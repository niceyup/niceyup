import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { modelProviders } from '@workspace/db/schema'
import { z } from 'zod'

export async function deleteModelProvider(app: FastifyTypedInstance) {
  app.register(authenticate).delete(
    '/model-providers/:modelProviderId',
    {
      schema: {
        tags: ['Model Providers'],
        description: 'Delete a model provider',
        operationId: 'deleteModelProvider',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          modelProviderId: z.string(),
        }),
        body: z.object({}),
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

      await db
        .delete(modelProviders)
        .where(eq(modelProviders.id, modelProviderId))

      return reply.status(204).send()
    },
  )
}
