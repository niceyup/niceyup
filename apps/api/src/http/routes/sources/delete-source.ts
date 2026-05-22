import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import { billing } from '@workspace/billing'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { sourceOperations } from '@workspace/db/schema'
import type { DeleteSourceTask } from '@workspace/engine/tasks/delete-source'
import { tasks } from '@workspace/engine/trigger'
import { z } from 'zod'

export async function deleteSource(app: FastifyTypedInstance) {
  app.register(authenticate).delete(
    '/sources/:sourceId',
    {
      schema: {
        tags: ['Sources'],
        description: 'Delete a source',
        operationId: 'deleteSource',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          sourceId: z.string(),
        }),
        body: z.object({
          destroy: z.boolean().optional(),
        }),
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

      const { sourceId } = request.params

      const { destroy } = request.body

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

      await billing.limits.computeUsage.throwIfExceeded({
        referenceId: organization.id,
      })

      await db.transaction(async (tx) => {
        const [sourceOperation] = await tx
          .select({
            id: sourceOperations.id,
          })
          .from(sourceOperations)
          .where(eq(sourceOperations.sourceId, sourceId))
          .limit(1)

        if (sourceOperation) {
          await tx
            .update(sourceOperations)
            .set({
              type: 'ingest-delete' as const,
              status: 'queued' as const,
            })
            .where(eq(sourceOperations.sourceId, sourceId))
        } else {
          await tx.insert(sourceOperations).values({
            sourceId,
            type: 'ingest-delete' as const,
            status: 'queued' as const,
          })
        }
      })

      await tasks.trigger<DeleteSourceTask>(
        'delete-source',
        { sourceId, destroy },
        {
          concurrencyKey: organization.id,
          tags: [`organization:${organization.id}`, `source:${sourceId}`],
        },
      )

      return reply.status(204).send()
    },
  )
}
