import { schemaTask } from '@trigger.dev/sdk'
import { db } from '@workspace/db'
import { and, eq } from '@workspace/db/orm'
import { connections, databaseSources, files } from '@workspace/db/schema'
import { z } from 'zod'
import { InvalidArgumentError } from '../../erros'
import { python } from '../python'

export type GetDbSchemaTask = typeof getDbSchemaTask

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
      throw new InvalidArgumentError({
        code: 'DATABASE_SOURCE_NOT_FOUND',
        message: 'Database source not found',
      })
    }

    switch (databaseSource.dialect) {
      case 'postgresql':
      case 'mysql':
        if (!databaseSource.connectionId) {
          throw new InvalidArgumentError({
            code: 'CONNECTION_NOT_FOUND_FOR_DATABASE_SOURCE',
            message: 'Connection not found for database source',
          })
        }

        const [connection] = await db
          .select()
          .from(connections)
          .where(eq(connections.id, databaseSource.connectionId))
          .limit(1)

        if (!connection) {
          throw new InvalidArgumentError({
            code: 'CONNECTION_NOT_FOUND',
            message: 'Connection not found',
          })
        }

        if (connection.app !== 'postgresql' && connection.app !== 'mysql') {
          throw new InvalidArgumentError({
            code: 'CONNECTION_APP_NOT_SUPPORTED',
            message: 'Connection app not supported',
          })
        }

        type DatabaseConnectionCredentials = {
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
            envVars: connection.credentials as DatabaseConnectionCredentials,
          },
        )

      case 'sqlite':
        if (!databaseSource.fileId) {
          throw new InvalidArgumentError({
            code: 'FILE_NOT_FOUND_FOR_DATABASE_SOURCE',
            message: 'File not found for database source',
          })
        }

        const [file] = await db
          .select()
          .from(files)
          .where(eq(files.id, databaseSource.fileId))
          .limit(1)

        if (!file) {
          throw new InvalidArgumentError({
            code: 'FILE_NOT_FOUND',
            message: 'File not found',
          })
        }

        return await python.getDbSchema({
          dialect: databaseSource.dialect,
          file_path: file.filePath,
        })

      default:
        throw new InvalidArgumentError({
          code: 'UNSUPPORTED_DIALECT',
          message: 'Unsupported dialect',
        })
    }
  },
  catchError: async ({ error }) => {
    if (error instanceof InvalidArgumentError) {
      return { skipRetrying: true }
    }
  },
})
