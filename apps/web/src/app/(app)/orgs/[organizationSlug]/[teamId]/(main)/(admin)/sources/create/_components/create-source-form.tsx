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
import { cn } from '@workspace/ui/lib/utils'
import { FileTextIcon, SearchIcon, TextIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { TextSource } from './text-source'
import { UploadFileSource } from './upload-file-source'

const sourceTypes = {
  file: {
    value: 'file' as const,
    label: 'File',
    description:
      'Upload documents to train your AI. Extract text from PDFs, DOCX, and TXT files.',
    icon: <FileTextIcon className="size-4" />,
  },
  text: {
    value: 'text' as const,
    label: 'Text',
    description:
      'Add plain text-based sources to train your AI Agent with precise information.',
    icon: <TextIcon className="size-4" />,
  },
  // website: {
  //   value: 'website' as const,
  //   label: 'Website',
  //   description:
  //     'Crawl web pages or submit sitemaps to update your AI with the latest content.',
  //   icon: <GlobeIcon className="size-4" />,
  // },
  // 'question-answer': {
  //   value: 'question-answer' as const,
  //   label: 'Q&A',
  //   description:
  //     'Craft responses for key questions, ensuring your AI shares relevant info.',
  //   icon: <MessagesSquareIcon className="size-4" />,
  // },
}

type SourceType = keyof typeof sourceTypes

type Step = 'source-type' | 'source-configuration'

type CreateSourceFormProps = {
  modal?: boolean
  organizationSlug: OrganizationTeamParams['organizationSlug']
}

export function CreateSourceForm({
  modal,
  organizationSlug,
}: CreateSourceFormProps) {
  const [step, setStep] = React.useState<Step>('source-type')

  const [selectedSourceType, setSelectedSourceType] =
    React.useState<SourceType | null>(null)

  if (step === 'source-configuration') {
    return (
      <SourceConfigurationStep
        modal={modal}
        organizationSlug={organizationSlug}
        setStep={setStep}
        selectedSourceType={selectedSourceType}
        setSelectedSourceType={setSelectedSourceType}
      />
    )
  }

  return (
    <SourceTypeStep
      modal={modal}
      organizationSlug={organizationSlug}
      setStep={setStep}
      selectedSourceType={selectedSourceType}
      setSelectedSourceType={setSelectedSourceType}
    />
  )
}

type SourceTypeStepProps = CreateSourceFormProps & {
  setStep: (step: Step) => void
  selectedSourceType: SourceType | null
  setSelectedSourceType: (sourceType: SourceType) => void
}

function SourceTypeStep({
  setStep,
  selectedSourceType,
  setSelectedSourceType,
  modal,
  organizationSlug,
}: SourceTypeStepProps) {
  const [search, setSearch] = React.useState('')

  const filteredSourceTypes = React.useMemo(() => {
    return Object.values(sourceTypes).filter(
      ({ label, description }) =>
        label.toLowerCase().includes(search.toLowerCase()) ||
        description.toLowerCase().includes(search.toLowerCase()),
    )
  }, [sourceTypes, search])

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full flex-col gap-2">
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
          <div className="grid max-h-85 w-full grid-cols-1 gap-2 overflow-y-auto md:grid-cols-2">
            {filteredSourceTypes.map((sourceType) => (
              <div
                key={sourceType.value}
                className={cn(
                  'group flex cursor-pointer select-none items-center justify-start gap-4 rounded-md border p-2 hover:bg-accent',
                  { 'border-primary': selectedSourceType === sourceType.value },
                )}
                onClick={() => setSelectedSourceType(sourceType.value)}
              >
                <div className="flex size-8 items-center justify-center rounded-sm bg-muted">
                  {sourceType.icon}
                </div>

                <div className="flex flex-1 flex-col">
                  <div className="flex flex-row items-center justify-start gap-2">
                    <span className="line-clamp-1 break-all text-start font-medium text-sm">
                      {sourceType.label}
                    </span>
                  </div>

                  <span className="line-clamp-1 break-all text-start font-normal text-muted-foreground text-xs">
                    {sourceType.description}
                  </span>
                </div>
              </div>
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
            <Link href={`/orgs/${organizationSlug}/~/sources`}>Cancel</Link>
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

type SourceConfigurationStepProps = {
  setStep: (step: Step) => void
  selectedSourceType: SourceType | null
  setSelectedSourceType: (sourceType: SourceType | null) => void
} & CreateSourceFormProps

function SourceConfigurationStep({
  setStep,
  selectedSourceType,
  setSelectedSourceType,
  modal,
  organizationSlug,
}: SourceConfigurationStepProps) {
  const router = useRouter()

  const onReset = () => {
    setStep('source-type')
    setSelectedSourceType(null)
  }

  const onSuccess = () => {
    if (modal) {
      // Dismiss the modal
      router.back()
    }

    onReset()

    // Fix: The router is not updated immediately
    setTimeout(() => router.push(`/orgs/${organizationSlug}/~/sources`), 300)
  }

  const onBack = () => {
    setStep('source-type')
  }

  if (selectedSourceType === 'file') {
    return (
      <UploadFileSource
        onSuccess={onSuccess}
        onBack={onBack}
        sourceType={sourceTypes[selectedSourceType]}
      />
    )
  }

  if (selectedSourceType === 'text') {
    return (
      <TextSource
        onSuccess={onSuccess}
        onBack={onBack}
        sourceType={sourceTypes[selectedSourceType]}
      />
    )
  }

  return (
    <div className="flex w-full flex-col">
      <Empty>
        <EmptyHeader>
          <EmptyTitle className="text-sm">No Source Type Selected</EmptyTitle>
          <EmptyDescription>
            Please select a source type to continue.
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
