import type { ConversationVisibility } from '@workspace/core/conversations'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { db } from '../../db'
import { conversations, participants, teamMembers } from '../../schema'
import { getAgent } from './agents'

type ContextListConversationsParams = {
  userId: string
  organizationId: string
  teamId?: string | null
}

type ListConversationsParams = {
  agentId: string
  visibility: ConversationVisibility
}

export async function listConversations(
  context: ContextListConversationsParams,
  params: ListConversationsParams,
) {
  const checkAccessToAgent = await getAgent(context, {
    agentId: params.agentId,
  })

  if (!checkAccessToAgent) {
    return []
  }

  const selectQuery = db
    .select({
      id: conversations.id,
      title: conversations.title,
      visibility: sql<ConversationVisibility>`
        CASE
          WHEN ${conversations.teamId} IS NOT NULL THEN 'team'
          WHEN ${conversations.createdByUserId} = ${context.userId} THEN 'private'
          ELSE 'shared'
        END
    `.as('visibility'),
      teamId: conversations.teamId,
      createdByUserId: conversations.createdByUserId,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)

  if (params.visibility === 'private') {
    const listConversations = await selectQuery
      .where(
        and(
          eq(conversations.createdByUserId, context.userId),
          eq(conversations.agentId, params.agentId),
          isNull(conversations.teamId),
          isNull(conversations.deletedAt),
        ),
      )
      .orderBy(desc(conversations.updatedAt))

    return listConversations
  }

  if (params.visibility === 'shared') {
    const listConversations = await selectQuery
      .innerJoin(
        participants,
        eq(conversations.id, participants.conversationId),
      )
      .where(
        and(
          eq(participants.userId, context.userId),
          eq(conversations.agentId, params.agentId),
          isNull(conversations.deletedAt),
        ),
      )
      .orderBy(desc(conversations.updatedAt))

    return listConversations
  }

  if (params.visibility === 'team' && context.teamId) {
    const listConversations = await selectQuery
      .where(
        and(
          eq(conversations.teamId, context.teamId),
          eq(conversations.agentId, params.agentId),
          isNull(conversations.deletedAt),
        ),
      )
      .orderBy(desc(conversations.updatedAt))

    return listConversations
  }

  return []
}

type ContextGetConversationParams = {
  userId: string
  organizationId: string
}

type GetConversationParams = {
  agentId: string
  conversationId: string
}

export async function getConversation(
  context: ContextGetConversationParams,
  params: GetConversationParams,
) {
  const checkAccessToAgent = await getAgent(context, {
    agentId: params.agentId,
  })

  if (!checkAccessToAgent) {
    return null
  }

  const [conversation] = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      visibility: sql<ConversationVisibility>`
        CASE
          WHEN ${conversations.teamId} IS NOT NULL THEN 'team'
          WHEN ${conversations.createdByUserId} = ${context.userId} THEN 'private'
          ELSE 'shared'
        END
      `.as('visibility'),
      teamId: conversations.teamId,
      createdByUserId: conversations.createdByUserId,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.agentId, params.agentId),
        eq(conversations.id, params.conversationId),
        isNull(conversations.deletedAt),
      ),
    )
    .limit(1)

  if (conversation?.visibility === 'private') {
    return conversation
  }

  if (conversation?.visibility === 'shared') {
    const [checkAccessToConversation] = await db
      .select({
        userId: participants.userId,
      })
      .from(participants)
      .where(
        and(
          eq(participants.conversationId, conversation.id),
          eq(participants.userId, context.userId),
        ),
      )
      .limit(1)

    if (checkAccessToConversation) {
      return conversation
    }
  }

  if (conversation?.visibility === 'team' && conversation.teamId) {
    const [checkAccessToTeam] = await db
      .select({
        userId: teamMembers.userId,
      })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, conversation.teamId),
          eq(teamMembers.userId, context.userId),
        ),
      )
      .limit(1)

    if (checkAccessToTeam) {
      return conversation
    }
  }

  return null
}
