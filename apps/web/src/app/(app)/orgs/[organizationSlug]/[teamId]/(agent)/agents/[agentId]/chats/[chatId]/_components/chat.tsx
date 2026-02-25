'use client'

import { streamMessage } from '@/actions/messages'
import type {
  AgentParams,
  Chat,
  ChatParams,
  MessageNode,
  OrganizationTeamParams,
} from '@/lib/types'
import { getInitials } from '@/lib/utils'
import {
  type DynamicToolUIPart,
  type FileUIPart,
  type ReasoningUIPart,
  type TextUIPart,
  type ToolUIPart,
  isFileUIPart,
  isReasoningUIPart,
  isTextUIPart,
  isToolUIPart,
} from '@workspace/ai'
import type { AIMessage } from '@workspace/ai/types'
import { useChatMessageRealtime } from '@workspace/realtime/hooks'
import {
  Confirmation,
  ConfirmationAccepted,
  ConfirmationAction,
  ConfirmationActions,
  ConfirmationRejected,
  ConfirmationRequest,
  ConfirmationTitle,
} from '@workspace/ui/components/ai-elements/confirmation'
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@workspace/ui/components/ai-elements/conversation'
import { Image } from '@workspace/ui/components/ai-elements/image'
import {
  Message,
  MessageAction,
  MessageActions,
  MessageAttachment,
  MessageAttachments,
  MessageBranch,
  MessageBranchContent,
  MessageBranchNext,
  MessageBranchPage,
  MessageBranchPrevious,
  MessageBranchSelector,
  MessageContent,
  MessageResponse,
  MessageToolbar,
} from '@workspace/ui/components/ai-elements/message'
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSpeechButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from '@workspace/ui/components/ai-elements/prompt-input'
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@workspace/ui/components/ai-elements/reasoning'
import { Shimmer } from '@workspace/ui/components/ai-elements/shimmer'
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@workspace/ui/components/ai-elements/tool'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@workspace/ui/components/avatar'
import { Button } from '@workspace/ui/components/button'
import {
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@workspace/ui/components/input-group'
import { InputGroup } from '@workspace/ui/components/input-group'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Spinner } from '@workspace/ui/components/spinner'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'
import { useResizeObserver } from '@workspace/ui/hooks/use-resize-observer'
import { cn } from '@workspace/ui/lib/utils'
import {
  AlertCircleIcon,
  BrainIcon,
  CheckIcon,
  CopyIcon,
  LockIcon,
  MessageSquare,
  PencilIcon,
  RefreshCcwIcon,
  UsersIcon,
  XCircleIcon,
  XIcon,
} from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'
import { useStickToBottomContext } from 'use-stick-to-bottom'
import { useChatOptions } from '../../_store/use-chat-options'
import {
  type ChatMessageNode,
  type ChatOptions,
  useChat,
} from '../_hooks/use-chat'

// ============================================================================
// Provider Context & Types
// ============================================================================

type Params = OrganizationTeamParams & AgentParams & ChatParams

type ToolImageGenerationPart = ToolUIPart<{
  image_generation: {
    input: unknown
    output: { result: string }
  }
}>

type MessageParts = {
  reasoningText: string
  text: string
  reasoning: ReasoningUIPart[]
  texts: TextUIPart[]
  files: FileUIPart[]
  tools: (ToolUIPart | DynamicToolUIPart)[]
  toolImageGenerations: ToolImageGenerationPart[]
}

function extractMessageParts({
  message,
}: { message: MessageNode }): MessageParts {
  const reasoningParts: ReasoningUIPart[] = []
  const textParts: TextUIPart[] = []
  const fileParts: FileUIPart[] = []
  const toolParts: (ToolUIPart | DynamicToolUIPart)[] = []
  const toolImageGenerationParts: ToolImageGenerationPart[] = []

  for (const part of message.parts || []) {
    if (isReasoningUIPart(part)) {
      reasoningParts.push(part)
    } else if (isTextUIPart(part)) {
      textParts.push(part)
    } else if (isFileUIPart(part)) {
      fileParts.push(part)
    } else if (isToolUIPart(part)) {
      if (part.type === 'tool-image_generation') {
        toolImageGenerationParts.push(part as ToolImageGenerationPart)
      } else {
        toolParts.push(part)
      }
    }
  }

  return {
    reasoningText: reasoningParts.map((part) => part.text).join('\n'),
    text: textParts.map((part) => part.text).join('\n'),
    reasoning: reasoningParts,
    texts: textParts,
    files: fileParts,
    tools: toolParts,
    toolImageGenerations: toolImageGenerationParts,
  }
}

