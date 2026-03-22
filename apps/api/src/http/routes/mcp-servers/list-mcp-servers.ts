import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { mcpServerTypeSchema } from '@workspace/core/mcp-servers'
import { queries } from '@workspace/db/queries'
import { z } from 'zod'

export async function listMcpServers(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/mcp-servers',
    {
      schema: {
        tags: ['MCP Servers'],
        description: 'Get all MCP servers',
        operationId: 'listMcpServers',
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          type: mcpServerTypeSchema.optional(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              mcpServers: z.array(
                z.object({
                  id: z.string(),
                  name: z.string(),
                  type: mcpServerTypeSchema,
                  url: z.string(),
                }),
              ),
            })
            .describe('Success'),
        }),
      },
    },
    async (request) => {
      const {
        user: { id: userId },
      } = request.authSession

      const { organizationId, organizationSlug, type } = request.query

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const mcpServers = await queries.context.listMcpServers(context, {
        type,
      })

      return { mcpServers }
    },
  )
}
