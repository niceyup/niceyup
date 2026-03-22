import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import {
  modelProviderSchema,
  modelProviderSettingsSchema,
  validateModelProvider,
} from '@workspace/core/model-providers'
import { db } from '@workspace/db'
import { modelProviders } from '@workspace/db/schema'
import { z } from 'zod'

export async function createModelProvider(app: FastifyTypedInstance) {
  app.register(authenticate).post(
    '/model-providers',
    {
      schema: {
        tags: ['Model Providers'],
        description: 'Create a new model provider',
        operationId: 'createModelProvider',
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          name: z.string(),
          provider: modelProviderSchema,
          settings: modelProviderSettingsSchema.nullish(),
          credentials: z.record(z.string(), z.unknown()).nullish(),
        }),
        response: withDefaultErrorResponses({
          201: z
            .object({
              modelProviderId: z.string(),
            })
            .describe('Success'),
        }),
      },
    },
    async (request, reply) => {
      const {
        user: { id: userId },
      } = request.authSession

      const {
        organizationId,
        organizationSlug,
        name,
        provider,
        settings,
        credentials,
      } = request.body

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const validatedData = validateModelProvider({
        provider,
        settings,
        credentials,
      })

      const [createdModelProvider] = await db
        .insert(modelProviders)
        .values({
          name,
          ...validatedData,
          organizationId: context.organizationId,
        })
        .returning({
          id: modelProviders.id,
        })

      if (!createdModelProvider) {
        throw new BadRequestError({
          code: 'MODEL_PROVIDER_NOT_CREATED',
          message: 'Model provider not created',
        })
      }

      return reply.status(201).send({
        modelProviderId: createdModelProvider.id,
      })
    },
  )
}
