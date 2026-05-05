import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
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
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        querystring: z.object({
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
      const { organization } = await resolveAuthOrganizationContext(
        request.ctx,
        {
          auth: { subject: 'user' },
          membership: { role: 'admin' },
          params: request.ctxParams,
        },
      )

      const { providers, search } = request.query

      const modelProviders = await queries.ctx.listModelProviderSelectOptions(
        { organizationId: organization.id },
        { providers, search },
      )

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
