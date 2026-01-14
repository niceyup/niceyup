import type {
  AIMessageMetadata,
  AIMessagePart,
  AIMessageRole,
  AIMessageStatus,
} from '@workspace/ai/types'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { db } from '../db'
import { messages } from '../schema'

type GetMessageParams = {
  messageId: string
}

export async function getMessage(params: GetMessageParams) {
  const [message] = await db
    .select({
      id: messages.id,
      status: messages.status,
      role: messages.role,
      parts: messages.parts,
      metadata: messages.metadata,
      authorId: messages.authorId,
      parentId: messages.parentId,
    })
    .from(messages)
    .where(and(eq(messages.id, params.messageId), isNull(messages.deletedAt)))
    .limit(1)

  return message || null
}

type UpdateMessageParams = {
  messageId: string
  status?: AIMessageStatus
  parts?: AIMessagePart[]
  metadata?: AIMessageMetadata
}

export async function updateMessage(params: UpdateMessageParams) {
  await db
    .update(messages)
    .set({
      status: params.status,
      parts: params.parts,
      metadata: params.metadata
        ? sql`COALESCE(${messages.metadata}, '{}'::jsonb) || ${JSON.stringify(params.metadata)}::jsonb`
        : undefined,
    })
    .where(and(eq(messages.id, params.messageId), isNull(messages.deletedAt)))
}

type MessageNode = {
  id: string
  status: AIMessageStatus
  role: AIMessageRole
  parts: AIMessagePart[] | null
  metadata: AIMessageMetadata | null
  authorId?: string | null
  parentId?: string | null
  children?: string[]
}

type ListMessageNodesParams = {
  conversationId: string
  targetMessageId: string
  parentNodes?: { limit?: number } | boolean
  childNodes?: boolean
}

export async function listMessageNodes(params: ListMessageNodesParams) {
  const listMessageParents = !params.parentNodes
    ? []
    : await listMessageParentNodes({
        targetMessageId: params.targetMessageId,
        conversationId: params.conversationId,
        limit:
          typeof params.parentNodes === 'object'
            ? params.parentNodes.limit
            : undefined,
      })

  const listMessageChildren =
    params.childNodes === false
      ? []
      : await listMessageChildNodes({
          targetMessageId: params.targetMessageId,
          conversationId: params.conversationId,
        })

  return [...listMessageParents, ...listMessageChildren]
}

type ListMessageParentNodesParams = {
  conversationId: string
  targetMessageId: string
  limit?: number
}

export async function listMessageParentNodes(
  params: ListMessageParentNodesParams,
) {
  const result = await db.execute<MessageNode>(sql`
    WITH RECURSIVE message_parent_nodes AS (
      -- Base case: start with target message
      SELECT id, status, role, parts, metadata, author_id, parent_id, created_at,
             (SELECT COALESCE(ARRAY_AGG(child_node.id), '{}'::text[])
              FROM ${messages} child_node
              WHERE child_node.parent_id = ${messages}.id
              AND child_node.deleted_at IS NULL) as children
      FROM ${messages}
      WHERE id = ${params.targetMessageId}
        AND conversation_id = ${params.conversationId}
        AND deleted_at IS NULL
      
      UNION ALL
      
      -- Recursive case: get parents of each message in the previous level
      SELECT parent_node.id, parent_node.status, parent_node.role, parent_node.parts, parent_node.metadata, parent_node.author_id, parent_node.parent_id, parent_node.created_at,
             (SELECT COALESCE(ARRAY_AGG(child_node.id), '{}'::text[])
              FROM ${messages} child_node
              WHERE child_node.parent_id = parent_node.id
              AND child_node.deleted_at IS NULL) as children
      FROM ${messages} parent_node
      INNER JOIN message_parent_nodes mpn ON parent_node.id = mpn.parent_id
      WHERE parent_node.deleted_at IS NULL
    )
    SELECT id, status, role, parts, metadata, author_id as "authorId", parent_id as "parentId", children, created_at as "createdAt"
    FROM message_parent_nodes
    WHERE id != ${params.targetMessageId}  -- Exclude the target message itself
    ORDER BY created_at ASC
    ${params.limit ? sql`LIMIT ${params.limit}` : sql``}
  `)

  return result.rows
}

type ListMessageChildNodesParams = {
  conversationId: string
  targetMessageId: string
}

export async function listMessageChildNodes(
  params: ListMessageChildNodesParams,
) {
  const result = await db.execute<MessageNode>(sql`
    WITH RECURSIVE message_child_nodes AS (
      -- Base case: start with target message
      SELECT id, status, role, parts, metadata, author_id, parent_id, created_at,
             (SELECT COALESCE(ARRAY_AGG(child_node.id ORDER BY child_node.created_at ASC), '{}'::text[])
              FROM ${messages} child_node
              WHERE child_node.parent_id = ${messages}.id
              AND child_node.deleted_at IS NULL) as children
      FROM ${messages}
      WHERE id = ${params.targetMessageId}
        AND conversation_id = ${params.conversationId}
        AND deleted_at IS NULL
      
      UNION ALL
      
      -- Recursive case: get only the first (oldest) child_node of each message, but keep all children in the array
      SELECT child_node.id, child_node.status, child_node.role, child_node.parts, child_node.metadata, child_node.author_id, child_node.parent_id, child_node.created_at,
             (SELECT COALESCE(ARRAY_AGG(grandchild_node.id ORDER BY grandchild_node.created_at ASC), '{}'::text[])
              FROM ${messages} grandchild_node
              WHERE grandchild_node.parent_id = child_node.id
              AND grandchild_node.deleted_at IS NULL) as children
      FROM ${messages} child_node
      INNER JOIN message_child_nodes mcn ON child_node.id = (
        SELECT first_child_node.id
        FROM ${messages} first_child_node
        WHERE first_child_node.parent_id = mcn.id
        AND first_child_node.deleted_at IS NULL
        ORDER BY first_child_node.created_at ASC
        LIMIT 1
      )
      WHERE child_node.deleted_at IS NULL
    )
    SELECT id, status, role, parts, metadata, author_id as "authorId", parent_id as "parentId", children, created_at as "createdAt"
    FROM message_child_nodes
    ORDER BY created_at ASC
  `)

  return result.rows
}
