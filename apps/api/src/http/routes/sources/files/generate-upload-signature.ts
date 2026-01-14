import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
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
          organizationId: z.string().optional(),
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

      const { context } = await resolveMembershipContext({
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
        expires: 24 * 60 * 60, // 24 hours
      })

      return { signature }
    },
  )
}
