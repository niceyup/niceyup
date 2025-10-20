'use server'

import { authenticatedUser } from '@/lib/auth/server'
import type {
  ConversationExplorerNodeVisibility,
  OrganizationTeamParams,
} from '@/lib/types'
import { db } from '@workspace/db'
import { and, eq, inArray, isNull, sql } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import {
  conversationExplorerNodes,
  conversations,
  conversationsToUsers,
} from '@workspace/db/schema'

type ContextConversationExplorerNodeParams = OrganizationTeamParams & {
  agentId: string
}

async function checkAdminAccess(
  context: { userId: string } & ContextConversationExplorerNodeParams,
) {
  if (context.organizationSlug === 'my-account') {
    return true
  }

  const isAdmin = await queries.context.isOrganizationMemberAdmin(context)

  return isAdmin
}

async function checkAccessToAgent(
  context: { userId: string } & ContextConversationExplorerNodeParams,
) {
  const ctx = {
    userId: context.userId,
    organizationSlug:
      context.organizationSlug !== 'my-account'
        ? context.organizationSlug
        : null,
    teamId: context.teamId !== '~' ? context.teamId : null,
  }

  const agent = await queries.context.getAgent(ctx, {
    agentId: context.agentId,
  })

  return Boolean(agent)
}

type GetItemInConversationExplorerNodeParams = {
  visibility: ConversationExplorerNodeVisibility
  itemId: string
}

export async function getItemInConversationExplorerNode(
  context: ContextConversationExplorerNodeParams,
  { visibility, itemId }: GetItemInConversationExplorerNodeParams,
) {
  if (visibility === 'team' && context.teamId === '~') {
    return null
  }

  const {
    user: { id: userId },
  } = await authenticatedUser()

  if (!(await checkAccessToAgent({ userId, ...context }))) {
    return null
  }

  const ownerTypeCondition =
    visibility === 'team'
      ? eq(conversationExplorerNodes.ownerTeamId, context.teamId)
      : eq(conversationExplorerNodes.ownerUserId, userId)

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
        eq(conversationExplorerNodes.visibility, visibility),
        eq(conversationExplorerNodes.agentId, context.agentId),
        ownerTypeCondition,
        eq(conversationExplorerNodes.id, itemId),
        isNull(conversationExplorerNodes.deletedAt),
      ),
    )
    .limit(1)

  return itemData || null
}

type GetChildrenWithDataInConversationExplorerNodeParams = {
  visibility: ConversationExplorerNodeVisibility
  itemId: string
}

export async function getChildrenWithDataInConversationExplorerNode(
  context: ContextConversationExplorerNodeParams,
  { visibility, itemId }: GetChildrenWithDataInConversationExplorerNodeParams,
) {
  if (visibility === 'team' && context.teamId === '~') {
    return []
  }

  const {
    user: { id: userId },
  } = await authenticatedUser()

  if (!(await checkAccessToAgent({ userId, ...context }))) {
    return []
  }

  const ownerTypeCondition =
    visibility === 'team'
      ? eq(conversationExplorerNodes.ownerTeamId, context.teamId)
      : eq(conversationExplorerNodes.ownerUserId, userId)

  if (itemId === 'root') {
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
          eq(conversationExplorerNodes.visibility, visibility),
          eq(conversationExplorerNodes.agentId, context.agentId),
          ownerTypeCondition,
          isNull(conversationExplorerNodes.parentId),
          isNull(conversationExplorerNodes.deletedAt),
        ),
      )

    return childrenWithData || []
  }

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
        eq(conversationExplorerNodes.visibility, visibility),
        eq(conversationExplorerNodes.agentId, context.agentId),
        ownerTypeCondition,
        eq(conversationExplorerNodes.parentId, itemId),
        isNull(conversationExplorerNodes.deletedAt),
      ),
    )

  return childrenWithData || []
}

type GetParentsInConversationExplorerNodeParams = {
  visibility: ConversationExplorerNodeVisibility
} & (
  | {
      itemId: string
      conversationId?: never
    }
  | {
      itemId?: never
      conversationId: string
    }
)

