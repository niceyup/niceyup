import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import {
  createSourceExplorerNodeFolder,
  getSourceExplorerNodeFolder,
} from '@/http/functions/explorer-nodes/source-explorer-nodes'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { z } from 'zod'

export async function createSourceFolder(app: FastifyTypedInstance) {
  app.register(authenticate).post(
    '/sources/folders',
    {
      schema: {
        tags: ['Sources'],
        description: 'Create a new source folder',
        operationId: 'createSourceFolder',
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
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
      const {
        user: { id: userId },
      } = request.authSession

      const { organizationId, organizationSlug, name, explorerNode } =
        request.body

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      if (explorerNode?.folderId && explorerNode.folderId !== 'root') {
        const folderExplorerNode = await getSourceExplorerNodeFolder({
          id: explorerNode.folderId,
          organizationId: context.organizationId,
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
        organizationId: context.organizationId,
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
