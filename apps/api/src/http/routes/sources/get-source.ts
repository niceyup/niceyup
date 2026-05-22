import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import { sourceStatusSchema, sourceTypeSchema } from '@workspace/core/sources'
import { db } from '@workspace/db'
import { and, count, eq, isNull, or } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { sourceOperations, sources } from '@workspace/db/schema'
import { z } from 'zod'

export async function getSource(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/sources/:sourceId',
    {
      schema: {
        tags: ['Sources'],
        description: 'Get source details',
        operationId: 'getSource',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          sourceId: z.string(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              source: z.object({
                id: z.string(),
                name: z.string(),
                type: sourceTypeSchema,
                status: sourceStatusSchema,
              }),
              summary: z.object({
                draft: z.boolean(),
                ready: z.boolean(),
                processing: z.boolean(),
                completed: z.boolean(),
                failed: z.boolean(),
              }),
            })
            .describe('Success'),
        }),
      },
    },
    async (request) => {
      const { organization } = await resolveAuthOrganizationContext(
        request.ctx,
        {
          membership: { role: 'admin' },
          params: request.ctxParams,
        },
      )

      const { sourceId } = request.params

      const source = await queries.ctx.getSource(
        { organizationId: organization.id },
        { sourceId },
      )

      if (!source) {
        throw new BadRequestError({
          code: 'SOURCE_NOT_FOUND',
          message: 'Source not found or you don’t have access',
        })
      }

      const summary = await db.transaction(async (tx) => {
        const [draftCount] = await tx
          .select({ count: count() })
          .from(sources)
          .leftJoin(sourceOperations, eq(sources.id, sourceOperations.sourceId))
          .where(
            and(
              eq(sources.id, sourceId),
              eq(sources.status, 'draft'),
              isNull(sourceOperations.sourceId),
            ),
          )

        const [readyCount] = await tx
          .select({ count: count() })
          .from(sources)
          .leftJoin(sourceOperations, eq(sources.id, sourceOperations.sourceId))
          .where(
            and(
              eq(sources.id, sourceId),
              eq(sources.status, 'ready'),
              isNull(sourceOperations.sourceId),
            ),
          )

        const [processingCount] = await tx
          .select({ count: count() })
          .from(sources)
          .innerJoin(
            sourceOperations,
            eq(sources.id, sourceOperations.sourceId),
          )
          .where(
            and(
              eq(sources.id, sourceId),
              or(
                eq(sourceOperations.status, 'queued'),
                eq(sourceOperations.status, 'processing'),
              ),
            ),
          )

        const [completedCount] = await tx
          .select({ count: count() })
          .from(sources)
          .where(and(eq(sources.id, sourceId), eq(sources.status, 'completed')))

        const [failedCount] = await tx
          .select({ count: count() })
          .from(sources)
          .innerJoin(
            sourceOperations,
            eq(sources.id, sourceOperations.sourceId),
          )
          .where(
            and(
              eq(sources.id, sourceId),
              eq(sourceOperations.status, 'failed'),
            ),
          )

        return {
          draft: Boolean(draftCount?.count),
          ready: Boolean(readyCount?.count),
          processing: Boolean(processingCount?.count),
          completed: Boolean(completedCount?.count),
          failed: Boolean(failedCount?.count),
        }
      })

      return { source, summary }
    },
  )
}
