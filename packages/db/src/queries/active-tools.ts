import { db } from '@workspace/db'
import { and, eq, isNull } from '@workspace/db/orm'
import { activeTools } from '@workspace/db/schema'

type ListActiveToolsParams = {
  agentConfigurationId: string
  mcpServerId?: string | null
}

export async function listActiveTools(params: ListActiveToolsParams) {
  const listActiveTools = await db
    .select({
      id: activeTools.id,
      name: activeTools.name,
      tool: activeTools.tool,
      type: activeTools.type,
      arguments: activeTools.arguments,
      mcpServerId: activeTools.mcpServerId,
    })
    .from(activeTools)
    .where(
      and(
        eq(activeTools.agentConfigurationId, params.agentConfigurationId),
        params.mcpServerId
          ? eq(activeTools.mcpServerId, params.mcpServerId)
          : params.mcpServerId === null
            ? isNull(activeTools.mcpServerId)
            : undefined,
      ),
    )

  return listActiveTools
}
