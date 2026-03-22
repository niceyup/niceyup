import { BadRequestError } from '@/http/errors/bad-request-error'
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

export async function getModelProvider(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/model-providers/:modelProviderId',
    {
      schema: {
        tags: ['Model Providers'],
        description: 'Get model provider details',
        operationId: 'getModelProvider',
        params: z.object({
          modelProviderId: z.string(),
        }),
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
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
      const {
        user: { id: userId },
      } = request.authSession

      const { modelProviderId } = request.params

      const { organizationId, organizationSlug } = request.query

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const modelProvider = await queries.context.getModelProvider(context, {
        modelProviderId,
      })

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
