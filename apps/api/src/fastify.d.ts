import 'fastify'
import type { Context, WithAuthContext } from '@workspace/auth/context'

declare module 'fastify' {
  export interface FastifyRequest {
    ctx: Context<WithAuthContext>
    ctxParams: {
      organizationId?: string | null
      organizationSlug?: string | null
      teamId?: string | null
      agentId?: string | null
      agentSlug?: string | null
    }
  }
}
