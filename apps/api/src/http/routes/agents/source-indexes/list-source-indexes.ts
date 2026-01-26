import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { sourceIndexStatusSchema } from '@workspace/core/sources'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { sourceIndexes, sources } from '@workspace/db/schema'
import { z } from 'zod'

export async function listSourceIndexes(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/agents/:agentId/source-indexes',
    {
      schema: {
        tags: ['Source Indexes'],
        description: 'Get all source indexes of an agent',
        operationId: 'listSourceIndexes',
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
              sourceIndexes: z.array(
                z.object({
                  id: z.string(),
                  sourceId: z.string(),
                  status: sourceIndexStatusSchema,
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

      const { context } = await resolveMembershipContext({
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

      const listSourceIndexes = await db
        .select({
          id: sourceIndexes.id,
          sourceId: sourceIndexes.sourceId,
          status: sourceIndexes.status,
        })
        .from(sourceIndexes)
        .leftJoin(sources, eq(sourceIndexes.sourceId, sources.id))
        .where(eq(sourceIndexes.agentId, agentId))

      return { agent, sourceIndexes: listSourceIndexes }
    },
  )
}
