import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { providerSchema, validateProvider } from '@workspace/core/providers'
import { db } from '@workspace/db'
import { providers } from '@workspace/db/schema'
import { z } from 'zod'

export async function createProvider(app: FastifyTypedInstance) {
  app.register(authenticate).post(
    '/providers',
    {
      schema: {
        tags: ['Providers'],
        description: 'Create a new provider',
        operationId: 'createProvider',
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          provider: providerSchema,
          credentials: z.record(z.string(), z.unknown()).nullish(),
        }),
        response: withDefaultErrorResponses({
          201: z
            .object({
              providerId: z.string(),
            })
            .describe('Success'),
        }),
      },
    },
    async (request, reply) => {
      const {
        user: { id: userId },
      } = request.authSession

      const { organizationId, organizationSlug, provider, credentials } =
        request.body

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const validatedData = validateProvider({ provider, credentials })

      const [createdProvider] = await db
        .insert(providers)
        .values({
          ...validatedData,
          organizationId: context.organizationId,
        })
        .returning({
          id: providers.id,
        })

      if (!createdProvider) {
        throw new BadRequestError({
          code: 'PROVIDER_NOT_CREATED',
          message: 'Provider not created',
        })
      }

      return reply.status(201).send({
        providerId: createdProvider.id,
      })
    },
  )
}
