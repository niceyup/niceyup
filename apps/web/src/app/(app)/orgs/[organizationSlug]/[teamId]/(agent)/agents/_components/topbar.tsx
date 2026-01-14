'use client'

import type { ChatParams } from '@/lib/types'
import { cn } from '@workspace/ui/lib/utils'
import { useParams } from 'next/navigation'
import { useChatAppearance } from '../_store/use-chat-appearance'

export function Topbar({ children }: { children: React.ReactNode }) {
  const params = useParams<ChatParams>()

  const { topbar } = useChatAppearance()

  if (params.chatId) {
    return (
      <div
        className={cn('flex flex-col items-stretch justify-center', {
          hidden: !topbar,
        })}
      >
        {children}
      </div>
    )
  }

  return children
}
