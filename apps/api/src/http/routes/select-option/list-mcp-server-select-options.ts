import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
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
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        querystring: z.object({
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
      const { organization } = await resolveAuthOrganizationContext(
        request.ctx,
        {
          auth: { subject: 'user' },
          membership: { role: 'admin' },
          params: request.ctxParams,
        },
      )

      const { search } = request.query

      const mcpServers = await queries.ctx.listMcpServerSelectOptions(
        { organizationId: organization.id },
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
