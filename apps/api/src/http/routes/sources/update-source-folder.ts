import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import { db } from '@workspace/db'
import { and, eq, isNull } from '@workspace/db/orm'
import { sourceExplorerNodes } from '@workspace/db/schema'
import { z } from 'zod'

export async function updateSourceFolder(app: FastifyTypedInstance) {
  app.register(authenticate).patch(
    '/sources/folders/:folderId',
    {
      schema: {
        tags: ['Sources'],
        description: 'Update a source folder',
        operationId: 'updateSourceFolder',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          folderId: z.string(),
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

      const { folderId } = request.params

      const { name } = request.body

      const [folderExplorerNode] = await db
        .select({
          id: sourceExplorerNodes.id,
        })
        .from(sourceExplorerNodes)
        .where(
          and(
            isNull(sourceExplorerNodes.sourceId),
            eq(sourceExplorerNodes.id, folderId),
            eq(sourceExplorerNodes.organizationId, organization.id),
            isNull(sourceExplorerNodes.deletedAt),
          ),
        )
        .limit(1)

      if (!folderExplorerNode) {
        throw new BadRequestError({
          code: 'FOLDER_NOT_FOUND',
          message: 'Folder not found or you don’t have access',
        })
      }

      await db
        .update(sourceExplorerNodes)
        .set({
          name,
        })
        .where(eq(sourceExplorerNodes.id, folderId))

      return reply.status(204).send()
    },
  )
}
