import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
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
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        querystring: z.object({
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
      const { teamId } = request.query

      const { user, organization, team } = await resolveAuthOrganizationContext(
        request.ctx,
        {
          auth: { subject: 'user' },
          params: { ...request.ctxParams, teamId },
        },
      )

      const { agentId, visibility } = request.query

      const conversations = await queries.ctx.listConversations(
        { userId: user.id, organizationId: organization.id, teamId: team?.id },
        { agentId, visibility },
      )

      return { conversations }
    },
  )
}
