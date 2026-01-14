'use client'

import { Button } from '@workspace/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import * as React from 'react'

export const ThemeSwitcher = () => {
  const [theme, setTheme] = React.useState<string>()

  const { setTheme: nextSetTheme, theme: nextTheme } = useTheme()

  React.useEffect(() => {
    setTheme(nextTheme)
  }, [nextTheme])

  if (!theme) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          {theme === 'system' && <MonitorIcon />}
          {theme === 'light' && <SunIcon />}
          {theme === 'dark' && <MoonIcon />}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => nextSetTheme('light')}>
          <SunIcon />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => nextSetTheme('dark')}>
          <MoonIcon />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => nextSetTheme('system')}>
          <MonitorIcon />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
