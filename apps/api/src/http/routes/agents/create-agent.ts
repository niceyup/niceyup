import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
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
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        body: z.object({
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
      const { organization } = await resolveAuthOrganizationContext(
        request.ctx,
        {
          membership: { role: 'admin' },
          params: request.ctxParams,
        },
      )

      const { name, slug, logo, description, tags } = request.body

      const agentSlug = stripSpecialCharacters(slug)

      const [agentBySlug] = await db
        .select({
          id: agents.id,
        })
        .from(agents)
        .where(
          and(
            eq(agents.organizationId, organization.id),
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
            organizationId: organization.id,
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
