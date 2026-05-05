import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import {
  modelProviderSchema,
  modelProviderSettingsSchema,
  validateModelProvider,
} from '@workspace/core/model-providers'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { modelProviders } from '@workspace/db/schema'
import { z } from 'zod'

export async function updateModelProvider(app: FastifyTypedInstance) {
  app.register(authenticate).patch(
    '/model-providers/:modelProviderId',
    {
      schema: {
        tags: ['Model Providers'],
        description: 'Update a model provider',
        operationId: 'updateModelProvider',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          modelProviderId: z.string(),
        }),
        body: z.object({
          name: z.string().optional(),
          provider: modelProviderSchema.optional(),
          settings: modelProviderSettingsSchema.nullish(),
          credentials: z.record(z.string(), z.unknown()).nullish(),
        }),
        response: withDefaultErrorResponses({
          204: z.null().describe('Success'),
        }),
      },
    },
    async (request, reply) => {
      const { organization } = await resolveAuthOrganizationContext(
        request.ctx,
        {
          membership: { role: 'admin' },
          params: request.ctxParams,
        },
      )

      const { modelProviderId } = request.params

      const { name, provider, settings, credentials } = request.body

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

      let validatedData = undefined

      if (
        provider !== undefined ||
        settings !== undefined ||
        credentials !== undefined
      ) {
        validatedData = validateModelProvider({
          provider: provider ?? modelProvider.provider,
          settings,
          credentials,
        })
      }

      await db
        .update(modelProviders)
        .set({
          name,
          ...validatedData,
        })
        .where(eq(modelProviders.id, modelProviderId))

      return reply.status(204).send()
    },
  )
}
