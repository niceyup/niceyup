import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
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
        params: z.object({
          mcpServerId: z.string(),
        }),
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
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

      const { organizationId, organizationSlug } = request.body

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

      await db.delete(mcpServers).where(eq(mcpServers.id, mcpServerId))

      return reply.status(204).send()
    },
  )
}
