import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
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
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        querystring: z.object({
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
      const { organization } = await resolveAuthOrganizationContext(
        request.ctx,
        {
          membership: { role: 'admin' },
          params: request.ctxParams,
        },
      )

      const { provider } = request.query

      const modelProviders = await queries.ctx.listModelProviders(
        { organizationId: organization.id },
        { provider },
      )

      return { modelProviders }
    },
  )
}
