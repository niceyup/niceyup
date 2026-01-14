import { and, eq, inArray } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { z } from 'zod'

import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { db } from '@workspace/db'
import { agentsToSources, sources } from '@workspace/db/schema'
import type { CreateAgentSourceEmbeddingTask } from '@workspace/engine/tasks/create-agent-source-embedding'
import type { DeleteAgentSourceEmbeddingTask } from '@workspace/engine/tasks/delete-agent-source-embedding'
import { tasks } from '@workspace/engine/trigger'

export async function manageAgentSources(app: FastifyTypedInstance) {
  app.register(authenticate).patch(
    '/agents/:agentId/sources',
    {
      schema: {
        tags: ['Agents'],
        description:
          'Manage sources of an agent to add or remove them from the agent.',
        operationId: 'manageAgentSources',
        params: z.object({
          agentId: z.string(),
        }),
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          add: z.array(z.string()),
          remove: z.array(z.string()),
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

      const { organizationId, organizationSlug, add, remove } = request.body

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

      const [sourcesAdd, sourcesRemove] = await Promise.all([
        db
          .select({ id: sources.id })
          .from(sources)
          .where(
            and(
              inArray(sources.id, add),
              eq(sources.organizationId, context.organizationId),
            ),
          ),
        db
          .select({ id: sources.id })
          .from(sources)
          .where(
            and(
              inArray(sources.id, remove),
              eq(sources.organizationId, context.organizationId),
            ),
          ),
      ])

      const sourcesAddIds = new Set(sourcesAdd.map((source) => source.id))
      const sourcesRemoveIds = new Set(sourcesRemove.map((source) => source.id))

      const sourceAddIdsNotFound = add.filter((id) => !sourcesAddIds.has(id))
      const sourceRemoveIdsNotFound = remove.filter(
        (id) => !sourcesRemoveIds.has(id),
      )

      if (sourceAddIdsNotFound.length || sourceRemoveIdsNotFound.length) {
        const sourceIdsNotFound = [
          ...sourceAddIdsNotFound,
          ...sourceRemoveIdsNotFound,
        ]

        throw new BadRequestError({
          code: 'SOURCE_NOT_FOUND',
          message: `The following source IDs were not found or you don’t have access to them: [${sourceIdsNotFound.join(', ')}]`,
        })
      }

      await db.transaction(async (tx) => {
        if (add.length) {
          const createdAgentsToSources = await tx
            .insert(agentsToSources)
            .values(
              sourcesAdd.map((source) => ({
                agentId,
                sourceId: source.id,
              })),
            )
            .onConflictDoNothing()
            .returning({
              agentId: agentsToSources.agentId,
              sourceId: agentsToSources.sourceId,
            })

          const sourcesToUpdateIds = new Set(
            createdAgentsToSources.map((item) => item.sourceId),
          )

          const sourcesToUpdate = sourcesAdd.filter(
            (source) => !sourcesToUpdateIds.has(source.id),
          )

          if (sourcesToUpdate.length) {
            await tx
              .update(agentsToSources)
              .set({
                status: 'queued',
              })
              .where(
                and(
                  eq(agentsToSources.agentId, agentId),
                  inArray(
                    agentsToSources.sourceId,
                    sourcesToUpdate.map((source) => source.id),
                  ),
                ),
              )
          }

          await tasks.batchTrigger<CreateAgentSourceEmbeddingTask>(
            'create-agent-source-embedding',
            sourcesAdd.map((source) => ({
              payload: { agentId, sourceId: source.id },
            })),
          )
        }

        if (remove.length) {
          await tx
            .update(agentsToSources)
            .set({
              status: 'delete-queued',
            })
            .where(
              and(
                eq(agentsToSources.agentId, agentId),
                inArray(agentsToSources.sourceId, remove),
              ),
            )

          await tasks.batchTrigger<DeleteAgentSourceEmbeddingTask>(
            'delete-agent-source-embedding',
            sourcesRemove.map((source) => ({
              payload: { agentId, sourceId: source.id },
            })),
          )
        }
      })

      return reply.status(204).send()
    },
  )
}
