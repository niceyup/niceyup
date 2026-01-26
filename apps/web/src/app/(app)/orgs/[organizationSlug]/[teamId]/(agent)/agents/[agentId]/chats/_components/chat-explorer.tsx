'use client'

import type {
  AgentParams,
  ConversationVisibility,
  OrganizationTeamParams,
} from '@/lib/types'
import {
  type FeatureImplementation,
  type ItemInstance,
  type TreeInstance,
  asyncDataLoaderFeature,
  dragAndDropFeature,
  hotkeysCoreFeature,
  keyboardDragAndDropFeature,
  renamingFeature,
  selectionFeature,
} from '@headless-tree/core'
import { AssistiveTreeDescription, useTree } from '@headless-tree/react'
import { Button } from '@workspace/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { Input } from '@workspace/ui/components/input'
import { Spinner } from '@workspace/ui/components/spinner'
import {
  Tree,
  TreeDragLine,
  TreeItem,
  TreeItemLabel,
} from '@workspace/ui/components/tree'
import { cn } from '@workspace/ui/lib/utils'
import {
  CircleXIcon,
  FolderIcon,
  FolderOpenIcon,
  MessageCircleIcon,
  MoreVerticalIcon,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import {
  createFolderInConversationExplorerNode,
  deleteItemInConversationExplorerNode,
  getChildrenWithDataInConversationExplorerNode,
  getItemInConversationExplorerNode,
  updateNameOfItemInConversationExplorerNode,
  updateParentIdOfItemsInConversationExplorerNode,
} from '../_actions/conversation-explorer-nodes'

// ============================================================================
// Provider Context & Types
// ============================================================================

type Params = OrganizationTeamParams & AgentParams

type Item = {
  name?: string
  conversationId?: string | null
  fractionalIndex?: string | null
  folder?: boolean
  loading?: boolean
  disabled?: boolean
  unknown?: boolean
  children?: string[]
}

function toItemData(item: Item) {
  const folder = !item.conversationId

  return { ...item, folder, children: folder ? item.children : undefined }
}

declare module '@headless-tree/core' {
  // biome-ignore lint/correctness/noUnusedVariables: <explanation>
  export interface ItemInstance<T> {
    isChat: () => boolean
  }
}

const chatExplorerFeature: FeatureImplementation<Item> = {
  key: 'chat-explorer',
  itemInstance: {
    isChat: ({ item }) => item.getItemData().conversationId,
  },
}

type ChatExplorerContextType = {
  params: Params
  visibility: ConversationVisibility
  indent: number
  tree: TreeInstance<Item>
  focusedItem: string | null
  selectedItems: string[]
  loadingItemData: string[]
  loadingItemChildrens: string[]
  setFocusedItem: React.Dispatch<React.SetStateAction<string | null>>
  setSelectedItems: React.Dispatch<React.SetStateAction<string[]>>
  setLoadingItemData: React.Dispatch<React.SetStateAction<string[]>>
  setLoadingItemChildrens: React.Dispatch<React.SetStateAction<string[]>>
  setFocusedSelectedItem: (itemId: string) => void
  onClickItem?: (item: { id: string; conversationId?: string | null }) => void
}

const ChatExplorerContext = React.createContext<
  ChatExplorerContextType | undefined
>(undefined)

export function useChatExplorerContext(): ChatExplorerContextType {
  const context = React.useContext(ChatExplorerContext)

  if (context === undefined) {
    throw new Error(
      'useChatExplorerContext must be used within a ChatExplorerProvider',
    )
  }

  return context
}

export function ChatExplorerProvider({
  params,
  visibility,
  initialItems,
  onClickItem,
  onSelectedFolderPath,
  children,
}: {
  params: Params
  visibility: ConversationVisibility
  initialItems?: { id: string; data: Item }[]
  onClickItem?: (item: { id: string; conversationId?: string | null }) => void
  onSelectedFolderPath?: (
    folderPath: { id: string; name?: string; parentId?: string }[],
  ) => Promise<void> | void
  children: React.ReactNode
}) {
  const indent = 10

  const [focusedItem, setFocusedItem] = React.useState<string | null>(null)
  const [selectedItems, setSelectedItems] = React.useState<string[]>([])
  const [loadingItemData, setLoadingItemData] = React.useState<string[]>([])
  const [loadingItemChildrens, setLoadingItemChildrens] = React.useState<
    string[]
  >([])

  const setFocusedSelectedItem = (itemId: string) => {
    setSelectedItems([itemId])
    setFocusedItem(itemId)
  }

  const invalidatedParentIds = async (items: ItemInstance<Item>[]) => {
    const uniqueInvalidatedIds = new Set<string>()

    for (const item of items.sort(
      (a, b) => b.getItemMeta().level - a.getItemMeta().level,
    )) {
      const parentItemInstance = item.getParent()
      if (parentItemInstance?.isFolder()) {
        uniqueInvalidatedIds.add(parentItemInstance.getId())
      }
    }

    for (const parentId of uniqueInvalidatedIds) {
      const parentItemInstance = tree.getItemInstance(parentId)
      if (parentItemInstance.isFolder()) {
        await parentItemInstance.invalidateChildrenIds(true)
      }
    }
  }

  const tree = useTree<Item>({
    indent,
    rootItemId: 'root',
    state: {
      focusedItem,
      selectedItems,
      loadingItemData,
      loadingItemChildrens,
    },
    setFocusedItem,
    setSelectedItems,
    setLoadingItemData,
    setLoadingItemChildrens,
    getItemName: (item) => item.getItemData().name || '',
    isItemFolder: (item) => Boolean(item.getItemData().folder),
    createLoadingItemData: () => ({
      id: 'loading',
      loading: true,
      disabled: true,
    }),
    dataLoader: {
      getItem: async (itemId) => {
        const itemData = await getItemInConversationExplorerNode(params, {
          visibility,
          itemId,
        })

        if (itemData) {
          return toItemData(itemData)
        }

        return { id: 'unknown', unknown: true, disabled: true }
      },
      getChildrenWithData: async (itemId) => {
        const hasInitialItems = itemId === 'root' && initialItems?.length

        const childrenWithData = hasInitialItems
          ? initialItems
          : await getChildrenWithDataInConversationExplorerNode(params, {
              visibility,
              itemId,
            })

        return childrenWithData.map((child) => ({
          ...child,
          data: toItemData(child.data),
        }))
      },
    },
    canReorder: true,
    onDrop: async (items, target) => {
      const itemsIds = items.map((item) => item.getId())
      const insertionIndex = (target as { insertionIndex?: number })
        ?.insertionIndex

      setLoadingItemData((prev) => [...prev, ...itemsIds])

      await updateParentIdOfItemsInConversationExplorerNode(params, {
        visibility,
        itemIds: itemsIds,
        parentId: target.item.getId(),
        insertionIndex,
      })

      await invalidatedParentIds(items)
      await Promise.all([
        target.item.invalidateChildrenIds(),
        // onDropItems?.(
        //   items.map((item) => ({
        //     id: item.getId(),
        //     conversationId: item.getItemData().conversationId,
        //   })),
        //   { id: target.item.getId(), insertionIndex },
        // ),
      ])
    },
    onRename: async (item, value) => {
      const { conversationId } = item.getItemData()

      setLoadingItemData((prev) => [...prev, item.getId()])

      item.updateCachedData({ name: value })
      await updateNameOfItemInConversationExplorerNode(params, {
        visibility,
        name: value,
        ...(conversationId ? { conversationId } : { itemId: item.getId() }),
      })

      await Promise.all([
        item.invalidateItemData(true),
        // onRenameItem?.({ id: item.getId(), conversationId }, value),
      ])
    },
    features: [
      asyncDataLoaderFeature,
      selectionFeature,
      dragAndDropFeature,
      keyboardDragAndDropFeature,
      hotkeysCoreFeature,
      renamingFeature,
      chatExplorerFeature,
    ],
  })

  React.useEffect(() => {
    if (onSelectedFolderPath) {
      const [selectedItemId] = selectedItems

      if (!selectedItemId) {
        onSelectedFolderPath([])
        return
      }

      const itemInstance = tree.getItemInstance(selectedItemId)
      const parentItems = []

      let currentItem = itemInstance

      while (currentItem.isChat() || currentItem.isFolder()) {
        if (currentItem.isFolder()) {
          parentItems.push({
            id: currentItem.getId(),
            name: currentItem.getItemData().name,
            parentId: currentItem.getParent()?.getId(),
          })
        }

        const parent = currentItem.getParent()

        if (!parent || parent.getId() === 'root') {
          break
        }

        currentItem = parent
      }

      onSelectedFolderPath(parentItems.reverse())
    }
  }, [selectedItems])

  const contextValue: ChatExplorerContextType = {
    params,
    visibility,
    indent,
    tree,
    focusedItem,
    selectedItems,
    loadingItemData,
    loadingItemChildrens,
    setFocusedItem,
    setSelectedItems,
    setLoadingItemData,
    setLoadingItemChildrens,
    setFocusedSelectedItem,
    onClickItem,
  }

  return (
    <ChatExplorerContext.Provider value={contextValue}>
      {children}
    </ChatExplorerContext.Provider>
  )
}

type ChatExplorerItemContextType = {
  item: ItemInstance<Item>
}

const ChatExplorerItemContext = React.createContext<
  ChatExplorerItemContextType | undefined
>(undefined)

export function useChatExplorerItemContext(): ChatExplorerItemContextType {
  const context = React.useContext(ChatExplorerItemContext)

  if (context === undefined) {
    throw new Error(
      'useChatExplorerItemContext must be used within a ChatExplorerItemProvider',
    )
  }

  return context
}

export function ChatExplorerItemProvider({
  item,
  children,
}: {
  item: ItemInstance<Item>
  children: React.ReactNode
}) {
  const contextValue: ChatExplorerItemContextType = { item }

  return (
    <ChatExplorerItemContext.Provider value={contextValue}>
      {children}
    </ChatExplorerItemContext.Provider>
  )
}

// ============================================================================
// Components
// ============================================================================

export function ChatExplorer() {
  const { indent, tree } = useChatExplorerContext()

  return (
    <Tree indent={indent} tree={tree}>
      <AssistiveTreeDescription tree={tree} />

      {tree.getItems().map((item) => (
        <ChatExplorerTreeItem key={item.getId()} item={item} />
      ))}

      <TreeDragLine />
    </Tree>
  )
}

function ChatExplorerTreeItem({ item }: { item: ItemInstance<Item> }) {
  return (
    <ChatExplorerItemProvider item={item}>
      <TreeItem
        item={item}
        data-disabled={item.getItemData().disabled ? true : undefined}
        asChild
      >
        <div>
          <ChatExplorerItem />
        </div>
      </TreeItem>
    </ChatExplorerItemProvider>
  )
}

function ChatExplorerItem() {
  const { params, onClickItem } = useChatExplorerContext()
  const { item } = useChatExplorerItemContext()

  const router = useRouter()

  if (item.getItemData().unknown) {
    return (
      <TreeItemLabel>
        <span className="flex items-center gap-2">
          <CircleXIcon className="size-4 text-muted-foreground" />
          <p className="text-muted-foreground italic">Unknown</p>
        </span>
      </TreeItemLabel>
    )
  }

  if (item.getItemData().loading) {
    return (
      <TreeItemLabel>
        <span className="flex items-center gap-2">
          <Spinner className="text-muted-foreground" />
          <p className="text-muted-foreground italic">Loading</p>
        </span>
      </TreeItemLabel>
    )
  }

  return (
    <TreeItemLabel
      className="group relative"
      onClick={(e) => {
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
          const { conversationId } = item.getItemData()

          if (conversationId) {
            router.push(
              `/orgs/${params.organizationSlug}/${params.teamId}/agents/${params.agentId}/chats/${conversationId}`,
            )
          }

          onClickItem?.({ id: item.getId(), conversationId })
        }
      }}
    >
      <ChatExplorerItemLabel />
      <ChatExplorerItemActions />
    </TreeItemLabel>
  )
}

