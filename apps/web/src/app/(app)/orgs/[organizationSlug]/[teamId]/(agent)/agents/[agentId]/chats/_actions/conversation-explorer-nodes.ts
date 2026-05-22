'use server'

import { getMembership } from '@/actions/membership'
import type {
  AgentParams,
  ConversationVisibility,
  OrganizationTeamParams,
} from '@/lib/types'
import type { ConversationExplorerNodeType } from '@workspace/core/conversations'
import { db } from '@workspace/db'
import { and, eq, inArray, isNull, notInArray, sql } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import {
  conversationExplorerNodes,
  conversations,
  participants,
} from '@workspace/db/schema'
import {
  generateKeyBetween,
  generateNKeysBetween,
} from 'jittered-fractional-indexing'

type ContextConversationExplorerNodeParams = OrganizationTeamParams &
  AgentParams

type ResolveConversationExplorerNodeContextParams = {
  visibility: ConversationVisibility
}

async function resolveConversationExplorerNodeContext(
  context: ContextConversationExplorerNodeParams,
  params: ResolveConversationExplorerNodeContextParams,
) {
  if (params.visibility === 'team' && context.teamId === '~') {
    return null
  }

  const membership = await getMembership({
    organizationSlug: context.organizationSlug,
  })

  if (!membership) {
    return null
  }

  const agent = await queries.ctx.getAgent(
    { organizationId: membership.organizationId },
    { agentId: context.agentId },
  )

  if (!agent) {
    return null
  }

  if (params.visibility === 'team') {
    const team = await queries.ctx.getTeam(
      { organizationId: membership.organizationId },
      { teamId: context.teamId },
    )

    if (!team) {
      return null
    }

    return { membership, agent, visibility: 'team' as const, team }
  }

  return { membership, agent, visibility: params.visibility, team: null }
}

type GetItemInConversationExplorerNodeParams = {
  visibility: ConversationVisibility
  itemId: string
}

export async function getItemInConversationExplorerNode(
  context: ContextConversationExplorerNodeParams,
  params: GetItemInConversationExplorerNodeParams,
) {
  const ctx = await resolveConversationExplorerNodeContext(context, {
    visibility: params.visibility,
  })

  if (!ctx) {
    return null
  }

  const ownerTypeCondition =
    ctx.visibility === 'team'
      ? eq(conversationExplorerNodes.ownerTeamId, ctx.team.id)
      : eq(conversationExplorerNodes.ownerUserId, ctx.membership.userId)

  const [itemData] = await db
    .select({
      id: conversationExplorerNodes.id,
      name: sql<string>`
        CASE
          WHEN ${conversationExplorerNodes.conversationId} IS NOT NULL
          THEN COALESCE(${conversations.title}, ${conversationExplorerNodes.name})
          ELSE ${conversationExplorerNodes.name}
        END
      `.as('name'),
      type: conversationExplorerNodes.type,
      fractionalIndex: conversationExplorerNodes.fractionalIndex,
      conversationId: conversationExplorerNodes.conversationId,
      children: sql<string[]>`
        (SELECT COALESCE(ARRAY_AGG(id), '{}'::text[])
         FROM ${conversationExplorerNodes} child_node
         WHERE child_node.parent_id = ${conversationExplorerNodes.id}
         AND child_node.deleted_at IS NULL)
      `.as('children'),
    })
    .from(conversationExplorerNodes)
    .leftJoin(
      conversations,
      eq(conversationExplorerNodes.conversationId, conversations.id),
    )
    .where(
      and(
        eq(conversationExplorerNodes.visibility, ctx.visibility),
        eq(conversationExplorerNodes.agentId, ctx.agent.id),
        ownerTypeCondition,
        eq(conversationExplorerNodes.id, params.itemId),
        isNull(conversationExplorerNodes.deletedAt),
      ),
    )
    .limit(1)

  return itemData || null
}

type GetChildrenWithDataInConversationExplorerNodeParams = {
  visibility: ConversationVisibility
  itemId: string
}

