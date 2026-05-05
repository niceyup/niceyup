import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
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
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          conversationId: z.string(),
        }),
        body: z.object({
          agentId: z.string(),
          title: z.string(),
        }),
        response: withDefaultErrorResponses({
          204: z.null().describe('Success'),
        }),
      },
    },
    async (request, reply) => {
      const { user, organization } = await resolveAuthOrganizationContext(
        request.ctx,
        {
          auth: { subject: 'user' },
          params: request.ctxParams,
        },
      )

      const { conversationId } = request.params

      const { agentId, title } = request.body

      const conversation = await queries.ctx.getConversation(
        { userId: user.id, organizationId: organization.id },
        { agentId, conversationId },
      )

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

      if (updatedConversation) {
        conversationPubSub.emitConversation({
          conversationId: conversation.id,
          data: {
            action: 'update',
            conversation: {
              id: updatedConversation.id,
              title: updatedConversation.title,
              updatedAt: updatedConversation.updatedAt.toISOString(),
            },
          },
        })

        if (conversation.visibility === 'team' && conversation.teamId) {
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
      }

      return reply.status(204).send()
    },
  )
}
