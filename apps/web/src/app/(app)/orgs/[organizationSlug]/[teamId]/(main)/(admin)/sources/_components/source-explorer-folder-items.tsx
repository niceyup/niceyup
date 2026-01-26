'use client'

import { updateTag } from '@/actions/cache'
import { sdk } from '@/lib/sdk'
import type { OrganizationTeamParams } from '@/lib/types'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Dialog } from '@workspace/ui/components/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import { Spinner } from '@workspace/ui/components/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'
import { formatBytes } from '@workspace/ui/hooks/use-file-upload'
import { cn } from '@workspace/ui/lib/utils'
import {
  AlertCircleIcon,
  CircleCheckIcon,
  ClockIcon,
  FileIcon,
  InfoIcon,
  MoreHorizontalIcon,
} from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'
import type { listFolderItemsInSourceExplorerNode } from '../_actions/source-explorer-nodes'
import type { SourceExplorerNodeStatus } from '../_lib/types'
import { sourceExplorerNodeStatus } from '../_lib/utils'
import { MoveSourceDialog } from './move-source-dialog'
import { SourceView } from './source-view'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
}

export function SourceExplorerFolderItems({
  params,
  listFolderItems,
}: {
  params: Params
  listFolderItems: Awaited<
    ReturnType<typeof listFolderItemsInSourceExplorerNode>
  >
}) {
  return (
    <div className="w-full rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <span className="ml-8">Name</span>
            </TableHead>
            <TableHead>
              <span>Type</span>
            </TableHead>
            <TableHead>
              <span>Size</span>
            </TableHead>
            <TableHead className="text-center">
              <span>Status</span>
            </TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {!listFolderItems.length && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={5}>
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle className="text-sm">No Sources Yet</EmptyTitle>
                    <EmptyDescription>
                      Add a source to get started.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </TableCell>
            </TableRow>
          )}

          {listFolderItems.map((item) => (
            <SourceExplorerItemTableRow
              key={item.id}
              params={params}
              item={item}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

const statusIcon = (status: SourceExplorerNodeStatus) => {
  switch (status) {
    // Ingest Status
    case 'ingest-draft':
      return <InfoIcon className="size-4 text-yellow-500" />
    case 'ingest-ready':
      return <InfoIcon className="size-4 text-blue-500" />
    case 'ingest-queued':
      return <ClockIcon className="size-4 text-muted-foreground" />
    case 'ingest-processing':
      return <Spinner className="text-blue-500" />
    case 'ingest-completed':
      return <CircleCheckIcon className="size-4 text-green-500" />
    case 'ingest-failed':
      return <AlertCircleIcon className="size-4 text-destructive" />
    case 'ingest-delete-queued':
      return <ClockIcon className="size-4 text-destructive" />
    case 'ingest-delete-processing':
      return <Spinner className="text-destructive" />
    case 'ingest-delete-completed':
      return <CircleCheckIcon className="size-4 text-destructive" />
    case 'ingest-delete-failed':
      return <AlertCircleIcon className="size-4 text-destructive" />
  }
}

function SourceExplorerItemTableRow({
  params,
  item,
}: {
  params: Params
  item: Awaited<ReturnType<typeof listFolderItemsInSourceExplorerNode>>[number]
}) {
  const [modalOpen, setModalOpen] = React.useState<'view' | 'move' | null>(null)

  const status = sourceExplorerNodeStatus({
    source: item.source,
  })

  return (
    <>
      <TableRow className="cursor-pointer" onClick={() => setModalOpen('view')}>
        <TableCell className="flex flex-row items-center justify-start gap-2">
          <FileIcon className="ml-2 size-4 shrink-0 text-muted-foreground" />

          <span
            className={cn('line-clamp-1 break-all font-medium text-sm', {
              italic: !item.name,
            })}
          >
            {item.name || 'Untitled'}
          </span>

          {item.sourceType && (
            <Badge variant="secondary" className="text-[11px]">
              {item.sourceType}
            </Badge>
          )}
        </TableCell>
        <TableCell>
          {item.source?.type && (
            <span className="text-muted-foreground text-sm capitalize">
              {item.source.type}
            </span>
          )}
        </TableCell>
        <TableCell>
          {item.source?.fileSize && (
            <span className="text-muted-foreground text-sm capitalize">
              {formatBytes(item.source.fileSize)}
            </span>
          )}
        </TableCell>
        <TableCell className="text-center">
          {status && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm">
                  {statusIcon(status)}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="capitalize">{status}</TooltipContent>
            </Tooltip>
          )}
        </TableCell>
        <TableCell className="flex items-center justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setModalOpen('view')}>
                View
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  setModalOpen('move')
                }}
              >
                Move
              </DropdownMenuItem>
              <SourceExplorerItemActionDelete
                params={params}
                sourceId={item.sourceId}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      <SourceView
        params={params}
        sourceId={item.sourceId}
        open={modalOpen === 'view'}
        onOpenChange={(open) => setModalOpen(open ? 'view' : null)}
      />

      <Dialog
        open={modalOpen === 'move'}
        onOpenChange={(open) => setModalOpen(open ? 'move' : null)}
      >
        <MoveSourceDialog params={params} itemId={item.id} name={item.name} />
      </Dialog>
    </>
  )
}

function SourceExplorerItemActionDelete({
  params,
  sourceId,
}: {
  params: Params
  sourceId: string
}) {
  const [isPending, startTransition] = React.useTransition()

  const onRemove = async () => {
    startTransition(async () => {
      const { error } = await sdk.deleteSource({
        sourceId,
        data: {
          organizationSlug: params.organizationSlug,
        },
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Source deleted successfully')
      await updateTag('delete-source')
    })
  }

  return (
    <DropdownMenuItem
      variant="destructive"
      onClick={(e) => {
        e.stopPropagation()
        onRemove()
      }}
      disabled={isPending}
    >
      {isPending && <Spinner />}
      Delete
    </DropdownMenuItem>
  )
}
