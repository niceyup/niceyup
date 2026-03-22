import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { indexedSourceStatusSchema } from '@workspace/core/sources'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { indexedSources } from '@workspace/db/schema'
import { resolveAgentKnowledgeBase } from '@workspace/engine/agents'
import { z } from 'zod'

export async function listIndexedSources(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/agents/:agentId/knowledge-base/indexed-sources',
    {
      schema: {
        tags: ['Agent Knowledge Bases'],
        description: 'Get all indexed sources',
        operationId: 'listIndexedSources',
        params: z.object({
          agentId: z.string(),
        }),
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              indexedSources: z.array(
                z.object({
                  id: z.string(),
                  sourceId: z.string(),
                  status: indexedSourceStatusSchema,
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

      const { agentId } = request.params

      const { organizationId, organizationSlug } = request.query

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

      if (agentKnowledgeBase?.status === 'reindexing') {
        throw new BadRequestError({
          code: 'KNOWLEDGE_BASE_REINDEXING',
          message: 'Knowledge base is reindexing',
        })
      }

      const validatedConfiguration =
        await agentKnowledgeBase?.safeValidateConfiguration()

      if (!agentKnowledgeBase || validatedConfiguration?.success !== true) {
        throw new BadRequestError({
          code: 'KNOWLEDGE_BASE_NOT_CONFIGURED',
          message: 'Knowledge base vector store or embedding model is not set',
        })
      }

      const listIndexedSources = await db
        .select({
          id: indexedSources.id,
          sourceId: indexedSources.sourceId,
          status: indexedSources.status,
        })
        .from(indexedSources)
        .where(eq(indexedSources.knowledgeBaseId, agentKnowledgeBase.id))

      return { indexedSources: listIndexedSources }
    },
  )
}
