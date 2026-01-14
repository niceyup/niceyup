import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { conversationVisibilitySchema } from '@workspace/core/conversations'
import { queries } from '@workspace/db/queries'
import { z } from 'zod'

export async function listConversations(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/conversations',
    {
      schema: {
        tags: ['Conversations'],
        description: 'Get all conversations',
        operationId: 'listConversations',
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          teamId: z.string().optional(),
          agentId: z.string(),
          visibility: conversationVisibilitySchema.default('private'),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              conversations: z.array(
                z.object({
                  id: z.string(),
                  title: z.string(),
                  visibility: conversationVisibilitySchema,
                  teamId: z.string().nullish(),
                  createdByUserId: z.string().nullish(),
                  updatedAt: z.date(),
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

      const { organizationId, organizationSlug, teamId, agentId, visibility } =
        request.query

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
        teamId,
      })

      const conversations = await queries.context.listConversations(context, {
        agentId,
        visibility,
      })

      return { conversations }
    },
  )
}
