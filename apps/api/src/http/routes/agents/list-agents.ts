import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
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
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
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
      const { organization } = await resolveAuthOrganizationContext(
        request.ctx,
        { params: request.ctxParams },
      )

      const agents = await queries.ctx.listAgents({
        organizationId: organization.id,
      })

      return { agents }
    },
  )
}
