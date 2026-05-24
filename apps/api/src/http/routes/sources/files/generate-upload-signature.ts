import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { generateSignatureForUpload } from '@/http/functions/upload-file-to-storage'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import { sourceFileTypeSchema } from '@workspace/core/sources'
import { z } from 'zod'

export async function generateUploadSignatureSource(app: FastifyTypedInstance) {
  app.register(authenticate).post(
    '/sources/files/signature',
    {
      schema: {
        tags: ['Sources'],
        description: 'Generate upload signature for source',
        operationId: 'generateUploadSignatureSource',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        body: z.object({
          fileType: sourceFileTypeSchema.default('unstructured'),
          explorerNode: z
            .object({
              folderId: z.string().nullish(),
            })
            .optional(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              signature: z.string(),
            })
            .describe('Success'),
        }),
      },
    },
    async (request) => {
      const { user, organization } = await resolveAuthOrganizationContext(
        request.ctx,
        {
          membership: { role: 'admin' },
          params: request.ctxParams,
        },
      )

      const { fileType, explorerNode } = request.body

      const signature = generateSignatureForUpload({
        key: 'files:sources',
        payload: {
          data: {
            bucket: 'private',
            scope: 'sources',
            metadata: {
              sentByUserId: user?.id,
              // NOTE: sourceId — set in upload-files after inserting the sources.
            },
            referenceId: organization.id,
          },
          fileType,
          explorerNode,
        },
        expires: 24 * 60 * 60, // 24 hours
      })

      return { signature }
    },
  )
}
