import { BadRequestError } from '@/http/errors/bad-request-error'
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

export async function getModelProvider(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/model-providers/:modelProviderId',
    {
      schema: {
        tags: ['Model Providers'],
        description: 'Get model provider details',
        operationId: 'getModelProvider',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          modelProviderId: z.string(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              modelProvider: z.object({
                id: z.string(),
                name: z.string(),
                provider: modelProviderSchema,
                settings: modelProviderSettingsSchema.nullable(),
                credentials: z.record(z.string(), z.unknown()).nullable(),
              }),
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

      const { modelProviderId } = request.params

      const modelProvider = await queries.ctx.getModelProvider(
        { organizationId: organization.id },
        { modelProviderId },
      )

      if (!modelProvider) {
        throw new BadRequestError({
          code: 'MODEL_PROVIDER_NOT_FOUND',
          message: 'Model provider not found or you don’t have access',
        })
      }

      return { modelProvider }
    },
  )
}
