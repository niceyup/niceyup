import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import { queries } from '@workspace/db/queries'
import { resolveAgentKnowledgeBase } from '@workspace/engine/agents'
import { runs } from '@workspace/engine/trigger'
import { z } from 'zod'

export async function cancelKnowledgeBaseReindexing(app: FastifyTypedInstance) {
  app.register(authenticate).post(
    '/agents/:agentId/knowledge-base/reindex/cancel',
    {
      schema: {
        tags: ['Agent Knowledge Bases'],
        description: 'Cancel knowledge base reindexing',
        operationId: 'cancelKnowledgeBaseReindexing',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          agentId: z.string(),
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

      const { agentId } = request.params

      const agent = await queries.ctx.getAgent(
        { organizationId: organization.id },
        { agentId },
      )

      if (!agent) {
        throw new BadRequestError({
          code: 'AGENT_NOT_FOUND',
          message: 'Agent not found or you don’t have access',
        })
      }

      const agentKnowledgeBase = await resolveAgentKnowledgeBase({
        agentId,
      })

      if (agentKnowledgeBase?.status !== 'reindexing') {
        throw new BadRequestError({
          code: 'KNOWLEDGE_BASE_NOT_REINDEXING',
          message: 'Knowledge base is not reindexing',
        })
      }

      const {
        data: [run],
      } = await runs.list({
        taskIdentifier: ['reindex-knowledge-base'],
        tag: [
          `organization:${organization.id}`,
          `knowledge-base:${agentKnowledgeBase.id}`,
        ],
        status: ['EXECUTING'],
        limit: 1,
      })

      if (run) {
        await runs.cancel(run.id)
      }

      return reply.status(204).send()
    },
  )
}
