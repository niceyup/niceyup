import type { DBTransaction } from '@workspace/db'
import { db } from '@workspace/db'
import { and, eq, isNull, sql } from '@workspace/db/orm'
import { sourceExplorerNodes } from '@workspace/db/schema'
import { generateKeyBetween } from 'jittered-fractional-indexing'

type GetSourceExplorerNodeFolderParams = {
  id: string
  organizationId: string | null | undefined
}

export async function getSourceExplorerNodeFolder(
  params: GetSourceExplorerNodeFolderParams,
) {
  if (!params.organizationId) {
    return null
  }

  const [explorerNode] = await db
    .select({
      id: sourceExplorerNodes.id,
    })
    .from(sourceExplorerNodes)
    .where(
      and(
        eq(sourceExplorerNodes.id, params.id),
        eq(sourceExplorerNodes.organizationId, params.organizationId),
        isNull(sourceExplorerNodes.sourceId),
        isNull(sourceExplorerNodes.deletedAt),
      ),
    )
    .limit(1)

  return explorerNode || null
}

type CreateSourceExplorerNodeItemParams = {
  parentId?: string | null
  sourceId: string
  organizationId: string | null | undefined
}

export async function createSourceExplorerNodeItem(
  params: CreateSourceExplorerNodeItemParams,
  tx?: DBTransaction,
) {
  if (!params.organizationId) {
    return null
  }

  const [firstSibling] = await (tx ?? db)
    .select({
      fractionalIndex: sourceExplorerNodes.fractionalIndex,
    })
    .from(sourceExplorerNodes)
    .where(
      and(
        !params.parentId || params.parentId === 'root'
          ? isNull(sourceExplorerNodes.parentId)
          : eq(sourceExplorerNodes.parentId, params.parentId),
        eq(sourceExplorerNodes.organizationId, params.organizationId),
        isNull(sourceExplorerNodes.deletedAt),
      ),
    )
    .orderBy(sql`${sourceExplorerNodes.fractionalIndex} COLLATE "C" ASC`)
    .limit(1)

  const fractionalIndex = generateKeyBetween(
    null,
    firstSibling?.fractionalIndex || null,
  )

  const [explorerNode] = await (tx ?? db)
    .insert(sourceExplorerNodes)
    .values({
      sourceId: params.sourceId,
      parentId:
        !params.parentId || params.parentId === 'root' ? null : params.parentId,
      fractionalIndex,
      organizationId: params.organizationId,
    })
    .returning({
      id: sourceExplorerNodes.id,
    })

  return explorerNode || null
}

type CreateSourceExplorerNodeFolderParams = {
  parentId?: string | null
  name: string
  organizationId: string | null | undefined
}

export async function createSourceExplorerNodeFolder(
  params: CreateSourceExplorerNodeFolderParams,
  tx?: DBTransaction,
) {
  if (!params.organizationId) {
    return null
  }

  const [firstSibling] = await (tx ?? db)
    .select({
      fractionalIndex: sourceExplorerNodes.fractionalIndex,
    })
    .from(sourceExplorerNodes)
    .where(
      and(
        !params.parentId || params.parentId === 'root'
          ? isNull(sourceExplorerNodes.parentId)
          : eq(sourceExplorerNodes.parentId, params.parentId),
        eq(sourceExplorerNodes.organizationId, params.organizationId),
        isNull(sourceExplorerNodes.deletedAt),
      ),
    )
    .orderBy(sql`${sourceExplorerNodes.fractionalIndex} COLLATE "C" ASC`)
    .limit(1)

  const fractionalIndex = generateKeyBetween(
    null,
    firstSibling?.fractionalIndex || null,
  )

  const [explorerNode] = await (tx ?? db)
    .insert(sourceExplorerNodes)
    .values({
      name: params.name,
      parentId:
        !params.parentId || params.parentId === 'root' ? null : params.parentId,
      fractionalIndex,
      organizationId: params.organizationId,
    })
    .returning({
      id: sourceExplorerNodes.id,
    })

  return explorerNode || null
}
