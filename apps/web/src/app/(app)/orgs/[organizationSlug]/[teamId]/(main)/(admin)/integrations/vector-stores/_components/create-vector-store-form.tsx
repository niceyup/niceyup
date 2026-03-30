'use client'

import { Button } from '@workspace/ui/components/button'
import { DialogClose } from '@workspace/ui/components/dialog'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import { SearchIcon } from 'lucide-react'
import * as React from 'react'
import { UpstashVectorStore } from './available-vector-stores/upstash'
import {
  type AvailableVectorStore,
  availableVectorStores,
} from './available-vector-stores/vector-stores'
import { VectorStoreCard } from './vector-store-card'

type Step = 'select-provider' | 'vector-store-configuration'

type CreateVectorStoreFormContextType = {
  step: Step
  setStep: (step: Step) => void
  selectedProvider: keyof AvailableVectorStore | null
  setSelectedProvider: (provider: keyof AvailableVectorStore | null) => void
  onClose: () => void
}

const CreateVectorStoreFormContext = React.createContext<
  CreateVectorStoreFormContextType | undefined
>(undefined)

export function useCreateVectorStoreFormContext(): CreateVectorStoreFormContextType {
  const context = React.useContext(CreateVectorStoreFormContext)

  if (context === undefined) {
    throw new Error(
      'useCreateVectorStoreFormContext must be used within a CreateVectorStoreForm',
    )
  }

  return context
}

export function CreateVectorStoreForm() {
  const [step, setStep] = React.useState<Step>('select-provider')

  const [selectedProvider, setSelectedProvider] = React.useState<
    keyof AvailableVectorStore | null
  >(null)

  const dialogCloseRef = React.useRef<HTMLButtonElement>(null)

  const onClose = () => {
    dialogCloseRef.current?.click()
  }

  const contextValue: CreateVectorStoreFormContextType = {
    step,
    setStep,
    selectedProvider,
    setSelectedProvider,
    onClose,
  }

  return (
    <CreateVectorStoreFormContext.Provider value={contextValue}>
      <DialogClose ref={dialogCloseRef} className="sr-only" />

      {step === 'select-provider' && <SelectProviderStep />}

      {step === 'vector-store-configuration' && (
        <VectorStoreConfigurationStep />
      )}
    </CreateVectorStoreFormContext.Provider>
  )
}

function SelectProviderStep() {
  const { setStep, selectedProvider, setSelectedProvider } =
    useCreateVectorStoreFormContext()

  const [search, setSearch] = React.useState('')

  const filteredProviders = React.useMemo(() => {
    return Object.values(availableVectorStores).filter(
      ({ label, description }) =>
        label.toLowerCase().includes(search.toLowerCase()) ||
        description.toLowerCase().includes(search.toLowerCase()),
    )
  }, [availableVectorStores, search])

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full flex-col gap-4">
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find Providers..."
            className="[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none"
          />
        </InputGroup>

        {search && !filteredProviders?.length && (
          <Empty>
            <EmptyHeader>
              <EmptyTitle className="text-sm">No Providers Found</EmptyTitle>
              <EmptyDescription>
                Your search for "{search}" did not return any providers.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {!!filteredProviders?.length && (
          <div className="grid max-h-85 w-full grid-cols-1 gap-2 overflow-y-auto">
            {filteredProviders.map((provider) => (
              <VectorStoreCard
                key={provider.value}
                provider={provider}
                selected={selectedProvider === provider.value}
                onSelect={setSelectedProvider}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex w-full flex-row items-center justify-end gap-2">
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>

        <Button
          onClick={() => setStep('vector-store-configuration')}
          disabled={!selectedProvider}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

function VectorStoreConfigurationStep() {
  const { setStep, selectedProvider, setSelectedProvider, onClose } =
    useCreateVectorStoreFormContext()

  const onReset = () => {
    setStep('select-provider')
    setSelectedProvider(null)
  }

  const onBack = () => {
    setStep('select-provider')
  }

  const onSuccess = () => {
    onClose()
    onReset()
  }

  switch (selectedProvider) {
    case 'upstash':
      return <UpstashVectorStore onSuccess={onSuccess} onBack={onBack} />

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
