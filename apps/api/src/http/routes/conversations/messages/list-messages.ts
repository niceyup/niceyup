import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { getMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import {
  aiMessageMetadataSchema,
  aiMessagePartSchema,
  aiMessageRoleSchema,
  aiMessageStatusSchema,
} from '@workspace/ai/schemas'
import { db } from '@workspace/db'
import { and, desc, eq, isNull } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { messages } from '@workspace/db/schema'
import { z } from 'zod'

const messageSchema = z.object({
  id: z.string(),
  status: aiMessageStatusSchema,
  role: aiMessageRoleSchema,
  parts: z.array(aiMessagePartSchema).nullable(),
  metadata: aiMessageMetadataSchema.nullable(),
  authorId: z.string().nullish(),
  parentId: z.string().nullish(),
  children: z.array(z.string()).optional(),
})

export async function listMessages(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/conversations/:conversationId/messages',
    {
      schema: {
        tags: ['Conversations'],
        description: 'Get all messages from a conversation',
        operationId: 'listMessages',
        params: z.object({
          conversationId: z.string(),
        }),
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          agentId: z.string(),
          targetMessageId: z.string().optional(),
          parents: z.coerce.boolean().optional(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              messages: z.array(messageSchema),
            })
            .describe('Success'),
        }),
      },
    },
    async (request) => {
      const {
        user: { id: userId },
      } = request.authSession

      const { conversationId } = request.params

      const { organizationId, organizationSlug, agentId } = request.query

      const { context } = await getMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const conversation = await queries.context.getConversation(context, {
        agentId,
        conversationId,
      })

      if (!conversation) {
        throw new BadRequestError({
          code: 'CONVERSATION_NOT_FOUND',
          message: 'Conversation not found or you don’t have access',
        })
      }

      const { targetMessageId, parents } = request.query

      const [targetMessage] = await db
        .select({
          id: messages.id,
        })
        .from(messages)
        .where(
          and(
            targetMessageId ? eq(messages.id, targetMessageId) : undefined,
            eq(messages.conversationId, conversationId),
            isNull(messages.deletedAt),
          ),
        )
        .orderBy(desc(messages.createdAt))
        .limit(1)

      if (!targetMessage) {
        throw new BadRequestError({
          code: 'TARGET_MESSAGE_NOT_FOUND',
          message: 'Target message not found',
        })
      }

      const listMessages = await queries.listMessageNodes({
        conversationId,
        targetMessageId: targetMessage.id,
        parentNodes: parents,
      })

      return { messages: listMessages }
    },
  )
}
