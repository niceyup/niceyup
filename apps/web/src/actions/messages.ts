'use server'

import { resumableStreamContext } from '@/lib/resumable-stream'
import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import { createStreamableValue } from '@workspace/ai/rsc'
import type { AIMessage } from '@workspace/ai/types'
import { queries } from '@workspace/db/queries'
import { JsonLinesTransformStream } from '@workspace/realtime/stream'
import { getMembership } from './membership'

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
  const membership = await getMembership({
    organizationSlug: context.organizationSlug,
  })

  if (!membership) {
    return null
  }

  const message = await queries.ctx.getMessage(
    { userId: membership.userId, organizationId: membership.organizationId },
    {
      agentId: context.agentId,
      conversationId,
      messageId,
    },
  )

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

  if (message.role !== 'assistant' || !message.metadata?.streamId) {
    return {
      error: {
        code: 'MESSAGE_NOT_STREAMABLE',
        message: 'Message is not streamable',
      },
    }
  }

  const stream = await resumableStreamContext.resumeExistingStream(
    message.metadata?.streamId,
  )

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
