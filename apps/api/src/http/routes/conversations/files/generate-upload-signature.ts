import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { generateSignatureForUpload } from '@/http/functions/upload-file-to-storage'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import { billing } from '@workspace/billing'
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
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        body: z.object({
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
      const { user, organization } = await resolveAuthOrganizationContext(
        request.ctx,
        {
          auth: { subject: 'user' },
          params: request.ctxParams,
        },
      )

      const { agentId, conversationId } = request.body

      if (conversationId) {
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
      } else {
        const agent = await queries.ctx.getAgent(
          { organizationId: organization.id },
          { agentId },
        )

        if (!agent) {
          throw new BadRequestError({
            code: 'AGENT_NOT_FOUND',
            message: 'Agent not found or you don’t have access',
          })
        }
      }

      await billing.limits.storageUsage.throwIfExceeded({
        referenceId: organization.id,
      })

      const signature = generateSignatureForUpload({
        key: 'conversations',
        payload: {
          data: {
            bucket: 'default',
            scope: 'conversations',
            metadata: {
              sentByUserId: user.id,
              // agentIds: [agentId],
              // ...(conversationId ? { conversationIds: [conversationId] } : {}),
            },
            referenceId: organization.id,
          },
        },
        expires: 15 * 60, // 15 minutes
      })

      return { signature }
    },
  )
}
