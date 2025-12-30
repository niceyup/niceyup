import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { getMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import { env } from '@/lib/env'
import type { FastifyTypedInstance } from '@/types/fastify'
import { db } from '@workspace/db'
import { and, eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import {
  databaseSources,
  fileSources,
  files,
  sourceExplorerNodes,
  sources,
} from '@workspace/db/schema'
import { storage } from '@workspace/storage'
import { vectorStore } from '@workspace/vector-store'
import { z } from 'zod'

export async function deleteSource(app: FastifyTypedInstance) {
  app.register(authenticate).delete(
    '/sources/:sourceId',
    {
      schema: {
        tags: ['Sources'],
        description: 'Delete a source',
        operationId: 'deleteSource',
        params: z.object({
          sourceId: z.string(),
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

      const { sourceId } = request.params

      const { organizationId, organizationSlug, destroy } = request.body

      const { context } = await getMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const source = await queries.context.getSource(context, {
        sourceId,
      })

      if (!source) {
        throw new BadRequestError({
          code: 'SOURCE_NOT_FOUND',
          message: 'Source not found or you don’t have access',
        })
      }

      let _file = null

      switch (source.type) {
        case 'file':
          const [fileSource] = await db
            .select()
            .from(fileSources)
            .where(eq(fileSources.sourceId, sourceId))
            .limit(1)

          if (fileSource?.fileId) {
            const [file] = await db
              .select()
              .from(files)
              .where(eq(files.id, fileSource.fileId))
              .limit(1)

            if (file) {
              _file = file
            }
          }
          break
        case 'database':
          const [databaseSource] = await db
            .select()
            .from(databaseSources)
            .where(eq(databaseSources.sourceId, sourceId))
            .limit(1)

          if (databaseSource?.fileId) {
            const [file] = await db
              .select()
              .from(files)
              .where(eq(files.id, databaseSource.fileId))
              .limit(1)

            if (file) {
              _file = file
            }
          }
          break
      }

      await db.transaction(async (tx) => {
        if (destroy) {
          await tx
            .delete(sourceExplorerNodes)
            .where(
              and(
                eq(sourceExplorerNodes.sourceId, sourceId),
                eq(sourceExplorerNodes.organizationId, context.organizationId),
              ),
            )

          await tx
            .delete(sources)
            .where(
              and(
                eq(sources.id, sourceId),
                eq(sources.organizationId, context.organizationId),
              ),
            )

          if (_file) {
            await tx.delete(files).where(eq(files.id, _file.id))
          }
        } else {
          await tx
            .update(sourceExplorerNodes)
            .set({ deletedAt: new Date() })
            .where(
              and(
                eq(sourceExplorerNodes.sourceId, sourceId),
                eq(sourceExplorerNodes.organizationId, context.organizationId),
              ),
            )

          await tx
            .update(sources)
            .set({ deletedAt: new Date() })
            .where(
              and(
                eq(sources.id, sourceId),
                eq(sources.organizationId, context.organizationId),
              ),
            )
        }
      })

      await Promise.all([
        vectorStore.delete({
          namespace: context.organizationId,
          sourceId,
        }),

        destroy &&
          _file &&
          storage.delete({ bucket: env.S3_ENGINE_BUCKET, key: _file.filePath }),

        destroy &&
          source.type === 'database' &&
          storage.deleteDirectory({
            bucket: env.S3_ENGINE_BUCKET,
            path: `/sources/${sourceId}/`,
          }),
      ])

      return reply.status(204).send()
    },
  )
}
