'use client'

import type { sdk } from '@/lib/sdk'
import { DialogClose } from '@workspace/ui/components/dialog'
import * as React from 'react'
import { CustomMcpServer } from './available-mcp-servers/custom-mcp'

type McpServer = NonNullable<
  Awaited<ReturnType<typeof sdk.getMcpServer>>['data']
>['mcpServer']

type EditMcpServerFormContextType = {
  initialData: McpServer
  onClose: () => void
}

const EditMcpServerFormContext = React.createContext<
  EditMcpServerFormContextType | undefined
>(undefined)

export function useEditMcpServerFormContext(): EditMcpServerFormContextType {
  const context = React.useContext(EditMcpServerFormContext)

  if (context === undefined) {
    throw new Error(
      'useEditMcpServerFormContext must be used within a EditMcpServerForm',
    )
  }

  return context
}

type EditMcpServerFormProps = {
  initialData: McpServer
}

export function EditMcpServerForm({ initialData }: EditMcpServerFormProps) {
  const dialogCloseRef = React.useRef<HTMLButtonElement>(null)

  const onClose = () => {
    dialogCloseRef.current?.click()
  }

  const contextValue: EditMcpServerFormContextType = {
    initialData,
    onClose,
  }

  return (
    <EditMcpServerFormContext.Provider value={contextValue}>
      <DialogClose ref={dialogCloseRef} className="sr-only" />

      <McpServerConfiguration />
    </EditMcpServerFormContext.Provider>
  )
}

function McpServerConfiguration() {
  const { initialData, onClose } = useEditMcpServerFormContext()

  const onSuccess = () => {
    onClose()
  }

  const onBack = () => {
    onClose()
  }

  switch (initialData.connection?.app) {
    default:
      return (
        <CustomMcpServer
          onSuccess={onSuccess}
          onBack={onBack}
          initialData={{
            name: initialData.name,
            type: initialData.type,
            url: initialData.url,
            headers: initialData.headers,
          }}
        />
      )

    // return (
    //   <div className="flex w-full flex-col">
    //     <Empty>
    //       <EmptyHeader>
    //         <EmptyTitle className="text-sm">Unsupported Connection</EmptyTitle>
    //         <EmptyDescription>
    //           This connection is not supported or could not be loaded.
    //         </EmptyDescription>
    //       </EmptyHeader>

    //       <EmptyContent>
    //         <Button variant="outline" onClick={onBack}>
    //           Back
    //         </Button>
    //       </EmptyContent>
    //     </Empty>
    //   </div>
    // )
  }
}
