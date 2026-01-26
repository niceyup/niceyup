import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { db } from '@workspace/db'
import { and, count, eq, isNull } from '@workspace/db/orm'
import { sourceExplorerNodes } from '@workspace/db/schema'
import { z } from 'zod'

export async function deleteSourceFolder(app: FastifyTypedInstance) {
  app.register(authenticate).delete(
    '/sources/folders/:folderId',
    {
      schema: {
        tags: ['Sources'],
        description: 'Delete a source folder',
        operationId: 'deleteSourceFolder',
        params: z.object({
          folderId: z.string(),
        }),
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          destroy: z.boolean().optional(),
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

      const { folderId } = request.params

      const { organizationId, organizationSlug, destroy } = request.body

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const [folderExplorerNode] = await db
        .select({
          id: sourceExplorerNodes.id,
        })
        .from(sourceExplorerNodes)
        .where(
          and(
            isNull(sourceExplorerNodes.sourceId),
            eq(sourceExplorerNodes.id, folderId),
            eq(sourceExplorerNodes.organizationId, context.organizationId),
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

      const [childrenCount] = await db
        .select({ count: count() })
        .from(sourceExplorerNodes)
        .where(
          and(
            eq(sourceExplorerNodes.parentId, folderId),
            isNull(sourceExplorerNodes.deletedAt),
          ),
        )

      if (childrenCount?.count) {
        throw new BadRequestError({
          code: 'FOLDER_IS_NOT_EMPTY',
          message: 'Folder is not empty',
        })
      }

      if (destroy) {
        await db
          .delete(sourceExplorerNodes)
          .where(eq(sourceExplorerNodes.id, folderId))
      } else {
        await db
          .update(sourceExplorerNodes)
          .set({ deletedAt: new Date() })
          .where(eq(sourceExplorerNodes.id, folderId))
      }

      return reply.status(204).send()
    },
  )
}
