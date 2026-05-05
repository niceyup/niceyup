import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import { queries } from '@workspace/db/queries'
import { z } from 'zod'

export async function stopMessage(app: FastifyTypedInstance) {
  app.register(authenticate).post(
    '/conversations/:conversationId/messages/:messageId/stop',
    {
      schema: {
        tags: ['Messages'],
        description: 'Stop message processing',
        operationId: 'stopMessage',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          conversationId: z.string(),
          messageId: z.string(),
        }),
        body: z.object({
          agentId: z.string(),
        }),
        response: withDefaultErrorResponses({
          204: z.null().describe('Success'),
        }),
      },
    },
    async (request, reply) => {
      const { user, organization } = await resolveAuthOrganizationContext(
        request.ctx,
        {
          auth: { subject: 'user' },
          params: request.ctxParams,
        },
      )

      const { conversationId, messageId } = request.params

      const { agentId } = request.body

      const message = await queries.ctx.getMessage(
        { userId: user.id, organizationId: organization.id },
        { agentId, conversationId, messageId },
      )

      if (!message) {
        throw new BadRequestError({
          code: 'MESSAGE_NOT_FOUND',
          message: 'Message not found or you don’t have access',
        })
      }

      if (message.status !== 'processing') {
        throw new BadRequestError({
          code: 'MESSAGE_STATUS_NOT_PROCESSING',
          message: 'Message status is not processing',
        })
      }

      await queries.updateMessage({
        messageId,
        status: 'canceled',
      })

      return reply.status(204).send()
    },
  )
}
