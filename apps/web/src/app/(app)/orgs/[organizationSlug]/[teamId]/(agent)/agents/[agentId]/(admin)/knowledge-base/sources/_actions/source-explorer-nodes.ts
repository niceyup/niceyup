'use server'

import { getMembership } from '@/actions/membership'
import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import { db } from '@workspace/db'
import { aliasedTable, and, eq, isNull, sql } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import {
  indexedSources,
  knowledgeBases,
  sourceExplorerNodes,
  sourceOperations,
  sources,
} from '@workspace/db/schema'

type ContextSourceExplorerNodeParams = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  agentId: AgentParams['agentId']
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

  const agent = await queries.ctx.getAgent(
    { organizationId: membership.organizationId },
    { agentId: context.agentId },
  )

  if (!agent) {
    return null
  }

  return { membership, agent }
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

  const indexedSourceOperations = aliasedTable(
    sourceOperations,
    'indexed_source_operations',
  )

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
      type: sourceExplorerNodes.type,
      fractionalIndex: sourceExplorerNodes.fractionalIndex,
      flag: sourceExplorerNodes.flag,
      readOnly: sourceExplorerNodes.readOnly,
      sourceId: sourceExplorerNodes.sourceId,
      source: {
        type: sources.type,
        status: sources.status,
        contentUpdatedAt: sources.contentUpdatedAt,
        operationType: sourceOperations.type,
        operationStatus: sourceOperations.status,
      },
      indexedSource: {
        id: indexedSources.id,
        status: indexedSources.status,
        indexedAt: indexedSources.indexedAt,
        operationType: indexedSourceOperations.type,
        operationStatus: indexedSourceOperations.status,
      },
      children: sql<string[]>`
          (SELECT COALESCE(ARRAY_AGG(id), '{}'::text[])
           FROM ${sourceExplorerNodes} child_node
           WHERE child_node.parent_id = ${sourceExplorerNodes.id}
           AND child_node.deleted_at IS NULL)
        `.as('children'),
    })
    .from(sourceExplorerNodes)
    .leftJoin(sources, eq(sources.id, sourceExplorerNodes.sourceId))
    .leftJoin(knowledgeBases, eq(knowledgeBases.agentId, ctx.agent.id))
    .leftJoin(
      indexedSources,
      and(
        eq(indexedSources.knowledgeBaseId, knowledgeBases.id),
        eq(indexedSources.sourceId, sourceExplorerNodes.sourceId),
      ),
    )
    .leftJoin(sourceOperations, eq(sourceOperations.sourceId, sources.id))
    .leftJoin(
      indexedSourceOperations,
      eq(indexedSourceOperations.indexedSourceId, indexedSources.id),
    )
    .where(
      and(
        eq(sourceExplorerNodes.id, params.itemId),
        eq(sourceExplorerNodes.organizationId, ctx.membership.organizationId),
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
  params: GetChildrenWithDataInSourceExplorerNodeParams,
) {
  const ctx = await resolveSourceExplorerNodeContext(context)

  if (!ctx) {
    return []
  }

  const indexedSourceOperations = aliasedTable(
    sourceOperations,
    'indexed_source_operations',
  )

  const childrenWithData = await db
    .select({
      id: sourceExplorerNodes.id,
      name: sql<string>`
            CASE
              WHEN ${sourceExplorerNodes.sourceId} IS NOT NULL
              THEN COALESCE(${sources.name}, ${sourceExplorerNodes.name})
              ELSE ${sourceExplorerNodes.name}
            END
          `.as('name'),
      type: sourceExplorerNodes.type,
      fractionalIndex: sourceExplorerNodes.fractionalIndex,
      flag: sourceExplorerNodes.flag,
      readOnly: sourceExplorerNodes.readOnly,
      sourceId: sourceExplorerNodes.sourceId,
      source: {
        type: sources.type,
        status: sources.status,
        contentUpdatedAt: sources.contentUpdatedAt,
        operationType: sourceOperations.type,
        operationStatus: sourceOperations.status,
      },
      indexedSource: {
        id: indexedSources.id,
        status: indexedSources.status,
        indexedAt: indexedSources.indexedAt,
        operationType: indexedSourceOperations.type,
        operationStatus: indexedSourceOperations.status,
      },
      children: sql<string[]>`
            (SELECT COALESCE(ARRAY_AGG(id), '{}'::text[])
             FROM ${sourceExplorerNodes} child_node
             WHERE child_node.parent_id = ${sourceExplorerNodes.id}
             AND child_node.deleted_at IS NULL)
          `.as('children'),
    })
    .from(sourceExplorerNodes)
    .leftJoin(sources, eq(sources.id, sourceExplorerNodes.sourceId))
    .leftJoin(knowledgeBases, eq(knowledgeBases.agentId, ctx.agent.id))
    .leftJoin(
      indexedSources,
      and(
        eq(indexedSources.knowledgeBaseId, knowledgeBases.id),
        eq(indexedSources.sourceId, sourceExplorerNodes.sourceId),
      ),
    )
    .leftJoin(sourceOperations, eq(sourceOperations.sourceId, sources.id))
    .leftJoin(
      indexedSourceOperations,
      eq(indexedSourceOperations.indexedSourceId, indexedSources.id),
    )
    .where(
      and(
        params.itemId === 'root'
          ? isNull(sourceExplorerNodes.parentId)
          : eq(sourceExplorerNodes.parentId, params.itemId),
        eq(sourceExplorerNodes.organizationId, ctx.membership.organizationId),
        isNull(sourceExplorerNodes.deletedAt),
      ),
    )
    .orderBy(sql`${sourceExplorerNodes.fractionalIndex} COLLATE "C" ASC`)

  return childrenWithData.map((child) => ({ id: child.id, data: child }))
}