export async function getChildrenWithDataInConversationExplorerNode(
  context: ContextConversationExplorerNodeParams,
  params: GetChildrenWithDataInConversationExplorerNodeParams,
) {
  const ctx = await resolveConversationExplorerNodeContext(context, {
    visibility: params.visibility,
  })

  if (!ctx) {
    return []
  }

  const ownerTypeCondition =
    ctx.visibility === 'team'
      ? eq(conversationExplorerNodes.ownerTeamId, ctx.team.id)
      : eq(conversationExplorerNodes.ownerUserId, ctx.membership.userId)

  const childrenWithData = await db
    .select({
      id: conversationExplorerNodes.id,
      data: {
        id: conversationExplorerNodes.id,
        name: sql<string>`
          CASE
            WHEN ${conversationExplorerNodes.conversationId} IS NOT NULL
            THEN COALESCE(${conversations.title}, ${conversationExplorerNodes.name})
            ELSE ${conversationExplorerNodes.name}
          END
        `.as('name'),
        type: conversationExplorerNodes.type,
        fractionalIndex: conversationExplorerNodes.fractionalIndex,
        conversationId: conversationExplorerNodes.conversationId,
        children: sql<string[]>`
          (SELECT COALESCE(ARRAY_AGG(id), '{}'::text[])
           FROM ${conversationExplorerNodes} child_node
           WHERE child_node.parent_id = ${conversationExplorerNodes.id}
           AND child_node.deleted_at IS NULL)
        `.as('children'),
      },
    })
    .from(conversationExplorerNodes)
    .leftJoin(
      conversations,
      eq(conversationExplorerNodes.conversationId, conversations.id),
    )
    .where(
      and(
        params.itemId === 'root'
          ? isNull(conversationExplorerNodes.parentId)
          : eq(conversationExplorerNodes.parentId, params.itemId),
        eq(conversationExplorerNodes.visibility, ctx.visibility),
        eq(conversationExplorerNodes.agentId, ctx.agent.id),
        ownerTypeCondition,
        isNull(conversationExplorerNodes.deletedAt),
      ),
    )
    .orderBy(sql`${conversationExplorerNodes.fractionalIndex} COLLATE "C" ASC`)

  return childrenWithData || []
}

type GetParentsInConversationExplorerNodeParams = {
  visibility: ConversationVisibility
} & (
  | {
      type: 'folder'
      folderId: string
      conversationId?: never
    }
  | {
      type: 'conversation'
      folderId?: never
      conversationId: string
    }
)

export async function getParentsInConversationExplorerNode(
  context: ContextConversationExplorerNodeParams,
  params: GetParentsInConversationExplorerNodeParams,
) {
  const ctx = await resolveConversationExplorerNodeContext(context, {
    visibility: params.visibility,
  })

  if (!ctx) {
    return []
  }

  const itemTypeCondition =
    params.type === 'conversation'
      ? sql`node.type = 'conversation' AND node.conversation_id = ${params.conversationId}`
      : sql`node.id = ${params.folderId} AND node.type = 'folder'`

  const ownerTypeCondition =
    ctx.visibility === 'team'
      ? sql`node.owner_team_id = ${ctx.team.id}`
      : sql`node.owner_user_id = ${ctx.membership.userId}`

  const parents = await db.execute<{
    id: string
    name: string
    type: ConversationExplorerNodeType
    parentId: string | null
    conversationId: string | null
    deletedAt: string | null
    level: number
  }>(sql`
    WITH RECURSIVE explorer_nodes AS (
      SELECT node.id,
             CASE
               WHEN node.conversation_id IS NOT NULL
               THEN COALESCE(conversation.title, node.name)
               ELSE node.name
             END AS name,
             node.type,
             node.parent_id,
             node.conversation_id,
             node.deleted_at,
             0 AS level
      FROM ${conversationExplorerNodes} node
      LEFT JOIN ${conversations} conversation ON node.conversation_id = conversation.id
      WHERE ${itemTypeCondition}
        AND node.visibility = ${ctx.visibility}
        AND node.agent_id = ${ctx.agent.id}
        AND ${ownerTypeCondition}
      UNION ALL
      
      SELECT parent_node.id,
             parent_node.name,
             parent_node.type,
             parent_node.parent_id,
             parent_node.conversation_id,
             parent_node.deleted_at,
             explorer_nodes.level + 1 AS level
      FROM ${conversationExplorerNodes} parent_node
      INNER JOIN explorer_nodes ON parent_node.id = explorer_nodes.parent_id
    )
    SELECT id,
           name,
           type,
           parent_id AS "parentId",
           conversation_id AS "conversationId",
           deleted_at AS "deletedAt",
           level
    FROM explorer_nodes
    ORDER BY level DESC
  `)

  return parents.rows
}

