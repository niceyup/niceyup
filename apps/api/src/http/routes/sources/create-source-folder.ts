import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import {
  createSourceExplorerNodeFolder,
  getSourceExplorerNodeFolder,
} from '@/http/functions/explorer-nodes/source-explorer-nodes'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import { z } from 'zod'

export async function createSourceFolder(app: FastifyTypedInstance) {
  app.register(authenticate).post(
    '/sources/folders',
    {
      schema: {
        tags: ['Sources'],
        description: 'Create a new source folder',
        operationId: 'createSourceFolder',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        body: z.object({
          name: z.string(),
          explorerNode: z
            .object({
              folderId: z.string().nullish(),
            })
            .optional(),
        }),
        response: withDefaultErrorResponses({
          201: z
            .object({
              explorerNode: z.object({
                folderId: z.string(),
              }),
            })
            .describe('Success'),
        }),
      },
    },
    async (request, reply) => {
      const { organization } = await resolveAuthOrganizationContext(
        request.ctx,
        {
          membership: { role: 'admin' },
          params: request.ctxParams,
        },
      )

      const { name, explorerNode } = request.body

      if (explorerNode?.folderId && explorerNode.folderId !== 'root') {
        const folderExplorerNode = await getSourceExplorerNodeFolder({
          id: explorerNode.folderId,
          organizationId: organization.id,
        })

        if (!folderExplorerNode) {
          throw new BadRequestError({
            code: 'FOLDER_IN_EXPLORER_NOT_FOUND',
            message: 'Folder in explorer not found or you don’t have access',
          })
        }
      }

      const folderExplorerNode = await createSourceExplorerNodeFolder({
        parentId: explorerNode?.folderId,
        name,
        organizationId: organization.id,
      })

      if (!folderExplorerNode) {
        throw new BadRequestError({
          code: 'EXPLORER_NODE_NOT_CREATED',
          message: 'Explorer node not created',
        })
      }

      return reply.status(201).send({
        explorerNode: { folderId: folderExplorerNode.id },
      })
    },
  )
}
