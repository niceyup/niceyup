'use client'

import { updateTag } from '@/actions/cache'
import { useUploadFiles } from '@/hooks/use-upload-files'
import { env } from '@/lib/env'
import { sdk } from '@/lib/sdk'
import type {
  AgentParams,
  Chat,
  ChatParams,
  MessageNode,
  MessageRole,
  OrganizationTeamParams,
  PromptInputStatus,
  PromptMessagePart,
} from '@/lib/types'
import { useChatRealtime } from '@workspace/realtime/hooks'
import type { ConversationScrollToBottom } from '@workspace/ui/components/ai-elements/conversation'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

type Params = OrganizationTeamParams & AgentParams & ChatParams

export type ChatMessageNode = MessageNode & { isPersisted?: boolean }

type ChatLoadingMessage = { id: string; role: MessageRole }

// Memoized message index for O(1) lookups
const createMessageNodeIndex = (messageNodes: ChatMessageNode[]) => {
  const index = new Map<string, ChatMessageNode>()
  const childrenIndex = new Map<string, string[]>()

  for (const messageNode of messageNodes) {
    if (messageNode.parentId) {
      const existing = childrenIndex.get(messageNode.parentId) || []
      existing.push(messageNode.id)
      childrenIndex.set(messageNode.parentId, existing)
    }
    index.set(messageNode.id, messageNode)
  }

  return { index, childrenIndex }
}

// Optimized nodes building with memoization
const buildMessageNodes = (
  targetNodeId: string | undefined,
  loadingMessage: ChatLoadingMessage | false,
  messageNodeIndex: Map<string, ChatMessageNode>,
  childrenIndex: Map<string, string[]>,
) => {
  if (!targetNodeId) {
    return []
  }

  const targetNode = messageNodeIndex.get(targetNodeId)
  if (!targetNode) {
    return []
  }

  // Handle loading state
  if (loadingMessage) {
    const loadingMessageNode = messageNodeIndex.get(loadingMessage.id)
    if (loadingMessageNode) {
      const ancestorNodes = buildAncestorNodes(
        loadingMessageNode,
        messageNodeIndex,
      )

      return [...ancestorNodes, targetNode]
    }
  }

  const ancestorNodes = buildAncestorNodes(targetNode, messageNodeIndex)
  const descendantNodes = buildDescendantNodes(
    targetNode,
    messageNodeIndex,
    childrenIndex,
  )

  return [...ancestorNodes, targetNode, ...descendantNodes]
}

// Build ancestor nodes chain efficiently
const buildAncestorNodes = (
  messageNode: ChatMessageNode,
  messageNodeIndex: Map<string, ChatMessageNode>,
) => {
  const ancestorNodes: ChatMessageNode[] = []
  let currentNode = messageNode

  while (currentNode.parentId) {
    const parentNode = messageNodeIndex.get(currentNode.parentId)
    if (!parentNode) {
      break
    }

    ancestorNodes.unshift(parentNode)
    currentNode = parentNode
  }

  return ancestorNodes
}

// Build descendant nodes chain efficiently
const buildDescendantNodes = (
  messageNode: ChatMessageNode,
  messageNodeIndex: Map<string, ChatMessageNode>,
  childrenIndex: Map<string, string[]>,
) => {
  const descendantNodes: ChatMessageNode[] = []
  let currentNode = messageNode

  while (true) {
    const [firstChildId] = childrenIndex.get(currentNode.id) || []
    if (!firstChildId) {
      break
    }

    const firstChildNode = messageNodeIndex.get(firstChildId)
    if (!firstChildNode) {
      break
    }

    descendantNodes.push(firstChildNode)
    currentNode = firstChildNode
  }

  return descendantNodes
}

