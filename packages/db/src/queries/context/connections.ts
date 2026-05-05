import type { ConnectionApp } from '@workspace/core/connections'
import { and, eq, ilike, inArray, or } from 'drizzle-orm'
import { db } from '../../db'
import { connections } from '../../schema'

type ContextListConnectionsParams = {
  organizationId: string
}

type ListConnectionsParams = {
  app?: ConnectionApp
}

export async function listConnections(
  context: ContextListConnectionsParams,
  params: ListConnectionsParams,
) {
  const listConnections = await db
    .select({
      id: connections.id,
      name: connections.name,
      app: connections.app,
      authentication: connections.authentication,
      settings: connections.settings,
    })
    .from(connections)
    .where(
      and(
        eq(connections.organizationId, context.organizationId),
        params.app ? eq(connections.app, params.app) : undefined,
      ),
    )

  return listConnections
}

type ContextGetConnectionParams = {
  organizationId: string
}

type GetConnectionParams = {
  connectionId: string
}

export async function getConnection(
  context: ContextGetConnectionParams,
  params: GetConnectionParams,
) {
  const [connection] = await db
    .select({
      id: connections.id,
      name: connections.name,
      app: connections.app,
      authentication: connections.authentication,
      settings: connections.settings,
      credentials: connections.credentials,
      tokens: connections.tokens,
    })
    .from(connections)
    .where(
      and(
        eq(connections.id, params.connectionId),
        eq(connections.organizationId, context.organizationId),
      ),
    )
    .limit(1)

  return connection || null
}

type ContextListConnectionSelectOptionsParams = {
  organizationId: string
}

type ListConnectionSelectOptionsParams = {
  apps?: ConnectionApp[]
  search: string
}

export async function listConnectionSelectOptions(
  context: ContextListConnectionSelectOptionsParams,
  params: ListConnectionSelectOptionsParams,
) {
  const listConnections = await db
    .select({
      id: connections.id,
      name: connections.name,
      app: connections.app,
      authentication: connections.authentication,
      settings: connections.settings,
    })
    .from(connections)
    .where(
      and(
        eq(connections.organizationId, context.organizationId),
        params.apps ? inArray(connections.app, params.apps) : undefined,
        or(
          ilike(connections.name, `%${params.search}%`),
          ilike(connections.app, `%${params.search}%`),
        ),
      ),
    )
    .limit(10)

  return listConnections
}
