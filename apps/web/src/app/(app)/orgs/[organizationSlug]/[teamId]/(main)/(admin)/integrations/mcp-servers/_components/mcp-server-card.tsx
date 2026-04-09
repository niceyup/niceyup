'use client'

import { getInitials } from '@/lib/utils'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@workspace/ui/components/avatar'
import { cn } from '@workspace/ui/lib/utils'
import { CircleDashedIcon } from 'lucide-react'
import type { AvailableMcpServer } from './available-mcp-servers/mcp-servers'

type McpServer = AvailableMcpServer[keyof AvailableMcpServer] & {
  icon?: React.ReactNode
  image?: string
}

export function McpServerCard({
  connection,
  selected,
  onSelect,
}: {
  connection?: McpServer
  selected?: boolean
  onSelect?: (connection: keyof AvailableMcpServer) => void
}) {
  return (
    <div
      className={cn(
        'group flex select-none items-center justify-start gap-3 rounded-md border p-3',
        {
          'border-primary/30': selected,
          'cursor-pointer hover:bg-primary/5': connection && onSelect,
        },
      )}
      onClick={() => connection && onSelect?.(connection.value)}
    >
      {connection?.image ? (
        <Avatar className="size-8 rounded-sm border bg-background">
          <AvatarImage src={connection.image} />
          <AvatarFallback className="rounded-sm text-xs">
            {getInitials(connection.value)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div
          className={cn(
            'flex size-8 items-center justify-center rounded-sm border',
            { 'border-dashed': connection?.value === 'custom-mcp' },
          )}
        >
          {connection?.icon ?? <CircleDashedIcon className="size-4" />}
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <div className="flex flex-row items-center justify-start gap-2">
          <span className="line-clamp-1 break-all text-start font-medium text-sm">
            {connection?.label ?? 'Unknown Connection'}
          </span>
        </div>

        <span className="line-clamp-1 break-all text-start font-normal text-muted-foreground text-xs">
          {connection?.description ?? 'Unknown Connection'}
        </span>
      </div>
    </div>
  )
}
