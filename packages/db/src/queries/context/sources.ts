import { and, asc, eq, isNull } from 'drizzle-orm'
import { db } from '../../db'
import { sources } from '../../schema'

type ContextListSourcesParams = {
  organizationId: string
  isAdmin: boolean
}

export async function listSources(context: ContextListSourcesParams) {
  if (!context.isAdmin) {
    return []
  }

  const listSources = await db
    .select({
      id: sources.id,
      name: sources.name,
      type: sources.type,
      status: sources.status,
    })
    .from(sources)
    .where(
      and(
        eq(sources.organizationId, context.organizationId),
        isNull(sources.deletedAt),
      ),
    )
    .orderBy(asc(sources.createdAt))

  return listSources
}

type ContextGetSourceParams = {
  organizationId: string
  isAdmin: boolean
}

type GetSourceParams = {
  sourceId: string
}

export async function getSource(
  context: ContextGetSourceParams,
  params: GetSourceParams,
) {
  if (!context.isAdmin) {
    return null
  }

  const [source] = await db
    .select({
      id: sources.id,
      name: sources.name,
      type: sources.type,
      status: sources.status,
    })
    .from(sources)
    .where(
      and(
        eq(sources.id, params.sourceId),
        eq(sources.organizationId, context.organizationId),
        isNull(sources.deletedAt),
      ),
    )
    .limit(1)

  return source || null
}
