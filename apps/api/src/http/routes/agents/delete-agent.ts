import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { agents } from '@workspace/db/schema'
import { z } from 'zod'

export async function deleteAgent(app: FastifyTypedInstance) {
  app.register(authenticate).delete(
    '/agents/:agentId',
    {
      schema: {
        tags: ['Agents'],
        description: 'Delete an agent',
        operationId: 'deleteAgent',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          agentId: z.string(),
        }),
        body: z.object({}),
        response: withDefaultErrorResponses({
          204: z.null().describe('Success'),
        }),
      },
    },
    async (request, reply) => {
      const { organization } = await resolveAuthOrganizationContext(
        request.ctx,
        {
          membership: { role: 'admin' },
          params: request.ctxParams,
        },
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

      await db.delete(agents).where(eq(agents.id, agentId))

      return reply.status(204).send()
    },
  )
}
