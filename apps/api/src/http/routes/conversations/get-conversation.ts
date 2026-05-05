import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import { conversationVisibilitySchema } from '@workspace/core/conversations'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { participants, teamMembers, users } from '@workspace/db/schema'
import { z } from 'zod'

export async function getConversation(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/conversations/:conversationId',
    {
      schema: {
        tags: ['Conversations'],
        description: 'Get conversation details',
        operationId: 'getConversation',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          conversationId: z.string(),
        }),
        querystring: z.object({
          agentId: z.string(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              conversation: z.object({
                id: z.string(),
                title: z.string(),
                visibility: conversationVisibilitySchema,
                teamId: z.string().nullish(),
                createdByUserId: z.string().nullish(),
                updatedAt: z.date(),
              }),
              participants: z.array(
                z.object({
                  id: z.string(),
                  name: z.string(),
                  email: z.string(),
                  image: z.string().nullish(),
                }),
              ),
            })
            .describe('Success'),
        }),
      },
    },
    async (request) => {
      const { user, organization } = await resolveAuthOrganizationContext(
        request.ctx,
        {
          auth: { subject: 'user' },
          params: request.ctxParams,
        },
      )

      const { conversationId } = request.params

      const { agentId } = request.query

      const conversation = await queries.ctx.getConversation(
        { userId: user.id, organizationId: organization.id },
        { agentId, conversationId },
      )

      if (!conversation) {
        throw new BadRequestError({
          code: 'CONVERSATION_NOT_FOUND',
          message: 'Conversation not found or you don’t have access',
        })
      }

      const participantsSelectQuery = db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
        })
        .from(users)

      const listParticipants = conversation.teamId
        ? await participantsSelectQuery
            .innerJoin(teamMembers, eq(users.id, teamMembers.userId))
            .where(eq(teamMembers.teamId, conversation.teamId))
        : await participantsSelectQuery
            .innerJoin(participants, eq(users.id, participants.userId))
            .where(eq(participants.conversationId, conversation.id))

      return { conversation, participants: listParticipants }
    },
  )
}