function ChatExplorerItemLabel() {
  const { item } = useChatExplorerItemContext()

  return (
    <span className="flex flex-1 items-center gap-2">
      {item.isLoading() ? (
        <Spinner className="text-muted-foreground" />
      ) : item.isFolder() ? (
        item.isExpanded() ? (
          <FolderOpenIcon className="size-4 text-muted-foreground" />
        ) : (
          <FolderIcon className="size-4 text-muted-foreground" />
        )
      ) : (
        <MessageCircleIcon className="size-4 text-muted-foreground" />
      )}

      {item.isRenaming() ? (
        <Input
          {...item.getRenameInputProps()}
          autoFocus
          className="-my-0.5 h-6 px-1 text-sm"
        />
      ) : (
        <p className="flex items-center gap-1">
          <span
            className={cn('line-clamp-1 break-all text-start', {
              italic: !item.getItemName(),
            })}
          >
            {item.getItemName() ||
              (item.isFolder() ? 'Unnamed folder' : 'Untitled')}
          </span>
        </p>
      )}
    </span>
  )
}

function ChatExplorerItemActions() {
  const { item } = useChatExplorerItemContext()

  const [open, setOpen] = React.useState(false)

  return (
    <div
      className={cn(
        '-my-0.5 invisible flex items-center opacity-0 transition-opacity group-hover:visible group-hover:opacity-100',
        {
          // Display actions when the dropdown menu is open
          'visible opacity-100': open,
          // Hide actions when the item is renaming
          'invisible opacity-0 group-hover:invisible group-hover:opacity-0':
            item.isRenaming(),
          // Display above actions when the item is selected
          'absolute right-0 mr-1 rounded-sm bg-gradient-to-l from-60% from-accent pr-1 pl-8':
            !open || item.isSelected(),
        },
      )}
    >
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            className="size-6 rounded-sm"
            disabled={item.isLoading()}
          >
            <MoreVerticalIcon />
          </Button>
        </DropdownMenuTrigger>

        <ChatExplorerItemActionsContent />
      </DropdownMenu>
    </div>
  )
}

