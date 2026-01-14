import { python } from '@trigger.dev/python'
import type { DatabaseSourceTableMetadata } from '@workspace/core/sources'
import { env } from '../../lib/env'
import { tmpDir } from '../../lib/utils'
import { pyArgs, pyPath, pyStreamingResult } from '../lib/python'

type GetDbSchemaArgs = {
  dialect?: string
  file_path?: string
}

type GetDbSchemaEnvVars = {
  host?: string
  port?: string
  user?: string
  password?: string
  database?: string
  schema?: string
}

type GetDbSchemaResult = DatabaseSourceTableMetadata[]

export async function getDbSchema(
  args: GetDbSchemaArgs,
  { envVars }: { envVars?: GetDbSchemaEnvVars } = {},
): Promise<GetDbSchemaResult> {
  const streamingResult = python.stream.runScript(
    pyPath('get_db_schema'),
    pyArgs(args),
    {
      env: {
        APP_ENV: env.APP_ENV,
        TMP_DIR: tmpDir(),
        DATABASE_CLIENT_HOST: envVars?.host,
        DATABASE_CLIENT_PORT: envVars?.port,
        DATABASE_CLIENT_USER: envVars?.user,
        DATABASE_CLIENT_PASSWORD: envVars?.password,
        DATABASE_CLIENT_DATABASE: envVars?.database,
        DATABASE_CLIENT_SCHEMA: envVars?.schema,
      },
    },
  )

  const result = await pyStreamingResult<GetDbSchemaResult>(streamingResult)

  return result
}
