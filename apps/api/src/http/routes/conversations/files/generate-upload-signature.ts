import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { resolveMembershipContext } from '@/http/functions/membership'
import { generateSignatureForUpload } from '@/http/functions/upload-file-to-storage'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { queries } from '@workspace/db/queries'
import { z } from 'zod'

export async function generateUploadSignatureConversation(
  app: FastifyTypedInstance,
) {
  app.register(authenticate).post(
    '/conversations/files/signature',
    {
      schema: {
        tags: ['Conversations'],
        description: 'Generate upload signature for conversation',
        operationId: 'generateUploadSignatureConversation',
        body: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          agentId: z.string(),
          conversationId: z.string().nullish(),
        }),
        response: withDefaultErrorResponses({
          200: z
            .object({
              signature: z.string(),
            })
            .describe('Success'),
        }),
      },
    },
    async (request) => {
      const {
        user: { id: userId },
      } = request.authSession

      const { organizationId, organizationSlug, agentId, conversationId } =
        request.body

      const { context } = await resolveMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      if (conversationId) {
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
      } else {
        const agent = await queries.context.getAgent(context, {
          agentId,
        })

        if (!agent) {
          throw new BadRequestError({
            code: 'AGENT_NOT_FOUND',
            message: 'Agent not found or you don’t have access',
          })
        }
      }

      const signature = generateSignatureForUpload({
        key: 'conversations',
        payload: {
          data: {
            bucket: 'default',
            scope: 'conversations',
            metadata: {
              sentByUserId: context.userId,
              // agentIds: [agentId],
              // ...(conversationId ? { conversationIds: [conversationId] } : {}),
            },
            organizationId: context.organizationId,
          },
        },
        expires: 15 * 60, // 15 minutes
      })

      return { signature }
    },
  )
}
