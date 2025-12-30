import { db, generateId } from '@workspace/db'
import {
  agents,
  members,
  models,
  organizations,
  providers,
  teamMembers,
  teams,
} from '@workspace/db/schema'
import type { ProviderPayload } from '@workspace/db/types'

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

    const [provider] = await tx
      .insert(providers)
      .values({
        app: 'openai',
        name: 'OpenAI',
        payload: {
          apiKey: process.env.OPENAI_API_KEY,
        } as ProviderPayload,
        organizationId: member.organizationId,
      })
      .returning({
        id: providers.id,
      })

    const [languageModel] = await tx
      .insert(models)
      .values({
        type: 'language_model',
        model: 'openai/gpt-4.1',
        options: {
          maxOutputTokens: 64000,
          temperature: 0.7,
          topP: 1,
          frequencyPenalty: 0,
          presencePenalty: 0,
        },
        providerId: provider?.id,
      })
      .returning({
        id: models.id,
      })

    await tx.insert(agents).values({
      name: 'Assistant',
      slug: `assistant-${generateId()}`,
      description: 'Your AI-Powered Assistant for Work and Life',
      tags: ['OpenAI', 'Anthropic', 'Google'],

      languageModelId: languageModel?.id,

      systemMessage:
        'You are a helpful assistant. Check your knowledge base before answering any questions.\nOnly respond to questions using information from tool calls.\nIf no relevant information is found in the tool calls, respond, "Sorry, I don\'t know."',
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
