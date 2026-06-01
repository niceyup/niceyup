import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import type {
  SourceOperationStatus,
  SourceOperationType,
} from '@workspace/core/sources'
import { db } from '@workspace/db'
import { and, eq, inArray, isNull, or } from '@workspace/db/orm'
import { sourceOperations, sources } from '@workspace/db/schema'
import type { DeleteSourceTask } from '@workspace/engine/tasks/delete-source'
import type { IngestSourceTask } from '@workspace/engine/tasks/ingest-source'
import { tasks } from '@workspace/engine/trigger'
import { z } from 'zod'

const BATCH_SIZE = 100

export async function triggerSourceIngestion(app: FastifyTypedInstance) {
  app.register(authenticate).post(
    '/sources/trigger',
    {
      schema: {
        tags: ['Sources'],
        description: 'Trigger source ingestion',
        operationId: 'triggerSourceIngestion',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        body: z.object({
          status: z.enum(['all', 'ready', 'failed']).default('all'),
          sources: z
            .array(z.string())
            .nonempty()
            .max(BATCH_SIZE)
            .describe('Source identifiers to trigger ingestion for.'),
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

      const { status, sources: sourceIds } = request.body

      const listSources = await db
        .select({
          id: sources.id,
          sourceOperationId: sourceOperations.id,
          sourceOperationType: sourceOperations.type,
          sourceOperationStatus: sourceOperations.status,
        })
        .from(sources)
        .leftJoin(sourceOperations, eq(sourceOperations.sourceId, sources.id))
        .where(
          and(
            inArray(sources.id, sourceIds),
            or(
              status === 'all' || status === 'ready'
                ? and(
                    eq(sources.status, 'ready'),
                    isNull(sourceOperations.sourceId),
                  )
                : undefined,
              status === 'all' || status === 'failed'
                ? eq(sourceOperations.status, 'failed')
                : undefined,
            ),
            eq(sources.organizationId, organization.id),
          ),
        )

      const sourceIdsSet = new Set(listSources.map((source) => source.id))

      const sourceIdsNotFound = sourceIds.filter((id) => !sourceIdsSet.has(id))

      if (sourceIdsNotFound.length) {
        throw new BadRequestError({
          code: 'SOURCE_NOT_FOUND',
          message: `The following source identifiers were not found or you don’t have access to them: [${sourceIdsNotFound.join(', ')}]`,
        })
      }

      await manageSources({ organizationId: organization.id }, { listSources })

      return reply.status(204).send()
    },
  )
}

type SourceData = {
  id: string
  sourceOperationId: string | null
  sourceOperationType: SourceOperationType | null
  sourceOperationStatus: SourceOperationStatus | null
}

async function manageSources(
  context: {
    organizationId: string
  },
  params: {
    listSources: SourceData[]
  },
) {
  const { addedSources, removedSources } = await db.transaction(async (tx) => {
    const sourcesWithoutOperation: { id: string }[] = [] // create source operations
    const sourcesWithOperation: { id: string }[] = [] // update source operations

    const sourcesWithOperationFailedToDelete: { id: string }[] = [] // update source operations

    for (const source of params.listSources) {
      if (!source.sourceOperationId) {
        sourcesWithoutOperation.push({
          id: source.id,
        })
        continue
      }

      if (
        source.sourceOperationType === 'ingest-delete' &&
        source.sourceOperationStatus === 'failed'
      ) {
        sourcesWithOperationFailedToDelete.push({
          id: source.id,
        })
        continue
      }

      sourcesWithOperation.push({
        id: source.id,
      })
    }

    if (sourcesWithoutOperation.length) {
      await tx.insert(sourceOperations).values(
        sourcesWithoutOperation.map(({ id }) => ({
          sourceId: id,
          type: 'ingest' as const,
          status: 'queued' as const,
        })),
      )
    }

    if (sourcesWithOperation.length) {
      await tx
        .update(sourceOperations)
        .set({
          type: 'ingest' as const,
          status: 'queued' as const,
        })
        .where(
          inArray(
            sourceOperations.sourceId,
            sourcesWithOperation.map(({ id }) => id),
          ),
        )
    }

    if (sourcesWithOperationFailedToDelete.length) {
      await tx
        .update(sourceOperations)
        .set({
          type: 'ingest-delete' as const,
          status: 'queued' as const,
        })
        .where(
          inArray(
            sourceOperations.sourceId,
            sourcesWithOperationFailedToDelete.map(({ id }) => id),
          ),
        )
    }

    return {
      addedSources: [...sourcesWithoutOperation, ...sourcesWithOperation],
      removedSources: sourcesWithOperationFailedToDelete,
    }
  })

  if (addedSources.length) {
    await tasks.batchTrigger<IngestSourceTask>(
      'ingest-source',
      addedSources.map(({ id }) => ({
        payload: { sourceId: id },
        options: {
          concurrencyKey: context.organizationId,
          tags: [`organization:${context.organizationId}`, `source:${id}`],
        },
      })),
    )
  }

  if (removedSources.length) {
    await tasks.batchTrigger<DeleteSourceTask>(
      'delete-source',
      removedSources.map(({ id }) => ({
        payload: { sourceId: id, destroy: true },
        options: {
          concurrencyKey: context.organizationId,
          tags: [`organization:${context.organizationId}`, `source:${id}`],
        },
      })),
    )
  }

  return { addedSources, removedSources }
}
