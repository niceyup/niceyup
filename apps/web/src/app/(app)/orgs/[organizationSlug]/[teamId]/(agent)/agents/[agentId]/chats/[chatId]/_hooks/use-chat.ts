'use client'

import { updateTag } from '@/actions/cache'
import { useUploadFiles } from '@/hooks/use-upload-files'
import { env } from '@/lib/env'
import { sdk } from '@/lib/sdk'
import type {
  AgentParams,
  Chat,
  ChatParams,
  Message,
  MessageNode,
  OrganizationTeamParams,
  PromptInputStatus,
  PromptMessagePart,
} from '@/lib/types'
import { createEntityAdapter } from '@reduxjs/toolkit'
import { useChatRealtime } from '@workspace/realtime/hooks'
import type { ConversationScrollToBottom } from '@workspace/ui/components/ai-elements/conversation'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

type Params = OrganizationTeamParams & AgentParams & ChatParams

export type ChatOptions = {
  visibility: 'private' | 'team'
  explorerNode?: {
    folderId?: string | null
  }
}

export type ChatMessageNode = MessageNode & {
  temporaryId?: string
  isPersisted?: boolean
}

type LoadingMessage = { id: string; role: Message['role'] }

const messagesAdapter = createEntityAdapter<ChatMessageNode>()

const buildChildrenIndex = (
  messagesState: ReturnType<typeof messagesAdapter.getInitialState>,
) => {
  const index = new Map<string, string[]>()

  for (const message of Object.values(messagesState.entities)) {
    if (!message?.parentId) {
      continue
    }

    const children = index.get(message.parentId) ?? []
    children.push(message.id)
    index.set(message.parentId, children)
  }

  return index
}

const buildMessageChain = (
  targetMessageId: string | undefined,
  loadingMessage: LoadingMessage | false,
  entities: Record<string, ChatMessageNode | undefined>,
  childrenIndex: Map<string, string[]>,
) => {
  if (!targetMessageId) {
    return []
  }

  const targetMessage = entities[targetMessageId]
  if (!targetMessage) {
    return []
  }

  if (loadingMessage) {
    const loadingMessageNode = entities[loadingMessage.id]
    if (loadingMessageNode) {
      const ancestors = buildAncestors(loadingMessageNode, entities)
      return [...ancestors, targetMessage]
    }
  }

  const ancestors = buildAncestors(targetMessage, entities)
  const descendants = buildDescendants(targetMessage, entities, childrenIndex)

  return [...ancestors, targetMessage, ...descendants]
}

const buildAncestors = (
  message: ChatMessageNode,
  entities: Record<string, ChatMessageNode | undefined>,
) => {
  const ancestors: ChatMessageNode[] = []
  let current = message

  while (current.parentId) {
    const parent = entities[current.parentId]
    if (!parent) {
      break
    }

    ancestors.unshift(parent)
    current = parent
  }

  return ancestors
}

const buildDescendants = (
  message: ChatMessageNode,
  entities: Record<string, ChatMessageNode | undefined>,
  childrenIndex: Map<string, string[]>,
) => {
  const descendants: ChatMessageNode[] = []
  let current = message

  while (true) {
    const [firstChildId] = childrenIndex.get(current.id) ?? []
    if (!firstChildId) {
      break
    }

    const firstChild = entities[firstChildId]
    if (!firstChild) {
      break
    }

    descendants.push(firstChild)
    current = firstChild
  }

  return descendants
}

const createBranchChangeHandler = (
  params: Params,
  getMessage: (id: string | null | undefined) => ChatMessageNode | undefined,
  upsertMessages: (messages: ChatMessageNode[]) => void,
  setTargetMessageId: (id: string | undefined) => void,
  setLoadingMessage: (loading: LoadingMessage | false) => void,
) => {
  return React.useCallback(
    async ({
      previousNodeId,
      targetNodeId,
      role,
    }: {
      previousNodeId: string
      targetNodeId: string
      role: Message['role']
    }) => {
      const targetMessage = getMessage(targetNodeId)

      if (targetMessage?.children) {
        setTargetMessageId(targetNodeId)
        return
      }

      try {
        setLoadingMessage({ id: previousNodeId, role })

        const { data } = await sdk.listMessages({
          conversationId: params.chatId,
          params: {
            organizationSlug: params.organizationSlug,
            agentId: params.agentId,
            targetMessageId: targetNodeId,
          },
        })

        const messages = (data?.messages ?? []) as ChatMessageNode[]
        upsertMessages(messages)
        setTargetMessageId(targetNodeId)
      } catch {
        // Silently fail
      } finally {
        setLoadingMessage(false)
      }
    },
    [params, getMessage, upsertMessages, setTargetMessageId, setLoadingMessage],
  )
}

