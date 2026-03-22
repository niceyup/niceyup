import type { McpServerType } from '@workspace/core/mcp-servers'
import { and, eq } from 'drizzle-orm'
import { db } from '../../db'
import { connections, mcpServers, modelProviders } from '../../schema'

type ContextListMcpServersParams = {
  organizationId: string
  isAdmin: boolean
}

type ListMcpServersParams = {
  type?: McpServerType
}

export async function listMcpServers(
  context: ContextListMcpServersParams,
  params: ListMcpServersParams,
) {
  if (!context.isAdmin) {
    return []
  }

  const listMcpServers = await db
    .select({
      id: mcpServers.id,
      name: mcpServers.name,
      type: mcpServers.type,
      url: mcpServers.url,
      headers: mcpServers.headers,
    })
    .from(mcpServers)
    .where(
      and(
        eq(modelProviders.organizationId, context.organizationId),
        params.type ? eq(mcpServers.type, params.type) : undefined,
      ),
    )

  return listMcpServers
}

type ContextGetMcpServerParams = {
  userId: string
  organizationId: string
  isAdmin: boolean
}

type GetMcpServerParams = {
  mcpServerId: string
}

export async function getMcpServer(
  context: ContextGetMcpServerParams,
  params: GetMcpServerParams,
) {
  if (!context.isAdmin) {
    return null
  }

  const [mcpServer] = await db
    .select({
      id: mcpServers.id,
      name: mcpServers.name,
      type: mcpServers.type,
      url: mcpServers.url,
      headers: mcpServers.headers,
      credentials: mcpServers.credentials,
      connection: {
        id: connections.id,
        app: connections.app,
        name: connections.name,
      },
    })
    .from(mcpServers)
    .leftJoin(connections, eq(mcpServers.connectionId, connections.id))
    .where(
      and(
        eq(mcpServers.id, params.mcpServerId),
        eq(mcpServers.organizationId, context.organizationId),
      ),
    )
    .limit(1)

  return mcpServer || null
}
