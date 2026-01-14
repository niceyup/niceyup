import type { ProviderCredentials } from '@workspace/core/providers'
import { db, generateId } from '@workspace/db'
import {
  agents,
  members,
  modelSettings,
  organizations,
  providers,
  teamMembers,
  teams,
} from '@workspace/db/schema'

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
        name: 'Default Team',
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

    await tx
      .insert(providers)
      .values({
        provider: 'openai',
        credentials: {
          apiKey: process.env.OPENAI_API_KEY,
        } as ProviderCredentials,
        organizationId: member.organizationId,
      })
      .returning({
        id: providers.id,
      })

    const [languageModelSettings] = await tx
      .insert(modelSettings)
      .values({
        provider: 'openai',
        model: 'gpt-4.1',
        type: 'language-model',
      })
      .returning({
        id: modelSettings.id,
      })

    const [embeddingModelSettings] = await tx
      .insert(modelSettings)
      .values({
        provider: 'openai',
        model: 'text-embedding-3-small',
        type: 'embedding-model',
      })
      .returning({
        id: modelSettings.id,
      })

    await tx.insert(agents).values({
      name: 'Assistant',
      slug: `assistant-${generateId()}`,
      description: 'Your AI-Powered Assistant for Work and Life',
      tags: ['OpenAI', 'Anthropic', 'Google'],

      languageModelSettingsId: languageModelSettings?.id,
      embeddingModelSettingsId: embeddingModelSettings?.id,

      systemMessage: `
You are a helpful assistant that answers questions using only your knowledge base.

CRITICAL RULES:
1. ALWAYS call retrieve_sources tool first for every question
2. Answer ONLY with information from the tool
3. Respond in the SAME LANGUAGE as the user's question
4. If tool returns nothing, say you don't have that information (in user's language)

Never use external knowledge. Never answer without calling the tool.
`,
      promptMessages: [],
      suggestions: [
        'What are the latest trends in AI?',
        'How does machine learning work?',
        'Explain quantum computing',
        'Best practices for React development',
        'Tell me about TypeScript benefits',
        'How to optimize database queries?',
        'What is the difference between SQL and NoSQL?',
        'Explain cloud computing basics',
      ],

      organizationId: member.organizationId,
    })
  })
}
