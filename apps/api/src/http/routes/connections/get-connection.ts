import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { connectionAppSchema } from '@workspace/core/connections'
import { queries } from '@workspace/db/queries'
import { z } from 'zod'

export async function getConnection(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/connections/:connectionId',
    {
      schema: {
        tags: ['Connections'],
        description: 'Get connection details',
        operationId: 'getConnection',
        params: z.object({
          connectionId: z.string(),
        }),
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              connection: z.object({
                id: z.string(),
                app: connectionAppSchema,
                name: z.string(),
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

      const { connectionId } = request.params

      const { organizationId, organizationSlug } = request.query

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const connection = await queries.context.getConnection(context, {
        connectionId,
      })

      if (!connection) {
        throw new BadRequestError({
          code: 'CONNECTION_NOT_FOUND',
          message: 'Connection not found or you don’t have access',
        })
      }

      return { connection }
    },
  )
}
