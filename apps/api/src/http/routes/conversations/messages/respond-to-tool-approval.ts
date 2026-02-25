import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { streamAgentResponse } from '@/http/functions/stream-agent-response'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import {
  isToolUIPart,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from '@workspace/ai'
import {
  aiMessageMetadataSchema,
  aiMessagePartSchema,
  aiMessageRoleSchema,
  aiMessageStatusSchema,
} from '@workspace/ai/schemas'
import type { AIMessagePart } from '@workspace/ai/types'
import { db, generateId } from '@workspace/db'
import { and, eq, isNull, sql } from '@workspace/db/orm'
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
})

export async function respondToToolApproval(app: FastifyTypedInstance) {
  app.register(authenticate).post(
    '/conversations/:conversationId/messages/:messageId/tool-approval',
    {
      schema: {
        tags: ['Conversations'],
        description: 'Respond to a tool approval request',
        operationId: 'respondToToolApproval',
        params: z.object({
          conversationId: z.string(),
          messageId: z.string(),
        }),
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          agentId: z.string(),
          // toolCallId: z.string(),
          approvalId: z.string(),
          approved: z.boolean(),
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

      const {
        organizationId,
        organizationSlug,
        agentId,
        // toolCallId,
        approvalId,
        approved,
      } = request.body

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const streamId = generateId()

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
          role: messages.role,
          parts: messages.parts,
          metadata: messages.metadata,
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

      const toolCallPart = message.parts?.find(
        (part) =>
          isToolUIPart(part) &&
          // part.toolCallId === toolCallId &&
          part.state === 'approval-requested' &&
          part.approval.id === approvalId,
      )

      if (!toolCallPart) {
        throw new BadRequestError({
          code: 'TOOL_CALL_PART_APPROVAL_REQUESTED_NOT_FOUND',
          message: 'Tool call part approval requested not found',
        })
      }

      const updatedParts: AIMessagePart[] = (message.parts || []).map((part) =>
        isToolUIPart(part) &&
        // part.toolCallId === toolCallId &&
        part.state === 'approval-requested' &&
        part.approval.id === approvalId
          ? {
              ...part,
              state: 'approval-responded',
              approval: {
                id: approvalId,
                approved,
                // reason: approved ? 'User confirmed the command' : 'User denied the command',
              },
            }
          : part,
      )

      const isCompleteWithApprovalResponses =
        lastAssistantMessageIsCompleteWithApprovalResponses({
          messages: [{ ...message, parts: updatedParts }],
        })

      const { assistantMessage } = await db.transaction(async (tx) => {
        const [assistantMessage] = await tx
          .update(messages)
          .set({
            parts: updatedParts,

            ...(isCompleteWithApprovalResponses
              ? {
                  status: 'queued',
                  metadata: sql`COALESCE(${messages.metadata}, '{}'::jsonb) || ${JSON.stringify({ streamId })}::jsonb`,
                }
              : {}),
          })
          .where(eq(messages.id, message.id))
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
            code: 'ASSISTANT_MESSAGE_NOT_UPDATED',
            message: 'Assistant message not updated',
          })
        }

        return { assistantMessage }
      })

      if (isCompleteWithApprovalResponses) {
        await streamAgentResponse({
          streamId,
          conversationId,
          assistantMessage: {
            id: assistantMessage.id,
            parts: assistantMessage.parts || [],
            metadata: assistantMessage.metadata,
          },
        })
      }

      // Realtime PubSub

      conversationPubSub.emitMessages({
        conversationId,
        data: [assistantMessage],
      })

      return { assistantMessage }
    },
  )
}
