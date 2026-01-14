'use server'

import { authenticatedUser } from '@/lib/auth/server'
import { resolveOrganizationContext } from '@/lib/organization'
import { resumableStreamContext } from '@/lib/resumable-stream'
import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import { createStreamableValue } from '@workspace/ai/rsc'
import type { AIMessage } from '@workspace/ai/types'
import { queries } from '@workspace/db/queries'
import { JsonLinesTransformStream } from '@workspace/realtime/stream'

type ContextMessageParams = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  agentId: AgentParams['agentId']
}

type GetMessageParams = {
  conversationId: string
  messageId: string
}

export async function getMessage(
  context: ContextMessageParams,
  { conversationId, messageId }: GetMessageParams,
) {
  const {
    user: { id: userId },
  } = await authenticatedUser()

  const ctx = await resolveOrganizationContext({ userId, ...context })

  if (!ctx) {
    return null
  }

  const message = await queries.context.getMessage(ctx, {
    agentId: context.agentId,
    conversationId,
    messageId,
  })

  return message
}

type StreamMessageParams = {
  conversationId: string
  messageId: string
}

export async function streamMessage(
  context: ContextMessageParams,
  { conversationId, messageId }: StreamMessageParams,
) {
  const message = await getMessage(context, { conversationId, messageId })

  if (!message) {
    return {
      error: {
        code: 'MESSAGE_NOT_FOUND',
        message: 'Message not found or you don’t have access',
      },
    }
  }

  if (message.role !== 'assistant') {
    return {
      error: {
        code: 'MESSAGE_NOT_STREAMABLE',
        message: 'Message is not streamable',
      },
    }
  }

  const stream = await resumableStreamContext.resumeExistingStream(messageId)

  const streamable = createStreamableValue<AIMessage, unknown>({
    id: message.id,
    status: message.status,
    role: message.role,
    parts: message.parts || [],
    metadata: message.metadata || {},
  })

  const startStreaming = async () => {
    if (stream) {
      const reader = stream
        .pipeThrough(new JsonLinesTransformStream<AIMessage>())
        .getReader()

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          streamable.done()
          break
        }

        streamable.update(value)
      }
    } else {
      streamable.done()
    }
  }

  startStreaming()

  return { data: streamable.value }
}
