import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { sendUserMessageToAssistant } from '@/http/functions/ai-assistant'
import { getMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import {
  aiMessageMetadataSchema,
  aiMessagePartSchema,
  aiMessageRoleSchema,
  aiMessageStatusSchema,
} from '@workspace/ai/schemas'
import type { AIMessageMetadata } from '@workspace/ai/types'
import { db } from '@workspace/db'
import { and, eq, isNull } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { messages } from '@workspace/db/schema'
import { conversationPubSub } from '@workspace/realtime/pubsub'
import { z } from 'zod'

const textPartSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
})

const filePartSchema = z.object({
  type: z.literal('file'),
  mediaType: z.string(),
  filename: z.string().optional(),
  url: z.string(),
})

const promptMessagePartSchema = z.union([textPartSchema, filePartSchema])

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

export async function resendMessage(app: FastifyTypedInstance) {
  app.register(authenticate).post(
    '/conversations/:conversationId/messages/resend',
    {
      schema: {
        tags: ['Conversations'],
        description: 'Resend user message',
        operationId: 'resendMessage',
        params: z.object({
          conversationId: z.string(),
        }),
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          agentId: z.string(),
          parentMessageId: z.string(),
          message: z.object({
            parts: z.array(promptMessagePartSchema).nonempty(),
            metadata: aiMessageMetadataSchema.nullish(),
          }),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              userMessage: messageSchema,
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

      const { conversationId } = request.params

      const {
        organizationId,
        organizationSlug,
        agentId,
        parentMessageId,
        message,
      } = request.body

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
          code: 'CONVERSATION_UNAVAILABLE',
          message: 'Conversation not found or you don’t have access',
        })
      }

      const [parentMessage] = await db
        .select({
          id: messages.id,
        })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conversationId),
            eq(messages.id, parentMessageId),
            isNull(messages.deletedAt),
          ),
        )
        .limit(1)

      if (!parentMessage) {
        throw new BadRequestError({
          code: 'PARENT_MESSAGE_NOT_FOUND',
          message: 'Parent message not found',
        })
      }

      const { userMessage, assistantMessage } = await db.transaction(
        async (tx) => {
          const [userMessage] = await tx
            .insert(messages)
            .values({
              conversationId: conversationId,
              status: 'finished',
              role: 'user',
              parts: message.parts,
              metadata: message.metadata as AIMessageMetadata,
              authorId: userId,
              parentId: parentMessageId,
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

          if (!userMessage) {
            throw new BadRequestError({
              code: 'USER_MESSAGE_NOT_CREATED',
              message: 'User message not created',
            })
          }

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
              parentId: userMessage.id,
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

          return {
            userMessage: { ...userMessage, children: [assistantMessage.id] },
            assistantMessage: { ...assistantMessage, children: [] },
          }
        },
      )

      sendUserMessageToAssistant({
        conversationId,
        userMessage: {
          id: userMessage.id,
          parts: message.parts,
        },
        assistantMessage,
      })

      conversationPubSub.publish({
        channel: `conversations:${conversationId}:updated`,
        messages: [userMessage, assistantMessage],
      })

      return { userMessage, assistantMessage }
    },
  )
}
