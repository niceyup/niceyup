import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { db } from '@workspace/db'
import { and, eq } from '@workspace/db/orm'
import { agentSystemConfigurations, agents } from '@workspace/db/schema'
import { stripSpecialCharacters } from '@workspace/utils'
import { z } from 'zod'

const DEFAULT_TITLE_GENERATION_SYSTEM_MESSAGE = `Generate a concise, 3-5 word title summarizing the chat history.
### Guidelines:
- The title should clearly represent the main theme or subject of the conversation.
- Avoid quotation marks or special formatting.
- Write the title in the chat's primary language; default to English if multilingual.
- Prioritize accuracy over excessive creativity; keep it clear and simple.`

export async function createAgent(app: FastifyTypedInstance) {
  app.register(authenticate).post(
    '/agents',
    {
      schema: {
        tags: ['Agents'],
        description: 'Create a new agent',
        operationId: 'createAgent',
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          name: z.string(),
          slug: z.string().min(3),
          logo: z.string().optional(),
          description: z.string().optional(),
          tags: z.array(z.string()).optional(),
        }),
        response: withDefaultErrorResponses({
          201: z
            .object({
              agentId: z.string(),
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
        slug,
        logo,
        description,
        tags,
      } = request.body

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })
      const agentSlug = stripSpecialCharacters(slug)

      const [agentBySlug] = await db
        .select({
          id: agents.id,
        })
        .from(agents)
        .where(
          and(
            eq(agents.organizationId, context.organizationId),
            eq(agents.slug, agentSlug),
          ),
        )
        .limit(1)

      if (agentBySlug) {
        throw new BadRequestError({
          code: 'AGENT_SLUG_ALREADY_EXISTS',
          message: 'Agent with this slug already exists',
        })
      }

      const agent = await db.transaction(async (tx) => {
        const [agent] = await tx
          .insert(agents)
          .values({
            name,
            slug: agentSlug,
            logo,
            description,
            tags,
            organizationId: context.organizationId,
          })
          .returning({
            id: agents.id,
          })

        if (!agent) {
          throw new BadRequestError({
            code: 'AGENT_NOT_CREATED',
            message: 'Agent not created',
          })
        }

        await tx.insert(agentSystemConfigurations).values({
          agentId: agent.id,
          titleGenerationSystemMessage: DEFAULT_TITLE_GENERATION_SYSTEM_MESSAGE,
        })

        return agent
      })

      return reply.status(201).send({
        agentId: agent.id,
      })
    },
  )
}
