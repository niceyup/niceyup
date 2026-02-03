import { db, generateId } from '@workspace/db'
import {
  agents,
  members,
  organizations,
  teamMembers,
  teams,
} from '@workspace/db/schema'
import { env } from './env'

export async function setupDefaultIndividualOrganization(user: {
  id: string
  name: string
}) {
  const [firstName] = user.name.split(' ') as [string]
  const firstNameCapitalized =
    firstName.charAt(0).toUpperCase() + firstName.slice(1)
  const unique = Math.random().toString(36).substring(5)

  return await db.transaction(async (tx) => {
    const [organization] = await tx
      .insert(organizations)
      .values({
        name: `${firstNameCapitalized}\u2018s Individual Org`,
        slug: `${firstNameCapitalized.toLowerCase()}-individual-org-${unique}`,
      })
      .returning({
        id: organizations.id,
      })

    if (!organization) {
      return
    }

    await tx.insert(members).values({
      organizationId: organization.id,
      userId: user.id,
      role: 'owner',
    })

    return organization
  })
}

export async function setupDefaultTeamAndAgent(member: {
  organizationId: string
  userId: string
}) {
  await db.transaction(async (tx) => {
    const [team] = await tx
      .insert(teams)
      .values({
        name:
          env.APP_ENV === 'development' ? 'Development Team' : 'Default Team',
        organizationId: member.organizationId,
      })
      .returning({
        id: teams.id,
      })

    if (!team) {
      return
    }

    await tx.insert(teamMembers).values({
      teamId: team.id,
      userId: member.userId,
    })

    if (env.APP_ENV === 'development') {
      await tx.insert(agents).values({
        name: 'Atlas',
        slug: `atlas-${generateId()}`,
        description: 'AI agent specialized in large-scale system design.',
        tags: ['OpenAI', 'Anthropic', 'Google'],

        systemMessage: `You are a helpful assistant that answers questions using only your knowledge base.

CRITICAL RULES:
1. ALWAYS call retrieve_sources tool first for every question
2. Answer ONLY with information from the tool
3. Respond in the SAME LANGUAGE as the user's question
4. If tool returns nothing, say you don't have that information (in user's language)

Never use external knowledge. Never answer without calling the tool.`,
        promptMessages: [],
        suggestions: [
          'Design a scalable URL shortening service.',
          'How would you design Twitter at scale?',
          'Explain the steps of a system design interview.',
          'Estimate traffic and storage for a large-scale system.',
          'Design a cache strategy for a read-heavy system.',
          'How would you handle database sharding and replication?',
          'Identify bottlenecks in a distributed system.',
          'Compare SQL vs NoSQL for large-scale systems.',
        ],

        organizationId: member.organizationId,
      })
    }
  })
}
