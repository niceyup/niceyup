import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { db } from '@workspace/db'
import { and, eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import {
  conversationExplorerNodes,
  conversations,
  participants,
} from '@workspace/db/schema'
import { conversationPubSub } from '@workspace/realtime/pubsub'
import { z } from 'zod'

export async function deleteConversation(app: FastifyTypedInstance) {
  app.register(authenticate).delete(
    '/conversations/:conversationId',
    {
      schema: {
        tags: ['Conversations'],
        description: 'Delete a conversation',
        operationId: 'deleteConversation',
        params: z.object({
          conversationId: z.string(),
        }),
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          agentId: z.string(),
          destroy: z.boolean().optional(),
        }),
        response: withDefaultErrorResponses({
          204: z.null().describe('Success'),
        }),
      },
    },
    async (request, reply) => {
      const {
        user: { id: userId },
      } = request.authSession

      const { conversationId } = request.params

      const { organizationId, organizationSlug, agentId, destroy } =
        request.body

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

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

      const { itemExplorerNode } = await db.transaction(async (tx) => {
        let _itemExplorerNode = null

        if (conversation.visibility === 'shared') {
          const [itemExplorerNode] = await tx
            .delete(conversationExplorerNodes)
            .where(
              and(
                eq(conversationExplorerNodes.conversationId, conversationId),
                eq(conversationExplorerNodes.ownerUserId, userId),
              ),
            )
            .returning({
              id: conversationExplorerNodes.id,
              parentId: conversationExplorerNodes.parentId,
            })

          _itemExplorerNode = itemExplorerNode

          await tx
            .delete(participants)
            .where(
              and(
                eq(participants.conversationId, conversationId),
                eq(participants.userId, userId),
              ),
            )
        } else {
          const explorerOwnerTypeCondition = conversation.teamId
            ? eq(conversationExplorerNodes.ownerTeamId, conversation.teamId)
            : eq(conversationExplorerNodes.ownerUserId, userId)

          const ownerTypeCondition = conversation.teamId
            ? eq(conversations.teamId, conversation.teamId)
            : eq(conversations.createdByUserId, userId)

          if (destroy) {
            const [itemExplorerNode] = await tx
              .delete(conversationExplorerNodes)
              .where(
                and(
                  eq(conversationExplorerNodes.conversationId, conversationId),
                  explorerOwnerTypeCondition,
                ),
              )
              .returning({
                id: conversationExplorerNodes.id,
                parentId: conversationExplorerNodes.parentId,
              })

            _itemExplorerNode = itemExplorerNode

            await tx
              .delete(conversations)
              .where(
                and(eq(conversations.id, conversationId), ownerTypeCondition),
              )
          } else {
            const [itemExplorerNode] = await tx
              .update(conversationExplorerNodes)
              .set({ deletedAt: new Date() })
              .where(
                and(
                  eq(conversationExplorerNodes.conversationId, conversationId),
                  explorerOwnerTypeCondition,
                ),
              )
              .returning({
                id: conversationExplorerNodes.id,
                parentId: conversationExplorerNodes.parentId,
              })

            _itemExplorerNode = itemExplorerNode

            await tx
              .update(conversations)
              .set({ deletedAt: new Date() })
              .where(
                and(eq(conversations.id, conversationId), ownerTypeCondition),
              )
          }
        }

        return { itemExplorerNode: _itemExplorerNode }
      })

      // Realtime PubSub

      if (conversation.visibility === 'team' && conversation.teamId) {
        conversationPubSub.emitTeamConversations({
          agentId,
          teamId: conversation.teamId,
          view: 'list',
          data: {
            action: 'delete',
            conversation: { id: conversationId },
          },
        })

        if (itemExplorerNode) {
          conversationPubSub.emitTeamConversations({
            agentId,
            teamId: conversation.teamId,
            view: 'explorer',
            data: {
              action: 'delete',
              item: {
                id: itemExplorerNode.id,
                parentId: itemExplorerNode.parentId,
              },
            },
          })
        }
      }

      return reply.status(204).send()
    },
  )
}