// Memoized branch change handler
const createBranchChangeHandler = (
  params: Params,
  loadedMessageNodes: ChatMessageNode[],
  upsertLoadedMessageNodes: (messageNodes: ChatMessageNode[]) => void,
  setTargetNodeId: (targetNodeId: string | undefined) => void,
  setLoadingMessage: (loadingMessage: ChatLoadingMessage | false) => void,
) => {
  return React.useCallback(
    async ({
      previousNodeId,
      targetNodeId,
      role,
    }: {
      previousNodeId: string
      targetNodeId: string
      role: MessageRole
    }) => {
      // Check if message node is already loaded using the index
      const messageNodeIndex = createMessageNodeIndex(loadedMessageNodes)
      const targetNode = messageNodeIndex.index.get(targetNodeId)

      if (targetNode) {
        setTargetNodeId(targetNodeId)
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

        const messageNodes = (data?.messages || []) as ChatMessageNode[]

        upsertLoadedMessageNodes(messageNodes)

        setTargetNodeId(targetNodeId)
      } catch (error) {
        console.error(error)
      } finally {
        setLoadingMessage(false)
      }
    },
    [
      params,
      loadedMessageNodes,
      upsertLoadedMessageNodes,
      setTargetNodeId,
      setLoadingMessage,
    ],
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
  // selectedExplorerNode?: {
  //   visibility: 'private' | 'team'
  //   folderId?: string | null
  // }
}

export function useChat({
  params,
  chat,
  initialMessages,
  // selectedExplorerNode,
}: UseChatParams) {
  const router = useRouter()

  const conversationScrollRef = React.useRef<ConversationScrollToBottom>(null)

  const [loadedMessageNodes, setLoadedMessageNodes] = React.useState<
    ChatMessageNode[]
  >(initialMessages || [])
  const [targetNodeId, setTargetNodeId] = React.useState<string | undefined>(
    initialMessages?.at(-1)?.id,
  )

  const [loadingMessage, setLoadingMessage] = React.useState<
    ChatLoadingMessage | false
  >(false)

  const upsertLoadedMessageNodes = (messageNodes: ChatMessageNode[]) => {
    setLoadedMessageNodes((prevMessageNodes) => {
      const updatedMessageNodes = [...prevMessageNodes]
      const indexById = new Map(updatedMessageNodes.map((mn, i) => [mn.id, i]))
      let changed = false

      for (const messageNode of messageNodes) {
        const idx = indexById.get(messageNode.id)
        if (idx !== undefined) {
          if (updatedMessageNodes[idx] !== messageNode) {
            updatedMessageNodes[idx] = messageNode
            changed = true
          }
        } else {
          indexById.set(messageNode.id, updatedMessageNodes.length)
          updatedMessageNodes.push(messageNode)
          changed = true
        }
      }

      return changed ? updatedMessageNodes : prevMessageNodes
    })
  }

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
      upsertLoadedMessageNodes(messagesRealtime)
    }
  }, [messagesRealtime])

  // Memoized message node index
  const messageNodeIndex = React.useMemo(
    () => createMessageNodeIndex(loadedMessageNodes),
    [loadedMessageNodes],
  )

  // Memoized message node lookup function
  const getMessageNodeById = React.useCallback(
    (id: string | null | undefined) => {
      if (!id) {
        return undefined
      }

      return messageNodeIndex.index.get(id)
    },
    [messageNodeIndex.index],
  )

  const updateMessageNodeById = (
    messageNodeId: string,
    messageNode: Partial<Omit<ChatMessageNode, 'id'>>,
  ) => {
    setLoadedMessageNodes((prevMessageNodes) => {
      return prevMessageNodes.map((prevMessageNode) =>
        prevMessageNode.id === messageNodeId
          ? { ...prevMessageNode, ...messageNode }
          : prevMessageNode,
      )
    })
  }

  const getPersistentParentNode = React.useCallback(
    (parentNodeId: string | undefined): ChatMessageNode | undefined => {
      if (!parentNodeId) {
        return undefined
      }

      let currentNode = messageNodeIndex.index.get(parentNodeId)

      while (currentNode) {
        if (currentNode.isPersisted !== false) {
          return currentNode
        }

        if (!currentNode.parentId) {
          break
        }

        currentNode = messageNodeIndex.index.get(currentNode.parentId)
      }

      return undefined
    },
    [messageNodeIndex.index],
  )

  // Memoized branch change handler
  const handleBranchChange = createBranchChangeHandler(
    params,
    loadedMessageNodes,
    upsertLoadedMessageNodes,
    setTargetNodeId,
    setLoadingMessage,
  )

  // Memoized message node chain filtered by targetNodeId
  const messageNodeChain = React.useMemo<ChatMessageNode[]>(() => {
    return buildMessageNodes(
      targetNodeId,
      loadingMessage,
      messageNodeIndex.index,
      messageNodeIndex.childrenIndex,
    )
  }, [targetNodeId, loadingMessage, messageNodeIndex])

  const [promptInputStatus, setPromptInputStatus] =
    React.useState<PromptInputStatus>('ready')

  const generateFakeNodeId = () => {
    return Math.random().toString(36).substring(2, 15)
  }

  const addFakeNode = ({
    type,
    parentNodeId,
    fakeNodeId,
    parts,
  }:
    | {
        type: 'user'
        parentNodeId?: string
        fakeNodeId: string
        parts: PromptMessagePart[]
      }
    | {
        type: 'assistant'
        parentNodeId: string
        fakeNodeId: string
        parts?: never
      }) => {
    setLoadedMessageNodes((prevMessageNodes) => {
      const updatedMessageNodes = prevMessageNodes.map((messageNode) => {
        if (messageNode.id === parentNodeId) {
          return {
            ...messageNode,
            children: [...(messageNode.children || []), fakeNodeId],
          }
        }

        return messageNode
      })

      updatedMessageNodes.push({
        id: fakeNodeId,
        status: 'queued',
        role: type,
        parts: type === 'user' ? parts : [],
        parentId: parentNodeId,
        isPersisted: false,
      })

      return updatedMessageNodes
    })
  }

  const replaceFakeNode = ({
    type,
    parentNodeId,
    fakeNodeId,
    userMessageNode,
    assistantMessageNode,
  }:
    | {
        type: 'user'
        parentNodeId?: string
        fakeNodeId: string
        userMessageNode: ChatMessageNode
        assistantMessageNode: ChatMessageNode
      }
    | {
        type: 'assistant'
        parentNodeId: string
        fakeNodeId: string
        userMessageNode?: never
        assistantMessageNode: ChatMessageNode
      }) => {
    setLoadedMessageNodes((prevMessageNodes) => {
      const updatedMessageNodes = prevMessageNodes.map((messageNode) => {
        if (messageNode.id === parentNodeId) {
          return {
            ...messageNode,
            children: messageNode.children?.map((id) =>
              id === fakeNodeId
                ? type === 'user'
                  ? userMessageNode.id
                  : assistantMessageNode.id
                : id,
            ),
          }
        }

        if (messageNode.id === fakeNodeId) {
          return {
            ...(type === 'user' ? userMessageNode : assistantMessageNode),
            parentId: messageNode.parentId, // Non-persistent parent node, kept to remain visually hierarchical
          }
        }

        return messageNode
      })

      if (type === 'user') {
        updatedMessageNodes.push(assistantMessageNode)
      }

      return updatedMessageNodes
    })
  }

  const setErrorFakeNode = ({
    type,
    fakeNodeId,
  }: {
    type: 'user' | 'assistant'
    fakeNodeId: string
  }) => {
    setLoadedMessageNodes((prevMessageNodes) => {
      const updatedMessageNodes = prevMessageNodes.map((messageNode) => {
        if (messageNode.id === fakeNodeId) {
          return {
            ...messageNode,
            status: 'failed',
            metadata: {
              error:
                type === 'user'
                  ? 'Failed to send message'
                  : 'Failed to generate assistant',
            },
          } as ChatMessageNode
        }

        return messageNode
      })

      return updatedMessageNodes
    })
  }

  const sendMessage = async ({ parts }: SendMessageParams) => {
    if (
      promptInputStatus === 'submitted' ||
      promptInputStatus === 'streaming'
    ) {
      return
    }

    setPromptInputStatus('submitted')

    const parentNodeId = messageNodeChain.at(-1)?.id
    const fakeNodeId = generateFakeNodeId()

    addFakeNode({ type: 'user', parentNodeId, fakeNodeId, parts })

    conversationScrollRef.current?.scrollToBottom()

    try {
      const persistentParentNodeId = getPersistentParentNode(parentNodeId)?.id

      const { data, error } = await sdk.sendMessage({
        conversationId: params.chatId,
        data: {
          organizationSlug: params.organizationSlug,
          teamId: params.teamId,
          agentId: params.agentId,
          parentMessageId: persistentParentNodeId,
          message: { parts },
          // ...(params.chatId === 'new'
          //   ? {
          //       visibility: selectedExplorerNode.visibility,
          //       explorerNode: {
          //         folderId: selectedExplorerNode.folderId,
          //       },
          //     }
          //   : {}),
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

      replaceFakeNode({
        type: 'user',
        parentNodeId,
        fakeNodeId,
        userMessageNode: data.userMessage as ChatMessageNode,
        assistantMessageNode: data.assistantMessage as ChatMessageNode,
      })
    } catch {
      setPromptInputStatus('error')

      setErrorFakeNode({ type: 'user', fakeNodeId })
    }
  }

  const resendMessage = async ({ messageId, parts }: ResendMessageParams) => {
    if (
      promptInputStatus === 'submitted' ||
      promptInputStatus === 'streaming'
    ) {
      return
    }

    setPromptInputStatus('submitted')

    const messageNode = getMessageNodeById(messageId)

    const parentNodeId = messageNode?.parentId

    if (!parentNodeId) {
      return
    }

    const fakeNodeId = generateFakeNodeId()

    addFakeNode({ type: 'user', parentNodeId, fakeNodeId, parts })

    setTargetNodeId(fakeNodeId)

    conversationScrollRef.current?.scrollToBottom()

    try {
      const persistentParentNodeId = getPersistentParentNode(parentNodeId)?.id

      if (!persistentParentNodeId) {
        return
      }

      const { data, error } = await sdk.resendMessage({
        conversationId: params.chatId,
        data: {
          organizationSlug: params.organizationSlug,
          agentId: params.agentId,
          parentMessageId: persistentParentNodeId,
          message: { parts },
          // referenceMessageId: message.isPersisted === false ? undefined : message.id,
        },
      })

      if (error) {
        throw new Error(error.message)
      }

      replaceFakeNode({
        type: 'user',
        parentNodeId,
        fakeNodeId,
        userMessageNode: data.userMessage as ChatMessageNode,
        assistantMessageNode: data.assistantMessage as ChatMessageNode,
      })

      setTargetNodeId(data.userMessage.id)
    } catch {
      setPromptInputStatus('error')

      setErrorFakeNode({ type: 'user', fakeNodeId })
    }
  }

  const regenerateMessage = async ({ messageId }: RegenerateMessageParams) => {
    if (
      promptInputStatus === 'submitted' ||
      promptInputStatus === 'streaming'
    ) {
      return
    }

    setPromptInputStatus('submitted')

    const messageNode = getMessageNodeById(messageId)

    const parentNodeId = messageNode?.parentId

    if (!parentNodeId) {
      return
    }

    const fakeNodeId = generateFakeNodeId()

    addFakeNode({ type: 'assistant', parentNodeId, fakeNodeId })

    setTargetNodeId(fakeNodeId)

    conversationScrollRef.current?.scrollToBottom()

    try {
      const persistentParentNodeId = getPersistentParentNode(parentNodeId)?.id

      if (!persistentParentNodeId) {
        return
      }

      const { data, error } = await sdk.regenerateMessage({
        conversationId: params.chatId,
        data: {
          organizationSlug: params.organizationSlug,
          agentId: params.agentId,
          parentMessageId: persistentParentNodeId,
          // referenceMessageId: message.isPersisted === false ? undefined : message.id,
        },
      })

      if (error) {
        throw new Error(error.message)
      }

      replaceFakeNode({
        type: 'assistant',
        parentNodeId,
        fakeNodeId,
        assistantMessageNode: data.assistantMessage as ChatMessageNode,
      })

      setTargetNodeId(data.assistantMessage.id)
    } catch {
      setPromptInputStatus('error')

      setErrorFakeNode({ type: 'assistant', fakeNodeId })
    }
  }

  const stopMessage = async ({ messageId }: StopMessageParams = {}) => {
    const msgId = messageId || streamingMessageId

    if (!msgId) {
      return
    }

    try {
      const { error } = await sdk.stopMessage({
        conversationId: params.chatId,
        messageId: msgId,
        data: {
          organizationSlug: params.organizationSlug,
          agentId: params.agentId,
        },
      })

      if (error) {
        throw new Error(error.message)
      }
    } catch {}
  }

  const { uploading, uploadFile: uploadFileHook } = useUploadFiles({
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
      const { data, error } = await uploadFileHook({ file })

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

      throw new Error()
    } catch {
      return { id, error: 'Failed to upload file' }
    }
  }

  const [streamingMessageId, setStreamingMessageId] = React.useState<
    string | null
  >(null)

  return {
    chat,
    messages: messageNodeChain,
    loadingMessage,
    getMessageNodeById,
    updateMessageNodeById,
    handleBranchChange,
    sendMessage,
    resendMessage,
    regenerateMessage,
    stopMessage,
    promptInputStatus,
    setPromptInputStatus,
    conversationScrollRef,
    uploading,
    uploadFile,
    streamingMessageId,
    setStreamingMessageId,
  }
}
