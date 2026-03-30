'use client'

import type { OrganizationTeamParams } from '@/lib/types'
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
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import {
  type AvailableSourceType,
  availableSourceTypes,
} from './available-source-types/source-types'
import { TextSource } from './available-source-types/text-source'
import { UploadFileSource } from './available-source-types/upload-file-source'
import { SourceTypeCard } from './source-type-card'

type Step = 'select-source-type' | 'source-configuration'

type CreateSourceFormContextType = {
  modal?: boolean
  organizationSlug: OrganizationTeamParams['organizationSlug']
  folderId?: string | null
  step: Step
  setStep: (step: Step) => void
  selectedSourceType: keyof AvailableSourceType | null
  setSelectedSourceType: (sourceType: keyof AvailableSourceType | null) => void
}

const CreateSourceFormContext = React.createContext<
  CreateSourceFormContextType | undefined
>(undefined)

export function useCreateSourceFormContext(): CreateSourceFormContextType {
  const context = React.useContext(CreateSourceFormContext)

  if (context === undefined) {
    throw new Error(
      'useCreateSourceFormContext must be used within a CreateSourceForm',
    )
  }

  return context
}

type CreateSourceFormProps = {
  modal?: boolean
  organizationSlug: OrganizationTeamParams['organizationSlug']
  folderId?: string
}

export function CreateSourceForm({
  modal,
  organizationSlug,
  folderId,
}: CreateSourceFormProps) {
  const [step, setStep] = React.useState<Step>('select-source-type')

  const [selectedSourceType, setSelectedSourceType] = React.useState<
    keyof AvailableSourceType | null
  >(null)

  const contextValue: CreateSourceFormContextType = {
    modal,
    organizationSlug,
    folderId,
    step,
    setStep,
    selectedSourceType,
    setSelectedSourceType,
  }

  return (
    <CreateSourceFormContext.Provider value={contextValue}>
      {step === 'select-source-type' && <SelectSourceTypeStep />}

      {step === 'source-configuration' && <SourceConfigurationStep />}
    </CreateSourceFormContext.Provider>
  )
}

function SelectSourceTypeStep() {
  const {
    modal,
    organizationSlug,
    folderId,
    setStep,
    selectedSourceType,
    setSelectedSourceType,
  } = useCreateSourceFormContext()

  const [search, setSearch] = React.useState('')

  const filteredSourceTypes = React.useMemo(() => {
    return Object.values(availableSourceTypes).filter(
      ({ label, description }) =>
        label.toLowerCase().includes(search.toLowerCase()) ||
        description.toLowerCase().includes(search.toLowerCase()),
    )
  }, [availableSourceTypes, search])

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
            placeholder="Find Source Types..."
            className="[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none"
          />
        </InputGroup>

        {search && !filteredSourceTypes?.length && (
          <Empty>
            <EmptyHeader>
              <EmptyTitle className="text-sm">No Source Types Found</EmptyTitle>
              <EmptyDescription>
                Your search for "{search}" did not return any source types.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {!!filteredSourceTypes?.length && (
          <div className="grid max-h-85 w-full grid-cols-1 gap-2 overflow-y-auto">
            {filteredSourceTypes.map((sourceType) => (
              <SourceTypeCard
                key={sourceType.value}
                sourceType={sourceType}
                selected={selectedSourceType === sourceType.value}
                onSelect={setSelectedSourceType}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex w-full flex-row items-center justify-end gap-2">
        {modal ? (
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
        ) : (
          <Button variant="outline" asChild>
            <Link
              href={`/orgs/${organizationSlug}/~/sources${folderId ? `?folderId=${folderId}` : ''}`}
            >
              Cancel
            </Link>
          </Button>
        )}

        <Button
          onClick={() => setStep('source-configuration')}
          disabled={!selectedSourceType}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

function SourceConfigurationStep() {
  const {
    modal,
    organizationSlug,
    folderId,
    setStep,
    selectedSourceType,
    setSelectedSourceType,
  } = useCreateSourceFormContext()

  const router = useRouter()

  const onReset = () => {
    setStep('select-source-type')
    setSelectedSourceType(null)
  }

  const onBack = () => {
    setStep('select-source-type')
  }

  const onSuccess = () => {
    if (modal) {
      // Dismiss the modal
      router.back()
    }

    onReset()

    // Fix: The router is not updated immediately
    setTimeout(
      () =>
        router.push(
          `/orgs/${organizationSlug}/~/sources${folderId ? `?folderId=${folderId}` : ''}`,
        ),
      300,
    )
  }

  switch (selectedSourceType) {
    case 'file':
      return (
        <UploadFileSource
          onBack={onBack}
          onSuccess={onSuccess}
          folderId={folderId}
        />
      )

    case 'text':
      return (
        <TextSource onSuccess={onSuccess} onBack={onBack} folderId={folderId} />
      )

    default:
      return (
        <div className="flex w-full flex-col">
          <Empty>
            <EmptyHeader>
              <EmptyTitle className="text-sm">
                Unsupported Source Type
              </EmptyTitle>
              <EmptyDescription>
                This source type is not supported or could not be loaded.
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
