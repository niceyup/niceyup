'use server'

import { getMembership } from '@/actions/membership'
import type { OrganizationTeamParams } from '@/lib/types'
import { db } from '@workspace/db'
import {
  aliasedTable,
  and,
  eq,
  isNotNull,
  isNull,
  sql,
} from '@workspace/db/orm'
import {
  databaseSources,
  fileSources,
  files,
  sourceExplorerNodes,
  sourceOperations,
  sources,
} from '@workspace/db/schema'
import { cacheTag } from 'next/cache'

type ContextSourceExplorerNodeParams = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
}

async function resolveSourceExplorerNodeContext(
  context: ContextSourceExplorerNodeParams,
) {
  const membership = await getMembership({
    organizationSlug: context.organizationSlug,
  })

  if (!membership?.isAdmin) {
    return null
  }

  return { membership }
}

type GetItemInSourceExplorerNodeParams = {
  itemId: string
}

export async function getItemInSourceExplorerNode(
  context: ContextSourceExplorerNodeParams,
  params: GetItemInSourceExplorerNodeParams,
) {
  const ctx = await resolveSourceExplorerNodeContext(context)

  if (!ctx) {
    return null
  }

  const [item] = await db
    .select({
      id: sourceExplorerNodes.id,
      parentId: sourceExplorerNodes.parentId,
    })
    .from(sourceExplorerNodes)
    .where(
      and(
        isNotNull(sourceExplorerNodes.sourceId),
        eq(sourceExplorerNodes.id, params.itemId),
        eq(sourceExplorerNodes.organizationId, ctx.membership.organizationId),
        isNull(sourceExplorerNodes.deletedAt),
      ),
    )
    .limit(1)

  return item || null
}

type ListFoldersInSourceExplorerNodeParams = {
  folderId?: string
}

export async function listFoldersInSourceExplorerNode(
  context: ContextSourceExplorerNodeParams,
  params: ListFoldersInSourceExplorerNodeParams,
) {
  'use cache: private'
  cacheTag(
    'create-source-folder',
    'update-source-folder',
    'delete-source-folder',
  )

  const ctx = await resolveSourceExplorerNodeContext(context)

  if (!ctx) {
    return []
  }

  const listFolders = await db
    .select({
      id: sourceExplorerNodes.id,
      name: sourceExplorerNodes.name,
      sourceType: sourceExplorerNodes.sourceType,
      fractionalIndex: sourceExplorerNodes.fractionalIndex,
      children: sql<string[]>`
            (SELECT COALESCE(ARRAY_AGG(id), '{}'::text[])
             FROM ${sourceExplorerNodes} child_node
             WHERE child_node.parent_id = ${sourceExplorerNodes.id}
             AND child_node.deleted_at IS NULL)
          `.as('children'),
    })
    .from(sourceExplorerNodes)
    .where(
      and(
        isNull(sourceExplorerNodes.sourceId),
        eq(sourceExplorerNodes.organizationId, ctx.membership.organizationId),
        params.folderId
          ? eq(sourceExplorerNodes.parentId, params.folderId)
          : isNull(sourceExplorerNodes.parentId),
        isNull(sourceExplorerNodes.deletedAt),
      ),
    )
    .orderBy(sql`${sourceExplorerNodes.fractionalIndex} COLLATE "C" ASC`)

  return listFolders
}

type ListFolderItemsInSourceExplorerNodeParams = {
  folderId?: string
}

export async function listFolderItemsInSourceExplorerNode(
  context: ContextSourceExplorerNodeParams,
  params: ListFolderItemsInSourceExplorerNodeParams,
) {
  'use cache: private'
  cacheTag('create-source', 'delete-source')

  const ctx = await resolveSourceExplorerNodeContext(context)

  if (!ctx) {
    return []
  }

  const filesDatabase = aliasedTable(files, 'files_database')

  const listFolderItems = await db
    .select({
      id: sourceExplorerNodes.id,
      name: sql<string>`COALESCE(${sources.name}, ${sourceExplorerNodes.name})`.as(
        'name',
      ),
      sourceId: sql<string>`${sourceExplorerNodes.sourceId}`.as('sourceId'),
      sourceType: sourceExplorerNodes.sourceType,
      source: {
        type: sources.type,
        status: sources.status,
        operationType: sourceOperations.type,
        operationStatus: sourceOperations.status,
        fileSize: sql<number | null>`
          CASE 
            WHEN ${sources.type} = 'file' THEN ${files.fileSize}
            WHEN ${sources.type} = 'database' THEN ${filesDatabase.fileSize}
            ELSE NULL
          END
        `.as('fileSize'),
      },
      fractionalIndex: sourceExplorerNodes.fractionalIndex,
    })
    .from(sourceExplorerNodes)
    .leftJoin(sources, eq(sources.id, sourceExplorerNodes.sourceId))
    .leftJoin(sourceOperations, eq(sourceOperations.sourceId, sources.id))
    .leftJoin(fileSources, eq(fileSources.sourceId, sources.id))
    .leftJoin(files, eq(files.id, fileSources.fileId))
    .leftJoin(databaseSources, eq(databaseSources.sourceId, sources.id))
    .leftJoin(filesDatabase, eq(filesDatabase.id, databaseSources.fileId))
    .where(
      and(
        isNotNull(sourceExplorerNodes.sourceId),
        eq(sourceExplorerNodes.organizationId, ctx.membership.organizationId),
        params.folderId
          ? eq(sourceExplorerNodes.parentId, params.folderId)
          : isNull(sourceExplorerNodes.parentId),
        isNull(sourceExplorerNodes.deletedAt),
      ),
    )
    .orderBy(sql`${sourceExplorerNodes.fractionalIndex} COLLATE "C" ASC`)

  return listFolderItems
}

