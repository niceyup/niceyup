import type { ConnectionApp } from '@workspace/core/connections'
import { and, eq } from 'drizzle-orm'
import { db } from '../../db'
import { connections } from '../../schema'

type ContextListConnectionsParams = {
  organizationId: string
  isAdmin: boolean
}

type ListConnectionsParams = {
  app?: ConnectionApp
}

export async function listConnections(
  context: ContextListConnectionsParams,
  params: ListConnectionsParams,
) {
  if (!context.isAdmin) {
    return []
  }

  const listConnections = await db
    .select({
      id: connections.id,
      app: connections.app,
      name: connections.name,
      credentials: connections.credentials,
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
  userId: string
  organizationId: string
  isAdmin: boolean
}

type GetConnectionParams = {
  connectionId: string
}

export async function getConnection(
  context: ContextGetConnectionParams,
  params: GetConnectionParams,
) {
  if (!context.isAdmin) {
    return null
  }

  const [connection] = await db
    .select({
      id: connections.id,
      app: connections.app,
      name: connections.name,
      credentials: connections.credentials,
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
