'use client'

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@workspace/ui/components/resizable'
import { cn } from '@workspace/ui/lib/utils'
import type * as React from 'react'
import { useChatAppearance } from '../../../_store/use-chat-appearance'

const DEFAULT_MIN_SIZE = 220 // 220px
const DEFAULT_MAX_SIZE = '30%' // 30% of the width

export function Resizable({
  primarySidebar: primarySidebarComponent,
  secondarySidebar: secondarySidebarComponent,
  children,
  ...props
}: {
  primarySidebar: React.ReactNode
  secondarySidebar: React.ReactNode
  children: React.ReactNode
} & React.ComponentProps<'div'>) {
  const { topbar, primarySidebar, secondarySidebar } = useChatAppearance()

  return (
    <div
      className={cn(
        'flex w-full',
        topbar ? 'h-[calc(100vh-90px)]' : 'h-screen',
        props.className,
      )}
    >
      <ResizablePanelGroup
        orientation="horizontal"
        defaultLayout={{ 'primary-sidebar': 0, 'secondary-sidebar': 0 }}
      >
        <ResizablePanel
          id="primary-sidebar"
          defaultSize={0}
          minSize={primarySidebar ? DEFAULT_MIN_SIZE : 0}
          maxSize={primarySidebar ? DEFAULT_MAX_SIZE : 0}
          className={cn(
            'flex flex-col border-r bg-background',
            !primarySidebar && 'hidden',
          )}
        >
          {primarySidebarComponent}
        </ResizablePanel>

        <ResizableHandle className="w-0.1" />

        <ResizablePanel>{children}</ResizablePanel>

        <ResizableHandle className="w-0.1" />

        <ResizablePanel
          id="secondary-sidebar"
          defaultSize={0}
          minSize={secondarySidebar ? DEFAULT_MIN_SIZE : 0}
          maxSize={secondarySidebar ? DEFAULT_MAX_SIZE : 0}
          className={cn(
            'flex flex-col border-l bg-background',
            !secondarySidebar && 'hidden',
          )}
        >
          {secondarySidebarComponent}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
