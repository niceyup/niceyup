import { Button } from '@workspace/ui/components/button'
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
import { PlusIcon, SearchIcon } from 'lucide-react'

export default async function Page() {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full flex-row items-center gap-2">
        <InputGroup className="h-10 bg-background">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            placeholder="Find Connections..."
            className="[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none"
            disabled
          />
        </InputGroup>

        <Button variant="outline" className="h-10" disabled>
          <PlusIcon />
          Add connection
        </Button>
      </div>

      <div className="w-full rounded-lg border bg-background p-4">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No Connections Yet</EmptyTitle>
            <EmptyDescription>
              Add a connection to get started.
            </EmptyDescription>
          </EmptyHeader>

          <EmptyContent>
            <Button disabled>
              <PlusIcon />
              Add connection
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    </div>
  )
}
