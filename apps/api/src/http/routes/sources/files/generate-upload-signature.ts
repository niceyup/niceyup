import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { getMembershipContext } from '@/http/functions/membership'
import { generateSignatureForUpload } from '@/http/functions/upload-file-to-storage'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { z } from 'zod'

export async function generateUploadSignatureSource(app: FastifyTypedInstance) {
  app.register(authenticate).post(
    '/sources/files/signature',
    {
      schema: {
        tags: ['Sources'],
        description: 'Generate upload signature for source',
        operationId: 'generateUploadSignatureSource',
        body: z.object({
          organizationId: z.string().nullish(),
          organizationSlug: z.string().optional(),
          sourceType: z.enum(['file', 'database']).default('file'),
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
      const {
        user: { id: userId },
      } = request.authSession

      const { organizationId, organizationSlug, sourceType, explorerNode } =
        request.body

      const { context } = await getMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const signature = generateSignatureForUpload({
        key: 'sources',
        payload: {
          data: {
            bucket: 'engine',
            scope: 'sources',
            metadata: {
              sentByUserId: context.userId,
            },
            organizationId: context.organizationId,
          },
          sourceType,
          explorerNode,
        },
        expires: 15 * 60, // 15 minutes
      })

      return { signature }
    },
  )
}
