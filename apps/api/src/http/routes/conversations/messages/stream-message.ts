import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { getMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import { resumableStreamContext } from '@/lib/resumable-stream'
import type { FastifyTypedInstance } from '@/types/fastify'
import {
  JsonToSseTransformStream,
  UI_MESSAGE_STREAM_HEADERS,
} from '@workspace/ai'
import { queries } from '@workspace/db/queries'
import { JsonLinesTransformStream } from '@workspace/realtime/stream'
import { z } from 'zod'

export async function streamMessage(app: FastifyTypedInstance) {
  app.register(authenticate).get(
    '/conversations/:conversationId/messages/:messageId/stream',
    {
      schema: {
        tags: ['Conversations'],
        description: 'Stream message',
        operationId: 'streamMessage',
        params: z.object({
          conversationId: z.string(),
          messageId: z.string(),
        }),
        querystring: z.object({
          organizationId: z.string().optional(),
          organizationSlug: z.string().optional(),
          agentId: z.string(),
        }),
        response: withDefaultErrorResponses({
          200: z.unknown().describe('Success'),
        }),
      },
    },
    async (request, reply) => {
      const {
        user: { id: userId },
      } = request.authSession

      const { conversationId, messageId } = request.params

      const { organizationId, organizationSlug, agentId } = request.query

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

      if (message.role !== 'assistant') {
        throw new BadRequestError({
          code: 'MESSAGE_NOT_STREAMABLE',
          message: 'Message is not streamable',
        })
      }

      if (message.status !== 'queued' && message.status !== 'processing') {
        throw new BadRequestError({
          code: 'MESSAGE_NOT_STREAMING',
          message: 'Message is not streaming',
        })
      }

      const stream =
        await resumableStreamContext.resumeExistingStream(messageId)

      if (!stream) {
        throw new BadRequestError({
          code: 'STREAM_NOT_FOUND',
          message: 'Stream not found',
        })
      }

      for (const [key, value] of Object.entries(UI_MESSAGE_STREAM_HEADERS)) {
        reply.header(key, value)
      }

      return reply
        .status(200)
        .send(
          stream
            .pipeThrough(new JsonLinesTransformStream())
            .pipeThrough(new JsonToSseTransformStream()),
        )
    },
  )
}
