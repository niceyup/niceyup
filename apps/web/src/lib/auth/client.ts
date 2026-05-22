'use client'

import { env } from '@/lib/env'
import { roles } from '@workspace/auth/access'
import { createAuthClient, organizationClient } from '@workspace/auth/client'

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_WEB_URL,
  plugins: [
    organizationClient({
      teams: {
        enabled: true,
      },
      roles,
    }),
  ],
})