const ACCEPTED_FILE_TYPES =
  'application/pdf, text/plain, image/jpeg, image/png, image/gif, image/webp'
const MAX_FILES = 10
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100 MB

const messageStatusToPromptInputStatus = {
  queued: 'submitted',
  processing: 'streaming',
  cancelled: 'ready',
  completed: 'ready',
  failed: 'error',
} as const

type ChatContextType = { params: Params; authorId?: string } & ReturnType<
  typeof useChat
>

const ChatContext = React.createContext<ChatContextType | undefined>(undefined)

export function useChatContext(): ChatContextType {
  const context = React.useContext(ChatContext)

  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider')
  }

  return context
}

export function ChatProvider({
  params,
  authorId,
  chat,
  initialMessages,
  options,
  children,
}: {
  params: Params
  authorId?: string
  chat?: Chat | null
  initialMessages?: MessageNode[]
  options?: ChatOptions
  children: React.ReactNode
}) {
  const chatHook = useChat({
    params,
    chat,
    initialMessages,
    options,
  })

  const contextValue: ChatContextType = { params, authorId, ...chatHook }

  return (
    <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
  )
}

type ChatMessageContextType = {
  message: ChatMessageNode
  parts: MessageParts
  streaming: boolean
  processing: boolean
  editing: boolean
  setEditing: (editing: boolean) => void
}

const ChatMessageContext = React.createContext<
  ChatMessageContextType | undefined
>(undefined)

export function useChatMessageContext(): ChatMessageContextType {
  const context = React.useContext(ChatMessageContext)

  if (context === undefined) {
    throw new Error(
      'useChatMessageContext must be used within a ChatMessageProvider',
    )
  }

  return context
}

export function ChatMessageProvider({
  message,
  children,
}: {
  message: ChatMessageNode
  children: React.ReactNode
}) {
  const [editing, setEditing] = React.useState(false)

  const processing =
    message.status === 'queued' || message.status === 'processing'

  const contextValue: ChatMessageContextType = {
    message,
    parts: extractMessageParts({ message }),
    streaming: message.role === 'assistant' && processing,
    processing,
    editing,
    setEditing,
  }

  return (
    <ChatMessageContext.Provider value={contextValue}>
      {children}
    </ChatMessageContext.Provider>
  )
}

// ============================================================================
// Components
// ============================================================================

export function ChatPromptInput({
  suggestion,
  newChat,
}: {
  suggestion?: string
  newChat?: boolean
}) {
  const {
    params,
    sendMessage,
    stopMessage,
    promptInputStatus,
    promptInputProcessing,
    uploading,
    uploadFile,
  } = useChatContext()

  const { visibility, setVisibility } = useChatOptions()

  const [text, setText] = React.useState<string>(suggestion || '')
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    setText(suggestion || '')
  }, [suggestion])

  const handleSubmit = async (message: PromptInputMessage) => {
    if (promptInputStatus === 'streaming') {
      await stopMessage()
    }

    const hasText = Boolean(message.text.trim())
    const hasAttachments = Boolean(message.files.length)

    if (!(hasText || hasAttachments) || uploading || promptInputProcessing) {
      throw new Error('Invalid message')
    }

    setText('')

    const textPart = {
      type: 'text' as const,
      text: message.text || 'Sent with attachments',
    }

    const fileParts = message.files.map(({ mediaType, filename, url }) => ({
      type: 'file' as const,
      mediaType,
      filename,
      url,
    }))

    await sendMessage({ parts: [textPart, ...fileParts] })
  }

  React.useEffect(() => {
    if (params.teamId === '~') {
      setVisibility('private')
    }
  }, [params.teamId])

  const handleVisibilitySwitch = () => {
    if (visibility === 'team') {
      setVisibility('private')
    } else {
      setVisibility('team')
    }
  }

  return (
    <PromptInput
      globalDrop
      multiple
      accept={ACCEPTED_FILE_TYPES}
      maxFiles={MAX_FILES}
      maxFileSize={MAX_FILE_SIZE}
      uploadFile={uploadFile}
      onSubmit={handleSubmit}
    >
      <PromptInputAttachments>
        {(attachment) => (
          <PromptInputAttachment
            data={{
              ...attachment,
              uploading: !attachment.uploaded && !attachment.error,
            }}
          />
        )}
      </PromptInputAttachments>

      <PromptInputBody>
        <PromptInputTextarea
          ref={textareaRef}
          onChange={(e) => setText(e.target.value)}
          value={text}
        />
      </PromptInputBody>

      <PromptInputFooter>
        <PromptInputTools>
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger />

            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>

          <PromptInputSpeechButton textareaRef={textareaRef} />
        </PromptInputTools>

        <PromptInputTools>
          {newChat && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block w-fit">
                  <PromptInputButton
                    variant="secondary"
                    onClick={handleVisibilitySwitch}
                    disabled={params.teamId === '~'}
                  >
                    {visibility === 'team' ? <UsersIcon /> : <LockIcon />}
                    {visibility === 'team' ? 'Team' : 'Private'}
                  </PromptInputButton>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {params.teamId === '~'
                  ? 'Select a team first'
                  : visibility === 'team'
                    ? 'Switch to private'
                    : 'Switch to team'}
              </TooltipContent>
            </Tooltip>
          )}
          <PromptInputSubmit
            status={promptInputStatus}
            disabled={uploading || promptInputStatus === 'submitted'}
          />
        </PromptInputTools>
      </PromptInputFooter>
    </PromptInput>
  )
}

