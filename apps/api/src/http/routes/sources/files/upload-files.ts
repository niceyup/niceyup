import { BadRequestError } from '@/http/errors/bad-request-error'
import type { BaseErrorParams } from '@/http/errors/base-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import {
  createSourceExplorerNodeItem,
  getSourceExplorerNodeFolder,
} from '@/http/functions/explorer-nodes/source-explorer-nodes'
import { uploadFileToStorage } from '@/http/functions/upload-file-to-storage'
import {
  validatedFileForUpload,
  verifySignatureForUpload,
} from '@/http/functions/upload-file-to-storage'
import type { FastifyTypedInstance } from '@/types/fastify'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { databaseSources, fileSources, sources } from '@workspace/db/schema'
import { z } from 'zod'

export async function uploadFilesSource(app: FastifyTypedInstance) {
  app.post(
    '/sources/files',
    {
      schema: {
        consumes: ['multipart/form-data'],
        tags: ['Sources'],
        description: 'Upload files to source',
        operationId: 'uploadFilesSource',
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
                    source: z.object({
                      sourceId: z.string(),
                      explorerNode: z.object({
                        itemId: z.string(),
                      }),
                    }),
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

      const { data, sourceType, explorerNode } = verifySignatureForUpload<{
        sourceType: 'file' | 'database'
        explorerNode: { folderId?: string | null }
      }>({ key: 'sources', signature })

      const files = request.files({
        limits: {
          files: 15,
          fileSize: 500 * 1024 * 1024, // 500 MB
        },
      })

      if (explorerNode.folderId && explorerNode.folderId !== 'root') {
        const folderExplorerNode = await getSourceExplorerNodeFolder({
          id: explorerNode.folderId,
          organizationId: data.organizationId,
        })

        if (!folderExplorerNode) {
          throw new BadRequestError({
            code: 'FOLDER_IN_EXPLORER_NOT_FOUND',
            message: 'Folder in explorer not found or you don’t have access',
          })
        }
      }

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
              sourceType === 'database'
                ? 'application/x-sqlite3'
                : 'application/pdf, text/plain',
          })

          const { source, itemExplorerNode, uploadedFile } =
            await db.transaction(async (tx) => {
              const [source] = await tx
                .insert(sources)
                .values({
                  name: validatedFile.filename,
                  type: sourceType,
                  organizationId: data.organizationId,
                })
                .returning({
                  id: sources.id,
                })

              if (!source) {
                throw new BadRequestError({
                  code: 'SOURCE_NOT_CREATED',
                  message: 'Source not created',
                })
              }

              const itemExplorerNode = await createSourceExplorerNodeItem(
                {
                  parentId: explorerNode.folderId,
                  sourceId: source.id,
                  organizationId: data.organizationId,
                },
                tx,
              )

              if (!itemExplorerNode) {
                throw new BadRequestError({
                  code: 'EXPLORER_NODE_NOT_CREATED',
                  message: 'Explorer node not created',
                })
              }

              if (sourceType === 'database') {
                const [databaseSource] = await tx
                  .insert(databaseSources)
                  .values({
                    dialect: 'sqlite',
                    sourceId: source.id,
                  })
                  .returning({
                    id: databaseSources.id,
                  })

                if (!databaseSource) {
                  throw new BadRequestError({
                    code: 'DATABASE_SOURCE_NOT_CREATED',
                    message: 'Database source not created',
                  })
                }
              } else {
                const [fileSource] = await tx
                  .insert(fileSources)
                  .values({
                    sourceId: source.id,
                  })
                  .returning({
                    id: fileSources.id,
                  })

                if (!fileSource) {
                  throw new BadRequestError({
                    code: 'FILE_SOURCE_NOT_CREATED',
                    message: 'File source not created',
                  })
                }
              }

              const uploadedFile = await uploadFileToStorage({
                data,
                file: validatedFile,
              })

              if (!uploadedFile) {
                throw new BadRequestError({
                  code: 'FILE_NOT_UPLOADED',
                  message: 'File not uploaded',
                })
              }

              if (sourceType === 'database') {
                await tx
                  .update(databaseSources)
                  .set({
                    fileId: uploadedFile.id,
                  })
                  .where(eq(databaseSources.sourceId, source.id))
              } else {
                await tx
                  .update(fileSources)
                  .set({
                    fileId: uploadedFile.id,
                  })
                  .where(eq(fileSources.sourceId, source.id))
              }

              return { source, itemExplorerNode, uploadedFile }
            })

          uploadedFiles.push({
            status: 'success' as const,
            ...uploadedFile,
            source: {
              sourceId: source.id,
              explorerNode: { itemId: itemExplorerNode.id },
            },
          })
        } catch (error) {
          let errorObject = {
            code: 'FAILED_TO_UPLOAD_FILE',
            message: 'Failed to upload file',
          }

          if (error instanceof BadRequestError) {
            const { code, message } = JSON.parse(
              error.message,
            ) as BaseErrorParams

            if (code && message) {
              errorObject = { code, message }
            }
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
