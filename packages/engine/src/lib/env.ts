import { env as databaseEnv } from '@workspace/db/env'
import { createEnv, z } from '@workspace/env'
import { env as storageEnv } from '@workspace/storage/env'

export const env = createEnv({
  extends: [databaseEnv, storageEnv],
  server: {
    TRIGGER_API_URL: z.url().optional(),
    TRIGGER_PROJECT_REF: z.string(),
    TRIGGER_SECRET_KEY: z.string(),
  },
  runtimeEnv: {
    TRIGGER_API_URL: process.env.TRIGGER_API_URL,
    TRIGGER_PROJECT_REF: process.env.TRIGGER_PROJECT_REF,
    TRIGGER_SECRET_KEY: process.env.TRIGGER_SECRET_KEY,
  },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.CI,
})
