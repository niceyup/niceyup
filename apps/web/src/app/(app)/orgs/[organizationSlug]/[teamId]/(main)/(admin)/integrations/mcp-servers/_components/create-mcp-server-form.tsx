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
import { CustomMcpServer } from './available-mcp-servers/custom-mcp'
import {
  type AvailableMcpServer,
  availableMcpServers,
} from './available-mcp-servers/mcp-servers'
import { McpServerCard } from './mcp-server-card'

type Step = 'select-connection' | 'mcp-server-configuration'

type CreateMcpServerFormContextType = {
  step: Step
  setStep: (step: Step) => void
  selectedConnection: keyof AvailableMcpServer | null
  setSelectedConnection: (connection: keyof AvailableMcpServer | null) => void
  onClose: () => void
}

const CreateMcpServerFormContext = React.createContext<
  CreateMcpServerFormContextType | undefined
>(undefined)

export function useCreateMcpServerFormContext(): CreateMcpServerFormContextType {
  const context = React.useContext(CreateMcpServerFormContext)

  if (context === undefined) {
    throw new Error(
      'useCreateMcpServerFormContext must be used within a CreateMcpServerForm',
    )
  }

  return context
}

export function CreateMcpServerForm() {
  const [step, setStep] = React.useState<Step>('select-connection')

  const [selectedConnection, setSelectedConnection] = React.useState<
    keyof AvailableMcpServer | null
  >(null)

  const dialogCloseRef = React.useRef<HTMLButtonElement>(null)

  const onClose = () => {
    dialogCloseRef.current?.click()
  }

  const contextValue: CreateMcpServerFormContextType = {
    step,
    setStep,
    selectedConnection,
    setSelectedConnection,
    onClose,
  }

  return (
    <CreateMcpServerFormContext.Provider value={contextValue}>
      <DialogClose ref={dialogCloseRef} className="sr-only" />

      {step === 'select-connection' && <SelectConnectionStep />}

      {step === 'mcp-server-configuration' && <McpServerConfigurationStep />}
    </CreateMcpServerFormContext.Provider>
  )
}

function SelectConnectionStep() {
  const { setStep, selectedConnection, setSelectedConnection } =
    useCreateMcpServerFormContext()

  const [search, setSearch] = React.useState('')

  const filteredConnections = React.useMemo(() => {
    return Object.values(availableMcpServers).filter(
      ({ label, description }) =>
        label.toLowerCase().includes(search.toLowerCase()) ||
        description.toLowerCase().includes(search.toLowerCase()),
    )
  }, [availableMcpServers, search])

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
            placeholder="Find Connections..."
            className="[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none"
          />
        </InputGroup>

        {search && !filteredConnections?.length && (
          <Empty>
            <EmptyHeader>
              <EmptyTitle className="text-sm">No Connections Found</EmptyTitle>
              <EmptyDescription>
                Your search for "{search}" did not return any connections.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {!!filteredConnections?.length && (
          <div className="grid max-h-85 w-full grid-cols-1 gap-2 overflow-y-auto">
            {filteredConnections.map((connection) => (
              <McpServerCard
                key={connection.value}
                connection={connection}
                selected={selectedConnection === connection.value}
                onSelect={setSelectedConnection}
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
          onClick={() => setStep('mcp-server-configuration')}
          disabled={!selectedConnection}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

function McpServerConfigurationStep() {
  const { setStep, selectedConnection, setSelectedConnection, onClose } =
    useCreateMcpServerFormContext()

  const onReset = () => {
    setStep('select-connection')
    setSelectedConnection(null)
  }

  const onBack = () => {
    setStep('select-connection')
  }

  const onSuccess = () => {
    onClose()
    onReset()
  }

  switch (selectedConnection) {
    case 'custom-mcp':
      return <CustomMcpServer onSuccess={onSuccess} onBack={onBack} />

    default:
      return (
        <div className="flex w-full flex-col">
          <Empty>
            <EmptyHeader>
              <EmptyTitle className="text-sm">
                Unsupported Connection
              </EmptyTitle>
              <EmptyDescription>
                This connection is not supported or could not be loaded.
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
