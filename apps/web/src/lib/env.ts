import { env as authEnv } from '@workspace/auth/env'
import { env as cacheEnv } from '@workspace/cache/env'
import { env as databaseEnv } from '@workspace/db/env'
import { env as baseEnv, createEnv, z } from '@workspace/env'
import { env as realtimeEnv } from '@workspace/realtime/env'

export const env = createEnv({
  extends: [baseEnv, authEnv, cacheEnv, databaseEnv, realtimeEnv],
  server: {
    NEXT_CONFIG_OUTPUT: z.enum(['standalone']).optional(),
  },
  shared: {
    NEXT_PUBLIC_WEB_URL: z.string().url(),
    NEXT_PUBLIC_API_URL: z.string().url(),
    NEXT_PUBLIC_STORAGE_URL: z.string().url(),
  },
  runtimeEnv: {
    NEXT_CONFIG_OUTPUT: process.env.NEXT_CONFIG_OUTPUT,

    NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_STORAGE_URL: process.env.NEXT_PUBLIC_STORAGE_URL,
  },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.CI,
})