function ChatExplorerItemActionsContent() {
  const { visibility } = useChatExplorerContext()
  const { item } = useChatExplorerItemContext()

  if (visibility === 'shared') {
    return (
      <DropdownMenuContent align="start">
        <ChatExplorerItemActionRename />
        <ChatExplorerItemActionDelete label="Leave" />
      </DropdownMenuContent>
    )
  }

  return (
    <DropdownMenuContent align="start">
      <ChatExplorerItemActionNewChat />
      {item.isFolder() && <ChatExplorerItemActionNewFolder />}

      <DropdownMenuSeparator />

      <ChatExplorerItemActionRename />
      <ChatExplorerItemActionDelete />
    </DropdownMenuContent>
  )
}

function ChatExplorerItemActionNewChat({
  label = 'New chat',
}: { label?: string }) {
  const { params, setFocusedSelectedItem } = useChatExplorerContext()
  const { item } = useChatExplorerItemContext()

  const router = useRouter()

  const onNewChat = () => {
    item.expand()
    setFocusedSelectedItem(item.getId())

    router.push(
      `/orgs/${params.organizationSlug}/${params.teamId}/agents/${params.agentId}/chats/new`,
    )
  }

  return (
    <DropdownMenuItem
      onClick={(e) => {
        e.stopPropagation()
        onNewChat()
      }}
    >
      {label}
    </DropdownMenuItem>
  )
}

