import { SECURE_COOKIE_PREFIX } from 'better-auth/cookies'
import { env } from './env'

export type Role = 'owner' | 'admin' | 'member'

export const ALLOWED_ROLES = {
  owner: ['owner'],
  admin: ['owner', 'admin'],
  member: ['owner', 'admin', 'member'],
} as const satisfies Record<Role, [Role, ...Role[]]>

export const COOKIE_PREFIX = 'auth' as const

export const ENABLE_SECURE_COOKIES = env.APP_ENV === 'production'

export const COOKIE_SESSION_TOKEN_NAME =
  `${ENABLE_SECURE_COOKIES ? SECURE_COOKIE_PREFIX : ''}${COOKIE_PREFIX}.session_token` as const
