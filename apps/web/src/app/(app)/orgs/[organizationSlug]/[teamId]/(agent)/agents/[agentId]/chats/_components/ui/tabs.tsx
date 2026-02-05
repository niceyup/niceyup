'use client'

import { Button } from '@workspace/ui/components/button'
import * as React from 'react'

type TabsContextType = {
  activeTab: string
  setActiveTab: (tab: string) => void
}

const TabsContext = React.createContext<TabsContextType | undefined>(undefined)

function useTabsContext(): TabsContextType {
  const context = React.useContext(TabsContext)

  if (context === undefined) {
    throw new Error('useTabsContext must be used within a TabsProvider')
  }

  return context
}

export function TabsProvider({
  initialTab,
  children,
}: {
  initialTab: string
  children?: React.ReactNode
}) {
  const [activeTab, setActiveTab] = React.useState(initialTab)

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  )
}

export function TabsTrigger({
  value,
  ...props
}: React.ComponentProps<typeof Button> & { value: string }) {
  const { activeTab, setActiveTab } = useTabsContext()

  return (
    <Button
      variant={activeTab === value ? 'secondary' : 'ghost'}
      {...props}
      onClick={(e) => {
        setActiveTab(value)
        props.onClick?.(e)
      }}
    />
  )
}

export function TabsContent({
  value,
  children,
}: {
  value: string
  children: React.ReactNode
}) {
  const { activeTab } = useTabsContext()

  if (activeTab !== value) {
    return null
  }

  return children
}
