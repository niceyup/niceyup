import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { mcpServerTypeSchema } from '@workspace/core/mcp-servers'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { mcpServers } from '@workspace/db/schema'
import { z } from 'zod'

export async function updateMcpServer(app: FastifyTypedInstance) {
  app.register(authenticate).patch(
    '/mcp-servers/:mcpServerId',
    {
      schema: {
        tags: ['MCP Servers'],
        description: 'Update a MCP server',
        operationId: 'updateMcpServer',
        params: z.object({
          mcpServerId: z.string(),
        }),
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          name: z.string().optional(),
          type: mcpServerTypeSchema.optional(),
          url: z.url().optional(),
          headers: z.record(z.string(), z.string()).nullish(),
          connectionId: z.string().nullish(),
        }),
        response: withDefaultErrorResponses({
          204: z.null().describe('Success'),
        }),
      },
    },
    async (request, reply) => {
      const {
        user: { id: userId },
      } = request.authSession

      const { mcpServerId } = request.params

      const {
        organizationId,
        organizationSlug,
        name,
        type,
        url,
        headers,
        connectionId,
      } = request.body

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

      await db
        .update(mcpServers)
        .set({
          name,
          type,
          url,
          headers,
          connectionId,
        })
        .where(eq(mcpServers.id, mcpServerId))

      return reply.status(204).send()
    },
  )
}