type ListSearchItemsInSourceExplorerNodeParams = {
  search?: string
}

export async function listSearchItemsInSourceExplorerNode(
  context: ContextSourceExplorerNodeParams,
  params: ListSearchItemsInSourceExplorerNodeParams,
) {
  const ctx = await resolveSourceExplorerNodeContext(context)

  if (!ctx) {
    return []
  }

  const listSearchItems = await db
    .select({
      id: sourceExplorerNodes.id,
      name: sql<string>`COALESCE(${sources.name}, ${sourceExplorerNodes.name})`.as(
        'name',
      ),
      sourceId: sourceExplorerNodes.sourceId,
      sourceType: sourceExplorerNodes.sourceType,
      fractionalIndex: sourceExplorerNodes.fractionalIndex,
      children: sql<string[]>`
            (SELECT COALESCE(ARRAY_AGG(id), '{}'::text[])
             FROM ${sourceExplorerNodes} child_node
             WHERE child_node.parent_id = ${sourceExplorerNodes.id}
             AND child_node.deleted_at IS NULL)
          `.as('children'),
    })
    .from(sourceExplorerNodes)
    .leftJoin(sources, eq(sourceExplorerNodes.sourceId, sources.id))
    .where(
      and(
        eq(sourceExplorerNodes.organizationId, ctx.membership.organizationId),
        sql<string>`COALESCE(${sources.name}, ${sourceExplorerNodes.name}) ILIKE ${`%${params.search}%`}`,
        isNull(sourceExplorerNodes.deletedAt),
      ),
    )
    .orderBy(sql`${sourceExplorerNodes.fractionalIndex} COLLATE "C" ASC`)

  return listSearchItems
}

type GetParentsInSourceExplorerNodeParams =
  | {
      folderId: string
      sourceId?: never
    }
  | {
      folderId?: never
      sourceId: string
    }

export async function getParentsInSourceExplorerNode(
  context: ContextSourceExplorerNodeParams,
  params: GetParentsInSourceExplorerNodeParams,
) {
  const ctx = await resolveSourceExplorerNodeContext(context)

  if (!ctx) {
    return []
  }

  const itemTypeCondition = params.sourceId
    ? sql`node.source_id = ${params.sourceId}`
    : sql`node.id = ${params.folderId} AND node.source_id IS NULL`

  const parents = await db.execute<{
    id: string
    name: string
    parent_id: string | null
    source_id: string | null
    deleted_at: string | null
    level: number
  }>(sql`
    WITH RECURSIVE explorer_nodes AS (
      SELECT node.id,
             CASE
               WHEN node.source_id IS NOT NULL
               THEN COALESCE(source.name, node.name)
               ELSE node.name
             END AS name,
             node.parent_id,
             node.source_id,
             node.deleted_at,
             0 AS level
      FROM ${sourceExplorerNodes} node
      LEFT JOIN ${sources} source ON node.source_id = source.id
      WHERE ${itemTypeCondition}
        AND node.organization_id = ${ctx.membership.organizationId}
      UNION ALL
      
      SELECT parent_node.id,
             parent_node.name,
             parent_node.parent_id,
             parent_node.source_id,
             parent_node.deleted_at,
             explorer_nodes.level + 1 AS level
      FROM ${sourceExplorerNodes} parent_node
      INNER JOIN explorer_nodes ON parent_node.id = explorer_nodes.parent_id
    )
    SELECT id,
           name,
           parent_id,
           source_id,
           deleted_at,
           level
    FROM explorer_nodes
    ORDER BY level DESC
  `)

  return parents.rows
}