export function ChatConversation() {
  const { messages } = useChatContext()

  return (
    <Conversation>
      <ConversationContent className="mx-auto max-w-4xl">
        {messages.length ? (
          <ChatConversationMessages />
        ) : (
          <ConversationEmptyState
            icon={<MessageSquare className="size-12" />}
            title="Start a conversation"
            description="Type a message below to begin chatting"
          />
        )}
      </ConversationContent>

      <ChatConversationScroll />
    </Conversation>
  )
}

function ChatConversationMessages() {
  const { messages, getMessageChildren } = useChatContext()

  return (
    <>
      {messages.map((message, i) => {
        const siblings = getMessageChildren(message.parentId)

        if (siblings.length > 1) {
          return (
            <ChatMessageBranch
              key={`${message.id}-${i}`}
              message={message}
              siblings={siblings}
            />
          )
        }

        return <ChatMessage key={message.id} message={message} />
      })}

      <ChatConversationLoading />
    </>
  )
}

function ChatConversationLoading() {
  const { loadingMessage } = useChatContext()

  if (!loadingMessage) {
    return null
  }

  return (
    <div className="flex w-full flex-col items-center justify-center gap-3 p-8 text-center">
      <Spinner />
    </div>
  )
}

function ChatConversationScroll() {
  const { conversationScrollRef } = useChatContext()

  return (
    <ConversationScrollButton
      conversationScrollRef={conversationScrollRef}
      className="backdrop-blur-xs"
    />
  )
}

const ChatMessageBranch = React.memo(function ChatMessageBranch({
  message,
  siblings,
}: {
  message: ChatMessageNode
  siblings: string[]
}) {
  const { getMessage, handleBranchChange } = useChatContext()

  return (
    <MessageBranch
      defaultBranch={siblings.indexOf(message.id)}
      onBranchChange={async (branchIndex) => {
        const targetNodeId = siblings.at(branchIndex)

        if (!targetNodeId) {
          return
        }

        await handleBranchChange({
          previousNodeId: message.id,
          targetNodeId,
          role: message.role,
        })
      }}
    >
      <MessageBranchContent>
        {siblings.map((id) => {
          if (id === message.id) {
            return <ChatMessage key={id} message={message} branch />
          }

          // Sibling message is already loaded
          const siblingMessage = getMessage(id)
          if (siblingMessage) {
            return <ChatMessage key={id} message={siblingMessage} branch />
          }

          return (
            <Message key={id} from={message.role}>
              <MessageContent>
                <Shimmer>Loading...</Shimmer>
              </MessageContent>

              <MessageToolbar
                className={cn(
                  'mt-0',
                  'group-[.is-user]:justify-end',
                  'group-[.is-assistant]:justify-start',
                )}
              >
                <MessageBranchSelector
                  className={cn(
                    'opacity-25 transition-opacity',
                    'group-hover:opacity-100',
                    'group-[.is-assistant]:order-1',
                  )}
                >
                  <MessageBranchPrevious />
                  <MessageBranchPage />
                  <MessageBranchNext />
                </MessageBranchSelector>
              </MessageToolbar>
            </Message>
          )
        })}
      </MessageBranchContent>
    </MessageBranch>
  )
})

