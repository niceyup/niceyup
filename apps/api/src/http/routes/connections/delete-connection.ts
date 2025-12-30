import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { getMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { connections } from '@workspace/db/schema'
import { z } from 'zod'

export async function deleteConnection(app: FastifyTypedInstance) {
  app.register(authenticate).delete(
    '/connections/:connectionId',
    {
      schema: {
        tags: ['Connections'],
        description: 'Delete a connection',
        operationId: 'deleteConnection',
        params: z.object({
          connectionId: z.string(),
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

      const { connectionId } = request.params

      const { organizationId, organizationSlug } = request.body

      const { context } = await getMembershipContext({
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

      await db.delete(connections).where(eq(connections.id, connectionId))

      return reply.status(204).send()
    },
  )
}