type SendMessageParams = {
  parts: PromptMessagePart[]
}

type ResendMessageParams = {
  messageId: string
  parts: PromptMessagePart[]
}

type RegenerateMessageParams = {
  messageId: string
}

type StopMessageParams = {
  messageId?: string
}

type UseChatParams = {
  params: Params
  chat?: Chat | null
  initialMessages?: MessageNode[]
  options?: ChatOptions
}

const isProcessing = (status: PromptInputStatus) =>
  status === 'submitted' || status === 'streaming'

export function useChat({
  params,
  chat,
  initialMessages,
  options,
}: UseChatParams) {
  const router = useRouter()
  const scrollRef = React.useRef<ConversationScrollToBottom>(null)

  const [messagesState, setMessagesState] = React.useState(() => {
    const state = messagesAdapter.getInitialState()
    return initialMessages?.length
      ? messagesAdapter.setAll(state, initialMessages)
      : state
  })

  const [targetMessageId, setTargetMessageId] = React.useState<
    string | undefined
  >(initialMessages?.at(-1)?.id)

  const [loadingMessage, setLoadingMessage] = React.useState<
    LoadingMessage | false
  >(false)

  const [inputStatus, setInputStatus] =
    React.useState<PromptInputStatus>('ready')

  const [streamingMessageId, setStreamingMessageId] = React.useState<
    string | null
  >(null)

  const upsertMessages = React.useCallback((messages: ChatMessageNode[]) => {
    if (!messages.length) {
      return
    }

    setMessagesState((prev) => {
      const messagesToUpsert = messages.filter(({ temporaryId }) => {
        return !temporaryId || !prev.entities[temporaryId]
      })

      if (!messagesToUpsert.length) {
        return prev
      }

      let state = messagesAdapter.upsertMany(prev, messagesToUpsert)

      const updates: { id: string; changes: Partial<ChatMessageNode> }[] = []

      for (const message of messagesToUpsert) {
        const parentId = message.parentId
        if (!parentId) {
          continue
        }

        const parent = state.entities[parentId]
        if (!parent) {
          continue
        }

        const currentChildren = new Set(parent.children)

        if (currentChildren.has(message.id)) {
          continue
        }

        currentChildren.add(message.id)

        const updatedChildren = Array.from(currentChildren)

        // state = messagesAdapter.updateOne(state, {
        //   id: parentId,
        //   changes: {
        //     children: updatedChildren,
        //   },
        // })

        updates.push({
          id: parentId,
          changes: {
            children: updatedChildren,
          },
        })
      }

      if (updates.length) {
        state = messagesAdapter.updateMany(state, updates)
      }

      return state
    })
  }, [])

  // const upsertMessages = React.useCallback((messages: ChatMessageNode[]) => {
  //   if (!messages.length) {
  //     return
  //   }

  //   setMessagesState((prev) => {
  //     const messagesToUpsert = messages.filter(({ temporaryId }) => {
  //       return !temporaryId || !prev.entities[temporaryId]
  //     })

  //     if (!messagesToUpsert.length) {
  //       return prev
  //     }

  //     let state = messagesAdapter.upsertMany(prev, messagesToUpsert)

  //     const childrenByParent = new Map<string, Set<string>>()

  //     for (const message of messagesToUpsert) {
  //       if (message.children?.length) {
  //         const set = childrenByParent.get(message.id) || new Set<string>()
  //         for (const childId of message.children) {
  //           set.add(childId)
  //         }
  //         childrenByParent.set(message.id, set)
  //       }

  //       if (message.parentId && state.entities[message.parentId]) {
  //         const set =
  //           childrenByParent.get(message.parentId) || new Set<string>()
  //         set.add(message.id)
  //         childrenByParent.set(message.parentId, set)
  //       }
  //     }

  //     if (!childrenByParent.size) {
  //       return state
  //     }

  //     const updates: { id: string; changes: Partial<ChatMessageNode> }[] = []

  //     for (const [parentId, newChildren] of childrenByParent) {
  //       const parent = state.entities[parentId]
  //       if (!parent) {
  //         continue
  //       }

  //       const currentChildren = new Set(parent.children)

  //       let hasChanges = false
  //       for (const childId of newChildren) {
  //         if (!currentChildren.has(childId)) {
  //           currentChildren.add(childId)
  //           hasChanges = true
  //         }
  //       }

  //       if (hasChanges) {
  //         updates.push({
  //           id: parentId,
  //           changes: { children: Array.from(currentChildren) },
  //         })
  //       }
  //     }

  //     if (updates.length) {
  //       state = messagesAdapter.updateMany(state, updates)
  //     }

  //     return state
  //   })
  // }, [])

  const { messages: messagesRealtime, error: errorRealtime } = useChatRealtime({
    params,
    visibility: chat?.visibility,
  })

  React.useEffect(() => {
    if (errorRealtime) {
      toast.error(errorRealtime)
    }
  }, [errorRealtime])

  React.useEffect(() => {
    if (messagesRealtime.length) {
      upsertMessages(messagesRealtime)
    }
  }, [messagesRealtime, upsertMessages])

  const allMessages = React.useMemo(
    () => messagesAdapter.getSelectors().selectAll(messagesState),
    [messagesState],
  )

  const rootMessageIds = React.useMemo(
    () => allMessages.filter((m) => !m.parentId).map((m) => m.id),
    [allMessages],
  )

  const childrenIndex = React.useMemo(
    () => buildChildrenIndex(messagesState),
    [messagesState],
  )

  const getMessageById = React.useCallback(
    (id: string | null | undefined) => {
      if (!id) {
        return undefined
      }

      return messagesState.entities[id]
    },
    [messagesState],
  )

  const updateMessage = React.useCallback(
    (messageId: string, changes: Partial<Omit<ChatMessageNode, 'id'>>) => {
      setMessagesState((prev) =>
        messagesAdapter.updateOne(prev, { id: messageId, changes }),
      )
    },
    [],
  )

  const getMessageChildren = React.useCallback(
    (messageId: string | null | undefined): string[] => {
      if (messageId) {
        return getMessageById(messageId)?.children ?? []
      }

      return rootMessageIds
    },
    [getMessageById, rootMessageIds],
  )

  const getPersistentParent = React.useCallback(
    (messageId: string | undefined): ChatMessageNode | undefined => {
      if (!messageId) {
        return undefined
      }

      let current = messagesState.entities[messageId]

      while (current) {
        if (current.isPersisted !== false) {
          return current
        }

        if (!current.parentId) {
          break
        }

        current = messagesState.entities[current.parentId]
      }

      return undefined
    },
    [messagesState],
  )

  const getPersistentLastSibling = React.useCallback(
    (messageId: string | undefined): ChatMessageNode | undefined => {
      if (!messageId) {
        return undefined
      }

      const persistentParent = getPersistentParent(messageId)

      const lastChildId = persistentParent?.children
        ?.filter((id) => messagesState.entities[id]?.isPersisted !== false)
        ?.at(-1)

      return lastChildId ? messagesState.entities[lastChildId] : undefined
    },
    [messagesState],
  )

  const handleBranchChange = createBranchChangeHandler(
    params,
    getMessageById,
    upsertMessages,
    setTargetMessageId,
    setLoadingMessage,
  )

  const messageChain = React.useMemo<ChatMessageNode[]>(() => {
    return buildMessageChain(
      targetMessageId,
      loadingMessage,
      messagesState.entities,
      childrenIndex,
    )
  }, [targetMessageId, loadingMessage, messagesState, childrenIndex])

  const generateTemporaryId = () => Math.random().toString(36).substring(2, 15)

  const addTemporaryMessage = React.useCallback(
    ({
      type,
      parentId,
      temporaryId,
      parts,
    }:
      | {
          type: 'user'
          parentId: string | null | undefined
          temporaryId: string
          parts: PromptMessagePart[]
        }
      | {
          type: 'assistant'
          parentId: string
          temporaryId: string
          parts?: never
        }) => {
      setMessagesState((prev) => {
        let state = prev

        if (parentId && prev.entities[parentId]) {
          const parent = prev.entities[parentId]

          const currentChildren = new Set(parent.children)
          currentChildren.add(temporaryId)

          state = messagesAdapter.updateOne(state, {
            id: parentId,
            changes: {
              children: Array.from(currentChildren),
            },
          })
        }

        const temporaryMessage: ChatMessageNode = {
          id: temporaryId,
          status: 'queued',
          role: type,
          parts: type === 'user' ? parts : [],
          parentId: parentId || null,
          isPersisted: false,
        }

        state = messagesAdapter.addOne(state, temporaryMessage)

        return state
      })
    },
    [],
  )

  const replaceTemporaryMessage = React.useCallback(
    ({
      type,
      parentId,
      temporaryId,
      userMessage,
      assistantMessage,
    }:
      | {
          type: 'user'
          parentId: string | null | undefined
          temporaryId: string
          userMessage: ChatMessageNode
          assistantMessage: ChatMessageNode
        }
      | {
          type: 'assistant'
          parentId: string
          temporaryId: string
          userMessage?: never
          assistantMessage: ChatMessageNode
        }) => {
      setMessagesState((prev) => {
        const temporary = prev.entities[temporaryId]
        let state = messagesAdapter.removeOne(prev, temporaryId)

        if (parentId && prev.entities[parentId]) {
          const parent = prev.entities[parentId]!
          const replacementId =
            type === 'user' ? userMessage.id : assistantMessage.id

          const updatedChildren = new Set<string>(
            parent.children?.map((id) =>
              id === temporaryId ? replacementId : id,
            ),
          )

          state = messagesAdapter.updateOne(state, {
            id: parentId,
            changes: {
              children: Array.from(updatedChildren),
            },
          })
        }

        if (type === 'user') {
          state = messagesAdapter.addOne(state, {
            ...userMessage,
            parentId: temporary?.parentId,
          })
          state = messagesAdapter.addOne(state, assistantMessage)
        } else {
          state = messagesAdapter.addOne(state, {
            ...assistantMessage,
            parentId: temporary?.parentId,
          })
        }

        return state
      })
    },
    [],
  )

  const setTemporaryMessageError = React.useCallback(
    ({
      type,
      temporaryId,
    }: {
      type: 'user' | 'assistant'
      temporaryId: string
    }) => {
      updateMessage(temporaryId, {
        status: 'failed',
        metadata: {
          error:
            type === 'user'
              ? 'Failed to send message'
              : 'Failed to generate assistant',
        },
      })
    },
    [updateMessage],
  )

  const sendMessage = async ({ parts }: SendMessageParams) => {
    if (isProcessing(inputStatus)) {
      return
    }

    setInputStatus('submitted')

    const parentId = messageChain.at(-1)?.id
    const temporaryId = generateTemporaryId()

    addTemporaryMessage({ type: 'user', parentId, temporaryId, parts })
    setTargetMessageId(temporaryId)
    scrollRef.current?.scrollToBottom()

    try {
      const persistentParentId = getPersistentParent(parentId)?.id

      const { data, error } = await sdk.sendMessage({
        conversationId: params.chatId,
        data: {
          organizationSlug: params.organizationSlug,
          teamId: params.teamId,
          agentId: params.agentId,
          parentMessageId: persistentParentId,
          message: { parts },
          ...(params.chatId === 'new'
            ? {
                visibility: options?.visibility,
                explorerNode: options?.explorerNode,
              }
            : {}),
          temporaryMessageId: temporaryId,
        },
      })

      if (error) {
        throw new Error(error.message)
      }

      if (params.chatId === 'new') {
        await updateTag('create-chat')
        router.push(
          `/orgs/${params.organizationSlug}/${params.teamId}/agents/${params.agentId}/chats/${data.conversationId}`,
        )
      }

      const isPrivate = chat?.visibility === 'private'

      if (!isPrivate) {
        setInputStatus('ready')
      }

      replaceTemporaryMessage({
        type: 'user',
        parentId,
        temporaryId,
        userMessage: data.userMessage as ChatMessageNode,
        assistantMessage: data.assistantMessage as ChatMessageNode,
      })

      setTargetMessageId(data.userMessage.id)
    } catch {
      setInputStatus('error')
      setTemporaryMessageError({ type: 'user', temporaryId })
    }
  }

  const resendMessage = async ({ messageId, parts }: ResendMessageParams) => {
    if (isProcessing(inputStatus)) {
      return
    }

    setInputStatus('submitted')

    const message = getMessageById(messageId)
    const parentId = message?.parentId
    const temporaryId = generateTemporaryId()

    addTemporaryMessage({ type: 'user', parentId, temporaryId, parts })
    setTargetMessageId(temporaryId)
    scrollRef.current?.scrollToBottom()

    try {
      const { data, error } = await sdk.resendMessage({
        conversationId: params.chatId,
        messageId,
        data: {
          organizationSlug: params.organizationSlug,
          agentId: params.agentId,
          message: { parts },
          temporaryMessageId: temporaryId,
        },
      })

      if (error) {
        throw new Error(error.message)
      }

      const isPrivate = chat?.visibility === 'private'

      if (!isPrivate) {
        setInputStatus('ready')
      }

      replaceTemporaryMessage({
        type: 'user',
        parentId,
        temporaryId,
        userMessage: data.userMessage as ChatMessageNode,
        assistantMessage: data.assistantMessage as ChatMessageNode,
      })

      setTargetMessageId(data.userMessage.id)
    } catch {
      setInputStatus('error')
      setTemporaryMessageError({ type: 'user', temporaryId })
    }
  }

  const regenerateMessage = async ({ messageId }: RegenerateMessageParams) => {
    if (isProcessing(inputStatus)) {
      return
    }

    setInputStatus('submitted')

    const message = getMessageById(messageId)
    const parentId = message?.parentId

    if (!parentId) {
      return
    }

    const temporaryId = generateTemporaryId()

    addTemporaryMessage({ type: 'assistant', parentId, temporaryId })
    setTargetMessageId(temporaryId)
    scrollRef.current?.scrollToBottom()

    try {
      const persistentLastSiblingId = getPersistentLastSibling(parentId)?.id

      if (!persistentLastSiblingId) {
        return
      }

      const { data, error } = await sdk.regenerateMessage({
        conversationId: params.chatId,
        messageId: persistentLastSiblingId,
        data: {
          organizationSlug: params.organizationSlug,
          agentId: params.agentId,
          temporaryMessageId: temporaryId,
        },
      })

      if (error) {
        throw new Error(error.message)
      }

      const isPrivate = chat?.visibility === 'private'

      if (!isPrivate) {
        setInputStatus('ready')
      }

      replaceTemporaryMessage({
        type: 'assistant',
        parentId,
        temporaryId,
        assistantMessage: data.assistantMessage as ChatMessageNode,
      })

      setTargetMessageId(data.assistantMessage.id)
    } catch {
      setInputStatus('error')
      setTemporaryMessageError({ type: 'assistant', temporaryId })
    }
  }

  const stopMessage = async ({ messageId }: StopMessageParams = {}) => {
    const id = messageId || streamingMessageId

    if (!id) {
      return
    }

    try {
      const { error } = await sdk.stopMessage({
        conversationId: params.chatId,
        messageId: id,
        data: {
          organizationSlug: params.organizationSlug,
          agentId: params.agentId,
        },
      })

      if (error) {
        throw new Error(error.message)
      }
    } catch {
      // Silently fail
    }
  }

  const { uploading, uploadFile: uploadFileFn } = useUploadFiles({
    bucket: 'default',
    scope: 'conversations',
    params: {
      organizationSlug: params.organizationSlug,
    },
    agentId: params.agentId,
    conversationId: params.chatId !== 'new' ? params.chatId : null,
  })

  const uploadFile = async ({ id, file }: { id: string; file: File }) => {
    try {
      const { data, error } = await uploadFileFn({ file })

      if (error) {
        return { id, error: error.message }
      }

      if (data) {
        if (data.file.status === 'error') {
          return { id, error: data.file.error.message }
        }

        return {
          id,
          url: new URL(
            data.file.filePath,
            env.NEXT_PUBLIC_STORAGE_URL,
          ).toString(),
          uploaded: true,
        }
      }

      throw new Error('Invalid response')
    } catch {
      return { id, error: 'Failed to upload file' }
    }
  }

  return {
    chat,
    messagesState,
    messages: messageChain,
    loadingMessage,
    getMessageNodeById: getMessageById,
    updateMessageNodeById: updateMessage,
    getMessageNodeChildIdsById: getMessageChildren,
    handleBranchChange,
    sendMessage,
    resendMessage,
    regenerateMessage,
    stopMessage,
    promptInputStatus: inputStatus,
    setPromptInputStatus: setInputStatus,
    conversationScrollRef: scrollRef,
    uploading,
    uploadFile,
    streamingMessageId,
    setStreamingMessageId,
  }
}
