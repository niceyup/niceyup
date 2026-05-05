import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import { queries } from '@workspace/db/queries'
import { conversationPubSub } from '@workspace/realtime/pubsub'
import { z } from 'zod'

export async function realtimeConversation(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/ws/conversations/:conversationId',
    {
      websocket: true,
      schema: {
        tags: ['Conversations'],
        description: 'Realtime conversation',
        operationId: 'realtimeConversation',
        params: z.object({
          conversationId: z.string(),
        }),
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          agentId: z.string(),
        }),
        response: withDefaultErrorResponses({
          200: z.unknown().describe('Success'),
        }),
      },
    },
    async (socket, request) => {
      const { organizationId, organizationSlug } = request.query

      const { user, organization } = await resolveAuthOrganizationContext(
        request.ctx,
        {
          auth: { subject: 'user' },
          params: { organizationId, organizationSlug },
        },
      )

      const { conversationId } = request.params

      const { agentId } = request.query

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

      conversationPubSub.subscribeConversation({
        conversationId,
        socket,
      })
    },
  )
}
