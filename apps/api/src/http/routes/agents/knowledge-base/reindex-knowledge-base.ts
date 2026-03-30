import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { knowledgeBases } from '@workspace/db/schema'
import { resolveAgentKnowledgeBase } from '@workspace/engine/agents'
import { reindexKnowledgeBaseTask } from '@workspace/engine/tasks/reindex-knowledge-base'
import { z } from 'zod'

export async function reindexKnowledgeBase(app: FastifyTypedInstance) {
  app.register(authenticate).post(
    '/agents/:agentId/knowledge-base/reindex',
    {
      schema: {
        tags: ['Agent Knowledge Bases'],
        description: 'Reindex knowledge base',
        operationId: 'reindexKnowledgeBase',
        params: z.object({
          agentId: z.string(),
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

      const { agentId } = request.params

      const { organizationId, organizationSlug } = request.body

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const agent = await queries.context.getAgent(context, { agentId })

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

      if (agentKnowledgeBase?.status === 'reindexing') {
        throw new BadRequestError({
          code: 'KNOWLEDGE_BASE_ALREADY_REINDEXING',
          message: 'Knowledge base is already reindexing',
        })
      }

      await db
        .update(knowledgeBases)
        .set({
          status: 'reindexing',
        })
        .where(eq(knowledgeBases.id, agentKnowledgeBase.id))

      await reindexKnowledgeBaseTask.trigger(
        { knowledgeBaseId: agentKnowledgeBase.id },
        { concurrencyKey: context.organizationId },
      )

      return reply.status(204).send()
    },
  )
}
