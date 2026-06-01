import { eq } from 'drizzle-orm'
import { db } from '../db'
import { agents } from '../schema'

type GetAgentParams = {
  agentId: string
}

export async function getAgent(params: GetAgentParams) {
  const [agent] = await db
    .select({
      id: agents.id,
      name: agents.name,
      slug: agents.slug,
      logo: agents.logo,
      description: agents.description,
      tags: agents.tags,
      organizationId: agents.organizationId,
    })
    .from(agents)
    .where(eq(agents.id, params.agentId))
    .limit(1)

  return agent || null
}
