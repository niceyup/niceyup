'use client'

import type { sdk } from '@/lib/sdk'
import type { VectorStoreUpstash } from '@workspace/core/vector-stores'
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
import { UpstashVectorStore } from './available-vector-stores/upstash'

type VectorStore = NonNullable<
  Awaited<ReturnType<typeof sdk.getVectorStore>>['data']
>['vectorStore']

type EditVectorStoreFormContextType = {
  initialData: VectorStore
  onClose: () => void
}

const EditVectorStoreFormContext = React.createContext<
  EditVectorStoreFormContextType | undefined
>(undefined)

export function useEditVectorStoreFormContext(): EditVectorStoreFormContextType {
  const context = React.useContext(EditVectorStoreFormContext)

  if (context === undefined) {
    throw new Error(
      'useEditVectorStoreFormContext must be used within a EditVectorStoreForm',
    )
  }

  return context
}

type EditVectorStoreFormProps = {
  initialData: VectorStore
}

export function EditVectorStoreForm({ initialData }: EditVectorStoreFormProps) {
  const dialogCloseRef = React.useRef<HTMLButtonElement>(null)

  const onClose = () => {
    dialogCloseRef.current?.click()
  }

  const contextValue: EditVectorStoreFormContextType = {
    initialData,
    onClose,
  }

  return (
    <EditVectorStoreFormContext.Provider value={contextValue}>
      <DialogClose ref={dialogCloseRef} className="sr-only" />

      <VectorStoreConfiguration />
    </EditVectorStoreFormContext.Provider>
  )
}

function VectorStoreConfiguration() {
  const { initialData, onClose } = useEditVectorStoreFormContext()

  const onSuccess = () => {
    onClose()
  }

  const onBack = () => {
    onClose()
  }

  switch (initialData.provider) {
    case 'upstash':
      return (
        <UpstashVectorStore
          onSuccess={onSuccess}
          onBack={onBack}
          initialData={{
            name: initialData.name,
            settings: initialData.settings as VectorStoreUpstash['settings'],
            credentials:
              initialData.credentials as VectorStoreUpstash['credentials'],
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
