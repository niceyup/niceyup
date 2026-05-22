import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import { billing } from '@workspace/billing'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { knowledgeBases } from '@workspace/db/schema'
import { resolveAgentKnowledgeBase } from '@workspace/engine/agents'
import type { ReindexKnowledgeBaseTask } from '@workspace/engine/tasks/reindex-knowledge-base'
import { tasks } from '@workspace/engine/trigger'
import { z } from 'zod'

export async function reindexKnowledgeBase(app: FastifyTypedInstance) {
  app.register(authenticate).post(
    '/agents/:agentId/knowledge-base/reindex',
    {
      schema: {
        tags: ['Agent Knowledge Bases'],
        description: 'Reindex knowledge base',
        operationId: 'reindexKnowledgeBase',
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

      const validatedConfiguration =
        await agentKnowledgeBase?.safeValidateConfiguration()

      if (!agentKnowledgeBase || validatedConfiguration?.success !== true) {
        throw new BadRequestError({
          code: 'KNOWLEDGE_BASE_NOT_CONFIGURED',
          message: 'Knowledge base vector store or embedding model is not set',
        })
      }

      if (agentKnowledgeBase.status === 'reindexing') {
        throw new BadRequestError({
          code: 'KNOWLEDGE_BASE_ALREADY_REINDEXING',
          message: 'Knowledge base is already reindexing',
        })
      }

      await billing.limits.computeUsage.throwIfExceeded({
        referenceId: organization.id,
      })

      await db
        .update(knowledgeBases)
        .set({
          status: 'reindexing',
        })
        .where(eq(knowledgeBases.id, agentKnowledgeBase.id))

      await tasks.trigger<ReindexKnowledgeBaseTask>(
        'reindex-knowledge-base',
        { knowledgeBaseId: agentKnowledgeBase.id },
        {
          concurrencyKey: organization.id,
          tags: [
            `organization:${organization.id}`,
            `knowledge-base:${agentKnowledgeBase.id}`,
          ],
        },
      )

      return reply.status(204).send()
    },
  )
}
