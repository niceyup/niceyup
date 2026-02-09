'use client'

import { streamMessage } from '@/actions/messages'
import type {
  AgentParams,
  Chat,
  ChatParams,
  MessageNode,
  Message as MessageType,
  OrganizationTeamParams,
} from '@/lib/types'
import type { AIMessage } from '@workspace/ai/types'
import { useChatMessageRealtime } from '@workspace/realtime/hooks'
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
import { Shimmer } from '@workspace/ui/components/ai-elements/shimmer'
import { Avatar, AvatarFallback } from '@workspace/ui/components/avatar'
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
  CopyIcon,
  LockIcon,
  MessageSquare,
  PencilIcon,
  RefreshCcwIcon,
  UsersIcon,
  XCircleIcon,
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

type FilePart = {
  type: 'file'
  mediaType: string
  filename?: string
  url: string
}

type ToolState =
  | 'input-streaming'
  | 'input-available'
  | 'approval-requested'
  | 'approval-responded'
  | 'output-available'
  | 'output-error'
  | 'output-denied'

type ToolImageGenerationPart = {
  type: 'tool-image_generation'
  toolCallId: string
  state: ToolState
  output?: { result: string }
}

type MessageParts = {
  text: string
  files: FilePart[]
  toolImageGenerationParts: ToolImageGenerationPart[]
}

