import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { getMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { agents } from '@workspace/db/schema'
import { z } from 'zod'

export async function updateAgent(app: FastifyTypedInstance) {
  app.register(authenticate).patch(
    '/agents/:agentId',
    {
      schema: {
        tags: ['Agents'],
        description: 'Update an agent',
        operationId: 'updateAgent',
        params: z.object({
          agentId: z.string(),
        }),
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          name: z.string().optional(),
          slug: z.string().optional(),
          logo: z.string().nullish(),
          description: z.string().nullish(),
          tags: z.array(z.string()).nullish(),
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

      const {
        organizationId,
        organizationSlug,
        name,
        slug,
        logo,
        description,
        tags,
      } = request.body

      const { context } = await getMembershipContext({
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

      await db
        .update(agents)
        .set({
          name,
          slug,
          logo,
          description,
          tags,
        })
        .where(eq(agents.id, agentId))

      return reply.status(204).send()
    },
  )
}
