import { AbortTaskRunError, schemaTask } from '@trigger.dev/sdk'
import { db } from '@workspace/db'
import { and, eq } from '@workspace/db/orm'
import { connections, databaseSources, files } from '@workspace/db/schema'
import { z } from 'zod'
import { python } from '../python'

export const getDbSchemaTask = schemaTask({
  id: 'get-db-schema',
  schema: z.object({
    sourceId: z.string(),
  }),
  run: async (payload) => {
    const [databaseSource] = await db
      .select()
      .from(databaseSources)
      .where(and(eq(databaseSources.sourceId, payload.sourceId)))
      .limit(1)

    if (!databaseSource) {
      throw new AbortTaskRunError('Database source not found')
    }

    switch (databaseSource.dialect) {
      case 'postgresql':
      case 'mysql':
        if (!databaseSource.connectionId) {
          throw new AbortTaskRunError(
            'Connection not found for database source',
          )
        }

        const [connection] = await db
          .select()
          .from(connections)
          .where(eq(connections.id, databaseSource.connectionId))
          .limit(1)

        if (!connection) {
          throw new AbortTaskRunError('Connection not found')
        }

        if (connection.app !== 'postgresql' && connection.app !== 'mysql') {
          throw new AbortTaskRunError('Connection app not supported')
        }

        type DatabaseConnectionPayload = {
          host: string
          port: string
          user: string
          password: string
          database: string
          schema?: string
        }

        return await python.getDbSchema(
          { dialect: databaseSource.dialect },
          {
            envVars: connection.payload as DatabaseConnectionPayload,
          },
        )

      case 'sqlite':
        if (!databaseSource.fileId) {
          throw new AbortTaskRunError('File not found for database source')
        }

        const [file] = await db
          .select()
          .from(files)
          .where(eq(files.id, databaseSource.fileId))
          .limit(1)

        if (!file) {
          throw new AbortTaskRunError('File not found')
        }

        return await python.getDbSchema({
          dialect: databaseSource.dialect,
          file_path: file.filePath,
        })

      default:
        throw new AbortTaskRunError('Unsupported dialect')
    }
  },
})
