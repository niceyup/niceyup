import { and, asc, eq } from 'drizzle-orm'
import { db } from '../../db'
import { agents } from '../../schema'

type ContextListAgentsParams = {
  organizationId: string
}

export async function listAgents(context: ContextListAgentsParams) {
  const listAgents = await db
    .select({
      id: agents.id,
      name: agents.name,
      slug: agents.slug,
      logo: agents.logo,
      description: agents.description,
      tags: agents.tags,
    })
    .from(agents)
    .where(eq(agents.organizationId, context.organizationId))
    .orderBy(asc(agents.createdAt))

  return listAgents
}

type ContextGetAgentParams = {
  organizationId: string
}

type GetAgentParams = {
  agentId: string
}

export async function getAgent(
  context: ContextGetAgentParams,
  params: GetAgentParams,
) {
  const [agent] = await db
    .select({
      id: agents.id,
      name: agents.name,
      slug: agents.slug,
      logo: agents.logo,
      description: agents.description,
      tags: agents.tags,
    })
    .from(agents)
    .where(
      and(
        eq(agents.id, params.agentId),
        eq(agents.organizationId, context.organizationId),
      ),
    )
    .limit(1)

  return agent || null
}
