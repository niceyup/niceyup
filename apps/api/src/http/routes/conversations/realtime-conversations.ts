import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { conversationVisibilitySchema } from '@workspace/core/conversations'
import { queries } from '@workspace/db/queries'
import { conversationPubSub } from '@workspace/realtime/pubsub'
import { z } from 'zod'

export async function realtimeConversations(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/ws/conversations',
    {
      websocket: true,
      schema: {
        tags: ['Conversations'],
        description: 'Realtime conversations',
        operationId: 'realtimeConversations',
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          teamId: z.string().nullish(),
          agentId: z.string(),
          visibility: conversationVisibilitySchema.default('private'),
          view: z.enum(['list', 'explorer']).default('list'),
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

      const {
        organizationId,
        organizationSlug,
        teamId,
        agentId,
        visibility,
        view,
      } = request.query

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
        teamId,
      })

      const checkAccessToAgent = await queries.context.getAgent(context, {
        agentId,
      })

      if (!checkAccessToAgent) {
        throw new BadRequestError({
          code: 'AGENT_NOT_FOUND',
          message: 'Agent not found or you don’t have access',
        })
      }

      if (visibility === 'team' && context.teamId) {
        conversationPubSub.subscribeTeamConversations({
          agentId,
          teamId: context.teamId,
          view,
          socket,
        })
      }
    },
  )
}
