'use client'

import type { sdk } from '@/lib/sdk'
import type {
  ModelProviderGoogle,
  ModelProviderOpenAI,
  ModelProviderOpenAICompatible,
} from '@workspace/core/model-providers'
import { Button } from '@workspace/ui/components/button'
import { DialogClose } from '@workspace/ui/components/dialog'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import * as React from 'react'
import { GoogleModelProvider } from './available-model-providers/google'
import { OpenAIModelProvider } from './available-model-providers/openai'
import { OpenAICompatibleModelProvider } from './available-model-providers/openai-compatible'

type ModelProvider = NonNullable<
  Awaited<ReturnType<typeof sdk.getModelProvider>>['data']
>['modelProvider']

type EditModelProviderFormContextType = {
  initialData: ModelProvider
  onClose: () => void
}

const EditModelProviderFormContext = React.createContext<
  EditModelProviderFormContextType | undefined
>(undefined)

export function useEditModelProviderFormContext(): EditModelProviderFormContextType {
  const context = React.useContext(EditModelProviderFormContext)

  if (context === undefined) {
    throw new Error(
      'useEditModelProviderFormContext must be used within a EditModelProviderForm',
    )
  }

  return context
}

type EditModelProviderFormProps = {
  initialData: ModelProvider
}

export function EditModelProviderForm({
  initialData,
}: EditModelProviderFormProps) {
  const dialogCloseRef = React.useRef<HTMLButtonElement>(null)

  const onClose = () => {
    dialogCloseRef.current?.click()
  }

  const contextValue: EditModelProviderFormContextType = {
    initialData,
    onClose,
  }

  return (
    <EditModelProviderFormContext.Provider value={contextValue}>
      <DialogClose ref={dialogCloseRef} className="sr-only" />

      <ModelProviderConfiguration />
    </EditModelProviderFormContext.Provider>
  )
}

function ModelProviderConfiguration() {
  const { initialData, onClose } = useEditModelProviderFormContext()

  const onSuccess = () => {
    onClose()
  }

  const onBack = () => {
    onClose()
  }

  if (initialData.provider.startsWith('openai-compatible/')) {
    return (
      <OpenAICompatibleModelProvider
        onSuccess={onSuccess}
        onBack={onBack}
        initialData={{
          name: initialData.name,
          settings:
            initialData.settings as ModelProviderOpenAICompatible['settings'],
          credentials:
            initialData.credentials as ModelProviderOpenAICompatible['credentials'],
        }}
      />
    )
  }

  switch (initialData.provider) {
    case 'openai':
      return (
        <OpenAIModelProvider
          onSuccess={onSuccess}
          onBack={onBack}
          initialData={{
            name: initialData.name,
            credentials:
              initialData.credentials as ModelProviderOpenAI['credentials'],
          }}
        />
      )

    case 'google':
      return (
        <GoogleModelProvider
          onSuccess={onSuccess}
          onBack={onBack}
          initialData={{
            name: initialData.name,
            credentials:
              initialData.credentials as ModelProviderGoogle['credentials'],
          }}
        />
      )

    default:
      return (
        <div className="flex w-full flex-col">
          <Empty>
            <EmptyHeader>
              <EmptyTitle className="text-sm">Unsupported Provider</EmptyTitle>
              <EmptyDescription>
                This provider is not supported or could not be loaded.
              </EmptyDescription>
            </EmptyHeader>

            <EmptyContent>
              <Button variant="outline" onClick={onBack}>
                Back
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      )
  }
}
