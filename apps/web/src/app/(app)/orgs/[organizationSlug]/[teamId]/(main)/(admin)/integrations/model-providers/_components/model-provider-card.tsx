'use client'

import { getInitials } from '@/lib/utils'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@workspace/ui/components/avatar'
import { cn } from '@workspace/ui/lib/utils'
import { CircleDashedIcon } from 'lucide-react'
import type { AvailableModelProvider } from './available-model-providers/model-providers'

type ModelProvider = AvailableModelProvider[keyof AvailableModelProvider] & {
  icon?: React.ReactNode
}

export function ModelProviderCard({
  provider,
  selected,
  onSelect,
}: {
  provider?: ModelProvider
  selected?: boolean
  onSelect?: (provider: keyof AvailableModelProvider) => void
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
        <div
          className={cn(
            'flex size-8 items-center justify-center rounded-sm border',
            { 'border-dashed': provider?.value === 'openai-compatible' },
          )}
        >
          {provider?.icon ?? <CircleDashedIcon className="size-4" />}
        </div>
      ) : (
        <Avatar className="size-8 rounded-sm border bg-background">
          <AvatarImage
            src={`https://7nyt0uhk7sse4zvn.public.blob.vercel-storage.com/docs-assets/static/docs/ai-gateway/logos/${provider.value}.png`}
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
