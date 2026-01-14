import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { queries } from '@workspace/db/queries'
import { z } from 'zod'

export async function listAgents(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/agents',
    {
      schema: {
        tags: ['Agents'],
        description: 'Get all agents',
        operationId: 'listAgents',
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              agents: z.array(
                z.object({
                  id: z.string(),
                  name: z.string(),
                  slug: z.string(),
                  logo: z.string().nullable(),
                  description: z.string().nullable(),
                  tags: z.array(z.string()).nullable(),
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

      const { organizationId, organizationSlug } = request.query

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const agents = await queries.context.listAgents(context)

      return { agents }
    },
  )
}
