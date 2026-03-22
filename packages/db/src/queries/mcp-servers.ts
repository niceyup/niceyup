import { db } from '@workspace/db'
import { and, eq, exists } from '@workspace/db/orm'
import { activeTools, mcpServers } from '@workspace/db/schema'

type ListMcpServersByAgentConfigurationIdParams = {
  agentConfigurationId: string
}

export async function listMcpServersByAgentConfigurationId(
  params: ListMcpServersByAgentConfigurationIdParams,
) {
  const listMcpServers = await db
    .select({
      id: mcpServers.id,
      name: mcpServers.name,
      type: mcpServers.type,
      url: mcpServers.url,
      headers: mcpServers.headers,
      credentials: mcpServers.credentials,
    })
    .from(mcpServers)
    .where(
      exists(
        db
          .select({ id: activeTools.id })
          .from(activeTools)
          .where(
            and(
              eq(activeTools.mcpServerId, mcpServers.id),
              eq(activeTools.agentConfigurationId, params.agentConfigurationId),
            ),
          ),
      ),
    )

  return listMcpServers
}
