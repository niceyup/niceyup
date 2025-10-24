import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import { getOrganizationIdentifier } from '@/lib/utils'
import type { FastifyTypedInstance } from '@/types/fastify'
import { queries } from '@workspace/db/queries'
import { conversationPubSub } from '@workspace/realtime/pubsub'
import { z } from 'zod'

export async function realtimeMessages(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/conversations/:conversationId/messages/realtime',
    {
      websocket: true,
      schema: {
        tags: ['Conversations'],
        description: 'Realtime messages',
        operationId: 'realtimeMessages',
        params: z.object({
          conversationId: z.string(),
        }),
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          teamId: z.string().optional(),
          agentId: z.string(),
        }),
        response: withDefaultErrorResponses({
          200: z.unknown().describe('Success'),
        }),
      },
    },
    async (socket, request) => {
      const {
        user: { id: userId },
      } = request.authSession

      const { conversationId } = request.params

      const { organizationId, organizationSlug, teamId, agentId } =
        request.query

      const context = {
        userId,
        ...getOrganizationIdentifier({
          organizationId,
          organizationSlug,
          teamId,
        }),
      }

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

      conversationPubSub.subscribe({
        channel: `conversations:${conversationId}:updated`,
        socket,
      })
    },
  )
}