type UpdateNameOfItemInConversationExplorerNodeParams = {
  visibility: ConversationVisibility
  name: string
} & (
  | {
      type: 'folder'
      folderId: string
      conversationId?: never
    }
  | {
      type: 'conversation'
      folderId?: never
      conversationId: string
    }
)

export async function updateNameOfItemInConversationExplorerNode(
  context: ContextConversationExplorerNodeParams,
  params: UpdateNameOfItemInConversationExplorerNodeParams,
) {
  const ctx = await resolveConversationExplorerNodeContext(context, {
    visibility: params.visibility,
  })

  if (!ctx) {
    return
  }

  if (params.type === 'conversation') {
    const ownerTypeCondition =
      ctx.visibility === 'team'
        ? eq(conversations.teamId, ctx.team.id)
        : eq(conversations.createdByUserId, ctx.membership.userId)

    await db
      .update(conversations)
      .set({
        title: params.name,
      })
      .where(
        and(
          eq(conversationExplorerNodes.type, 'conversation'),
          eq(conversations.id, params.conversationId),
          eq(conversations.agentId, ctx.agent.id),
          ownerTypeCondition,
          isNull(conversations.deletedAt),
        ),
      )

    return
  }

  const ownerTypeCondition =
    ctx.visibility === 'team'
      ? eq(conversationExplorerNodes.ownerTeamId, ctx.team.id)
      : eq(conversationExplorerNodes.ownerUserId, ctx.membership.userId)

  await db
    .update(conversationExplorerNodes)
    .set({
      name: params.name,
    })
    .where(
      and(
        eq(conversationExplorerNodes.id, params.folderId),
        eq(conversationExplorerNodes.type, 'folder'),
        eq(conversationExplorerNodes.visibility, ctx.visibility),
        eq(conversationExplorerNodes.agentId, ctx.agent.id),
        ownerTypeCondition,
        isNull(conversationExplorerNodes.deletedAt),
      ),
    )
}

type UpdateParentIdOfItemsInConversationExplorerNodeParams = {
  visibility: ConversationVisibility
  itemIds: string[]
  parentId: string | null
  insertionIndex?: number | null
}

export async function updateParentIdOfItemsInConversationExplorerNode(
  context: ContextConversationExplorerNodeParams,
  params: UpdateParentIdOfItemsInConversationExplorerNodeParams,
) {
  const ctx = await resolveConversationExplorerNodeContext(context, {
    visibility: params.visibility,
  })

  if (!ctx) {
    return
  }

  const ownerTypeCondition =
    ctx.visibility === 'team'
      ? eq(conversationExplorerNodes.ownerTeamId, ctx.team.id)
      : eq(conversationExplorerNodes.ownerUserId, ctx.membership.userId)

  const [parent] = params.parentId
    ? await db
        .select({
          id: conversationExplorerNodes.id,
          type: conversationExplorerNodes.type,
        })
        .from(conversationExplorerNodes)
        .where(
          and(
            eq(conversationExplorerNodes.id, params.parentId),
            eq(conversationExplorerNodes.type, 'folder'),
            eq(conversationExplorerNodes.visibility, ctx.visibility),
            eq(conversationExplorerNodes.agentId, ctx.agent.id),
            ownerTypeCondition,
            isNull(conversationExplorerNodes.deletedAt),
          ),
        )
        .limit(1)
    : []

  if (params.parentId && !parent) {
    return
  }

  const siblings = await db
    .select({
      fractionalIndex: conversationExplorerNodes.fractionalIndex,
    })
    .from(conversationExplorerNodes)
    .where(
      and(
        !params.parentId || params.parentId === 'root'
          ? isNull(conversationExplorerNodes.parentId)
          : eq(conversationExplorerNodes.parentId, params.parentId),
        notInArray(conversationExplorerNodes.id, params.itemIds),
        eq(conversationExplorerNodes.visibility, ctx.visibility),
        eq(conversationExplorerNodes.agentId, ctx.agent.id),
        ownerTypeCondition,
        isNull(conversationExplorerNodes.deletedAt),
      ),
    )
    .orderBy(sql`${conversationExplorerNodes.fractionalIndex} COLLATE "C" ASC`)
    .offset(Math.max(0, (params.insertionIndex || 0) - 1))
    .limit(params.insertionIndex ? 2 : 1)

  const previousSibling = params.insertionIndex ? siblings[0] : null
  const nextSibling = params.insertionIndex ? siblings[1] : siblings[0]

  const fractionalIndexes = generateNKeysBetween(
    previousSibling?.fractionalIndex,
    nextSibling?.fractionalIndex,
    params.itemIds.length,
  )

  await db.transaction(
    async (tx) =>
      await Promise.all(
        params.itemIds.map((itemId, index) =>
          tx
            .update(conversationExplorerNodes)
            .set({
              parentId: params.parentId === 'root' ? null : params.parentId,
              fractionalIndex: fractionalIndexes[index] || null,
            })
            .where(
              and(
                eq(conversationExplorerNodes.id, itemId),
                eq(conversationExplorerNodes.visibility, ctx.visibility),
                eq(conversationExplorerNodes.agentId, ctx.agent.id),
                ownerTypeCondition,
                isNull(conversationExplorerNodes.deletedAt),
              ),
            ),
        ),
      ),
  )
}

