import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import { queries } from '@workspace/db/queries'
import { z } from 'zod'

export async function getAgent(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/agents/:agentId',
    {
      schema: {
        tags: ['Agents'],
        description: 'Get agent details',
        operationId: 'getAgent',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          agentId: z.string(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              agent: z.object({
                id: z.string(),
                name: z.string(),
                slug: z.string(),
                logo: z.string().nullable(),
                description: z.string().nullable(),
                tags: z.array(z.string()).nullable(),
              }),
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

      const { agentId } = request.params

      const agent = await queries.ctx.getAgent(
        { organizationId: organization.id },
        { agentId },
      )

      if (!agent) {
        throw new BadRequestError({
          code: 'AGENT_NOT_FOUND',
          message: 'Agent not found or you don’t have access',
        })
      }

      return { agent }
    },
  )
}
