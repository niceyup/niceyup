import { Button } from '@workspace/ui/components/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import { PlusIcon } from 'lucide-react'

export default async function Page() {
  return (
    <div className="flex size-full flex-1 flex-col">
      <div className="border-b bg-background p-4">
        <div className="mx-auto flex max-w-4xl flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h2 className="font-semibold text-sm">Tools</h2>
              <p className="mt-1 text-muted-foreground text-sm">
                Manage the tools this AI agent can use to perform actions and
                tasks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button disabled>
              <PlusIcon />
              Add tool
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center gap-4 p-4">
        <div className="w-full max-w-4xl rounded-lg border bg-background p-4">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No Tools Yet</EmptyTitle>
              <EmptyDescription>Add a tool to get started.</EmptyDescription>
            </EmptyHeader>

            <EmptyContent>
              <Button disabled>
                <PlusIcon />
                Add tool
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      </div>
    </div>
  )
}
