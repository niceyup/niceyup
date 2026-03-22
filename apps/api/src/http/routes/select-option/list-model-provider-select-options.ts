import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { modelProviderSchema } from '@workspace/core/model-providers'
import { queries } from '@workspace/db/queries'
import { z } from 'zod'

const modelProvidersSchema = z.preprocess(
  (v) => (typeof v === 'string' ? v.split(',') : v),
  z.array(modelProviderSchema),
)

export async function listModelProviderSelectOptions(
  app: FastifyTypedInstance,
) {
  app.register(authenticate).get(
    '/select-option/model-providers',
    {
      schema: {
        tags: ['Model Providers'],
        description: 'Get model providers for select options',
        operationId: 'listModelProviderSelectOptions',
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          providers: modelProvidersSchema.optional(),
          search: z.string().max(100).default(''),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              meta: z.object({
                search: z.string(),
                count: z.number(),
              }),
              modelProviders: z.array(
                z.object({
                  id: z.string(),
                  name: z.string(),
                  provider: modelProviderSchema,
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

      const { organizationId, organizationSlug, providers, search } =
        request.query

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const modelProviders =
        await queries.context.listModelProviderSelectOptions(context, {
          providers,
          search,
        })

      return {
        meta: {
          search,
          count: modelProviders.length,
        },
        modelProviders,
      }
    },
  )
}