const ChatMessage = React.memo(function ChatMessage({
  message,
  branch,
}: {
  message: ChatMessageNode
  branch?: boolean
}) {
  const { authorId } = useChatContext()

  if (message.role !== 'assistant' && message.role !== 'user') {
    return null
  }

  const isOtherUser =
    authorId && message.authorId && authorId !== message.authorId

  return (
    <ChatMessageProvider message={message}>
      <Message
        from={message.role}
        className={cn(isOtherUser && 'is-other-user ml-0 justify-start')}
      >
        {message.role === 'assistant' ? (
          <ChatAssistantMessage />
        ) : (
          <ChatUserMessage />
        )}

        <MessageToolbar
          className={cn(
            'mt-0',
            'group-[.is-user]:justify-end',
            'group-[.is-assistant]:justify-start',
            'group-[.is-other-user]:justify-start!',
          )}
        >
          {branch && (
            <MessageBranchSelector
              className={cn(
                'opacity-25 transition-opacity',
                'group-hover:opacity-100',
                'group-[.is-assistant]:order-1',
                'group-[.is-other-user]:order-1',
              )}
            >
              <MessageBranchPrevious />
              <MessageBranchPage />
              <MessageBranchNext />
            </MessageBranchSelector>
          )}

          <ChatMessageActions />
        </MessageToolbar>
      </Message>
    </ChatMessageProvider>
  )
})

// ============================================================================
// User Message
// ============================================================================

function ChatUserMessage() {
  return (
    <ChatUserMessageCollapsible>
      <ChatUserMessageParts />
    </ChatUserMessageCollapsible>
  )
}

