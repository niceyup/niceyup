'use client'

import { getInitials } from '@/lib/utils'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@workspace/ui/components/avatar'
import { cn } from '@workspace/ui/lib/utils'
import { CircleDashedIcon } from 'lucide-react'
import type { AvailableVectorStore } from './available-vector-stores/vector-stores'

type VectorStore = AvailableVectorStore[keyof AvailableVectorStore] & {
  icon?: React.ReactNode
}

export function VectorStoreCard({
  provider,
  selected,
  onSelect,
}: {
  provider?: VectorStore
  selected?: boolean
  onSelect?: (provider: keyof AvailableVectorStore) => void
}) {
  return (
    <div
      className={cn(
        'group flex select-none items-center justify-start gap-3 rounded-md border p-3',
        {
          'border-primary/30': selected,
          'cursor-pointer hover:bg-primary/5': provider && onSelect,
        },
      )}
      onClick={() => provider && onSelect?.(provider.value)}
    >
      {!provider || provider.icon ? (
        <div className="flex size-8 items-center justify-center rounded-sm border">
          {provider?.icon ?? <CircleDashedIcon className="size-4" />}
        </div>
      ) : (
        <Avatar className="size-8 rounded-sm border bg-background">
          <AvatarImage
            src={`/integrations/vector-stores/${provider.value}.png`}
          />
          <AvatarFallback className="rounded-sm text-xs">
            {getInitials(provider.value)}
          </AvatarFallback>
        </Avatar>
      )}

      <div className="flex flex-1 flex-col">
        <div className="flex flex-row items-center justify-start gap-2">
          <span className="line-clamp-1 break-all text-start font-medium text-sm">
            {provider?.label ?? 'Unknown Provider'}
          </span>
        </div>

        <span className="line-clamp-1 break-all text-start font-normal text-muted-foreground text-xs">
          {provider?.description ?? 'Unknown Provider'}
        </span>
      </div>
    </div>
  )
}
