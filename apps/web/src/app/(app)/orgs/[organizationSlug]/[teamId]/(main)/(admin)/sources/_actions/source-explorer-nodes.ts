'use server'

import { isOrganizationMemberAdmin } from '@/actions/membership'
import { authenticatedUser } from '@/lib/auth/server'
import { resolveOrganizationContext } from '@/lib/organization'
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

type ContextListFoldersInSourceExplorerNodeParams = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
}

async function checkAdminAccess(
  context: { userId: string } & ContextListFoldersInSourceExplorerNodeParams,
) {
  const isAdmin = await isOrganizationMemberAdmin(context)

  return isAdmin
}

type GetItemInSourceExplorerNodeParams = {
  itemId: string
}

export async function getItemInSourceExplorerNode(
  context: ContextListFoldersInSourceExplorerNodeParams,
  { itemId }: GetItemInSourceExplorerNodeParams,
) {
  const {
    user: { id: userId },
  } = await authenticatedUser()

  if (!(await checkAdminAccess({ userId, ...context }))) {
    return null
  }

  const ctx = await resolveOrganizationContext({ userId, ...context })

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
        eq(sourceExplorerNodes.id, itemId),
        eq(sourceExplorerNodes.organizationId, ctx.organizationId),
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
  context: ContextListFoldersInSourceExplorerNodeParams,
  { folderId }: ListFoldersInSourceExplorerNodeParams,
) {
  'use cache: private'
  cacheTag(
    'create-source-folder',
    'update-source-folder',
    'delete-source-folder',
  )

  const {
    user: { id: userId },
  } = await authenticatedUser()

  if (!(await checkAdminAccess({ userId, ...context }))) {
    return []
  }

  const ctx = await resolveOrganizationContext({ userId, ...context })

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
        eq(sourceExplorerNodes.organizationId, ctx.organizationId),
        folderId
          ? eq(sourceExplorerNodes.parentId, folderId)
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
  context: ContextListFoldersInSourceExplorerNodeParams,
  { folderId }: ListFolderItemsInSourceExplorerNodeParams,
) {
  'use cache: private'
  cacheTag('create-source', 'delete-source')

  const {
    user: { id: userId },
  } = await authenticatedUser()

  if (!(await checkAdminAccess({ userId, ...context }))) {
    return []
  }

  const ctx = await resolveOrganizationContext({ userId, ...context })

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
        eq(sourceExplorerNodes.organizationId, ctx.organizationId),
        folderId
          ? eq(sourceExplorerNodes.parentId, folderId)
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
  context: ContextListFoldersInSourceExplorerNodeParams,
  { search }: ListSearchItemsInSourceExplorerNodeParams,
) {
  const {
    user: { id: userId },
  } = await authenticatedUser()

  if (!(await checkAdminAccess({ userId, ...context }))) {
    return []
  }

  const ctx = await resolveOrganizationContext({ userId, ...context })

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
        eq(sourceExplorerNodes.organizationId, ctx.organizationId),
        sql<string>`COALESCE(${sources.name}, ${sourceExplorerNodes.name}) ILIKE ${`%${search}%`}`,
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
  context: ContextListFoldersInSourceExplorerNodeParams,
  { folderId, sourceId }: GetParentsInSourceExplorerNodeParams,
) {
  const {
    user: { id: userId },
  } = await authenticatedUser()

  if (!(await checkAdminAccess({ userId, ...context }))) {
    return []
  }

  const ctx = await resolveOrganizationContext({ userId, ...context })

  if (!ctx) {
    return []
  }

  const itemTypeCondition = sourceId
    ? sql`node.source_id = ${sourceId}`
    : sql`node.id = ${folderId} AND node.source_id IS NULL`

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
        AND node.organization_id = ${ctx.organizationId}
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
