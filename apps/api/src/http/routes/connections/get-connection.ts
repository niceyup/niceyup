import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import { getOrganizationIdentifier } from '@/lib/utils'
import type { FastifyTypedInstance } from '@/types/fastify'
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
                app: z.string(),
                name: z.string(),
                payload: z.record(z.string(), z.any()).nullable(),
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

      const context = {
        userId,
        ...getOrganizationIdentifier({
          organizationId,
          organizationSlug,
        }),
      }

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
