import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import { getOrganizationIdentifier } from '@/lib/utils'
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
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              conversations: z.array(
                z.object({
                  id: z.string(),
                  title: z.string(),
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

      const conversations = await queries.context.listConversations(context, {
        agentId,
      })

      return { conversations }
    },
  )
}
