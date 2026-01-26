import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import {
  createConversationExplorerNodeItem,
  getConversationExplorerNodeFolder,
} from '@/http/functions/explorer-nodes/conversation-explorer-nodes'
import { generateConversationTitle } from '@/http/functions/generate-conversation-title'
import { resolveMembershipContext } from '@/http/functions/membership'
import { streamAgentResponse } from '@/http/functions/stream-agent-response'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import {
  aiMessageMetadataSchema,
  aiMessagePartSchema,
  aiMessageRoleSchema,
  aiMessageStatusSchema,
} from '@workspace/ai/schemas'
import type { AIMessageMetadata } from '@workspace/ai/types'
import { db } from '@workspace/db'
import { and, desc, eq, isNull } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { conversations, messages } from '@workspace/db/schema'
import { conversationPubSub } from '@workspace/realtime/pubsub'
import { z } from 'zod'

const textPartSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
})

const filePartSchema = z.object({
  type: z.literal('file'),
  mediaType: z.string(),
  filename: z.string().optional(),
  url: z.string(),
})

const promptMessagePartSchema = z.union([textPartSchema, filePartSchema])

const messageSchema = z.object({
  id: z.string(),
  status: aiMessageStatusSchema,
  role: aiMessageRoleSchema,
  parts: z.array(aiMessagePartSchema).nullable(),
  metadata: aiMessageMetadataSchema.nullable(),
  authorId: z.string().nullish(),
  parentId: z.string().nullish(),
  children: z.array(z.string()).optional(),
})

