import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { getMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { agentsToSources } from '@workspace/db/schema'
import { z } from 'zod'

export async function listAgentSources(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/agents/:agentId/sources',
    {
      schema: {
        tags: ['Agents'],
        description: 'Get all sources of an agent',
        operationId: 'listAgentSources',
        params: z.object({
          agentId: z.string(),
        }),
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
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
              sources: z.array(
                z.object({
                  id: z.string(),
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

      const { agentId } = request.params

      const { organizationId, organizationSlug } = request.query

      const { context } = await getMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const agent = await queries.context.getAgent(context, { agentId })

      if (!agent) {
        throw new BadRequestError({
          code: 'AGENT_NOT_FOUND',
          message: 'Agent not found or you don’t have access',
        })
      }

      const sources = await db
        .select({
          id: agentsToSources.sourceId,
        })
        .from(agentsToSources)
        .where(eq(agentsToSources.agentId, agentId))

      return { agent, sources }
    },
  )
}
