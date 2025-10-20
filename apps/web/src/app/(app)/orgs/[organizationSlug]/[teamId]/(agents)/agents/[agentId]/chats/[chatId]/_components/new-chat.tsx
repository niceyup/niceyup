'use client'

import type { ChatParams, OrganizationTeamParams } from '@/lib/types'
import { Suggestion, Suggestions } from '@workspace/ui/components/suggestion'
import * as React from 'react'
import { ChatPromptInput, ChatProvider } from './chat'

type Params = OrganizationTeamParams & { agentId: string } & ChatParams

export function NewChat({
  params,
  suggestions,
}: { params: Params; suggestions: string[] }) {
  const [suggestion, setSuggestion] = React.useState<string>('')

  const handleSuggestionClick = (suggestion: string) => {
    setSuggestion(suggestion)
  }

  return (
    <div className="flex size-full flex-col items-center justify-center">
      <div className="flex w-full max-w-2xl flex-col gap-4 p-2">
        <Suggestions>
          {suggestions.map((suggestion) => (
            <Suggestion
              key={suggestion}
              suggestion={suggestion}
              onClick={handleSuggestionClick}
            />
          ))}
        </Suggestions>

        <ChatProvider params={params}>
          <ChatPromptInput suggestion={suggestion} />
        </ChatProvider>
      </div>
    </div>
  )
}
