import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { getMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { db } from '@workspace/db'
import { providers } from '@workspace/db/schema'
import { providerAppSchema, providerSchema } from '@workspace/engine/providers'
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
          app: providerAppSchema,
          name: z.string(),
          payload: z.record(z.string(), z.unknown()),
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

      const { organizationId, organizationSlug, app, name, payload } =
        request.body

      const { context } = await getMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const { payload: validatedPayload } = providerSchema.parse({
        app,
        payload,
      })

      const [provider] = await db
        .insert(providers)
        .values({
          app,
          name,
          payload: validatedPayload,
          organizationId: context.organizationId,
        })
        .returning({
          id: providers.id,
        })

      if (!provider) {
        throw new BadRequestError({
          code: 'PROVIDER_NOT_CREATED',
          message: 'Provider not created',
        })
      }

      return reply.status(201).send({
        providerId: provider.id,
      })
    },
  )
}
