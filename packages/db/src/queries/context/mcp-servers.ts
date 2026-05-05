import type { McpServerType } from '@workspace/core/mcp-servers'
import { and, eq, ilike, or } from 'drizzle-orm'
import { db } from '../../db'
import { connections, mcpServers } from '../../schema'

type ContextListMcpServersParams = {
  organizationId: string
}

type ListMcpServersParams = {
  type?: McpServerType
}

export async function listMcpServers(
  context: ContextListMcpServersParams,
  params: ListMcpServersParams,
) {
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
        eq(mcpServers.organizationId, context.organizationId),
        params.type ? eq(mcpServers.type, params.type) : undefined,
      ),
    )

  return listMcpServers
}

type ContextGetMcpServerParams = {
  organizationId: string
}

type GetMcpServerParams = {
  mcpServerId: string
}

export async function getMcpServer(
  context: ContextGetMcpServerParams,
  params: GetMcpServerParams,
) {
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

type ContextListMcpServerSelectOptionsParams = {
  organizationId: string
}

type ListMcpServerSelectOptionsParams = {
  search: string
}

export async function listMcpServerSelectOptions(
  context: ContextListMcpServerSelectOptionsParams,
  params: ListMcpServerSelectOptionsParams,
) {
  const listMcpServers = await db
    .select({
      id: mcpServers.id,
      name: mcpServers.name,
      type: mcpServers.type,
    })
    .from(mcpServers)
    .where(
      and(
        eq(mcpServers.organizationId, context.organizationId),
        or(
          ilike(mcpServers.name, `%${params.search}%`),
          ilike(mcpServers.type, `%${params.search}%`),
        ),
      ),
    )
    .limit(10)

  return listMcpServers
}
