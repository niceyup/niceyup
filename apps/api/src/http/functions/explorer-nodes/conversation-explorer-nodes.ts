import type { ConversationVisibility } from '@workspace/core/conversations'
import type { DBTransaction } from '@workspace/db'
import { db } from '@workspace/db'
import { and, eq, isNull, sql } from '@workspace/db/orm'
import { conversationExplorerNodes } from '@workspace/db/schema'
import { generateKeyBetween } from 'jittered-fractional-indexing'

type GetConversationExplorerNodeFolderParams = {
  id: string
  visibility: ConversationVisibility
  agentId: string
  ownerUserId?: string | null
  ownerTeamId?: string | null
}

export async function getConversationExplorerNodeFolder(
  params: GetConversationExplorerNodeFolderParams,
) {
  if (
    (params.visibility !== 'team' && !params.ownerUserId) ||
    (params.visibility === 'team' && !params.ownerTeamId)
  ) {
    return null
  }

  const ownerTypeCondition = params.ownerTeamId
    ? eq(conversationExplorerNodes.ownerTeamId, params.ownerTeamId)
    : eq(conversationExplorerNodes.ownerUserId, params.ownerUserId as string)

  const [folderExplorerNode] = await db
    .select({
      id: conversationExplorerNodes.id,
      parentId: conversationExplorerNodes.parentId,
    })
    .from(conversationExplorerNodes)
    .where(
      and(
        eq(conversationExplorerNodes.id, params.id),
        eq(conversationExplorerNodes.visibility, params.visibility),
        eq(conversationExplorerNodes.agentId, params.agentId),
        isNull(conversationExplorerNodes.conversationId),
        ownerTypeCondition,
        isNull(conversationExplorerNodes.deletedAt),
      ),
    )
    .limit(1)

  return folderExplorerNode || null
}

type CreateConversationExplorerNodeItemParams = {
  visibility: ConversationVisibility
  agentId: string
  parentId?: string | null
  conversationId: string
  ownerUserId?: string | null
  ownerTeamId?: string | null
}

export async function createConversationExplorerNodeItem(
  params: CreateConversationExplorerNodeItemParams,
  tx?: DBTransaction,
) {
  if (
    (params.visibility !== 'team' && !params.ownerUserId) ||
    (params.visibility === 'team' && !params.ownerTeamId)
  ) {
    return null
  }

  const explorerOwnerTypeCondition = params.ownerTeamId
    ? eq(conversationExplorerNodes.ownerTeamId, params.ownerTeamId)
    : eq(conversationExplorerNodes.ownerUserId, params.ownerUserId as string)

  const [firstSibling] = await (tx ?? db)
    .select({
      fractionalIndex: conversationExplorerNodes.fractionalIndex,
    })
    .from(conversationExplorerNodes)
    .where(
      and(
        !params.parentId || params.parentId === 'root'
          ? isNull(conversationExplorerNodes.parentId)
          : eq(conversationExplorerNodes.parentId, params.parentId),
        eq(conversationExplorerNodes.visibility, params.visibility),
        eq(conversationExplorerNodes.agentId, params.agentId),
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

  const ownerTypeCondition = params.ownerTeamId
    ? { ownerTeamId: params.ownerTeamId }
    : { ownerUserId: params.ownerUserId }

  const [explorerNode] = await (tx ?? db)
    .insert(conversationExplorerNodes)
    .values({
      visibility: params.visibility,
      agentId: params.agentId,
      conversationId: params.conversationId,
      parentId:
        !params.parentId || params.parentId === 'root' ? null : params.parentId,
      fractionalIndex,
      ...ownerTypeCondition,
    })
    .returning({
      id: conversationExplorerNodes.id,
      parentId: conversationExplorerNodes.parentId,
    })

  return explorerNode || null
}
