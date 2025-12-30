import { randomUUID } from 'node:crypto'
import {
  type ModelMessage,
  type ToolSet,
  readUIMessageStream,
  streamText,
} from '@workspace/ai'
import type { Output } from '@workspace/ai'
import type { AIMessage, AIMessageMetadata } from '@workspace/ai/types'

type StreamTextParams<
  TOOLS extends ToolSet,
  OUTPUT extends Output.Output,
> = Parameters<typeof streamText<TOOLS, OUTPUT>>[0]

export async function streamAIAssistant<
  TOOLS extends ToolSet,
  OUTPUT extends Output.Output,
>({
  model,
  tools,
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
  StreamTextParams<TOOLS, OUTPUT>,
  'model' | 'tools' | 'stopWhen' | 'abortSignal'
> & {
  messages: ModelMessage[]
  originalMessage?: {
    id?: string
    metadata?: AIMessageMetadata | null
  }
  onStart?: (event: { message: AIMessage }) => Promise<void>
  onChunk?: (event: { message: AIMessage }) => Promise<void>
  onFinish?: (event: { message: AIMessage }) => Promise<void>
  onFailed?: (event: { message: AIMessage; error: unknown }) => Promise<void>
  onError?: (event: { error: unknown }) => void
}) {
  try {
    let error: unknown

    let message = {
      id: originalMessage?.id || randomUUID(),
      metadata: originalMessage?.metadata || {},
      status: 'processing',
      role: 'assistant',
      parts: [],
    } as AIMessage

    await onStart?.({ message })

    const streamingResult = streamText({
      model,
      tools,
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
      message.status = abortSignal?.aborted ? 'stopped' : 'finished'

      await onFinish?.({ message })
    }

    return streamingResult
  } catch (error) {
    onError?.({ error })
  }
}
