import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { mcpServerTypeSchema } from '@workspace/core/mcp-servers'
import { queries } from '@workspace/db/queries'
import { z } from 'zod'

export async function listMcpServerSelectOptions(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/select-option/mcp-servers',
    {
      schema: {
        tags: ['MCP Servers'],
        description: 'Get MCP servers for select options',
        operationId: 'listMcpServerSelectOptions',
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          search: z.string().max(100).default(''),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              meta: z.object({
                search: z.string(),
                count: z.number(),
              }),
              mcpServers: z.array(
                z.object({
                  id: z.string(),
                  name: z.string(),
                  type: mcpServerTypeSchema,
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

      const { organizationId, organizationSlug, search } = request.query

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const mcpServers = await queries.context.listMcpServerSelectOptions(
        context,
        { search },
      )

      return {
        meta: {
          search,
          count: mcpServers.length,
        },
        mcpServers,
      }
    },
  )
}
