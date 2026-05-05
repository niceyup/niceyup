import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthContext } from '@workspace/auth/context'
import { z } from 'zod'

export async function getProfile(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/profile',
    {
      schema: {
        tags: ['Profile'],
        description: 'Get authenticated user profile',
        operationId: 'getProfile',
        response: withDefaultErrorResponses({
          200: z
            .object({
              user: z.object({
                id: z.string(),
                name: z.string(),
                email: z.string(),
                emailVerified: z.boolean(),
                image: z.string().nullish(),
              }),
            })
            .describe('Success'),
        }),
      },
    },
    async (request) => {
      const { user } = await resolveAuthContext(request.ctx, {
        subject: 'user',
      })

      return { user }
    },
  )
}
