'use client'

import { updateTag } from '@/actions/cache'
import { sdk } from '@/lib/sdk'
import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import {
  type FeatureImplementation,
  type ItemInstance,
  type TreeInstance,
  asyncDataLoaderFeature,
  checkboxesFeature,
  expandAllFeature,
  hotkeysCoreFeature,
  searchFeature,
  selectionFeature,
} from '@headless-tree/core'
import { useTree } from '@headless-tree/react'
import type {
  SourceIndexStatus,
  SourceOperationStatus,
  SourceOperationType,
  SourceStatus,
  SourceType,
} from '@workspace/core/sources'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { ButtonGroup } from '@workspace/ui/components/button-group'
import { Checkbox } from '@workspace/ui/components/checkbox'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import { Spinner } from '@workspace/ui/components/spinner'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'
import { Tree, TreeItem, TreeItemLabel } from '@workspace/ui/components/tree'
import { cn } from '@workspace/ui/lib/utils'
import {
  AlertCircleIcon,
  CircleCheckIcon,
  CircleXIcon,
  ClockIcon,
  FileIcon,
  FilterIcon,
  FolderIcon,
  FolderOpenIcon,
  InfoIcon,
  ListCollapseIcon,
  ListTreeIcon,
  PlayIcon,
  RotateCwIcon,
} from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'
import {
  getChildrenWithDataInSourceExplorerNode,
  getItemInSourceExplorerNode,
} from '../_actions/source-explorer-nodes'
import type { SourceExplorerNodeStatus } from '../_lib/types'
import { sourceExplorerNodeStatus } from '../_lib/utils'

// ============================================================================
// Provider Context & Types
// ============================================================================

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  agentId: AgentParams['agentId']
}

type Item = {
  name?: string
  sourceId?: string | null
  sourceType?: string | null
  source?:
    | {
        type: SourceType | null
        status: SourceStatus | null
        operationType: SourceOperationType | null
        operationStatus: SourceOperationStatus | null
      }
    | undefined
  sourceIndex?:
    | {
        status: SourceIndexStatus | null
        operationType: SourceOperationType | null
        operationStatus: SourceOperationStatus | null
      }
    | undefined
  fractionalIndex?: string | null
  folder?: boolean
  loading?: boolean
  disabled?: boolean
  unknown?: boolean
  children?: string[]
}

function toItemData(item: Item) {
  const folder = !item.sourceId

  return { ...item, folder, children: folder ? item.children : undefined }
}

declare module '@headless-tree/core' {
  // biome-ignore lint/correctness/noUnusedVariables: <explanation>
  export interface ItemInstance<T> {
    isSource: () => boolean
  }
}

const sourceExplorerFeature: FeatureImplementation<Item> = {
  key: 'source-explorer',
  itemInstance: {
    isSource: ({ item }) => item.getItemData().sourceId,
  },
}

type SourceExplorerContextType = {
  params: Params
  indent: number
  tree: TreeInstance<Item>
  expandedItems: string[]
  setExpandedItems: React.Dispatch<React.SetStateAction<string[]>>
  checkedItems: string[]
  setCheckedItems: React.Dispatch<React.SetStateAction<string[]>>
  loadingSources: boolean
  setLoadingSources: React.Dispatch<React.SetStateAction<boolean>>
  loadingPropagationItems: string[]
  setLoadingPropagationItems: React.Dispatch<React.SetStateAction<string[]>>
  searchValue: string
  setSearchValue: React.Dispatch<React.SetStateAction<string>>
  filteredItems: string[]
  setFilteredItems: React.Dispatch<React.SetStateAction<string[]>>
  onClickItem?: (item: { id: string; sourceId?: string | null }) => void
}

const SourceExplorerContext = React.createContext<
  SourceExplorerContextType | undefined
>(undefined)

export function useSourceExplorerContext(): SourceExplorerContextType {
  const context = React.useContext(SourceExplorerContext)

  if (context === undefined) {
    throw new Error(
      'useSourceExplorerContext must be used within a SourceExplorerProvider',
    )
  }

  return context
}

