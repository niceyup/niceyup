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

type StreamTextResult<
  TOOLS extends ToolSet,
  OUTPUT extends Output.Output,
> = ReturnType<typeof streamText<TOOLS, OUTPUT>>

export async function createAgentAIStream<
  TOOLS extends ToolSet,
  OUTPUT extends Output.Output,
>({
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
  StreamTextParams<TOOLS, OUTPUT>,
  'model' | 'tools' | 'activeTools' | 'toolChoice' | 'stopWhen' | 'abortSignal'
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
}): Promise<StreamTextResult<TOOLS, OUTPUT> | undefined> {
  try {
    let message = {
      id: originalMessage?.id || randomUUID(),
      metadata: originalMessage?.metadata || {},
      status: 'processing',
      role: 'assistant',
      parts: [],
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
      message.status = abortSignal?.aborted ? 'cancelled' : 'completed'

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
