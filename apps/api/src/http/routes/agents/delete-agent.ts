import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
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
        params: z.object({
          agentId: z.string(),
        }),
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
        }),
        response: withDefaultErrorResponses({
          204: z.null().describe('Success'),
        }),
      },
    },
    async (request, reply) => {
      const {
        user: { id: userId },
      } = request.authSession

      const { agentId } = request.params

      const { organizationId, organizationSlug } = request.body

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const agent = await queries.context.getAgent(context, {
        agentId,
      })

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
