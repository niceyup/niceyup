import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { conversationExplorerNodes, conversations } from '@workspace/db/schema'
import { conversationPubSub } from '@workspace/realtime/pubsub'
import { z } from 'zod'

export async function updateConversation(app: FastifyTypedInstance) {
  app.register(authenticate).patch(
    '/conversations/:conversationId',
    {
      schema: {
        tags: ['Conversations'],
        description: 'Update a conversation',
        operationId: 'updateConversation',
        params: z.object({
          conversationId: z.string(),
        }),
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          agentId: z.string(),
          title: z.string(),
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

      const { organizationId, organizationSlug, agentId, title } = request.body

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
          code: 'CONVERSATION_UNAVAILABLE',
          message: 'Conversation not found or you don’t have access',
        })
      }

      const [updatedConversation] = await db
        .update(conversations)
        .set({
          title,
        })
        .where(eq(conversations.id, conversationId))
        .returning({
          id: conversations.id,
          title: conversations.title,
          updatedAt: conversations.updatedAt,
        })

      // Realtime PubSub

      if (
        updatedConversation &&
        conversation.visibility === 'team' &&
        conversation.teamId
      ) {
        conversationPubSub.emitTeamConversations({
          agentId,
          teamId: conversation.teamId,
          view: 'list',
          data: {
            action: 'update',
            conversation: {
              id: updatedConversation.id,
              title: updatedConversation.title,
              updatedAt: updatedConversation.updatedAt.toISOString(),
            },
          },
        })

        const [itemExplorerNode] = await db
          .select({
            id: conversationExplorerNodes.id,
            parentId: conversationExplorerNodes.parentId,
          })
          .from(conversationExplorerNodes)
          .where(eq(conversationExplorerNodes.conversationId, conversationId))
          .limit(1)

        if (itemExplorerNode) {
          conversationPubSub.emitTeamConversations({
            agentId,
            teamId: conversation.teamId,
            view: 'explorer',
            data: {
              action: 'update',
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
