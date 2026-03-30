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
import { GoogleModelProvider } from './available-model-providers/google'
import {
  type AvailableModelProvider,
  availableModelProviders,
} from './available-model-providers/model-providers'
import { OpenAIModelProvider } from './available-model-providers/openai'
import { OpenAICompatibleModelProvider } from './available-model-providers/openai-compatible'
import { ModelProviderCard } from './model-provider-card'

type Step = 'select-provider' | 'model-provider-configuration'

type CreateModelProviderFormContextType = {
  step: Step
  setStep: (step: Step) => void
  selectedProvider: keyof AvailableModelProvider | null
  setSelectedProvider: (provider: keyof AvailableModelProvider | null) => void
  onClose: () => void
}

const CreateModelProviderFormContext = React.createContext<
  CreateModelProviderFormContextType | undefined
>(undefined)

export function useCreateModelProviderFormContext(): CreateModelProviderFormContextType {
  const context = React.useContext(CreateModelProviderFormContext)

  if (context === undefined) {
    throw new Error(
      'useCreateModelProviderFormContext must be used within a CreateModelProviderForm',
    )
  }

  return context
}

export function CreateModelProviderForm() {
  const [step, setStep] = React.useState<Step>('select-provider')

  const [selectedProvider, setSelectedProvider] = React.useState<
    keyof AvailableModelProvider | null
  >(null)

  const dialogCloseRef = React.useRef<HTMLButtonElement>(null)

  const onClose = () => {
    dialogCloseRef.current?.click()
  }

  const contextValue: CreateModelProviderFormContextType = {
    step,
    setStep,
    selectedProvider,
    setSelectedProvider,
    onClose,
  }

  return (
    <CreateModelProviderFormContext.Provider value={contextValue}>
      <DialogClose ref={dialogCloseRef} className="sr-only" />

      {step === 'select-provider' && <SelectProviderStep />}

      {step === 'model-provider-configuration' && (
        <ModelProviderConfigurationStep />
      )}
    </CreateModelProviderFormContext.Provider>
  )
}

function SelectProviderStep() {
  const { setStep, selectedProvider, setSelectedProvider } =
    useCreateModelProviderFormContext()

  const [search, setSearch] = React.useState('')

  const filteredProviders = React.useMemo(() => {
    return Object.values(availableModelProviders).filter(
      ({ label, description }) =>
        label.toLowerCase().includes(search.toLowerCase()) ||
        description.toLowerCase().includes(search.toLowerCase()),
    )
  }, [availableModelProviders, search])

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
              <ModelProviderCard
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
          onClick={() => setStep('model-provider-configuration')}
          disabled={!selectedProvider}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

function ModelProviderConfigurationStep() {
  const { setStep, selectedProvider, setSelectedProvider, onClose } =
    useCreateModelProviderFormContext()

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
    case 'openai-compatible':
      return (
        <OpenAICompatibleModelProvider onSuccess={onSuccess} onBack={onBack} />
      )

    case 'openai':
      return <OpenAIModelProvider onSuccess={onSuccess} onBack={onBack} />

    case 'google':
      return <GoogleModelProvider onSuccess={onSuccess} onBack={onBack} />

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
