import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { streamAgentResponse } from '@/http/functions/stream-agent-response'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import {
  aiMessageMetadataSchema,
  aiMessagePartSchema,
  aiMessageRoleSchema,
  aiMessageStatusSchema,
} from '@workspace/ai/schemas'
import { db } from '@workspace/db'
import { and, eq, isNull } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { messages } from '@workspace/db/schema'
import { conversationPubSub } from '@workspace/realtime/pubsub'
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

export async function regenerateMessage(app: FastifyTypedInstance) {
  app.register(authenticate).post(
    '/conversations/:conversationId/messages/:messageId/regenerate',
    {
      schema: {
        tags: ['Conversations'],
        description: 'Regenerate assistant message',
        operationId: 'regenerateMessage',
        params: z.object({
          conversationId: z.string(),
          messageId: z.string(),
        }),
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          agentId: z.string(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              assistantMessage: messageSchema,
            })
            .describe('Success'),
        }),
      },
    },
    async (request) => {
      const {
        user: { id: userId },
      } = request.authSession

      const { conversationId, messageId } = request.params

      const { organizationId, organizationSlug, agentId } = request.body

      const { context } = await resolveMembershipContext({
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

      const [message] = await db
        .select({
          id: messages.id,
          parts: messages.parts,
          parentId: messages.parentId,
        })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conversationId),
            eq(messages.id, messageId),
            isNull(messages.deletedAt),
          ),
        )
        .limit(1)

      if (!message) {
        throw new BadRequestError({
          code: 'MESSAGE_NOT_FOUND',
          message: 'Message not found',
        })
      }

      let _parentMessage = null

      if (message.parentId) {
        const [parentMessage] = await db
          .select({
            id: messages.id,
            parts: messages.parts,
          })
          .from(messages)
          .where(
            and(
              eq(messages.conversationId, conversationId),
              eq(messages.id, message.parentId),
              isNull(messages.deletedAt),
            ),
          )
          .limit(1)

        _parentMessage = parentMessage
      }

      if (!_parentMessage) {
        throw new BadRequestError({
          code: 'PARENT_MESSAGE_NOT_FOUND',
          message: 'Parent message not found',
        })
      }

      const { assistantMessage } = await db.transaction(async (tx) => {
        const [assistantMessage] = await tx
          .insert(messages)
          .values({
            conversationId,
            status: 'queued',
            role: 'assistant',
            parts: [],
            metadata: {
              authorId: userId,
            },
            parentId: _parentMessage.id,
          })
          .returning({
            id: messages.id,
            status: messages.status,
            role: messages.role,
            parts: messages.parts,
            metadata: messages.metadata,
            authorId: messages.authorId,
            parentId: messages.parentId,
          })

        if (!assistantMessage) {
          throw new BadRequestError({
            code: 'ASSISTANT_MESSAGE_NOT_CREATED',
            message: 'Assistant message not created',
          })
        }

        return { assistantMessage: { ...assistantMessage, children: [] } }
      })

      await streamAgentResponse({
        conversationId,
        userMessage: {
          id: _parentMessage.id,
          parts: _parentMessage.parts || [],
        },
        assistantMessage,
      })

      conversationPubSub.publish({
        channel: `conversations:${conversationId}:updated`,
        messages: [assistantMessage],
      })

      return { assistantMessage }
    },
  )
}
