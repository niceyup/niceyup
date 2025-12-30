import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { env } from '@/lib/env'
import type { FastifyTypedInstance } from '@/types/fastify'
import { queries } from '@workspace/db/queries'
import { storage } from '@workspace/storage'
import { z } from 'zod'

const DEFAULT_EXPIRES = 5 * 60 // 5 minutes

export async function getFile(app: FastifyTypedInstance) {
  app.get(
    '/files/:fileId',
    {
      schema: {
        tags: ['Files'],
        description: 'Get a file',
        operationId: 'getFile',
        params: z.object({
          fileId: z.string(),
        }),
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          expires: z.number().optional().default(DEFAULT_EXPIRES),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              file: z.object({
                id: z.string(),
                fileName: z.string(),
                fileMimeType: z.string(),
                fileSize: z.number(),
                filePath: z.string(),
                bucket: z.enum(['default', 'engine']),
                scope: z.enum(['public', 'conversations', 'sources']),
                url: z.string(),
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

      const { fileId } = request.params

      const { organizationId, organizationSlug, expires } = request.query

      const orgId =
        organizationId ||
        (await queries.getOrganizationIdBySlug({ organizationSlug }))

      const context = {
        userId,
        organizationId: orgId,
        isAdmin: orgId
          ? await queries.context.isOrganizationMemberAdmin({
              userId,
              organizationId: orgId,
            })
          : false,
      }

      const file = await queries.context.getFile(context, {
        fileId,
      })

      if (!file) {
        throw new BadRequestError({
          code: 'FILE_NOT_FOUND',
          message: 'File not found or you don’t have access',
        })
      }

      let url: string

      if (file.bucket === 'engine') {
        url = await storage.signedUrl({
          bucket: env.S3_ENGINE_BUCKET,
          key: file.filePath,
          expires,
        })
      } else {
        url = new URL(file.filePath, env.STORAGE_URL).toString()
      }

      return { file: { ...file, url } }
    },
  )
}
