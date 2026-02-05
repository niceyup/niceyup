'use client'

import { sdk } from '@/lib/sdk'
import type {
  AgentParams,
  ChatParams,
  ConversationVisibility,
  OrganizationTeamParams,
} from '@/lib/types'
import { createEntityAdapter } from '@reduxjs/toolkit'
import { Button } from '@workspace/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { Input } from '@workspace/ui/components/input'
import { Spinner } from '@workspace/ui/components/spinner'
import { cn } from '@workspace/ui/lib/utils'
import { MoreVerticalIcon } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import * as React from 'react'

// ============================================================================
// Provider Context & Types
// ============================================================================

type Params = OrganizationTeamParams & AgentParams

type Item = {
  id: string
  title: string
  updatedAt?: string
  loading?: boolean
}

type UpsertItem = Pick<Item, 'id'> & Partial<Omit<Item, 'id'>>

// Create entity adapter with sorting by updatedAt (newest first)
const itemsAdapter = createEntityAdapter<Item>({
  sortComparer: (a, b) => {
    const dateA = (a.updatedAt ? new Date(a.updatedAt) : new Date()).getTime()
    const dateB = (b.updatedAt ? new Date(b.updatedAt) : new Date()).getTime()
    return dateB - dateA // Descending order (newest first)
  },
})

type ChatListContextType = {
  params: Params
  visibility: ConversationVisibility
  items: Item[]
  updateItem: (id: string, updater: (prev: Item) => Item) => void
  upsertItems: (payload: UpsertItem | UpsertItem[] | undefined) => void
  deleteItem: (itemId: string) => void
  onRenameItem?: (item: { id: string }, value: string) => Promise<void> | void
  onDeleteItem?: (item: { id: string }) => Promise<void> | void
}

const ChatListContext = React.createContext<ChatListContextType | undefined>(
  undefined,
)

export function useChatListContext(): ChatListContextType {
  const context = React.useContext(ChatListContext)

  if (context === undefined) {
    throw new Error('useChatListContext must be used within a ChatListProvider')
  }

  return context
}

export function ChatListProvider({
  params,
  visibility,
  initialItems,
  onRenameItem,
  onDeleteItem,
  children,
}: {
  params: Params
  visibility: ConversationVisibility
  initialItems?: Item[]
  onRenameItem?: (item: { id: string }, value: string) => Promise<void> | void
  onDeleteItem?: (item: { id: string }) => Promise<void> | void
  children: React.ReactNode
}) {
  const [itemsState, setItemsState] = React.useState(() =>
    itemsAdapter.getInitialState(),
  )

  function updateItem(id: string, updater: (prev: Item) => Item) {
    setItemsState((prev) => {
      const item = prev.entities[id]

      if (!item) {
        return prev
      }

      return itemsAdapter.upsertOne(prev, updater(item))
    })
  }

  function upsertItems(payload: UpsertItem | UpsertItem[] | undefined) {
    if (!payload) {
      return
    }

    const items = Array.isArray(payload) ? payload : [payload]

    setItemsState((prev) => itemsAdapter.upsertMany(prev, items as Item[]))
  }

  function deleteItem(id: string) {
    setItemsState((prev) => itemsAdapter.removeOne(prev, id))
  }

  const items = React.useMemo(() => {
    return itemsAdapter.getSelectors().selectAll(itemsState)
  }, [itemsState])

  React.useEffect(() => {
    if (initialItems?.length) {
      upsertItems(initialItems)
    }
  }, [initialItems])

  const contextValue: ChatListContextType = {
    params,
    visibility,
    items,
    updateItem,
    upsertItems,
    deleteItem,
    onRenameItem,
    onDeleteItem,
  }

  return (
    <ChatListContext.Provider value={contextValue}>
      {children}
    </ChatListContext.Provider>
  )
}

type ChatListItemContextType = {
  chatId: string
  item: Item
  selected: boolean
  setSelected: React.Dispatch<React.SetStateAction<boolean>>
  renaming: boolean
  setRenaming: React.Dispatch<React.SetStateAction<boolean>>
}

const ChatListItemContext = React.createContext<
  ChatListItemContextType | undefined
>(undefined)

export function useChatListItemContext(): ChatListItemContextType {
  const context = React.useContext(ChatListItemContext)

  if (context === undefined) {
    throw new Error(
      'useChatListItemContext must be used within a ChatListItemProvider',
    )
  }

  return context
}