type CreateFolderInConversationExplorerNodeParams = {
  visibility: ConversationVisibility
  parentId: string | null
  name: string
}

export async function createFolderInConversationExplorerNode(
  context: ContextConversationExplorerNodeParams,
  params: CreateFolderInConversationExplorerNodeParams,
) {
  const ctx = await resolveConversationExplorerNodeContext(context, {
    visibility: params.visibility,
  })

  if (!ctx) {
    return null
  }

  const explorerOwnerTypeCondition =
    ctx.visibility === 'team'
      ? eq(conversationExplorerNodes.ownerTeamId, ctx.team.id)
      : eq(conversationExplorerNodes.ownerUserId, ctx.membership.userId)

  const [firstSibling] = await db
    .select({
      fractionalIndex: conversationExplorerNodes.fractionalIndex,
    })
    .from(conversationExplorerNodes)
    .where(
      and(
        !params.parentId || params.parentId === 'root'
          ? isNull(conversationExplorerNodes.parentId)
          : eq(conversationExplorerNodes.parentId, params.parentId),
        eq(conversationExplorerNodes.visibility, ctx.visibility),
        eq(conversationExplorerNodes.agentId, ctx.agent.id),
        explorerOwnerTypeCondition,
        isNull(conversationExplorerNodes.deletedAt),
      ),
    )
    .orderBy(sql`${conversationExplorerNodes.fractionalIndex} COLLATE "C" ASC`)
    .limit(1)

  const fractionalIndex = generateKeyBetween(
    null,
    firstSibling?.fractionalIndex || null,
  )

  const ownerTypeCondition =
    ctx.visibility === 'team'
      ? { ownerTeamId: ctx.team.id }
      : { ownerUserId: ctx.membership.userId }

  const [newFolder] = await db
    .insert(conversationExplorerNodes)
    .values({
      name: params.name,
      type: 'folder',
      parentId: params.parentId === 'root' ? null : params.parentId,
      fractionalIndex,
      visibility: ctx.visibility,
      agentId: ctx.agent.id,
      ...ownerTypeCondition,
    })
    .returning({
      id: conversationExplorerNodes.id,
    })

  return newFolder || null
}

type DeleteItemInConversationExplorerNodeParams = {
  visibility: ConversationVisibility
  itemId: string
}