export async function getParentsInConversationExplorerNode(
  context: ContextConversationExplorerNodeParams,
  {
    visibility,
    itemId,
    conversationId,
  }: GetParentsInConversationExplorerNodeParams,
) {
  if (visibility === 'team' && context.teamId === '~') {
    return []
  }

  const {
    user: { id: userId },
  } = await authenticatedUser()

  if (!(await checkAccessToAgent({ userId, ...context }))) {
    return []
  }

  const itemTypeCondition = conversationId
    ? sql`node.conversation_id = ${conversationId}`
    : sql`node.id = ${itemId}`

  const ownerTypeCondition =
    visibility === 'team'
      ? sql`node.owner_team_id = ${context.teamId}`
      : sql`node.owner_user_id = ${userId}`

  const parents = await db.execute<{
    id: string
    name: string
    parent_id: string | null
    conversation_id: string | null
    deleted_at: string | null
    level: number
  }>(sql`
    WITH RECURSIVE explorer_nodes AS (
      SELECT node.id,
             CASE
               WHEN node.conversation_id IS NOT NULL
               THEN COALESCE(conversation.title, node.name)
               ELSE node.name
             END AS name,
             node.parent_id,
             node.conversation_id,
             node.deleted_at,
             0 AS level
      FROM ${conversationExplorerNodes} node
      LEFT JOIN ${conversations} conversation ON node.conversation_id = conversation.id
      WHERE ${itemTypeCondition}
        AND node.visibility = ${visibility}
        AND node.agent_id = ${context.agentId}
        AND ${ownerTypeCondition}
      UNION ALL
      
      SELECT parent_node.id,
             parent_node.name,
             parent_node.parent_id,
             parent_node.conversation_id,
             parent_node.deleted_at,
             explorer_nodes.level + 1 AS level
      FROM ${conversationExplorerNodes} parent_node
      INNER JOIN explorer_nodes ON parent_node.id = explorer_nodes.parent_id
    )
    SELECT id,
           name,
           parent_id,
           conversation_id,
           deleted_at,
           level
    FROM explorer_nodes
    ORDER BY level DESC
  `)

  return parents.rows
}

type UpdateNameOfItemInConversationExplorerNodeParams = {
  visibility: ConversationExplorerNodeVisibility
  name: string
} & (
  | {
      itemId: string
      conversationId?: never
    }
  | {
      itemId?: never
      conversationId: string
    }
)

export async function updateNameOfItemInConversationExplorerNode(
  context: ContextConversationExplorerNodeParams,
  {
    visibility,
    itemId,
    conversationId,
    name,
  }: UpdateNameOfItemInConversationExplorerNodeParams,
) {
  if (visibility === 'team' && context.teamId === '~') {
    return
  }

  const {
    user: { id: userId },
  } = await authenticatedUser()

  if (!(await checkAccessToAgent({ userId, ...context }))) {
    return
  }

  if (conversationId !== undefined) {
    const ownerTypeCondition =
      visibility === 'team'
        ? eq(conversations.ownerTeamId, context.teamId)
        : eq(conversations.ownerUserId, userId)

    await db
      .update(conversations)
      .set({ title: name })
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.agentId, context.agentId),
          ownerTypeCondition,
          isNull(conversations.deletedAt),
        ),
      )

    return
  }

  const ownerTypeCondition =
    visibility === 'team'
      ? eq(conversationExplorerNodes.ownerTeamId, context.teamId)
      : eq(conversationExplorerNodes.ownerUserId, userId)

  await db
    .update(conversationExplorerNodes)
    .set({ name })
    .where(
      and(
        eq(conversationExplorerNodes.visibility, visibility),
        eq(conversationExplorerNodes.agentId, context.agentId),
        ownerTypeCondition,
        eq(conversationExplorerNodes.id, itemId),
        isNull(conversationExplorerNodes.deletedAt),
      ),
    )
}

type UpdateParentIdOfItemsInConversationExplorerNodeParams = {
  visibility: ConversationExplorerNodeVisibility
  itemIds: string[]
  parentId: string | null
}

export async function updateParentIdOfItemsInConversationExplorerNode(
  context: ContextConversationExplorerNodeParams,
  {
    visibility,
    itemIds,
    parentId,
  }: UpdateParentIdOfItemsInConversationExplorerNodeParams,
) {
  if (visibility === 'team' && context.teamId === '~') {
    return
  }

  const {
    user: { id: userId },
  } = await authenticatedUser()

  if (!(await checkAccessToAgent({ userId, ...context }))) {
    return
  }

  const ownerTypeCondition =
    visibility === 'team'
      ? eq(conversationExplorerNodes.ownerTeamId, context.teamId)
      : eq(conversationExplorerNodes.ownerUserId, userId)

  await db
    .update(conversationExplorerNodes)
    .set({ parentId: parentId === 'root' ? null : parentId })
    .where(
      and(
        eq(conversationExplorerNodes.visibility, visibility),
        eq(conversationExplorerNodes.agentId, context.agentId),
        ownerTypeCondition,
        inArray(conversationExplorerNodes.id, itemIds),
        isNull(conversationExplorerNodes.deletedAt),
      ),
    )
}

