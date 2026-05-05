import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
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
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          connectionId: z.string(),
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

      const { connectionId } = request.params

      const connection = await queries.ctx.getConnection(
        { organizationId: organization.id },
        { connectionId },
      )

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
