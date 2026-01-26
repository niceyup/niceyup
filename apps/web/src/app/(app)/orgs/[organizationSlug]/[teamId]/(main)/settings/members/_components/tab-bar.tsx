'use client'

import { Button } from '@workspace/ui/components/button'
import { Separator } from '@workspace/ui/components/separator'
import { useQueryStates } from 'nuqs'
import { type TabValue, searchParams } from '../_lib/search-params'

export type TabItem = {
  value: TabValue
  label: React.ReactNode | string
  count?: number
}

export function TabBar({
  tabValue,
  tabs,
}: {
  tabValue: string
  tabs?: TabItem[]
}) {
  if (!tabs?.length) {
    return null
  }

  const [_, setSearchParams] = useQueryStates(searchParams, {
    clearOnDefault: true,
    shallow: false,
  })

  return (
    <div className="flex flex-col items-stretch">
      <div className="no-scrollbar flex flex-row items-center overflow-auto">
        {tabs.map((tab, index) => (
          <div
            key={`${tab.value}-${index}`}
            data-state={tabValue === tab.value ? 'active' : 'inactive'}
            className="cursor-pointer p-1 data-[state=active]:border-primary data-[state=active]:border-b-2"
          >
            <Button
              variant="ghost"
              size="sm"
              className="px-3"
              onClick={() => setSearchParams({ tab: tab.value as TabValue })}
            >
              {tab.label}
              {!!tab.count && (
                <div className="flex h-5 min-w-5 items-center justify-center rounded-full border p-1.5 text-xs">
                  {tab.count > 99 ? '99+' : tab.count}
                </div>
              )}
            </Button>
          </div>
        ))}
      </div>

      <Separator />
    </div>
  )
}
