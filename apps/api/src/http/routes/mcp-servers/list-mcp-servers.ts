import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
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
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        querystring: z.object({
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
      const { organization } = await resolveAuthOrganizationContext(
        request.ctx,
        {
          membership: { role: 'admin' },
          params: request.ctxParams,
        },
      )

      const { type } = request.query

      const mcpServers = await queries.ctx.listMcpServers(
        { organizationId: organization.id },
        { type },
      )

      return { mcpServers }
    },
  )
}
