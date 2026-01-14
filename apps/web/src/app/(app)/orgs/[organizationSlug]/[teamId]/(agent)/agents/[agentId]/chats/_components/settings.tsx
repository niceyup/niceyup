'use client'

import { Button } from '@workspace/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import {
  PanelLeftIcon,
  PanelRightIcon,
  PanelTopIcon,
  SettingsIcon,
} from 'lucide-react'
import { useChatAppearance } from '../../../_store/use-chat-appearance'

export function Settings() {
  const {
    topbar,
    primarySidebar,
    secondarySidebar,
    setTopbar,
    setPrimarySidebar,
    setSecondarySidebar,
  } = useChatAppearance()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <SettingsIcon />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTopbar(!topbar)}>
          <PanelTopIcon />
          Top bar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setPrimarySidebar(!primarySidebar)}>
          <PanelLeftIcon />
          Primary sidebar
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setSecondarySidebar(!secondarySidebar)}
        >
          <PanelRightIcon />
          Secondary sidebar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
