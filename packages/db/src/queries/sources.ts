import { db } from '@workspace/db'
import { and, eq, inArray, isNotNull, isNull, lt, or } from 'drizzle-orm'
import { indexedSources, sourceOperations, sources } from '../schema'

type ListIncompleteSourcesKnowledgeBaseParams = {
  knowledgeBaseId: string
  status?: 'all' | 'idle' | 'stale' | 'failed'
  sourceIds?: string[]
  limit: number
}

export async function listIncompleteSourcesKnowledgeBase(
  params: ListIncompleteSourcesKnowledgeBaseParams,
) {
  const listSources = await db
    .select({
      id: sources.id,
      indexedSourceId: indexedSources.id,
      sourceOperationId: sourceOperations.id,
      sourceOperationType: sourceOperations.type,
      sourceOperationStatus: sourceOperations.status,
    })
    .from(sources)
    .innerJoin(
      indexedSources,
      and(
        eq(indexedSources.sourceId, sources.id),
        eq(indexedSources.knowledgeBaseId, params.knowledgeBaseId),
      ),
    )
    .leftJoin(
      sourceOperations,
      eq(sourceOperations.indexedSourceId, indexedSources.id),
    )
    .where(
      and(
        params.sourceIds ? inArray(sources.id, params.sourceIds) : undefined,
        or(
          params.status === 'all' || params.status === 'idle'
            ? and(
                eq(indexedSources.status, 'idle'),
                isNull(sourceOperations.indexedSourceId),
              )
            : undefined,
          params.status === 'all' || params.status === 'stale'
            ? and(
                eq(indexedSources.status, 'completed'),
                isNotNull(indexedSources.indexedAt),
                lt(indexedSources.indexedAt, sources.contentUpdatedAt),
              )
            : undefined,
          params.status === 'all' || params.status === 'failed'
            ? eq(sourceOperations.status, 'failed')
            : undefined,
        ),
      ),
    )
    .limit(params.limit)

  return listSources
}
