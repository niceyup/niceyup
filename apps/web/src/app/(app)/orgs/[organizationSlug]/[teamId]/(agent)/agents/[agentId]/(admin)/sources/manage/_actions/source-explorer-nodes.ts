'use server'

import { isOrganizationMemberAdmin } from '@/actions/membership'
import { authenticatedUser } from '@/lib/auth/server'
import { resolveOrganizationContext } from '@/lib/organization'
import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import { db } from '@workspace/db'
import { and, eq, isNull, sql } from '@workspace/db/orm'
import {
  agentsToSources,
  sourceExplorerNodes,
  sources,
} from '@workspace/db/schema'

type ContextSourceExplorerNodeParams = OrganizationTeamParams & AgentParams

async function checkAdminAccess(
  context: { userId: string } & ContextSourceExplorerNodeParams,
) {
  const isAdmin = await isOrganizationMemberAdmin(context)

  return isAdmin
}

type GetItemInSourceExplorerNodeParams = {
  itemId: string
}

export async function getItemInSourceExplorerNode(
  context: ContextSourceExplorerNodeParams,
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

  const [itemData] = await db
    .select({
      id: sourceExplorerNodes.id,
      name: sql<string>`
          CASE
            WHEN ${sourceExplorerNodes.sourceId} IS NOT NULL
            THEN COALESCE(${sources.name}, ${sourceExplorerNodes.name})
            ELSE ${sourceExplorerNodes.name}
          END
        `.as('name'),
      sourceId: sourceExplorerNodes.sourceId,
      sourceType: sourceExplorerNodes.sourceType,
      sourceEmbeddingStatus: agentsToSources.status,
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
    .leftJoin(
      agentsToSources,
      and(
        eq(agentsToSources.agentId, context.agentId),
        eq(agentsToSources.sourceId, sourceExplorerNodes.sourceId),
      ),
    )
    .where(
      and(
        eq(sourceExplorerNodes.id, itemId),
        eq(sourceExplorerNodes.organizationId, ctx.organizationId),
        isNull(sourceExplorerNodes.deletedAt),
      ),
    )
    .limit(1)

  return itemData || null
}

type GetChildrenWithDataInSourceExplorerNodeParams = {
  itemId: string
}

export async function getChildrenWithDataInSourceExplorerNode(
  context: ContextSourceExplorerNodeParams,
  { itemId }: GetChildrenWithDataInSourceExplorerNodeParams,
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

  if (itemId === 'root') {
    const childrenWithData = await db
      .select({
        id: sourceExplorerNodes.id,
        data: {
          id: sourceExplorerNodes.id,
          name: sql<string>`
            CASE
              WHEN ${sourceExplorerNodes.sourceId} IS NOT NULL
              THEN COALESCE(${sources.name}, ${sourceExplorerNodes.name})
              ELSE ${sourceExplorerNodes.name}
            END
          `.as('name'),
          sourceId: sourceExplorerNodes.sourceId,
          sourceType: sourceExplorerNodes.sourceType,
          sourceEmbeddingStatus: agentsToSources.status,
          fractionalIndex: sourceExplorerNodes.fractionalIndex,
          children: sql<string[]>`
            (SELECT COALESCE(ARRAY_AGG(id), '{}'::text[])
             FROM ${sourceExplorerNodes} child_node
             WHERE child_node.parent_id = ${sourceExplorerNodes.id}
             AND child_node.deleted_at IS NULL)
          `.as('children'),
        },
      })
      .from(sourceExplorerNodes)
      .leftJoin(sources, eq(sourceExplorerNodes.sourceId, sources.id))
      .leftJoin(
        agentsToSources,
        and(
          eq(agentsToSources.agentId, context.agentId),
          eq(agentsToSources.sourceId, sourceExplorerNodes.sourceId),
        ),
      )
      .where(
        and(
          eq(sourceExplorerNodes.organizationId, ctx.organizationId),
          isNull(sourceExplorerNodes.parentId),
          isNull(sourceExplorerNodes.deletedAt),
        ),
      )
      .orderBy(sql`${sourceExplorerNodes.fractionalIndex} COLLATE "C" ASC`)

    return childrenWithData || []
  }

  const childrenWithData = await db
    .select({
      id: sourceExplorerNodes.id,
      data: {
        id: sourceExplorerNodes.id,
        name: sql<string>`
          CASE
            WHEN ${sourceExplorerNodes.sourceId} IS NOT NULL
            THEN COALESCE(${sources.name}, ${sourceExplorerNodes.name})
            ELSE ${sourceExplorerNodes.name}
          END
        `.as('name'),
        sourceId: sourceExplorerNodes.sourceId,
        sourceType: sourceExplorerNodes.sourceType,
        sourceEmbeddingStatus: agentsToSources.status,
        fractionalIndex: sourceExplorerNodes.fractionalIndex,
        children: sql<string[]>`
          (SELECT COALESCE(ARRAY_AGG(id), '{}'::text[])
           FROM ${sourceExplorerNodes} child_node
           WHERE child_node.parent_id = ${sourceExplorerNodes.id}
           AND child_node.deleted_at IS NULL)
        `.as('children'),
      },
    })
    .from(sourceExplorerNodes)
    .leftJoin(sources, eq(sourceExplorerNodes.sourceId, sources.id))
    .leftJoin(
      agentsToSources,
      and(
        eq(agentsToSources.agentId, context.agentId),
        eq(agentsToSources.sourceId, sourceExplorerNodes.sourceId),
      ),
    )
    .where(
      and(
        eq(sourceExplorerNodes.parentId, itemId),
        eq(sourceExplorerNodes.organizationId, ctx.organizationId),
        isNull(sourceExplorerNodes.deletedAt),
      ),
    )
    .orderBy(sql`${sourceExplorerNodes.fractionalIndex} COLLATE "C" ASC`)

  return childrenWithData || []
}