export function SourceExplorerProvider({
  params,
  initialSourceIds,
  onLoadedRootItems,
  initialItems,
  onClickItem,
  children,
}: {
  params: Params
  initialSourceIds?: string[]
  onLoadedRootItems?: () => void
  initialItems?: { id: string; data: Item }[]
  onClickItem?: (item: { id: string; sourceId?: string | null }) => void
  children: React.ReactNode
}) {
  const indent = 20

  const [expandedItems, setExpandedItems] = React.useState<string[]>([])
  const [checkedItems, setCheckedItems] = React.useState<string[]>([])

  const [loadingSources, setLoadingSources] = React.useState<boolean>(true)
  const [loadingPropagationItems, setLoadingPropagationItems] = React.useState<
    string[]
  >([])

  const loadPropagationItems = async (itemId: string) => {
    await tree.loadItemData(itemId)
    if (!tree.getItemInstance(itemId).isFolder()) {
      return
    }

    setLoadingPropagationItems((prev) => [...prev, itemId])
    try {
      const childrenIds = await tree.loadChildrenIds(itemId)
      await Promise.all(childrenIds.map((child) => loadPropagationItems(child)))
    } finally {
      setLoadingPropagationItems((prev) => prev.filter((id) => id !== itemId))
    }
  }

  const tree = useTree<Item>({
    indent,
    rootItemId: 'root',
    state: {
      expandedItems,
      checkedItems,
    },
    setExpandedItems,
    setCheckedItems,
    getItemName: (item) => item.getItemData().name || '',
    isItemFolder: (item) => Boolean(item.getItemData().folder),
    createLoadingItemData: () => ({
      id: 'loading',
      loading: true,
      disabled: true,
    }),
    dataLoader: {
      getItem: async (itemId) => {
        const itemData = await getItemInSourceExplorerNode(params, {
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
          : await getChildrenWithDataInSourceExplorerNode(params, {
              itemId,
            })

        return childrenWithData.map((child) => ({
          ...child,
          data: toItemData(child.data),
        }))
      },
    },
    onLoadedChildren: async (itemId, childrenIds) => {
      if (itemId === 'root') {
        onLoadedRootItems?.()
        await Promise.all(
          childrenIds.map((childId) => loadPropagationItems(childId)),
        )
        setLoadingSources(false)
      }
    },
    onLoadedItem: async (itemId) => {
      const itemInstance = tree.getItemInstance(itemId)

      if (itemInstance.isSource()) {
        const sourceId = itemInstance.getItemData().sourceId

        if (sourceId && initialSourceIds?.includes(sourceId)) {
          setCheckedItems((prev) => [...prev, itemId])
        }
      }
    },
    features: [
      asyncDataLoaderFeature,
      selectionFeature,
      hotkeysCoreFeature,
      searchFeature,
      checkboxesFeature,
      expandAllFeature,
      sourceExplorerFeature,
    ],
  })

  const [searchValue, setSearchValue] = React.useState('')

  // Keep track of filtered items separately from the tree's internal search state
  const [filteredItems, setFilteredItems] = React.useState<string[]>([])

  const contextValue: SourceExplorerContextType = {
    params,
    indent,
    tree,
    expandedItems,
    setExpandedItems,
    checkedItems,
    setCheckedItems,
    loadingSources,
    setLoadingSources,
    loadingPropagationItems,
    setLoadingPropagationItems,
    searchValue,
    setSearchValue,
    filteredItems,
    setFilteredItems,
    onClickItem,
  }

  return (
    <SourceExplorerContext.Provider value={contextValue}>
      {children}
    </SourceExplorerContext.Provider>
  )
}

type SourceExplorerItemContextType = {
  item: ItemInstance<Item>
}

const SourceExplorerItemContext = React.createContext<
  SourceExplorerItemContextType | undefined
>(undefined)

export function useSourceExplorerItemContext(): SourceExplorerItemContextType {
  const context = React.useContext(SourceExplorerItemContext)

  if (context === undefined) {
    throw new Error(
      'useSourceExplorerItemContext must be used within a SourceExplorerItemProvider',
    )
  }

  return context
}

export function SourceExplorerItemProvider({
  item,
  children,
}: {
  item: ItemInstance<Item>
  children: React.ReactNode
}) {
  const contextValue: SourceExplorerItemContextType = { item }

  return (
    <SourceExplorerItemContext.Provider value={contextValue}>
      {children}
    </SourceExplorerItemContext.Provider>
  )
}

// ============================================================================
// Components
// ============================================================================

export function SourceExplorerSearch() {
  const {
    tree,
    setExpandedItems,
    searchValue,
    setSearchValue,
    setFilteredItems,
  } = useSourceExplorerContext()

  const inputRef = React.useRef<HTMLInputElement>(null)

  // Handle clearing the search
  const handleClearSearch = () => {
    setSearchValue('')

    // Manually trigger the tree's search onChange with an empty value
    // to ensure item.isMatchingSearch() is correctly updated.
    const searchProps = tree.getSearchInputElementProps()
    if (searchProps.onChange) {
      const syntheticEvent = {
        target: { value: '' },
      } as React.ChangeEvent<HTMLInputElement> // Cast to the expected event type
      searchProps.onChange(syntheticEvent)
    }

    // Clear custom filtered items
    setFilteredItems([])

    if (inputRef.current) {
      inputRef.current.focus()
      // Also clear the internal search input
      inputRef.current.value = ''
    }
  }

  // Update filtered items when search value changes
  React.useEffect(() => {
    if (!searchValue || searchValue.length === 0) {
      setFilteredItems([])
      return
    }

    // Get all items
    const allItems = tree.getItems()

    // First, find direct matches
    const directMatches = allItems
      .filter((item) => {
        const name = item.getItemName().toLowerCase()
        return name.includes(searchValue.toLowerCase())
      })
      .map((item) => item.getId())

    // Then, find all parent IDs of matching items
    const parentIds = new Set<string>()
    for (const matchId of directMatches) {
      let item = tree.getItems().find((i) => i.getId() === matchId)

      while (item?.getParent?.()) {
        const parent = item.getParent()
        if (parent) {
          parentIds.add(parent.getId())
          item = parent
        } else {
          break
        }
      }
    }

    // Find all children of matching items
    const childrenIds = new Set<string>()
    for (const matchId of directMatches) {
      const item = tree.getItems().find((i) => i.getId() === matchId)

      if (item?.isFolder()) {
        const getDescendants = (itemId: string) => {
          const children = tree.retrieveChildrenIds(itemId, true)

          for (const childId of children) {
            childrenIds.add(childId)

            if (tree.retrieveChildrenIds(childId, true).length) {
              getDescendants(childId)
            }
          }
        }

        getDescendants(item.getId())
      }
    }

    // Combine direct matches, parents, and children
    setFilteredItems([
      ...directMatches,
      ...Array.from(parentIds),
      ...Array.from(childrenIds),
    ])

    // Keep all folders expanded during search to ensure all matches are visible
    // Store current expanded state first
    const currentExpandedItems = tree.getState().expandedItems || []

    // Get all folder IDs that need to be expanded to show matches
    const folderIdsToExpand = allItems
      .filter((item) => item.isFolder())
      .map((item) => item.getId())

    // Update expanded items in the tree state
    setExpandedItems([
      ...new Set([...currentExpandedItems, ...folderIdsToExpand]),
    ])
  }, [searchValue, tree])

  return (
    <InputGroup>
      <InputGroupAddon>
        <FilterIcon />
      </InputGroupAddon>
      <InputGroupInput
        className="[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none"
        onBlur={(e) => {
          // Prevent default blur behavior
          e.preventDefault()

          // Re-apply the search to ensure it stays active
          if (searchValue && searchValue.length > 0) {
            const searchProps = tree.getSearchInputElementProps()
            if (searchProps.onChange) {
              const syntheticEvent = {
                target: { value: searchValue },
              } as React.ChangeEvent<HTMLInputElement>
              searchProps.onChange(syntheticEvent)
            }
          }
        }}
        onChange={(e) => {
          const value = e.target.value
          setSearchValue(value)

          // Apply the search to the tree's internal state as well
          const searchProps = tree.getSearchInputElementProps()
          if (searchProps.onChange) {
            searchProps.onChange(e)
          }

          if (value.length > 0) {
            // If input has at least one character, expand all items
            tree.expandAll()
          } else {
            // If input is cleared
            setFilteredItems([])
          }
        }}
        placeholder="Filter items..."
        // Prevent the internal search from being cleared on blur
        ref={inputRef}
        type="search"
        value={searchValue}
      />
      {searchValue && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-xs" onClick={handleClearSearch}>
            <CircleXIcon />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  )
}

export function SourceExplorer() {
  const { indent, tree, searchValue, filteredItems } =
    useSourceExplorerContext()

  const noItemsFound = searchValue && !filteredItems.length

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row items-center gap-2">
        <SourceExplorerSearch />

        <ButtonGroup>
          <Button
            onClick={() => tree.expandAll()}
            size="icon"
            variant="outline"
          >
            <ListTreeIcon />
          </Button>
          <Button onClick={tree.collapseAll} size="icon" variant="outline">
            <ListCollapseIcon />
          </Button>
        </ButtonGroup>
      </div>

      <Tree
        indent={indent}
        tree={tree}
        className={cn({
          'relative before:absolute before:inset-0 before:ms-4.5 before:bg-[repeating-linear-gradient(to_right,transparent_0,transparent_calc(var(--tree-indent)-1px),var(--border)_calc(var(--tree-indent)-1px),var(--border)_calc(var(--tree-indent)))]':
            !noItemsFound,
        })}
      >
        {noItemsFound ? (
          <p className="px-3 py-4 text-center text-sm">
            No items found for "{searchValue}"
          </p>
        ) : (
          tree
            .getItems()
            .map((item) => (
              <SourceExplorerTreeItem key={item.getId()} item={item} />
            ))
        )}
      </Tree>
    </div>
  )
}

function SourceExplorerTreeItem({ item }: { item: ItemInstance<Item> }) {
  const { loadingPropagationItems, searchValue, filteredItems } =
    useSourceExplorerContext()

  // This function determines if an item should be visible based on our custom filtering
  const shouldShowItem = (itemId: string) => {
    return filteredItems.includes(itemId) || !searchValue
  }

  return (
    <SourceExplorerItemProvider item={item}>
      <div
        className="flex items-center gap-1.5 not-last:pb-0.5 data-[visible=false]:hidden"
        data-visible={shouldShowItem(item.getId())}
      >
        {loadingPropagationItems.includes(item.getId()) ? (
          <Spinner className="text-muted-foreground" />
        ) : (
          <Checkbox
            checked={
              {
                checked: true,
                indeterminate: 'indeterminate' as const,
                unchecked: false,
              }[item.getCheckedState()]
            }
            onCheckedChange={(checked) => {
              const checkboxProps = item.getCheckboxProps()
              checkboxProps.onChange?.({ target: { checked } })
            }}
            disabled={item.getItemData().disabled}
          />
        )}
        <TreeItem
          className="flex-1 not-last:pb-0"
          item={item}
          data-disabled={item.getItemData().disabled ? true : undefined}
          asChild
        >
          <div>
            <SourceExplorerItem />
          </div>
        </TreeItem>
      </div>
    </SourceExplorerItemProvider>
  )
}

function SourceExplorerItem() {
  const { onClickItem } = useSourceExplorerContext()
  const { item } = useSourceExplorerItemContext()

  if (item.getItemData().unknown) {
    return (
      <TreeItemLabel className="before:-inset-y-0.5 before:-z-10 relative before:absolute before:inset-x-0 before:bg-background">
        <span className="flex items-center gap-2">
          <CircleXIcon className="size-4 text-muted-foreground" />
          <p className="text-muted-foreground italic">Unknown</p>
        </span>
      </TreeItemLabel>
    )
  }

  if (item.getItemData().loading) {
    return (
      <TreeItemLabel className="before:-inset-y-0.5 before:-z-10 relative before:absolute before:inset-x-0 before:bg-background">
        <span className="flex items-center gap-2">
          <Spinner className="text-muted-foreground" />
          <p className="text-muted-foreground italic">Loading</p>
        </span>
      </TreeItemLabel>
    )
  }

  return (
    <TreeItemLabel
      className="before:-inset-y-0.5 before:-z-10 relative before:absolute before:inset-x-0 before:bg-background"
      onClick={(e) => {
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
          const { sourceId } = item.getItemData()

          onClickItem?.({ id: item.getId(), sourceId })
        }
      }}
    >
      <SourceExplorerItemLabel />
      <SourceExplorerItemActions />
    </TreeItemLabel>
  )
}

function SourceExplorerItemLabel() {
  const { item } = useSourceExplorerItemContext()

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
        <FileIcon className="size-4 text-muted-foreground" />
      )}

      <p className="flex items-center gap-1">
        <span
          className={cn('line-clamp-1 break-all text-start', {
            italic: !item.getItemName(),
          })}
        >
          {item.getItemName() ||
            (item.isFolder() ? 'Unnamed folder' : 'Untitled')}
        </span>
        {item.isFolder() && (
          <span className="text-muted-foreground text-xs">
            ({item.getItemData().children?.length || 0})
          </span>
        )}
      </p>
      {item.getItemData().sourceType && (
        <Badge variant="secondary" className="text-[11px] capitalize">
          {item.getItemData().sourceType}
        </Badge>
      )}
    </span>
  )
}

