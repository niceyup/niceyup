import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import {
  createConversationExplorerNodeItem,
  getConversationExplorerNodeFolder,
} from '@/http/functions/explorer-nodes/conversation-explorer-nodes'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { db } from '@workspace/db'
import { queries } from '@workspace/db/queries'
import { conversations } from '@workspace/db/schema'
import { conversationPubSub } from '@workspace/realtime/pubsub'
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
          title: z.string().optional(),
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

      const { conversation, itemExplorerNode } = await db.transaction(
        async (tx) => {
          const [conversation] = await tx
            .insert(conversations)
            .values({
              title: title ?? 'New conversation',
              agentId,
              teamId: visibility === 'team' ? context.teamId : null,
              createdByUserId: context.userId,
            })
            .returning({
              id: conversations.id,
              title: conversations.title,
              updatedAt: conversations.updatedAt,
            })

          if (!conversation) {
            throw new BadRequestError({
              code: 'CONVERSATION_NOT_CREATED',
              message: 'Conversation not created',
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

          return { conversation, itemExplorerNode: _itemExplorerNode }
        },
      )

      // Realtime PubSub

      if (visibility === 'team' && context.teamId) {
        conversationPubSub.emitTeamConversations({
          agentId,
          teamId: context.teamId,
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

        if (itemExplorerNode) {
          conversationPubSub.emitTeamConversations({
            agentId,
            teamId: context.teamId,
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

      return reply.status(201).send({
        conversationId: conversation.id,
        ...(itemExplorerNode && {
          explorerNode: { itemId: itemExplorerNode.id },
        }),
      })
    },
  )
}
