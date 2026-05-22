export type Role = 'owner' | 'billing' | 'admin' | 'member'

export const ALLOWED_ROLES = {
  owner: ['owner'],
  billing: ['owner', 'billing'],
  admin: ['owner', 'billing', 'admin', 'member'],
  member: ['owner', 'billing', 'admin', 'member'],
} as const satisfies Record<Role, [Role, ...Role[]]>

export const COOKIE_PREFIX = 'auth' as const

export const COOKIE_SESSION_TOKEN_NAME =
  `${COOKIE_PREFIX}.session_token` as const
