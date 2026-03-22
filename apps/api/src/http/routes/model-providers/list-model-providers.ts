import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import {
  modelProviderSchema,
  modelProviderSettingsSchema,
} from '@workspace/core/model-providers'
import { queries } from '@workspace/db/queries'
import { z } from 'zod'

export async function listModelProviders(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/model-providers',
    {
      schema: {
        tags: ['Model Providers'],
        description: 'Get all model providers',
        operationId: 'listModelProviders',
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          provider: modelProviderSchema.optional(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              modelProviders: z.array(
                z.object({
                  id: z.string(),
                  name: z.string(),
                  provider: modelProviderSchema,
                  settings: modelProviderSettingsSchema.nullable(),
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

      const modelProviders = await queries.context.listModelProviders(context, {
        provider,
      })

      return { modelProviders }
    },
  )
}