function SourceExplorerItemActions() {
  const { item } = useSourceExplorerItemContext()

  const { source, sourceIndex } = item.getItemData()

  const status = sourceExplorerNodeStatus({
    source,
    sourceIndex,
  })

  if (!status) {
    return null
  }

  return (
    <div className="-my-0.5 flex flex-row items-center gap-1">
      <SourceExplorerItemTriggerButton status={status} />
      <SourceExplorerItemStatus status={status} />
    </div>
  )
}

function SourceExplorerItemTriggerButton({
  status,
}: { status: SourceExplorerNodeStatus }) {
  const { params } = useSourceExplorerContext()
  const { item } = useSourceExplorerItemContext()

  const [isPending, startTransition] = React.useTransition()

  const sourceId = item.getItemData().sourceId

  const isTriggerable =
    status === 'index-idle' ||
    status === 'index-failed' ||
    status === 'index-delete-failed'

  if (!sourceId || !isTriggerable) {
    return null
  }

  const handleTrigger = () => {
    startTransition(async () => {
      if (status === 'index-idle') {
        try {
          const { error } = await sdk.triggerSourceIndexing({
            agentId: params.agentId,
            data: {
              organizationSlug: params.organizationSlug,
              status: 'idle',
              sources: [sourceId],
            },
          })

          if (error) {
            toast.error(error.message)
            return
          }

          toast.success('Source indexing started')
        } catch {
          toast.error('Failed to start source indexing')
        }
      } else {
        try {
          const { error } = await sdk.triggerSourceIndexing({
            agentId: params.agentId,
            data: {
              organizationSlug: params.organizationSlug,
              status: 'failed',
              sources: [sourceId],
            },
          })

          if (error) {
            toast.error(error.message)
            return
          }

          toast.success('Source reindexing started')
        } catch {
          toast.error('Failed to start source reindexing')
        }
      }

      await updateTag('trigger-source-indexing')
      await item.invalidateItemData(true)
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-6 text-xs"
      onClick={(e) => {
        e.stopPropagation()
        handleTrigger()
      }}
      disabled={isPending}
    >
      {isPending ? (
        <Spinner className="size-3.5" />
      ) : status === 'index-idle' ? (
        <PlayIcon className="size-3.5" />
      ) : (
        <RotateCwIcon className="size-3.5" />
      )}
      {status === 'index-idle' ? 'Index' : 'Reindex'}
    </Button>
  )
}

const statusIcon = (status: SourceExplorerNodeStatus) => {
  switch (status) {
    // Ingest Status
    case 'ingest-draft':
    case 'ingest-ready':
      return <InfoIcon className="size-4 text-yellow-500 opacity-50" />
    case 'ingest-queued':
      return <ClockIcon className="size-4 text-muted-foreground opacity-50" />
    case 'ingest-processing':
      return <Spinner className="text-blue-500 opacity-50" />
    case 'ingest-failed':
      return <AlertCircleIcon className="size-4 text-destructive opacity-50" />
    case 'ingest-delete-queued':
      return <ClockIcon className="size-4 text-destructive opacity-50" />
    case 'ingest-delete-processing':
      return <Spinner className="text-destructive opacity-50" />

    // Index Status
    case 'index-idle':
      return <InfoIcon className="size-4 text-yellow-500" />
    case 'index-queued':
      return <ClockIcon className="size-4 text-muted-foreground" />
    case 'index-processing':
      return <Spinner className="text-blue-500" />
    case 'index-completed':
      return <CircleCheckIcon className="size-4 text-green-500" />
    case 'index-failed':
      return <AlertCircleIcon className="size-4 text-destructive" />
    case 'index-delete-queued':
      return <ClockIcon className="size-4 text-destructive" />
    case 'index-delete-processing':
      return <Spinner className="text-destructive" />
    case 'index-delete-failed':
      return <AlertCircleIcon className="size-4 text-yellow-500" />
  }
}

function SourceExplorerItemStatus({
  status,
}: { status: SourceExplorerNodeStatus }) {
  const icon = statusIcon(status)

  if (!icon) {
    return null
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="size-6 rounded-sm">
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="capitalize">{status}</TooltipContent>
    </Tooltip>
  )
}
