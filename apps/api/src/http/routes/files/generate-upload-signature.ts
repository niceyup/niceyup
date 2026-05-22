import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { UnauthorizedError } from '@/http/errors/unauthorized-error'
import { generateSignatureForUpload } from '@/http/functions/upload-file-to-storage'
import { authenticate } from '@/http/middlewares/authenticate'
import { env } from '@/lib/env'
import type { FastifyTypedInstance } from '@/types/fastify'
import {
  resolveAuthContext,
  resolveOrganizationContext,
} from '@workspace/auth/context'
import { z } from 'zod'

const DEFAULT_ACCEPT = '*'
const DEFAULT_MAX_FILES = 1
const DEFAULT_MAX_SIZE = 15 * 1024 * 1024 // 15 MB
const DEFAULT_EXPIRES = 5 * 60 // 5 minutes

export async function generateUploadSignature(app: FastifyTypedInstance) {
  app.register(authenticate).post(
    '/files/signature',
    {
      schema: {
        tags: ['Files'],
        description: 'Generate upload signature',
        operationId: 'generateUploadSignature',
        headers: z.object({
          'x-app-secret-key': z.string(),
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        body: z.object({
          accept: z.string().default(DEFAULT_ACCEPT),
          maxFiles: z.number().positive().default(DEFAULT_MAX_FILES),
          maxSize: z.number().positive().default(DEFAULT_MAX_SIZE),
          expires: z.number().positive().default(DEFAULT_EXPIRES),
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
      const { 'x-app-secret-key': appSecretKey } = request.headers

      if (appSecretKey !== env.APP_SECRET_KEY) {
        throw new UnauthorizedError({
          code: 'INVALID_SECRET_KEY',
          message: 'Invalid secret key',
        })
      }

      const { user } = await resolveAuthContext(request.ctx, {
        subject: 'user',
      })

      let _organization = undefined

      if (
        request.ctxParams.organizationId ||
        request.ctxParams.organizationSlug
      ) {
        const { organization } = await resolveOrganizationContext(
          request.ctx,
          request.ctxParams,
        )

        _organization = organization
      }

      const { accept, maxFiles, maxSize, expires } = request.body

      const referenceId = _organization ? _organization.id : user.id

      const signature = generateSignatureForUpload({
        key: 'public',
        payload: {
          data: {
            bucket: 'default',
            scope: 'public',
            metadata: {
              ...(_organization ? { sentByUserId: user.id } : {}),
            },
            referenceId,
          },
          accept,
          maxFiles,
          maxSize,
        },
        expires,
      })

      return { signature }
    },
  )
}