export function ChatListItemProvider({
  item,
  children,
}: {
  item: Item
  children: React.ReactNode
}) {
  const params = useParams<ChatParams>()

  const [selected, setSelected] = React.useState(item.id === params.chatId)
  const [renaming, setRenaming] = React.useState(false)

  React.useEffect(() => {
    setSelected(item.id === params.chatId)
  }, [item.id, params.chatId])

  const contextValue: ChatListItemContextType = {
    chatId: params.chatId,
    item,
    selected,
    setSelected,
    renaming,
    setRenaming,
  }

  return (
    <ChatListItemContext.Provider value={contextValue}>
      {children}
    </ChatListItemContext.Provider>
  )
}

// ============================================================================
// Components
// ============================================================================

export function ChatList() {
  const { items } = useChatListContext()

  return (
    <div className="flex flex-col gap-1">
      {items.map((item) => (
        <ChatListItemProvider key={item.id} item={item}>
          <ChatListItem />
        </ChatListItemProvider>
      ))}
    </div>
  )
}

function ChatListItem() {
  const { params, updateItem, onRenameItem } = useChatListContext()
  const { item, selected, renaming, setRenaming } = useChatListItemContext()

  const onRename = async (value: string) => {
    updateItem(item.id, (prev) => ({ ...prev, title: value, loading: true }))

    await sdk.updateConversation({
      conversationId: item.id,
      data: {
        organizationSlug: params.organizationSlug,
        agentId: params.agentId,
        title: value,
      },
    })
    await onRenameItem?.({ id: item.id }, value)

    updateItem(item.id, (prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      loading: false,
    }))
  }

  return (
    <Link
      href={`/orgs/${params.organizationSlug}/${params.teamId}/agents/${params.agentId}/chats/${item.id}`}
      className={cn(
        'group relative flex items-center gap-1 rounded-sm bg-background px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
        { 'bg-accent font-medium text-accent-foreground': selected },
      )}
    >
      <span className="flex flex-1 items-center gap-2">
        {item.loading && <Spinner className="text-muted-foreground" />}

        {renaming ? (
          <Input
            placeholder="Enter a new title"
            defaultValue={item.title}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setRenaming(false)
                onRename(e.currentTarget.value)
              } else if (e.key === 'Escape') {
                setRenaming(false)
              }
            }}
            onBlur={() => setRenaming(false)}
            autoFocus
            className="-my-0.5 h-6 px-1 text-sm"
          />
        ) : (
          <p className="flex items-center gap-1">
            <span
              className={cn('line-clamp-1 break-all text-start', {
                italic: !item.title,
              })}
            >
              {item.title || 'Untitled'}
            </span>
          </p>
        )}
      </span>

      <ChatListItemActions />
    </Link>
  )
}

function ChatListItemActions() {
  const { item, selected, renaming } = useChatListItemContext()

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
            renaming,
          // Display above actions when the item is selected
          'absolute right-0 mr-1 rounded-sm bg-gradient-to-l from-60% from-accent pr-1 pl-8':
            !open || selected,
        },
      )}
    >
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            className="size-6 rounded-sm"
            disabled={item.loading}
          >
            <MoreVerticalIcon />
          </Button>
        </DropdownMenuTrigger>

        <ChatListItemActionsContent />
      </DropdownMenu>
    </div>
  )
}

function ChatListItemActionsContent() {
  const { visibility } = useChatListContext()

  return (
    <DropdownMenuContent align="start">
      <ChatListItemActionRename />
      {visibility === 'shared' ? (
        <ChatListItemActionDelete label="Leave" />
      ) : (
        <ChatListItemActionDelete />
      )}
    </DropdownMenuContent>
  )
}

function ChatListItemActionRename({ label = 'Rename' }: { label?: string }) {
  const { setRenaming } = useChatListItemContext()

  const focusRenaming = () => {
    setTimeout(() => {
      setRenaming(true)
    }, 300)
  }

  const onRename = async () => {
    focusRenaming()
  }

  return (
    <DropdownMenuItem
      onClick={(e) => {
        e.stopPropagation()
        onRename()
      }}
    >
      {label}
    </DropdownMenuItem>
  )
}

function ChatListItemActionDelete({ label = 'Delete' }: { label?: string }) {
  const { params, updateItem, deleteItem, onDeleteItem } = useChatListContext()
  const { chatId, item } = useChatListItemContext()

  const router = useRouter()

  const onDelete = async () => {
    updateItem(item.id, (prev) => ({ ...prev, loading: true }))

    if (chatId === item.id) {
      router.push(
        `/orgs/${params.organizationSlug}/${params.teamId}/agents/${params.agentId}/chats/new`,
      )
    }

    await sdk.deleteConversation({
      conversationId: item.id,
      data: {
        organizationSlug: params.organizationSlug,
        agentId: params.agentId,
      },
    })
    await onDeleteItem?.({ id: item.id })

    deleteItem(item.id)
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
