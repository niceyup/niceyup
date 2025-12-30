import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { getMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { queries } from '@workspace/db/queries'
import { providerAppSchema } from '@workspace/engine/providers'
import { z } from 'zod'

export async function getProvider(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/providers/:providerId',
    {
      schema: {
        tags: ['Providers'],
        description: 'Get provider details',
        operationId: 'getProvider',
        params: z.object({
          providerId: z.string(),
        }),
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              provider: z.object({
                id: z.string(),
                app: providerAppSchema,
                name: z.string(),
                updatedAt: z.date(),
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

      const { providerId } = request.params

      const { organizationId, organizationSlug } = request.query

      const { context } = await getMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const provider = await queries.context.getProvider(context, {
        providerId,
      })

      if (!provider) {
        throw new BadRequestError({
          code: 'PROVIDER_NOT_FOUND',
          message: 'Provider not found or you don’t have access',
        })
      }

      return { provider }
    },
  )
}
