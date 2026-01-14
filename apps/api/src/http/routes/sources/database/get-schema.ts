import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { databaseSourceTableMetadataSchema } from '@workspace/core/sources'
import { queries } from '@workspace/db/queries'
import type { GetDbSchemaTask } from '@workspace/engine/tasks/get-db-schema'
import { tasks } from '@workspace/engine/trigger'
import { z } from 'zod'

export async function getDatabaseSchema(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/sources/:sourceId/database/schema',
    {
      schema: {
        tags: ['Sources'],
        description: 'Get database schema',
        operationId: 'getDatabaseSchema',
        params: z.object({
          sourceId: z.string(),
        }),
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              tablesMetadata: z.array(databaseSourceTableMetadataSchema),
            })
            .describe('Success'),
        }),
      },
    },
    async (request) => {
      const {
        user: { id: userId },
      } = request.authSession

      const { sourceId } = request.params

      const { organizationId, organizationSlug } = request.query

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const source = await queries.context.getSource(context, { sourceId })

      if (!source) {
        throw new BadRequestError({
          code: 'SOURCE_NOT_FOUND',
          message: 'Source not found or you don’t have access',
        })
      }

      if (source.type !== 'database') {
        throw new BadRequestError({
          code: 'SOURCE_NOT_A_DATABASE',
          message: 'Source is not a database',
        })
      }

      const result = await tasks.triggerAndWait<GetDbSchemaTask>(
        'get-db-schema',
        { sourceId },
      )

      if (!result.ok) {
        throw new BadRequestError({
          code: 'GET_DATABASE_SCHEMA_FAILED',
          message: 'Failed to get database schema',
        })
      }

      return { tablesMetadata: result.output }
    },
  )
}
