import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import {
  uploadFileToStorage,
  validatedFileForUpload,
  verifySignatureForUpload,
} from '@/http/functions/upload-file-to-storage'
import type { FastifyTypedInstance } from '@/types/fastify'
import { billing } from '@workspace/billing'
import { NiceyupError } from '@workspace/core/errros'
import { z } from 'zod'

export async function uploadFilesConversation(app: FastifyTypedInstance) {
  app.post(
    '/conversations/files',
    {
      schema: {
        consumes: ['multipart/form-data'],
        tags: ['Conversations'],
        description: 'Upload files for conversation',
        operationId: 'uploadFilesConversation',
        headers: z.object({
          'x-upload-signature': z.string(),
        }),
        // body: z.object({
        //   file: z.custom<MultipartFile>(),
        // }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              files: z.array(
                z.discriminatedUnion('status', [
                  z.object({
                    status: z.literal('success'),
                    id: z.string(),
                    fileName: z.string(),
                    fileMimeType: z.string(),
                    fileSize: z.number(),
                    filePath: z.string(),
                  }),
                  z.object({
                    status: z.literal('error'),
                    error: z.object({
                      code: z.string(),
                      message: z.string(),
                    }),
                    fileName: z.string(),
                  }),
                ]),
              ),
            })
            .describe('Success'),
        }),
      },
    },
    async (request) => {
      const { 'x-upload-signature': signature } = request.headers

      const { data } = verifySignatureForUpload({
        key: 'conversations',
        signature,
      })

      const files = request.files({
        limits: {
          files: 10,
          fileSize: 100 * 1024 * 1024, // 100 MB
        },
      })

      await billing.limits.storageUsage.throwIfExceeded({
        referenceId: data.referenceId,
      })

      const uploadedFiles = []

      for await (const file of files) {
        try {
          if (file.file.truncated) {
            throw new BadRequestError({
              code: 'FILE_SIZE_LIMIT_REACHED',
              message: 'File size limit reached',
            })
          }

          const validatedFile = await validatedFileForUpload({
            file,
            accept:
              'application/pdf, text/plain, image/jpeg, image/png, image/gif, image/webp',
          })

          const uploadedFile = await uploadFileToStorage({
            data,
            file: validatedFile,
          })

          uploadedFiles.push({
            status: 'success' as const,
            ...uploadedFile,
          })
        } catch (error) {
          const errorObject = NiceyupError.isInstance(error)
            ? { code: error.code, message: error.message }
            : {
                code: 'FAILED_TO_UPLOAD_FILE',
                message: 'Failed to upload file',
              }

          uploadedFiles.push({
            status: 'error' as const,
            error: errorObject,
            fileName: file.filename,
          })
        }
      }

      if (!uploadedFiles.length) {
        throw new BadRequestError({
          code: 'FILES_NOT_UPLOADED',
          message: 'Files not uploaded',
        })
      }

      return { files: uploadedFiles }
    },
  )
}
