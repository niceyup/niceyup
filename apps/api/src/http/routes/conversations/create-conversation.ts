import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import {
  createConversationExplorerNodeItem,
  getConversationExplorerNodeFolder,
} from '@/http/functions/explorer-nodes/conversation-explorer-nodes'
import { getMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { db } from '@workspace/db'
import { queries } from '@workspace/db/queries'
import { conversations, messages } from '@workspace/db/schema'
import { getAgentConfiguration } from '@workspace/engine/agents'
import { z } from 'zod'

export async function createConversation(app: FastifyTypedInstance) {
  app.register(authenticate).post(
    '/conversations',
    {
      schema: {
        tags: ['Conversations'],
        description: 'Create a new conversation',
        operationId: 'createConversation',
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          teamId: z.string().nullish(),
          agentId: z.string(),
          title: z.string(),
          visibility: z.enum(['private', 'team']).default('private'),
          explorerNode: z
            .object({
              folderId: z.string().nullish(),
            })
            .optional(),
        }),
        response: withDefaultErrorResponses({
          201: z
            .object({
              conversationId: z.string(),
              systemMessageId: z.string(),
              explorerNode: z
                .object({
                  itemId: z.string(),
                })
                .optional(),
            })
            .describe('Success'),
        }),
      },
    },
    async (request, reply) => {
      const {
        user: { id: userId },
      } = request.authSession

      const {
        organizationId,
        organizationSlug,
        teamId,
        agentId,
        title,
        visibility,
        explorerNode,
      } = request.body

      const { context } = await getMembershipContext({
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

      const { conversation, systemMessage, itemExplorerNode } =
        await db.transaction(async (tx) => {
          const [conversation] = await tx
            .insert(conversations)
            .values({
              title,
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

          const agentConfiguration = await getAgentConfiguration({ agentId })

          const [systemMessage] = await tx
            .insert(messages)
            .values({
              conversationId: conversation.id,
              status: 'finished',
              role: 'system',
              parts: agentConfiguration.systemMessage
                ? [{ type: 'text', text: agentConfiguration.systemMessage }]
                : [],
            })
            .returning({
              id: messages.id,
            })

          if (!systemMessage) {
            throw new BadRequestError({
              code: 'SYSTEM_MESSAGE_NOT_CREATED',
              message: 'System message not created',
            })
          }

          let _itemExplorerNode = null

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

          return {
            conversation,
            systemMessage,
            itemExplorerNode: _itemExplorerNode,
          }
        })

      return reply.status(201).send({
        conversationId: conversation.id,
        systemMessageId: systemMessage.id,
        ...(itemExplorerNode && {
          explorerNode: { itemId: itemExplorerNode.id },
        }),
      })
    },
  )
}
