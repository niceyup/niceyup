import { and, asc, eq } from 'drizzle-orm'
import { db } from '../../db'
import { agents, members, organizations } from '../../schema'

type ContextListAgentsParams = {
  userId: string
  organizationId: string
}

export async function listAgents(context: ContextListAgentsParams) {
  const selectQuery = db
    .select({
      id: agents.id,
      name: agents.name,
      slug: agents.slug,
      logo: agents.logo,
      description: agents.description,
      tags: agents.tags,
    })
    .from(agents)

  const listAgents = await selectQuery
    .innerJoin(organizations, eq(agents.organizationId, organizations.id))
    .innerJoin(members, eq(organizations.id, members.organizationId))
    .where(
      and(
        eq(agents.organizationId, context.organizationId),
        eq(members.userId, context.userId),
      ),
    )
    .orderBy(asc(agents.createdAt))

  return listAgents
}

type ContextGetAgentParams = {
  userId: string
  organizationId: string
}

type GetAgentParams = {
  agentId: string
}

export async function getAgent(
  context: ContextGetAgentParams,
  params: GetAgentParams,
) {
  const selectQuery = db
    .select({
      id: agents.id,
      name: agents.name,
      slug: agents.slug,
      logo: agents.logo,
      description: agents.description,
      tags: agents.tags,
    })
    .from(agents)

  const [agent] = await selectQuery
    .innerJoin(organizations, eq(agents.organizationId, organizations.id))
    .innerJoin(members, eq(organizations.id, members.organizationId))
    .where(
      and(
        eq(agents.id, params.agentId),
        eq(agents.organizationId, context.organizationId),
        eq(members.userId, context.userId),
      ),
    )
    .limit(1)

  return agent || null
}