function ChatExplorerItemActionNewFolder({
  label = 'New folder',
}: { label?: string; shortcut?: string }) {
  const { params, visibility, setFocusedSelectedItem, setLoadingItemData } =
    useChatExplorerContext()
  const { item } = useChatExplorerItemContext()

  const focusRenaming = (item: ItemInstance<Item>) => {
    // Fix: The renaming input is not focused
    setTimeout(() => {
      setFocusedSelectedItem(item.getId())
      item.startRenaming()
    }, 300)
  }

  const onNewFolder = async () => {
    item.expand()

    setLoadingItemData((prev) => [...prev, item.getId()])

    const newFolder = await createFolderInConversationExplorerNode(params, {
      visibility,
      parentId: item.getId(),
      name: 'New folder',
    })

    setLoadingItemData((prev) => prev.filter((id) => id !== item.getId()))

    if (!newFolder) {
      return
    }

    await item.invalidateChildrenIds()

    const newFolderItemInstance = item
      .getChildren()
      .find((child) => child.getId() === newFolder.id)

    if (!newFolderItemInstance) {
      return
    }

    focusRenaming(newFolderItemInstance)
  }

  return (
    <DropdownMenuItem
      onClick={(e) => {
        e.stopPropagation()
        onNewFolder()
      }}
    >
      {label}
    </DropdownMenuItem>
  )
}

