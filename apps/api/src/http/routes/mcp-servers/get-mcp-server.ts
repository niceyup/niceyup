import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { connectionAppSchema } from '@workspace/core/connections'
import { mcpServerTypeSchema } from '@workspace/core/mcp-servers'
import { queries } from '@workspace/db/queries'
import { z } from 'zod'

export async function getMcpServer(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/mcp-servers/:mcpServerId',
    {
      schema: {
        tags: ['MCP Servers'],
        description: 'Get MCP server details',
        operationId: 'getMcpServer',
        params: z.object({
          mcpServerId: z.string(),
        }),
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              mcpServer: z.object({
                id: z.string(),
                name: z.string(),
                type: mcpServerTypeSchema,
                url: z.url(),
                headers: z.record(z.string(), z.string()).nullable(),
                connection: z
                  .object({
                    id: z.string(),
                    app: connectionAppSchema,
                    name: z.string(),
                  })
                  .nullable(),
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

      const { mcpServerId } = request.params

      const { organizationId, organizationSlug } = request.query

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const mcpServer = await queries.context.getMcpServer(context, {
        mcpServerId,
      })

      if (!mcpServer) {
        throw new BadRequestError({
          code: 'MCP_SERVER_NOT_FOUND',
          message: 'MCP server not found or you don’t have access',
        })
      }

      return { mcpServer }
    },
  )
}
