import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { sources } from '@workspace/db/schema'
import { z } from 'zod'

export async function updateSource(app: FastifyTypedInstance) {
  app.register(authenticate).patch(
    '/sources/:sourceId',
    {
      schema: {
        tags: ['Sources'],
        description: 'Update a source',
        operationId: 'updateSource',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          sourceId: z.string(),
        }),
        body: z.object({
          name: z.string(),
        }),
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

      const { sourceId } = request.params

      const { name } = request.body

      const source = await queries.ctx.getSource(
        { organizationId: organization.id },
        { sourceId },
      )

      if (!source) {
        throw new BadRequestError({
          code: 'SOURCE_NOT_FOUND',
          message: 'Source not found or you don’t have access',
        })
      }

      await db
        .update(sources)
        .set({
          name,
        })
        .where(eq(sources.id, sourceId))

      return reply.status(204).send()
    },
  )
}