function ChatExplorerItemActionRename({
  label = 'Rename',
  shortcut,
}: { label?: string; shortcut?: string }) {
  const { setFocusedSelectedItem } = useChatExplorerContext()
  const { item } = useChatExplorerItemContext()

  const focusRenaming = (item: ItemInstance<Item>) => {
    // Fix: The renaming input is not focused
    setTimeout(() => {
      setFocusedSelectedItem(item.getId())
      item.startRenaming()
    }, 300)
  }

  const onRename = async () => {
    focusRenaming(item)
  }

  return (
    <DropdownMenuItem
      onClick={(e) => {
        e.stopPropagation()
        onRename()
      }}
    >
      {label}
      {shortcut && <DropdownMenuShortcut>{shortcut}</DropdownMenuShortcut>}
    </DropdownMenuItem>
  )
}

function ChatExplorerItemActionDelete({
  label = 'Delete',
}: { label?: string }) {
  const { params, visibility, setLoadingItemData } = useChatExplorerContext()
  const { item } = useChatExplorerItemContext()

  const onDelete = async () => {
    setLoadingItemData((prev) => [...prev, item.getId()])

    await deleteItemInConversationExplorerNode(params, {
      visibility,
      itemId: item.getId(),
    })

    const parentItemInstance = item.getParent()

    if (parentItemInstance?.isFolder()) {
      await parentItemInstance.invalidateChildrenIds(true)
    } else {
      await item.invalidateItemData(true)
    }
  }

  return (
    <DropdownMenuItem
      variant="destructive"
      onClick={(e) => {
        e.stopPropagation()
        onDelete()
      }}
    >
      {label}
    </DropdownMenuItem>
  )
}

export function ChatExplorerRevealItem({
  revealItemPath,
  onRevealItem,
  revealingItems,
  setRevealingItems,
  children,
}: {
  revealItemPath: { id: string; parentIds: string[] } | null
  onRevealItem: (itemId: string) => Promise<void> | void
  revealingItems: string[]
  setRevealingItems: React.Dispatch<React.SetStateAction<string[]>>
  children: React.ReactNode
}) {
  const { tree, setFocusedSelectedItem } = useChatExplorerContext()

  const revealItem = async () => {
    if (!revealItemPath || revealingItems.includes(revealItemPath.id)) {
      return
    }

    const { id: itemId, parentIds } = revealItemPath

    setRevealingItems((prev) => [...prev, itemId])

    if (parentIds.length) {
      const invalidatedParentIds = new Set<string>()

      for (const parentId of parentIds.reverse()) {
        const parentItemInstance = tree.getItemInstance(parentId)
        invalidatedParentIds.add(parentId)
        if (parentItemInstance.isFolder()) {
          break
        }
      }

      if (parentIds.length === invalidatedParentIds.size) {
        const rootItemInstance = tree.getRootItem()
        await rootItemInstance.invalidateChildrenIds()
      }

      for (const parentId of [...invalidatedParentIds].reverse()) {
        const parentItemInstance = tree.getItemInstance(parentId)
        if (parentItemInstance.isFolder()) {
          await parentItemInstance.invalidateChildrenIds()
          parentItemInstance.expand()
        }
      }
    } else {
      const rootItemInstance = tree.getRootItem()
      await rootItemInstance.invalidateChildrenIds()
    }

    if (itemId) {
      const itemInstance = tree.getItemInstance(itemId)

      if (
        itemInstance.getItemData().conversationId ||
        itemInstance.isFolder()
      ) {
        setFocusedSelectedItem(itemId)
        onRevealItem(itemId)
      }
    }

    setRevealingItems((prev) => prev.filter((id) => id !== itemId))
  }

  React.useEffect(() => {
    revealItem()
  }, [revealItemPath])

  return children
}
