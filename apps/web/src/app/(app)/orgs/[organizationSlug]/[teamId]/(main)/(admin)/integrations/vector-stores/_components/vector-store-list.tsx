'use client'

import { updateTag } from '@/actions/cache'
import { sdk } from '@/lib/sdk'
import type { OrganizationTeamParams } from '@/lib/types'
import { getInitials } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@workspace/ui/components/avatar'
import { Button } from '@workspace/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
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
import { Spinner } from '@workspace/ui/components/spinner'
import { MoreHorizontalIcon, PlusIcon, SearchIcon } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'
import { toast } from 'sonner'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
}

type VectorStore = NonNullable<
  Awaited<ReturnType<typeof sdk.listVectorStores>>['data']
>['vectorStores'][number]

export function VectorStoreList({
  params,
  vectorStores,
}: {
  params: Params
  vectorStores?: VectorStore[]
}) {
  const [search, setSearch] = React.useState('')

  const filteredVectorStores = React.useMemo(() => {
    return vectorStores?.filter(({ name }) =>
      name.toLowerCase().includes(search.toLowerCase()),
    )
  }, [vectorStores, search])

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full flex-row items-center gap-2">
        <InputGroup className="h-10 bg-background">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find Vector Stores..."
            className="[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none"
            disabled={!vectorStores?.length}
          />
        </InputGroup>

        <Button variant="outline" className="h-10" asChild>
          <Link
            href={`/orgs/${params.organizationSlug}/~/integrations/vector-stores/create`}
          >
            <PlusIcon />
            Add vector store
          </Link>
        </Button>
      </div>

      {!vectorStores?.length && (
        <div className="w-full rounded-lg border bg-background p-4">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No Vector Stores Yet</EmptyTitle>
              <EmptyDescription>
                Add a vector store to get started.
              </EmptyDescription>
            </EmptyHeader>

            <EmptyContent>
              <Button asChild>
                <Link
                  href={`/orgs/${params.organizationSlug}/~/integrations/vector-stores/create`}
                >
                  <PlusIcon />
                  Add vector store
                </Link>
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      )}

      {search && !filteredVectorStores?.length && (
        <div className="w-full rounded-lg border bg-background p-4">
          <Empty>
            <EmptyHeader>
              <EmptyTitle className="text-sm">
                No Vector Stores Found
              </EmptyTitle>
              <EmptyDescription>
                Your search for "{search}" did not return any vector stores.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      )}

      {!!filteredVectorStores?.length && (
        <div className="flex w-full flex-col divide-y divide-border rounded-lg border bg-background">
          {filteredVectorStores.map((vectorStore) => (
            <div
              key={vectorStore.id}
              className="flex items-center justify-start gap-4 px-4 py-3"
            >
              <Avatar className="size-8 rounded-sm">
                <AvatarFallback className="rounded-sm text-xs">
                  {getInitials(vectorStore.name)}
                </AvatarFallback>
              </Avatar>

              <span className="font-medium text-sm">{vectorStore.name}</span>

              <div className="ml-auto flex items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontalIcon />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent>
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/orgs/${params.organizationSlug}/~/integrations/vector-stores/${vectorStore.id}`}
                      >
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <VectorStoreActionDelete
                      params={params}
                      vectorStoreId={vectorStore.id}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function VectorStoreActionDelete({
  params,
  vectorStoreId,
}: {
  params: Params
  vectorStoreId: string
}) {
  const [isPending, startTransition] = React.useTransition()

  const onRemove = async () => {
    startTransition(async () => {
      const { error } = await sdk.deleteVectorStore({
        vectorStoreId,
        data: {
          organizationSlug: params.organizationSlug,
        },
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Vector store deleted successfully')
      await updateTag('delete-vector-store')
    })
  }

  return (
    <DropdownMenuItem
      variant="destructive"
      onClick={(e) => {
        e.stopPropagation()
        onRemove()
      }}
      disabled={isPending}
    >
      {isPending && <Spinner />}
      Delete
    </DropdownMenuItem>
  )
}