export async function deleteItemInConversationExplorerNode(
  context: ContextConversationExplorerNodeParams,
  params: DeleteItemInConversationExplorerNodeParams,
) {
  const ctx = await resolveConversationExplorerNodeContext(context, {
    visibility: params.visibility,
  })

  if (!ctx) {
    return
  }

  const ownerTypeCondition =
    ctx.visibility === 'team'
      ? sql`owner_team_id = ${ctx.team.id}`
      : sql`owner_user_id = ${ctx.membership.userId}`

  if (ctx.visibility === 'shared') {
    await db.transaction(async (tx) => {
      const deletedConversations = await tx.execute<{
        conversationId: string
      }>(sql`
      WITH RECURSIVE explorer_nodes AS (
        SELECT id, conversation_id
        FROM ${conversationExplorerNodes}
        WHERE id = ${params.itemId}
          AND visibility = ${ctx.visibility}
          AND agent_id = ${ctx.agent.id}
          AND ${ownerTypeCondition}
          AND deleted_at IS NULL
        
        UNION ALL
        
        SELECT node.id, node.conversation_id
        FROM ${conversationExplorerNodes} node
        INNER JOIN explorer_nodes parent_node ON node.parent_id = parent_node.id
        WHERE node.deleted_at IS NULL
      ),
      updated_items AS (
        UPDATE ${conversationExplorerNodes}
        SET deleted_at = NOW()
        WHERE EXISTS (
          SELECT 1 FROM explorer_nodes
          WHERE explorer_nodes.id = ${conversationExplorerNodes}.id
            AND explorer_nodes.conversation_id IS NULL
        )
      ),
      deleted_conversations AS (
        DELETE FROM ${conversationExplorerNodes}
        WHERE EXISTS (
          SELECT 1 FROM explorer_nodes
          WHERE explorer_nodes.id = ${conversationExplorerNodes}.id
            AND explorer_nodes.conversation_id IS NOT NULL
        )
        RETURNING conversation_id
      )
      SELECT conversation_id AS "conversationId" FROM deleted_conversations
    `)

      const leaveConversationIds: string[] = deletedConversations.rows
        .map(({ conversationId }) => conversationId)
        .filter(Boolean)

      if (leaveConversationIds.length) {
        await tx
          .delete(participants)
          .where(
            and(
              inArray(participants.conversationId, leaveConversationIds),
              eq(participants.userId, ctx.membership.userId),
            ),
          )
      }
    })
  } else {
    await db.transaction(async (tx) => {
      const deletedItems = await tx.execute<{ conversationId: string }>(sql`
        WITH RECURSIVE explorer_nodes AS (
          SELECT id
          FROM ${conversationExplorerNodes}
          WHERE id = ${params.itemId}
            AND visibility = ${ctx.visibility}
            AND agent_id = ${ctx.agent.id}
            AND ${ownerTypeCondition}
            AND deleted_at IS NULL
          
          UNION ALL
          
          SELECT node.id
          FROM ${conversationExplorerNodes} node
          INNER JOIN explorer_nodes parent_node ON node.parent_id = parent_node.id
          WHERE node.deleted_at IS NULL
        )
        UPDATE ${conversationExplorerNodes}
        SET deleted_at = NOW()
        WHERE EXISTS (
          SELECT 1 FROM explorer_nodes
          WHERE explorer_nodes.id = ${conversationExplorerNodes}.id
        )
        RETURNING conversation_id AS "conversationId"
      `)

      const deletedConversationIds: string[] = deletedItems.rows
        .map(({ conversationId }) => conversationId)
        .filter(Boolean)

      if (deletedConversationIds.length) {
        await tx
          .update(conversations)
          .set({
            deletedAt: new Date(),
          })
          .where(
            and(
              inArray(conversations.id, deletedConversationIds),
              isNull(conversations.deletedAt),
            ),
          )
      }
    })
  }
}

type GetItemsDeletedInConversationExplorerNodeParams = {
  visibility: ConversationVisibility
}

export async function getItemsDeletedInConversationExplorerNode(
  context: ContextConversationExplorerNodeParams,
  params: GetItemsDeletedInConversationExplorerNodeParams,
) {
  const ctx = await resolveConversationExplorerNodeContext(context, {
    visibility: params.visibility,
  })

  if (!ctx) {
    return []
  }

  const ownerTypeCondition =
    ctx.visibility === 'team'
      ? sql`node.owner_team_id = ${ctx.team.id}`
      : sql`node.owner_user_id = ${ctx.membership.userId}`

  const deletedItems = await db.execute<{
    id: string
    name: string | null
    type: ConversationExplorerNodeType
    conversationId: string | null
    parentId: string | null
    deletedAt: Date
  }>(sql`
    SELECT DISTINCT ON (node.deleted_at)
      node.id,
      CASE
        WHEN node.conversation_id IS NOT NULL THEN COALESCE(conversation.title, node.name)
        ELSE node.name
      END as name,
      node.type,
      node.conversation_id AS "conversationId",
      node.parent_id AS "parentId",
      node.deleted_at AS "deletedAt"
    FROM ${conversationExplorerNodes} node
    LEFT JOIN ${conversations} conversation ON node.conversation_id = conversation.id
    WHERE node.agent_id = ${ctx.agent.id}
      AND node.visibility = ${ctx.visibility}
      AND ${ownerTypeCondition}
      AND node.deleted_at IS NOT NULL
      AND (node.parent_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM ${conversationExplorerNodes} parent_node
        WHERE parent_node.id = node.parent_id
          AND parent_node.agent_id = ${ctx.agent.id}
          AND parent_node.visibility = ${ctx.visibility}
          AND parent_node.deleted_at IS NOT NULL
      ))
    ORDER BY node.deleted_at DESC
  `)

  return deletedItems.rows || []
}

