import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { getMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { queries } from '@workspace/db/queries'
import { z } from 'zod'

export async function listConversations(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/conversations',
    {
      schema: {
        tags: ['Conversations'],
        description: 'Get all conversations',
        operationId: 'listConversations',
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          teamId: z.string().optional(),
          agentId: z.string(),
          visibility: z.enum(['private', 'shared', 'team']).default('private'),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              conversations: z.array(
                z.object({
                  id: z.string(),
                  title: z.string(),
                  visibility: z.enum(['private', 'shared', 'team']),
                  teamId: z.string().nullish(),
                  createdByUserId: z.string().nullish(),
                  updatedAt: z.date(),
                }),
              ),
            })
            .describe('Success'),
        }),
      },
    },
    async (request) => {
      const {
        user: { id: userId },
      } = request.authSession

      const { organizationId, organizationSlug, teamId, agentId, visibility } =
        request.query

      const { context } = await getMembershipContext({
        userId,
        organizationId,
        organizationSlug,
        teamId,
      })

      const conversations = await queries.context.listConversations(context, {
        agentId,
        visibility,
      })

      return { conversations }
    },
  )
}
