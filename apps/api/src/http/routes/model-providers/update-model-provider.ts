import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
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
        params: z.object({
          modelProviderId: z.string(),
        }),
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          name: z.string().optional(),
        }),
        response: withDefaultErrorResponses({
          204: z.null().describe('Success'),
        }),
      },
    },
    async (request, reply) => {
      const {
        user: { id: userId },
      } = request.authSession

      const { modelProviderId } = request.params

      const { organizationId, organizationSlug, name } = request.body

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

      await db
        .update(modelProviders)
        .set({
          name,
        })
        .where(eq(modelProviders.id, modelProviderId))

      return reply.status(204).send()
    },
  )
}