export async function sendMessage(app: FastifyTypedInstance) {
  app.register(authenticate).post(
    '/conversations/:conversationId/messages/send',
    {
      schema: {
        tags: ['Conversations'],
        description: 'Send a user message to a conversation',
        operationId: 'sendMessage',
        params: z.object({
          conversationId: z.string(),
        }),
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          teamId: z.string().nullish(),
          agentId: z.string(),
          parentMessageId: z.string().nullish(),
          message: z.object({
            parts: z.array(promptMessagePartSchema).nonempty(),
            metadata: aiMessageMetadataSchema.nullish(),
          }),
          visibility: z
            .enum(['private', 'team'])
            .default('private')
            .describe('Used only when conversation is created'),
          explorerNode: z
            .object({
              folderId: z.string().nullish(),
            })
            .optional()
            .describe('Used only when conversation is created'),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              conversationId: z.string(),
              userMessage: messageSchema,
              assistantMessage: messageSchema,
              explorerNode: z
                .object({
                  itemId: z.string(),
                })
                .optional()
                .describe('Return only when the conversation is created'),
            })
            .describe('Success'),
        }),
      },
    },
    async (request) => {
      const {
        user: { id: userId },
      } = request.authSession

      const { conversationId } = request.params

      const {
        organizationId,
        organizationSlug,
        teamId,
        agentId,
        parentMessageId,
        message,
        visibility,
        explorerNode,
      } = request.body

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
        teamId,
      })

      if (visibility === 'team' && !context.teamId) {
        throw new BadRequestError({
          code: 'TEAM_ID_REQUIRED',
          message:
            'Team is required when the conversation visibility is set to "team"',
        })
      }

      if (conversationId === 'new') {
        const checkAccessToAgent = await queries.context.getAgent(context, {
          agentId,
        })

        if (!checkAccessToAgent) {
          throw new BadRequestError({
            code: 'AGENT_NOT_FOUND',
            message: 'Agent not found or you don’t have access',
          })
        }

        if (explorerNode?.folderId && explorerNode.folderId !== 'root') {
          const folderExplorerNode = await getConversationExplorerNodeFolder({
            id: explorerNode.folderId,
            visibility,
            agentId,
            ownerUserId: context.userId,
            ownerTeamId: context.teamId,
          })

          if (!folderExplorerNode) {
            throw new BadRequestError({
              code: 'FOLDER_IN_EXPLORER_NOT_FOUND',
              message: 'Folder in explorer not found or you don’t have access',
            })
          }
        }
      } else {
        const conversation = await queries.context.getConversation(context, {
          agentId,
          conversationId,
        })

        if (!conversation) {
          throw new BadRequestError({
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Conversation not found or you don’t have access',
          })
        }
      }

      let _conversationId = conversationId

      const { userMessage, assistantMessage, itemExplorerNode } =
        await db.transaction(async (tx) => {
          let _itemExplorerNode = null

          if (conversationId === 'new') {
            const title = message.parts.find(
              (part) => part.type === 'text',
            )?.text

            const generatedTitle = await generateConversationTitle({
              userMessage: title,
            })

            const [conversation] = await tx
              .insert(conversations)
              .values({
                title: generatedTitle || 'New conversation',
                agentId,
                teamId: visibility === 'team' ? context.teamId : null,
                createdByUserId: context.userId,
              })
              .returning({
                id: conversations.id,
              })

            if (!conversation) {
              throw new BadRequestError({
                code: 'CONVERSATION_NOT_CREATED',
                message: 'Conversation not created',
              })
            }

            _conversationId = conversation.id

            // Create a new conversation in the explorerNode
            if (explorerNode) {
              const itemExplorerNode = await createConversationExplorerNodeItem(
                {
                  agentId,
                  visibility,
                  parentId: explorerNode.folderId,
                  conversationId: conversation.id,
                  ownerUserId: context.userId,
                  ownerTeamId: context.teamId,
                },
                tx,
              )

              _itemExplorerNode = itemExplorerNode
            }
          }

          const [parentMessage] = await tx
            .select({
              id: messages.id,
            })
            .from(messages)
            .where(
              and(
                eq(messages.conversationId, _conversationId),
                parentMessageId ? eq(messages.id, parentMessageId) : undefined,
                isNull(messages.deletedAt),
              ),
            )
            .orderBy(desc(messages.createdAt))
            .limit(1)

          if (parentMessageId && !parentMessage) {
            throw new BadRequestError({
              code: 'PARENT_MESSAGE_NOT_FOUND',
              message: 'Parent message not found',
            })
          }

          const [userMessage] = await tx
            .insert(messages)
            .values({
              conversationId: _conversationId,
              status: 'completed',
              role: 'user',
              parts: message.parts,
              metadata: message.metadata as AIMessageMetadata,
              authorId: userId,
              parentId: parentMessageId,
            })
            .returning({
              id: messages.id,
              status: messages.status,
              role: messages.role,
              parts: messages.parts,
              metadata: messages.metadata,
              authorId: messages.authorId,
              parentId: messages.parentId,
            })

          if (!userMessage) {
            throw new BadRequestError({
              code: 'USER_MESSAGE_NOT_CREATED',
              message: 'User message not created',
            })
          }

          const [assistantMessage] = await tx
            .insert(messages)
            .values({
              conversationId: _conversationId,
              status: 'queued',
              role: 'assistant',
              parts: [],
              metadata: {
                authorId: userId,
              },
              parentId: userMessage.id,
            })
            .returning({
              id: messages.id,
              status: messages.status,
              role: messages.role,
              parts: messages.parts,
              metadata: messages.metadata,
              authorId: messages.authorId,
              parentId: messages.parentId,
            })

          if (!assistantMessage) {
            throw new BadRequestError({
              code: 'ASSISTANT_MESSAGE_NOT_CREATED',
              message: 'Assistant message not created',
            })
          }

          return {
            userMessage: { ...userMessage, children: [assistantMessage.id] },
            assistantMessage: { ...assistantMessage, children: [] },
            itemExplorerNode: _itemExplorerNode,
          }
        })

      streamAgentResponse({
        conversationId: _conversationId,
        userMessage: {
          id: userMessage.id,
          parts: message.parts,
        },
        assistantMessage,
      })

      conversationPubSub.publish({
        channel: `conversations:${_conversationId}:updated`,
        messages: [userMessage, assistantMessage],
      })

      return {
        conversationId: _conversationId,
        userMessage,
        assistantMessage,
        ...(itemExplorerNode && {
          explorerNode: { itemId: itemExplorerNode.id },
        }),
      }
    },
  )
}
