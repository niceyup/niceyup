import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { mcpServerTypeSchema } from '@workspace/core/mcp-servers'
import { db } from '@workspace/db'
import { mcpServers } from '@workspace/db/schema'
import { z } from 'zod'

export async function createMcpServer(app: FastifyTypedInstance) {
  app.register(authenticate).post(
    '/mcp-servers',
    {
      schema: {
        tags: ['MCP Servers'],
        description: 'Create a new MCP server',
        operationId: 'createMcpServer',
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          name: z.string(),
          type: mcpServerTypeSchema.default('http'),
          url: z.url(),
          headers: z.record(z.string(), z.string()).nullish(),
          connectionId: z.string().nullish(),
        }),
        response: withDefaultErrorResponses({
          201: z
            .object({
              mcpServerId: z.string(),
            })
            .describe('Success'),
        }),
      },
    },
    async (request, reply) => {
      const {
        user: { id: userId },
      } = request.authSession

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

      const [createdMcpServer] = await db
        .insert(mcpServers)
        .values({
          name,
          type,
          url,
          headers,
          connectionId,
          organizationId: context.organizationId,
        })
        .returning({
          id: mcpServers.id,
        })

      if (!createdMcpServer) {
        throw new BadRequestError({
          code: 'MCP_SERVER_NOT_CREATED',
          message: 'MCP server not created',
        })
      }

      return reply.status(201).send({
        mcpServerId: createdMcpServer.id,
      })
    },
  )
}