function extractMessageParts(message: MessageNode): MessageParts {
  const text = message.parts
    ?.filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n')

  const filesPart = message.parts?.filter((part) => part.type === 'file')

  const toolImageGenerationParts = message.parts?.filter(
    (part) => part.type === 'tool-image_generation',
  ) as unknown as MessageParts['toolImageGenerationParts']

  return {
    text: text || '',
    files: filesPart || [],
    toolImageGenerationParts: toolImageGenerationParts || [],
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
  updateMessage: (updatedMessage: Omit<Partial<MessageType>, 'id'>) => void
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
  const [updatedMessage, setUpdatedMessage] =
    React.useState<Omit<Partial<MessageType>, 'id'>>()
  const [editing, setEditing] = React.useState(false)

  const mergedMessage = { ...message, ...updatedMessage }

  const processing =
    mergedMessage.status === 'queued' || mergedMessage.status === 'processing'

  const contextValue: ChatMessageContextType = {
    message: mergedMessage,
    parts: extractMessageParts(mergedMessage),
    updateMessage: setUpdatedMessage,
    streaming: mergedMessage.role === 'assistant' && processing,
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

    if (
      !(hasText || hasAttachments) ||
      uploading ||
      promptInputStatus === 'submitted' ||
      promptInputStatus === 'streaming'
    ) {
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
                    ? 'Switch to team'
                    : 'Switch to private'}
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
    <ConversationScrollButton conversationScrollRef={conversationScrollRef} />
  )
}

function ChatMessageBranch({
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

              <MessageToolbar>
                <MessageBranchSelector
                  className={cn(
                    'opacity-25 transition-opacity',
                    'group-hover:opacity-100 group-[.is-assistant]:order-1',
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
}

function ChatMessage({
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

        <MessageToolbar className="group-[.is-other-user]:justify-start!">
          {branch && (
            <MessageBranchSelector
              className={cn(
                'opacity-25 transition-opacity',
                'group-hover:opacity-100 group-[.is-assistant]:order-1 group-[.is-other-user]:order-1',
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
}

// ============================================================================
// User Message
// ============================================================================

function ChatUserMessage() {
  const { chat } = useChatContext()

  const contentRef = React.useRef<HTMLDivElement>(null)
  const contentSize = useResizeObserver({ ref: contentRef })
  const [isContentTooTall, setIsContentTooTall] = React.useState(false)

  const [showMore, setShowMore] = React.useState(false)

  React.useEffect(() => {
    // h-55 = 55 * 4 = 220px (Tailwind spacing scale)
    const maxHeight = 220

    setIsContentTooTall(
      Boolean(contentSize.height && contentSize.height > maxHeight),
    )
  }, [contentSize.height])

  const isPrivate = chat?.visibility === 'private'

  return (
    <div
      className={cn(
        'ml-auto flex flex-row items-start justify-end gap-2',
        'group-[.is-other-user]:ml-0 group-[.is-other-user]:justify-start',
      )}
    >
      <ChatUserMessageAvatar />

      <div
        ref={contentRef}
        data-enable-show-more={!isPrivate && isContentTooTall}
        data-show-more={showMore}
        className={cn(
          'ml-auto flex flex-col justify-end gap-2',
          'group-[.is-other-user]:ml-0 group-[.is-other-user]:justify-start',
          '[&[data-show-more=false]]:[&[data-enable-show-more=true]]:relative [&[data-show-more=false]]:[&[data-enable-show-more=true]]:max-h-55.5',
        )}
      >
        <ChatUserMessageBody />

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
  return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Avatar className="hidden size-8 group-[.is-other-user]:block">
          {/* {user.image && <AvatarImage src={user.image} />} */}
          <AvatarFallback className="text-xs">
            {/* {getInitials(user.name)} */}
          </AvatarFallback>
        </Avatar>
      </TooltipTrigger>
      <TooltipContent>{/* {user.name} */}</TooltipContent>
    </Tooltip>
  )
}

function ChatUserMessageBody() {
  const { parts, editing } = useChatMessageContext()

  if (editing) {
    return <ChatUserMessageBodyEditing />
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

function ChatUserMessageBodyEditing() {
  const { resendMessage, promptInputStatus } = useChatContext()
  const { message, parts, setEditing } = useChatMessageContext()

  const [newText, setNewText] = React.useState(parts.text)
  const [newFileParts, setNewFileParts] = React.useState(parts.files)

  const handleSave = async () => {
    const hasText = Boolean(newText.trim())

    if (
      !hasText ||
      promptInputStatus === 'submitted' ||
      promptInputStatus === 'streaming'
    ) {
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
            disabled={
              !newText.trim() ||
              promptInputStatus === 'submitted' ||
              promptInputStatus === 'streaming'
            }
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
    <MessageContent className="group-[.is-other-user]:bg-secondary/50!">
      {parts.text || <ChatEmptyMessage />}
    </MessageContent>
  )
}

// ============================================================================
// Assistant Message
// ============================================================================

function ChatAssistantMessage() {
  const { chat } = useChatContext()

  const contentRef = React.useRef<HTMLDivElement>(null)
  const contentSize = useResizeObserver({ ref: contentRef })
  const [isContentTooTall, setIsContentTooTall] = React.useState(false)

  const [showMore, setShowMore] = React.useState(false)

  React.useEffect(() => {
    // h-55 = 55 * 4 = 220px (Tailwind spacing scale)
    const maxHeight = 220

    setIsContentTooTall(
      Boolean(contentSize.height && contentSize.height > maxHeight),
    )
  }, [contentSize.height])

  const isPrivate = chat?.visibility === 'private'

  return (
    <div
      ref={contentRef}
      data-enable-show-more={!isPrivate && isContentTooTall}
      data-show-more={showMore}
      className={cn(
        'flex flex-col gap-2',
        '[&[data-show-more=false]]:[&[data-enable-show-more=true]]:relative [&[data-show-more=false]]:[&[data-enable-show-more=true]]:max-h-55.5',
      )}
    >
      <ChatAssistantMessageStreaming>
        <ChatAssistantMessageBody />
      </ChatAssistantMessageStreaming>

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
    updateMessage: updateMessageNode,
  } = useChatContext()
  const { message, updateMessage, streaming } = useChatMessageContext()
  const { scrollToBottom } = useStickToBottomContext()

  const onChunk = (chunk: AIMessage) => {
    if (chunk.status === 'processing') {
      setStreamingMessageId(chunk.id)
    } else {
      if (
        chunk.status === 'cancelled' ||
        chunk.status === 'completed' ||
        chunk.status === 'failed'
      ) {
        updateMessageNode(chunk.id, chunk)
      }

      setStreamingMessageId(null)
    }

    updateMessage(chunk)
    scrollToBottom({ preserveScrollPosition: true })

    const isPrivate = chat?.visibility === 'private'

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

  if (message.status === 'queued') {
    return (
      <MessageContent>
        <Shimmer>Sending message...</Shimmer>
      </MessageContent>
    )
  }

  return children
}

function ChatAssistantMessageBody() {
  const { parts } = useChatMessageContext()

  return (
    <>
      <ChatAssistantMessageContent />

      {!!parts.toolImageGenerationParts.length &&
        parts.toolImageGenerationParts.map((part) => (
          <ChatAssistantMessageImageGeneration
            key={part.toolCallId}
            part={part}
          />
        ))}
    </>
  )
}

function ChatAssistantMessageImageGeneration({
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
}

function ChatAssistantMessageContent() {
  const { message, parts, streaming } = useChatMessageContext()

  return (
    <MessageContent>
      {parts.text ? (
        <MessageResponse>{parts.text}</MessageResponse>
      ) : streaming ? (
        <Shimmer>Generating response...</Shimmer>
      ) : (
        <ChatEmptyMessage />
      )}

      <ChatMessageFailed />

      {message.metadata?.error && (
        <ChatMessageResponseError error={message.metadata?.error} />
      )}
    </MessageContent>
  )
}

// ============================================================================
// Common Components
// ============================================================================

function ChatEmptyMessage() {
  const { message } = useChatMessageContext()

  if (message.status === 'failed') {
    return null
  }

  return <p className="italic">No message content</p>
}

function ChatMessageFailed() {
  const { message } = useChatMessageContext()

  if (message.status !== 'failed') {
    return null
  }

  return (
    <div className="flex flex-row items-center gap-2">
      <XCircleIcon className="size-4 shrink-0 text-destructive" />
      An unexpected error occurred
    </div>
  )
}

function ChatMessageActions() {
  const { regenerateMessage } = useChatContext()
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
    <MessageActions className="group-[.is-other-user]:justify-start">
      <MessageAction
        label="Copy"
        onClick={handleCopy}
        tooltip="Copy to clipboard"
        disabled={!parts.text.trim()}
      >
        <CopyIcon />
      </MessageAction>

      {message.role === 'assistant' && (
        <MessageAction
          label="Retry"
          onClick={handleRetry}
          tooltip="Regenerate response"
          disabled={streaming}
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

function ChatMessageResponseError({ error }: { error?: unknown }) {
  return (
    <MessageResponse className="rounded-md border border-destructive border-dashed p-3">
      {`**Error message:**\n\`\`\`${typeof error === 'string' ? `\n${error}` : `json\n${JSON.stringify(error, null, 2)}`}\n\`\`\``}
    </MessageResponse>
  )
}
