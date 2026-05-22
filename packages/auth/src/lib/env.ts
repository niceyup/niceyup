import { env as cacheEnv } from '@workspace/cache/env'
import { env as databaseEnv } from '@workspace/db/env'
import { env as emailEnv } from '@workspace/email/env'
import { env as baseEnv, createEnv, z } from '@workspace/env'

const oauthEnv = createEnv({
  server: {
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
  },
  runtimeEnv: {
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.CI,
})

export const env = createEnv({
  extends: [oauthEnv, baseEnv, cacheEnv, databaseEnv, emailEnv],
  server: {
    BETTER_AUTH_SECRET: z.string(),
  },
  runtimeEnv: {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.CI,
})
