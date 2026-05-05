import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
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
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          mcpServerId: z.string(),
        }),
        body: z.object({
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
      const { organization } = await resolveAuthOrganizationContext(
        request.ctx,
        {
          membership: { role: 'admin' },
          params: request.ctxParams,
        },
      )

      const { mcpServerId } = request.params

      const { name, type, url, headers, connectionId } = request.body

      const mcpServer = await queries.ctx.getMcpServer(
        { organizationId: organization.id },
        { mcpServerId },
      )

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
