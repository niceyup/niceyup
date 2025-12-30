import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { getMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { queries } from '@workspace/db/queries'
import { z } from 'zod'

export async function stopMessage(app: FastifyTypedInstance) {
  app.register(authenticate).post(
    '/conversations/:conversationId/messages/:messageId/stop',
    {
      schema: {
        tags: ['Conversations'],
        description: 'Stop message processing',
        operationId: 'stopMessage',
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
          204: z.null().describe('Success'),
        }),
      },
    },
    async (request, reply) => {
      const {
        user: { id: userId },
      } = request.authSession

      const { conversationId, messageId } = request.params

      const { organizationId, organizationSlug, agentId } = request.body

      const { context } = await getMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      const message = await queries.context.getMessage(context, {
        agentId,
        conversationId,
        messageId,
      })

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
        status: 'stopped',
      })

      return reply.status(204).send(null)
    },
  )
}
