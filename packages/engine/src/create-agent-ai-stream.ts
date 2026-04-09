import {
  type ModelMessage,
  readUIMessageStream,
  streamText,
} from '@workspace/ai'
import type {
  AIMessage,
  AIMessageMetadata,
  AIMessagePart,
} from '@workspace/ai/types'
import { generateId } from '@workspace/utils'

type StreamTextParams = Parameters<typeof streamText>[0]

type StreamTextResult = ReturnType<typeof streamText>

export async function createAgentAIStream({
  model,
  tools,
  activeTools,
  toolChoice,
  stopWhen,
  abortSignal,
  originalMessage,
  messages,
  onStart,
  onChunk,
  onFinish,
  onFailed,
  onError,
}: Pick<
  StreamTextParams,
  'model' | 'tools' | 'activeTools' | 'toolChoice' | 'stopWhen' | 'abortSignal'
> & {
  messages: ModelMessage[]
  originalMessage?: {
    id?: string
    parts?: AIMessagePart[] | null
    metadata?: AIMessageMetadata | null
  }
  onStart?: (event: { message: AIMessage }) => Promise<void>
  onChunk?: (event: { message: AIMessage }) => Promise<void>
  onFinish?: (event: { message: AIMessage }) => Promise<void>
  onFailed?: (event: { message: AIMessage; error: unknown }) => Promise<void>
  onError?: (event: { error: unknown }) => void
}): Promise<StreamTextResult | undefined> {
  try {
    let message = {
      id: originalMessage?.id || generateId(),
      metadata: originalMessage?.metadata || {},
      status: 'processing',
      role: 'assistant',
      parts: originalMessage?.parts || [],
    } as AIMessage

    await onStart?.({ message })

    let error: unknown

    const streamingResult = streamText({
      model,
      tools,
      activeTools,
      toolChoice,
      stopWhen,
      abortSignal,
      messages,
      onError: (event) => {
        error = event.error
      },
    })

    const messageStream = readUIMessageStream<AIMessage>({
      message,
      stream: streamingResult.toUIMessageStream<AIMessage>({
        sendStart: true,
        sendReasoning: true,
        sendSources: true,
        sendFinish: true,
        messageMetadata: () => {
          return originalMessage?.metadata || {}
        },
      }),
    })

    for await (const chunk of messageStream) {
      message = chunk
      await onChunk?.({ message })
    }

    if (error) {
      message.status = 'failed'
      message.metadata = { ...message.metadata, error }

      await onFailed?.({ message, error })
    } else {
      message.status = abortSignal?.aborted ? 'canceled' : 'completed'

      await onFinish?.({ message })
    }

    return streamingResult
  } catch (error) {
    if (onError) {
      onError({ error })
    } else {
      throw error
    }
  }
}
