import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { getMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { providers } from '@workspace/db/schema'
import { z } from 'zod'

export async function deleteProvider(app: FastifyTypedInstance) {
  app.register(authenticate).delete(
    '/providers/:providerId',
    {
      schema: {
        tags: ['Providers'],
        description: 'Delete a provider',
        operationId: 'deleteProvider',
        params: z.object({
          providerId: z.string(),
        }),
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
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

      const { providerId } = request.params

      const { organizationId, organizationSlug } = request.body

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

      await db.delete(providers).where(eq(providers.id, providerId))

      return reply.status(204).send()
    },
  )
}
