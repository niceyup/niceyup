import { env as authEnv } from '@workspace/auth/env'
import { env as cacheEnv } from '@workspace/cache/env'
import { env as databaseEnv } from '@workspace/db/env'
import { env as engineEnv } from '@workspace/engine/env'
import { env as baseEnv, createEnv, z } from '@workspace/env'
import { env as storageEnv } from '@workspace/storage/env'

export const env = createEnv({
  extends: [baseEnv, authEnv, cacheEnv, databaseEnv, engineEnv, storageEnv],
  server: {
    PORT: z.coerce.number().optional(),

    UPLOAD_SECRET: z.string(),
  },
  runtimeEnv: {
    PORT: process.env.PORT,

    UPLOAD_SECRET: process.env.UPLOAD_SECRET,
  },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.CI,
})
