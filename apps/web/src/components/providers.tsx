'use client'

import { queryClient } from '@/lib/react-query'
import { AppProgressProvider as ProgressProvider } from '@bprogress/next'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@workspace/ui/components/sonner'
import { TooltipProvider } from '@workspace/ui/components/tooltip'
import { ThemeProvider } from 'next-themes'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import type * as React from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        enableColorScheme
        disableTransitionOnChange
      >
        <ProgressProvider
          color="currentColor"
          options={{ showSpinner: false }}
          shallowRouting
        >
          <NuqsAdapter>
            <TooltipProvider>
              {children}
              <Toaster />
            </TooltipProvider>
          </NuqsAdapter>
        </ProgressProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
