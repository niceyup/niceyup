import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { mcpServers } from '@workspace/db/schema'
import { z } from 'zod'

export async function deleteMcpServer(app: FastifyTypedInstance) {
  app.register(authenticate).delete(
    '/mcp-servers/:mcpServerId',
    {
      schema: {
        tags: ['MCP Servers'],
        description: 'Delete a MCP server',
        operationId: 'deleteMcpServer',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          mcpServerId: z.string(),
        }),
        body: z.object({}),
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

      await db.delete(mcpServers).where(eq(mcpServers.id, mcpServerId))

      return reply.status(204).send()
    },
  )
}
