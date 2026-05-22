import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { env } from '@/lib/env'
import type { FastifyTypedInstance } from '@/types/fastify'
import {
  resolveAuthContext,
  resolveOrganizationContext,
} from '@workspace/auth/context'
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
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          fileId: z.string(),
        }),
        querystring: z.object({
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
      const { subject, user } = await resolveAuthContext(request.ctx)

      let _organization = undefined

      if (
        subject === 'organization' ||
        request.ctxParams.organizationId ||
        request.ctxParams.organizationSlug
      ) {
        const { organization } = await resolveOrganizationContext(
          request.ctx,
          request.ctxParams,
        )

        _organization = organization
      }

      const { fileId } = request.params

      const { expires } = request.query

      const file = await queries.getFile({
        fileId,
        referenceId: _organization?.id ?? user?.id,
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
          bucket: file.bucket,
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