type CreateFolderInConversationExplorerNodeParams = {
  visibility: ConversationExplorerNodeVisibility
  parentId: string | null
  name: string
}

export async function createFolderInConversationExplorerNode(
  context: ContextConversationExplorerNodeParams,
  { visibility, parentId, name }: CreateFolderInConversationExplorerNodeParams,
) {
  if (visibility === 'team' && context.teamId === '~') {
    return null
  }

  const {
    user: { id: userId },
  } = await authenticatedUser()

  if (!(await checkAccessToAgent({ userId, ...context }))) {
    return null
  }

  const ownerTypeCondition =
    visibility === 'team'
      ? { ownerTeamId: context.teamId }
      : { ownerUserId: userId }

  const [newFolder] = await db
    .insert(conversationExplorerNodes)
    .values({
      visibility,
      agentId: context.agentId,
      ...ownerTypeCondition,
      parentId: parentId === 'root' ? null : parentId,
      name,
    })
    .returning({
      id: conversationExplorerNodes.id,
    })

  return newFolder || null
}

type DeleteItemInConversationExplorerNodeParams = {
  visibility: ConversationExplorerNodeVisibility
  itemId: string
}

export async function deleteItemInConversationExplorerNode(
  context: ContextConversationExplorerNodeParams,
  { visibility, itemId }: DeleteItemInConversationExplorerNodeParams,
) {
  if (visibility === 'team' && context.teamId === '~') {
    return
  }

  const {
    user: { id: userId },
  } = await authenticatedUser()

  if (!(await checkAccessToAgent({ userId, ...context }))) {
    return
  }

  const ownerTypeCondition =
    visibility === 'team'
      ? sql`owner_team_id = ${context.teamId}`
      : sql`owner_user_id = ${userId}`

  if (visibility === 'shared') {
    await db.transaction(async (tx) => {
      const deletedConversations = await tx.execute<{
        conversation_id: string
      }>(sql`
      WITH RECURSIVE explorer_nodes AS (
        SELECT id, conversation_id
        FROM ${conversationExplorerNodes}
        WHERE id = ${itemId}
          AND visibility = ${visibility}
          AND agent_id = ${context.agentId}
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
      SELECT conversation_id FROM deleted_conversations
    `)

      const leaveConversationIds: string[] = deletedConversations.rows
        .map(({ conversation_id }) => conversation_id)
        .filter(Boolean)

      if (leaveConversationIds.length) {
        await tx
          .delete(conversationsToUsers)
          .where(
            and(
              inArray(
                conversationsToUsers.conversationId,
                leaveConversationIds,
              ),
              eq(conversationsToUsers.userId, userId),
            ),
          )
      }
    })
  } else {
    await db.transaction(async (tx) => {
      const deletedItems = await tx.execute<{ conversation_id: string }>(sql`
        WITH RECURSIVE explorer_nodes AS (
          SELECT id
          FROM ${conversationExplorerNodes}
          WHERE id = ${itemId}
            AND visibility = ${visibility}
            AND agent_id = ${context.agentId}
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
        RETURNING conversation_id
      `)

      const deletedConversationIds: string[] = deletedItems.rows
        .map(({ conversation_id }) => conversation_id)
        .filter(Boolean)

      if (deletedConversationIds.length) {
        await tx
          .update(conversations)
          .set({ deletedAt: new Date() })
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
  visibility: ConversationExplorerNodeVisibility
}

export async function getItemsDeletedInConversationExplorerNode(
  context: ContextConversationExplorerNodeParams,
  { visibility }: GetItemsDeletedInConversationExplorerNodeParams,
) {
  if (visibility === 'team' && context.teamId === '~') {
    return []
  }

  const {
    user: { id: userId },
  } = await authenticatedUser()

  if (!(await checkAccessToAgent({ userId, ...context }))) {
    return []
  }

  const ownerTypeCondition =
    visibility === 'team'
      ? sql`owner_team_id = ${context.teamId}`
      : sql`owner_user_id = ${userId}`

  const deletedItems = await db.execute<{
    id: string
    name: string | null
    conversation_id: string | null
    parent_id: string | null
    deleted_at: Date
  }>(sql`
    SELECT DISTINCT ON (deleted_at)
      node.id,
      CASE
        WHEN node.conversation_id IS NOT NULL THEN COALESCE(conversation.title, node.name)
        ELSE node.name
      END as name,
      node.conversation_id,
      node.parent_id,
      node.deleted_at
    FROM ${conversationExplorerNodes} node
    LEFT JOIN ${conversations} conversation ON node.conversation_id = conversation.id
    WHERE node.agent_id = ${context.agentId}
      AND node.visibility = ${visibility}
      AND ${ownerTypeCondition}
      AND node.deleted_at IS NOT NULL
      AND (node.parent_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM ${conversationExplorerNodes} parent_node
        WHERE parent_node.id = node.parent_id
          AND parent_node.agent_id = ${context.agentId}
          AND parent_node.visibility = ${visibility}
          AND parent_node.deleted_at IS NOT NULL
      ))
    ORDER BY node.deleted_at DESC
  `)

  return deletedItems.rows || []
}

type RestoreItemInConversationExplorerNodeParams = {
  visibility: ConversationExplorerNodeVisibility
  itemId: string
}

export async function restoreItemInConversationExplorerNode(
  context: ContextConversationExplorerNodeParams,
  { visibility, itemId }: RestoreItemInConversationExplorerNodeParams,
) {
  if (visibility === 'team' && context.teamId === '~') {
    return
  }

  const {
    user: { id: userId },
  } = await authenticatedUser()

  if (!(await checkAdminAccess({ userId, ...context }))) {
    return
  }

  if (!(await checkAccessToAgent({ userId, ...context }))) {
    return
  }

  const ownerTypeCondition =
    visibility === 'team'
      ? sql`owner_team_id = ${context.teamId}`
      : sql`owner_user_id = ${userId}`

  await db.execute(sql`
    WITH RECURSIVE explorer_nodes AS (
      SELECT id, conversation_id, deleted_at
      FROM ${conversationExplorerNodes}
      WHERE id = ${itemId}
        AND visibility = ${visibility}
        AND agent_id = ${context.agentId}
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
        AND agent_id = ${context.agentId}
        AND deleted_at IS NOT NULL
    )
  `)
}

type DestroyItemInConversationExplorerNodeParams = {
  visibility: ConversationExplorerNodeVisibility
  itemId: string
}

export async function destroyItemInConversationExplorerNode(
  context: ContextConversationExplorerNodeParams,
  { visibility, itemId }: DestroyItemInConversationExplorerNodeParams,
) {
  if (visibility === 'team' && context.teamId === '~') {
    return
  }

  const {
    user: { id: userId },
  } = await authenticatedUser()

  if (!(await checkAdminAccess({ userId, ...context }))) {
    return
  }

  if (!(await checkAccessToAgent({ userId, ...context }))) {
    return
  }

  const ownerTypeCondition =
    visibility === 'team'
      ? sql`owner_team_id = ${context.teamId}`
      : sql`owner_user_id = ${userId}`

  console.log({
    itemId,
    visibility,
    agentId: context.agentId,
    ...ownerTypeCondition,
  })

  throw new Error('Not implemented')
}

type DestroyAllItemsInConversationExplorerNodeParams = {
  visibility: ConversationExplorerNodeVisibility
}

export async function destroyAllItemsInConversationExplorerNode(
  context: ContextConversationExplorerNodeParams,
  { visibility }: DestroyAllItemsInConversationExplorerNodeParams,
) {
  if (visibility === 'team' && context.teamId === '~') {
    return
  }

  const {
    user: { id: userId },
  } = await authenticatedUser()

  if (!(await checkAdminAccess({ userId, ...context }))) {
    return
  }

  if (!(await checkAccessToAgent({ userId, ...context }))) {
    return
  }

  const ownerTypeCondition =
    visibility === 'team'
      ? sql`owner_team_id = ${context.teamId}`
      : sql`owner_user_id = ${userId}`

  console.log({
    visibility,
    agentId: context.agentId,
    ...ownerTypeCondition,
  })

  throw new Error('Not implemented')
}
