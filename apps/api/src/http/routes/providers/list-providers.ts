import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { providerSchema } from '@workspace/core/providers'
import { queries } from '@workspace/db/queries'
import { z } from 'zod'

export async function listProviders(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/providers',
    {
      schema: {
        tags: ['Providers'],
        description: 'Get all providers',
        operationId: 'listProviders',
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          provider: providerSchema.optional(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              providers: z.array(
                z.object({
                  id: z.string(),
                  provider: providerSchema,
                  updatedAt: z.date(),
                }),
              ),
            })
            .describe('Success'),
        }),
      },
    },
    async (request) => {
      const {
        user: { id: userId },
      } = request.authSession

      const { organizationId, organizationSlug, provider } = request.query

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const providers = await queries.context.listProviders(context, {
        provider,
      })

      return { providers }
    },
  )
}
