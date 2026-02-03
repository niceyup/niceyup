import type { Chat, ChatParams } from '@/lib/types'
import { Separator } from '@workspace/ui/components/separator'
import { cn } from '@workspace/ui/lib/utils'
import { Settings } from '../../_components/settings'

type Params = ChatParams

export function Tabbar({
  params,
  chat,
}: {
  params: Params
  chat: Chat | null
}) {
  return (
    <div className="flex flex-row items-center bg-background">
      <div className="no-scrollbar flex flex-1 flex-row items-center gap-1 overflow-x-auto px-2 py-1">
        <span
          className={cn('whitespace-nowrap py-1.5 font-medium text-sm', {
            italic: params.chatId !== 'new' && !chat?.title,
          })}
        >
          {params.chatId === 'new' ? 'New chat' : chat?.title || 'Untitled'}
        </span>
      </div>

      <Separator
        orientation="vertical"
        className="data-[orientation=vertical]:h-full"
      />

      <div className="flex flex-row items-center gap-1 p-1">
        <Settings />
      </div>
    </div>
  )
}
