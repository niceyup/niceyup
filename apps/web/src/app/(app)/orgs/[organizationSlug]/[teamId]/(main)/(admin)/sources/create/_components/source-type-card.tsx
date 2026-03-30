'use client'

import { cn } from '@workspace/ui/lib/utils'
import { FileIcon } from 'lucide-react'
import type { AvailableSourceType } from './available-source-types/source-types'

type SourceType = AvailableSourceType[keyof AvailableSourceType]

export function SourceTypeCard({
  sourceType,
  selected,
  onSelect,
}: {
  sourceType?: SourceType
  selected?: boolean
  onSelect?: (sourceType: keyof AvailableSourceType) => void
}) {
  return (
    <div
      className={cn(
        'group flex select-none items-center justify-start gap-3 rounded-md border p-3',
        {
          'border-primary/30': selected,
          'cursor-pointer hover:bg-primary/5': sourceType && onSelect,
        },
      )}
      onClick={() => sourceType && onSelect?.(sourceType.value)}
    >
      <div className="flex size-8 items-center justify-center rounded-sm border">
        {sourceType?.icon ?? <FileIcon className="size-4" />}
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex flex-row items-center justify-start gap-2">
          <span className="line-clamp-1 break-all text-start font-medium text-sm">
            {sourceType?.label ?? 'Unknown Source Type'}
          </span>
        </div>

        <span className="line-clamp-1 break-all text-start font-normal text-muted-foreground text-xs">
          {sourceType?.description ?? 'Unknown Source Type'}
        </span>
      </div>
    </div>
  )
}