function ChatUserMessageCollapsible({
  children,
}: { children: React.ReactNode }) {
  const { chat } = useChatContext()

  const [showMore, setShowMore] = React.useState(false)

  const contentRef = React.useRef<HTMLDivElement>(null)
  const contentSize = useResizeObserver({ ref: contentRef })

  const isContentTooTall = React.useMemo(() => {
    // h-55 = 55 * 4 = 220px (Tailwind spacing scale)
    const maxHeight = 220

    return Boolean(contentSize.height && contentSize.height > maxHeight)
  }, [contentSize.height])

  const isPrivate = chat?.visibility === 'private'

  return (
    <div
      className={cn(
        'flex flex-row items-start justify-end gap-2',
        'group-[.is-other-user]:justify-start',
      )}
    >
      <ChatUserMessageAvatar />

      <div
        ref={contentRef}
        data-enable-show-more={!isPrivate && isContentTooTall}
        data-show-more={showMore}
        className={cn(
          'flex w-full flex-col justify-end gap-2 overflow-hidden',
          'group-[.is-other-user]:justify-start',
          '[&[data-show-more=false]]:[&[data-enable-show-more=true]]:relative [&[data-show-more=false]]:[&[data-enable-show-more=true]]:max-h-55.5',
        )}
      >
        {children}

        <div
          data-enable-show-more={!isPrivate && isContentTooTall}
          data-show-more={showMore}
          className={cn(
            'ml-auto flex items-end justify-end',
            'group-[.is-other-user]:ml-0 group-[.is-other-user]:justify-start',
            '[&[data-enable-show-more=false]]:hidden [&[data-show-more=false]]:absolute [&[data-show-more=false]]:inset-0 [&[data-show-more=false]]:bg-gradient-to-t [&[data-show-more=false]]:from-10% [&[data-show-more=false]]:from-background',
          )}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMore((prev) => !prev)}
          >
            {showMore ? 'Show less' : 'Show more'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function ChatUserMessageAvatar() {
  const { message } = useChatMessageContext()

  const user = {
    id: message.authorId,
    name: 'Guest',
    image: `https://avatar.vercel.sh/${message.authorId}`,
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Avatar className={cn('hidden size-8 group-[.is-other-user]:block')}>
          {user.image && <AvatarImage src={user.image} />}
          <AvatarFallback className="text-xs">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
      </TooltipTrigger>
      <TooltipContent>{user.name}</TooltipContent>
    </Tooltip>
  )
}

function ChatUserMessageParts() {
  const { parts, editing } = useChatMessageContext()

  if (editing) {
    return <ChatUserMessageEditing />
  }

  return (
    <>
      {!!parts.files.length && (
        <MessageAttachments>
          {parts.files.map((part) => (
            <MessageAttachment key={part.url} data={part} />
          ))}
        </MessageAttachments>
      )}

      <ChatUserMessageContent />
    </>
  )
}

function ChatUserMessageEditing() {
  const { resendMessage, promptInputProcessing } = useChatContext()
  const { message, parts, setEditing } = useChatMessageContext()

  const [newText, setNewText] = React.useState(parts.text)
  const [newFileParts, setNewFileParts] = React.useState(parts.files)

  const handleSave = async () => {
    const hasText = Boolean(newText.trim())

    if (!hasText || promptInputProcessing) {
      return
    }

    setEditing(false)

    const newTextPart = {
      type: 'text' as const,
      text: newText,
    }

    await resendMessage({
      messageId: message.id,
      parts: [newTextPart, ...newFileParts],
    })
  }

  const handleCancel = () => {
    setEditing(false)
  }

  const handleRemoveFile = (file: { url: string }) => {
    setNewFileParts(newFileParts.filter((part) => part.url !== file.url))
  }

  return (
    <>
      {!!newFileParts.length && (
        <MessageAttachments>
          {newFileParts.map((part) => (
            <MessageAttachment
              key={part.url}
              data={part}
              onRemove={() => handleRemoveFile(part)}
            />
          ))}
        </MessageAttachments>
      )}

      <InputGroup>
        <InputGroupTextarea
          className="field-sizing-content max-h-48 min-h-16"
          onChange={(e) => setNewText(e.target.value)}
          value={newText}
          placeholder="Enter prompt here"
        />
        <InputGroupAddon align="block-end" className="justify-end">
          <InputGroupButton onClick={handleCancel}>Cancel</InputGroupButton>
          <InputGroupButton
            onClick={handleSave}
            disabled={!newText.trim() || promptInputProcessing}
          >
            Save
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </>
  )
}

function ChatUserMessageContent() {
  const { parts } = useChatMessageContext()

  return (
    <MessageContent className={cn('group-[.is-other-user]:bg-secondary/50!')}>
      {parts.text ? (
        <pre className="whitespace-pre-wrap break-words font-sans">
          {parts.text}
        </pre>
      ) : (
        <ChatEmptyMessage />
      )}
    </MessageContent>
  )
}

// ============================================================================
// Assistant Message
// ============================================================================

function ChatAssistantMessage() {
  return (
    <ChatAssistantMessageCollapsible>
      <ChatAssistantMessageStreaming>
        <ChatAssistantMessageParts />
      </ChatAssistantMessageStreaming>
    </ChatAssistantMessageCollapsible>
  )
}

function ChatAssistantMessageCollapsible({
  children,
}: { children: React.ReactNode }) {
  const { chat } = useChatContext()

  const [showMore, setShowMore] = React.useState(false)

  const contentRef = React.useRef<HTMLDivElement>(null)
  const contentSize = useResizeObserver({ ref: contentRef })

  const isContentTooTall = React.useMemo(() => {
    // h-55 = 55 * 4 = 220px (Tailwind spacing scale)
    const maxHeight = 220

    return Boolean(contentSize.height && contentSize.height > maxHeight)
  }, [contentSize.height])

  const isPrivate = chat?.visibility === 'private'

  return (
    <div
      ref={contentRef}
      data-enable-show-more={!isPrivate && isContentTooTall}
      data-show-more={showMore}
      className={cn(
        'flex w-full flex-col gap-2 overflow-hidden',
        '[&[data-show-more=false]]:[&[data-enable-show-more=true]]:relative [&[data-show-more=false]]:[&[data-enable-show-more=true]]:max-h-55.5',
      )}
    >
      {children}

      <div
        data-enable-show-more={!isPrivate && isContentTooTall}
        data-show-more={showMore}
        className={cn(
          'flex items-end justify-start',
          '[&[data-enable-show-more=false]]:hidden [&[data-show-more=false]]:absolute [&[data-show-more=false]]:inset-0 [&[data-show-more=false]]:bg-gradient-to-t [&[data-show-more=false]]:from-10% [&[data-show-more=false]]:from-background',
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowMore((prev) => !prev)}
        >
          {showMore ? 'Show less' : 'Show more'}
        </Button>
      </div>
    </div>
  )
}

function ChatAssistantMessageStreaming({
  children,
}: { children: React.ReactNode }) {
  const {
    params,
    authorId,
    chat,
    setPromptInputStatus,
    setStreamingMessageId,
    updateMessage,
  } = useChatContext()
  const { message, streaming } = useChatMessageContext()
  const { scrollToBottom } = useStickToBottomContext()

  const onChunk = (chunk: AIMessage) => {
    if (chunk.status === 'processing') {
      setStreamingMessageId(chunk.id)
    } else {
      setStreamingMessageId(null)
    }

    updateMessage(chunk.id, chunk)

    const isPrivate = chat?.visibility === 'private'

    if (isPrivate) {
      scrollToBottom({ preserveScrollPosition: true })
    }

    if (isPrivate && authorId && authorId === chunk.metadata?.authorId) {
      setPromptInputStatus(messageStatusToPromptInputStatus[chunk.status])
    }
  }

  const { data, error } = useChatMessageRealtime({
    params,
    messageId: message.id,
    serverAction: streamMessage,
    onChunk,
    disable: !streaming,
  })

  if (error) {
    return (
      <MessageContent>
        <ChatMessageFailed />

        {data && <ChatMessageResponseError error={error} />}
      </MessageContent>
    )
  }

  if (message.status === 'queued' && !message.parts?.length) {
    return (
      <MessageContent>
        {message.isPersisted === false ? (
          <Shimmer>Sending...</Shimmer>
        ) : (
          <div className="flex w-full items-center gap-2 text-muted-foreground">
            <BrainIcon className="size-4" />
            <Shimmer>Thinking...</Shimmer>
          </div>
        )}
      </MessageContent>
    )
  }

  return children
}

function ChatAssistantMessageParts() {
  const { parts } = useChatMessageContext()

  return (
    <>
      <ChatAssistantMessageReasoning />

      {parts.tools.map((tool) => (
        <ChatAssistantMessageTool key={tool.toolCallId} tool={tool} />
      ))}

      <ChatAssistantMessageContent />

      {parts.toolImageGenerations.map((part) => (
        <ChatAssistantMessageToolImageGeneration
          key={part.toolCallId}
          part={part}
        />
      ))}
    </>
  )
}

function ChatAssistantMessageReasoning() {
  const { parts } = useChatMessageContext()

  const isStreaming = React.useMemo(() => {
    return parts.reasoning.some((part) => part.state === 'streaming')
  }, [parts.reasoning])

  if (!parts.reasoningText && !isStreaming) {
    return null
  }

  return (
    <Reasoning className="mb-0" isStreaming={isStreaming}>
      <ReasoningTrigger />
      <ReasoningContent>{parts.reasoningText}</ReasoningContent>
    </Reasoning>
  )
}

const ChatAssistantMessageTool = React.memo(function ChatAssistantMessageTool({
  tool,
}: { tool: ToolUIPart | DynamicToolUIPart }) {
  const { respondToToolApproval, promptInputProcessing } = useChatContext()
  const { message } = useChatMessageContext()

  const handleReject = async () => {
    if (tool.approval) {
      await respondToToolApproval({
        messageId: message.id,
        toolCallId: tool.toolCallId,
        approvalId: tool.approval.id,
        approved: false,
      })
    }
  }

  const handleAccept = async () => {
    if (tool.approval) {
      await respondToToolApproval({
        messageId: message.id,
        toolCallId: tool.toolCallId,
        approvalId: tool.approval.id,
        approved: true,
      })
    }
  }

  return (
    <Tool className="mb-0">
      <ToolHeader type={tool.type as ToolUIPart['type']} state={tool.state} />
      <ToolContent>
        <ToolInput input={tool.input} />

        <Confirmation approval={tool.approval} state={tool.state}>
          <ConfirmationTitle>
            <ConfirmationRequest>
              This tool requires your approval before execution.
            </ConfirmationRequest>
            <ConfirmationAccepted>
              <CheckIcon className="size-4 text-green-600 dark:text-green-400" />
              <span>Accepted</span>
            </ConfirmationAccepted>
            <ConfirmationRejected>
              <XIcon className="size-4 text-destructive" />
              <span>Rejected</span>
            </ConfirmationRejected>
          </ConfirmationTitle>
          <ConfirmationActions>
            <ConfirmationAction
              onClick={handleReject}
              variant="outline"
              disabled={promptInputProcessing}
            >
              Reject
            </ConfirmationAction>
            <ConfirmationAction
              onClick={handleAccept}
              variant="default"
              disabled={promptInputProcessing}
            >
              Accept
            </ConfirmationAction>
          </ConfirmationActions>
        </Confirmation>

        {(tool.state === 'output-available' ||
          tool.state === 'output-error') && (
          <ToolOutput
            output={
              <MessageResponse>
                {typeof tool.output === 'string'
                  ? tool.output
                  : JSON.stringify(tool.output, null, 2)}
              </MessageResponse>
            }
            errorText={tool.errorText}
          />
        )}
      </ToolContent>
    </Tool>
  )
})

function ChatAssistantMessageContent() {
  const { parts, streaming } = useChatMessageContext()

  return (
    <MessageContent>
      {parts.text ? (
        <MessageResponse className="whitespace-pre-wrap break-words">
          {parts.text}
        </MessageResponse>
      ) : streaming ? (
        <Shimmer>Generating response...</Shimmer>
      ) : (
        <ChatEmptyMessage />
      )}

      <ChatMessageFailed />
    </MessageContent>
  )
}

const ChatAssistantMessageToolImageGeneration = React.memo(
  function ChatAssistantMessageToolImageGeneration({
    part,
  }: { part: ToolImageGenerationPart }) {
    const { toolCallId, state, output } = part

    const isError = state === 'output-error'
    const isGenerating = state !== 'output-available'
    const base64 = output?.result

    if (isError) {
      return (
        <div
          key={toolCallId}
          className="flex h-[200px] w-[200px] items-center justify-center rounded-lg border p-4"
        >
          <AlertCircleIcon className="size-4 shrink-0 text-destructive" />
        </div>
      )
    }

    if (isGenerating || !base64) {
      return <Skeleton key={toolCallId} className="h-[200px] w-[200px]" />
    }

    return (
      <Image
        key={toolCallId}
        base64={base64}
        uint8Array={new Uint8Array()}
        mediaType="image/jpeg"
        alt="Generated image"
        className="max-h-[calc(100vh-300px)] min-h-[200px] min-w-[200px] max-w-fit rounded-lg border object-contain"
      />
    )
  },
)

// ============================================================================
// Common Components
// ============================================================================

function ChatMessageActions() {
  const { regenerateMessage, promptInputProcessing } = useChatContext()
  const { message, parts, streaming, processing, editing, setEditing } =
    useChatMessageContext()

  const handleCopy = () => {
    navigator.clipboard.writeText(parts.text)

    toast.success('Copied to clipboard')
  }

  const handleRetry = async () => {
    await regenerateMessage({ messageId: message.id })
  }

  const handleEdit = () => {
    setEditing(true)
  }

  return (
    <MessageActions>
      <MessageAction
        label="Copy"
        onClick={handleCopy}
        tooltip="Copy to clipboard"
        disabled={!parts.text.trim() || streaming}
      >
        <CopyIcon />
      </MessageAction>

      {message.role === 'assistant' && (
        <MessageAction
          label="Retry"
          onClick={handleRetry}
          tooltip="Regenerate response"
          disabled={streaming || promptInputProcessing}
        >
          <RefreshCcwIcon />
        </MessageAction>
      )}

      {message.role === 'user' && (
        <MessageAction
          label="Edit"
          onClick={handleEdit}
          tooltip="Edit message"
          disabled={processing || editing}
        >
          <PencilIcon fill={editing ? 'currentColor' : 'none'} />
        </MessageAction>
      )}
    </MessageActions>
  )
}

function ChatEmptyMessage() {
  const { message } = useChatMessageContext()

  if (message.status === 'failed') {
    return null
  }

  return <p className="italic">No message content</p>
}

function ChatMessageFailed() {
  const { message } = useChatMessageContext()

  return (
    <>
      {message.status === 'failed' && (
        <div className="flex flex-row items-center gap-2">
          <XCircleIcon className="size-4 shrink-0 text-destructive" />
          An unexpected error occurred
        </div>
      )}

      {message.metadata?.error && (
        <ChatMessageResponseError error={message.metadata?.error} />
      )}
    </>
  )
}

function ChatMessageResponseError({ error }: { error?: unknown }) {
  return (
    <MessageResponse className="rounded-md border border-destructive border-dashed p-3">
      {`**Error message:**\n\`\`\`${typeof error === 'string' ? `\n${error}` : `json\n${JSON.stringify(error, null, 2)}`}\n\`\`\``}
    </MessageResponse>
  )
}
