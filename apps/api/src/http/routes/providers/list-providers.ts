import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { getMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { queries } from '@workspace/db/queries'
import { providerAppSchema } from '@workspace/engine/providers'
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
          app: providerAppSchema.optional(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              providers: z.array(
                z.object({
                  id: z.string(),
                  app: providerAppSchema,
                  name: z.string(),
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

      const { organizationId, organizationSlug, app } = request.query

      const { context } = await getMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const providers = await queries.context.listProviders(context, {
        app,
      })

      return { providers }
    },
  )
}