type RestoreItemInConversationExplorerNodeParams = {
  visibility: ConversationVisibility
  itemId: string
}

export async function restoreItemInConversationExplorerNode(
  context: ContextConversationExplorerNodeParams,
  params: RestoreItemInConversationExplorerNodeParams,
) {
  const ctx = await resolveConversationExplorerNodeContext(context, {
    visibility: params.visibility,
  })

  if (!ctx) {
    return
  }

  const ownerTypeCondition =
    ctx.visibility === 'team'
      ? sql`owner_team_id = ${ctx.team.id}`
      : sql`owner_user_id = ${ctx.membership.userId}`

  await db.execute(sql`
    WITH RECURSIVE explorer_nodes AS (
      SELECT id, conversation_id, deleted_at
      FROM ${conversationExplorerNodes}
      WHERE id = ${params.itemId}
        AND visibility = ${ctx.visibility}
        AND agent_id = ${ctx.agent.id}
        AND ${ownerTypeCondition}
        AND deleted_at IS NOT NULL
      
      UNION ALL
      
      SELECT node.id, node.conversation_id, node.deleted_at
      FROM ${conversationExplorerNodes} node
      INNER JOIN explorer_nodes parent_node ON node.parent_id = parent_node.id
      WHERE node.deleted_at = explorer_nodes.deleted_at
        AND node.deleted_at IS NOT NULL
    ),
    restored_items AS (
      UPDATE ${conversationExplorerNodes}
      SET deleted_at = NULL
      WHERE EXISTS (
        SELECT 1 FROM explorer_nodes
        WHERE explorer_nodes.id = ${conversationExplorerNodes}.id
      )
    ),
    restored_conversations AS (
      UPDATE ${conversations}
      SET deleted_at = NULL
      WHERE EXISTS (
        SELECT 1 FROM explorer_nodes
        WHERE explorer_nodes.conversation_id = ${conversations}.id
          AND explorer_nodes.conversation_id IS NOT NULL
      )
        AND agent_id = ${ctx.agent.id}
        AND deleted_at IS NOT NULL
    )
  `)
}

type DestroyItemInConversationExplorerNodeParams = {
  visibility: ConversationVisibility
  itemId: string
}

export async function destroyItemInConversationExplorerNode(
  context: ContextConversationExplorerNodeParams,
  params: DestroyItemInConversationExplorerNodeParams,
) {
  const ctx = await resolveConversationExplorerNodeContext(context, {
    visibility: params.visibility,
  })

  if (!ctx || (ctx.visibility === 'team' && !ctx.membership.isAdmin)) {
    return
  }

  const ownerTypeCondition =
    ctx.visibility === 'team'
      ? sql`owner_team_id = ${ctx.team.id}`
      : sql`owner_user_id = ${ctx.membership.userId}`

  throw new Error('Not implemented')
}

type DestroyAllItemsInConversationExplorerNodeParams = {
  visibility: ConversationVisibility
}

export async function destroyAllItemsInConversationExplorerNode(
  context: ContextConversationExplorerNodeParams,
  params: DestroyAllItemsInConversationExplorerNodeParams,
) {
  const ctx = await resolveConversationExplorerNodeContext(context, {
    visibility: params.visibility,
  })

  if (!ctx || (ctx.visibility === 'team' && !ctx.membership.isAdmin)) {
    return
  }

  const ownerTypeCondition =
    ctx.visibility === 'team'
      ? sql`owner_team_id = ${ctx.team.id}`
      : sql`owner_user_id = ${ctx.membership.userId}`

  throw new Error('Not implemented')
}
