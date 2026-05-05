import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import {
  createConversationExplorerNodeItem,
  getConversationExplorerNodeFolder,
} from '@/http/functions/explorer-nodes/conversation-explorer-nodes'
import { generateConversationTitle } from '@/http/functions/generate-conversation-title'
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
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import { db } from '@workspace/db'
import { and, desc, eq, isNull } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { conversations, messages } from '@workspace/db/schema'
import { conversationPubSub } from '@workspace/realtime/pubsub'
import { generateId } from '@workspace/utils'
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
  temporaryId: z.string().optional(),
})

export async function sendMessage(app: FastifyTypedInstance) {
  app.register(authenticate).post(
    '/conversations/:conversationId/messages/send',
    {
      schema: {
        tags: ['Messages'],
        description: 'Send a user message to a conversation',
        operationId: 'sendMessage',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          conversationId: z.string(),
        }),
        body: z.object({
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
          temporaryMessageId: z
            .string()
            .optional()
            .describe(
              'Client-side temporary message identifier (not persisted)',
            ),
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
      const { teamId } = request.body

      const { user, organization, team } = await resolveAuthOrganizationContext(
        request.ctx,
        {
          auth: { subject: 'user' },
          params: { ...request.ctxParams, teamId },
        },
      )

      const { conversationId } = request.params

      const {
        agentId,
        parentMessageId,
        message,
        visibility,
        explorerNode,
        temporaryMessageId,
      } = request.body

      const streamId = generateId()

      if (visibility === 'team' && !team) {
        throw new BadRequestError({
          code: 'TEAM_REQUIRED',
          message:
            'Team is required when the conversation visibility is set to "team"',
        })
      }

      if (conversationId === 'new') {
        const checkAccessToAgent = await queries.ctx.getAgent(
          { organizationId: organization.id },
          { agentId },
        )

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
            ownerUserId: user.id,
            ownerTeamId: team?.id,
          })

          if (!folderExplorerNode) {
            throw new BadRequestError({
              code: 'FOLDER_IN_EXPLORER_NOT_FOUND',
              message: 'Folder in explorer not found or you don’t have access',
            })
          }
        }
      } else {
        const conversation = await queries.ctx.getConversation(
          { userId: user.id, organizationId: organization.id },
          { agentId, conversationId },
        )

        if (!conversation) {
          throw new BadRequestError({
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Conversation not found or you don’t have access',
          })
        }
      }

      let _conversationId = conversationId

      const {
        newConversation,
        userMessage,
        assistantMessage,
        itemExplorerNode,
      } = await db.transaction(async (tx) => {
        let _newConversation = null
        let _itemExplorerNode = null

        if (conversationId === 'new') {
          const [newConversation] = await tx
            .insert(conversations)
            .values({
              agentId,
              teamId: visibility === 'team' ? team?.id : null,
              createdByUserId: user.id,
            })
            .returning({
              id: conversations.id,
              title: conversations.title,
              updatedAt: conversations.updatedAt,
            })

          if (!newConversation) {
            throw new BadRequestError({
              code: 'CONVERSATION_NOT_CREATED',
              message: 'Conversation not created',
            })
          }

          _conversationId = newConversation.id
          _newConversation = newConversation

          // Create a new conversation in the explorerNode
          if (explorerNode) {
            const itemExplorerNode = await createConversationExplorerNodeItem(
              {
                agentId,
                visibility,
                parentId: explorerNode.folderId,
                conversationId: newConversation.id,
                ownerUserId: user.id,
                ownerTeamId: team?.id,
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
            authorId: user.id,
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
              streamId,
              authorId: user.id,
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
          newConversation: _newConversation,
          userMessage: { ...userMessage, children: [assistantMessage.id] },
          assistantMessage: { ...assistantMessage, children: [] },
          itemExplorerNode: _itemExplorerNode,
        }
      })

      await streamAgentResponse({
        streamId,
        conversationId: _conversationId,
        userMessage: {
          id: userMessage.id,
          parts: message.parts,
        },
        assistantMessage,
      })

      const userMessageWithTemporaryId = {
        ...userMessage,
        temporaryId: temporaryMessageId,
      }

      // Realtime PubSub

      conversationPubSub.emitMessages({
        conversationId: _conversationId,
        data: [userMessageWithTemporaryId, assistantMessage],
      })

      if (newConversation && visibility === 'team' && team) {
        conversationPubSub.emitTeamConversations({
          agentId,
          teamId: team.id,
          view: 'list',
          data: {
            action: 'create',
            conversation: {
              id: newConversation.id,
              title: newConversation.title,
              updatedAt: newConversation.updatedAt.toISOString(),
            },
          },
        })

        if (itemExplorerNode) {
          conversationPubSub.emitTeamConversations({
            agentId,
            teamId: team.id,
            view: 'explorer',
            data: {
              action: 'create',
              item: {
                id: itemExplorerNode.id,
                parentId: itemExplorerNode.parentId,
              },
            },
          })
        }
      }

      if (newConversation) {
        console.log('newConversation', newConversation)

        updateConversationTitle({
          conversationId: newConversation.id,
          agentId,
          text: message.parts.find((part) => part.type === 'text')?.text,
          visibility,
          teamId: team?.id,
          itemExplorerNode,
        })
      }

      return {
        conversationId: _conversationId,
        userMessage: userMessageWithTemporaryId,
        assistantMessage,
        ...(itemExplorerNode && {
          explorerNode: { itemId: itemExplorerNode.id },
        }),
      }
    },
  )
}

async function updateConversationTitle(params: {
  conversationId: string
  agentId: string
  text: string | undefined
  visibility?: 'team' | 'private'
  teamId?: string | null
  itemExplorerNode?: {
    id: string
    parentId: string | null
  } | null
}) {
  const generatedTitle = await generateConversationTitle({
    agentId: params.agentId,
    userMessage: params.text,
  })

  if (!generatedTitle) {
    return
  }

  const [conversation] = await db
    .update(conversations)
    .set({
      title: generatedTitle,
    })
    .where(eq(conversations.id, params.conversationId))
    .returning({
      id: conversations.id,
      title: conversations.title,
      updatedAt: conversations.updatedAt,
    })

  if (!conversation) {
    return
  }

  // Realtime PubSub

  conversationPubSub.emitConversation({
    conversationId: params.conversationId,
    data: {
      action: 'update',
      conversation: {
        id: conversation.id,
        title: conversation.title,
        updatedAt: conversation.updatedAt.toISOString(),
      },
    },
  })

  if (params.visibility === 'team' && params.teamId) {
    conversationPubSub.emitTeamConversations({
      agentId: params.agentId,
      teamId: params.teamId,
      view: 'list',
      data: {
        action: 'create',
        conversation: {
          id: conversation.id,
          title: conversation.title,
          updatedAt: conversation.updatedAt.toISOString(),
        },
      },
    })

    if (params.itemExplorerNode) {
      conversationPubSub.emitTeamConversations({
        agentId: params.agentId,
        teamId: params.teamId,
        view: 'explorer',
        data: {
          action: 'create',
          item: {
            id: params.itemExplorerNode.id,
            parentId: params.itemExplorerNode.parentId,
          },
        },
      })
    }
  }
}
