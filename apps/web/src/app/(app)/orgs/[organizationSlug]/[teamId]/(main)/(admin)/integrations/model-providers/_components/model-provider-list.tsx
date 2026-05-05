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

type ModelProvider = NonNullable<
  Awaited<ReturnType<typeof sdk.listModelProviders>>['data']
>['modelProviders'][number]

export function ModelProviderList({
  params,
  modelProviders,
}: {
  params: Params
  modelProviders?: ModelProvider[]
}) {
  const [search, setSearch] = React.useState('')

  const filteredModelProviders = React.useMemo(() => {
    return modelProviders?.filter(({ name }) =>
      name.toLowerCase().includes(search.toLowerCase()),
    )
  }, [modelProviders, search])

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
            placeholder="Find Model Providers..."
            className="[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none"
            disabled={!modelProviders?.length}
          />
        </InputGroup>

        <Button variant="outline" className="h-10" asChild>
          <Link
            href={`/orgs/${params.organizationSlug}/~/integrations/model-providers/create`}
          >
            <PlusIcon />
            Add model provider
          </Link>
        </Button>
      </div>

      {!modelProviders?.length && (
        <div className="w-full rounded-lg border bg-background p-4">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No Model Providers Yet</EmptyTitle>
              <EmptyDescription>
                Add a model provider to get started.
              </EmptyDescription>
            </EmptyHeader>

            <EmptyContent>
              <Button asChild>
                <Link
                  href={`/orgs/${params.organizationSlug}/~/integrations/model-providers/create`}
                >
                  <PlusIcon />
                  Add model provider
                </Link>
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      )}

      {search && !filteredModelProviders?.length && (
        <div className="w-full rounded-lg border bg-background p-4">
          <Empty>
            <EmptyHeader>
              <EmptyTitle className="text-sm">
                No Model Providers Found
              </EmptyTitle>
              <EmptyDescription>
                Your search for "{search}" did not return any model providers.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      )}

      {!!filteredModelProviders?.length && (
        <div className="flex w-full flex-col divide-y divide-border rounded-lg border bg-background">
          {filteredModelProviders.map((modelProvider) => (
            <div
              key={modelProvider.id}
              className="flex items-center justify-start gap-4 px-4 py-3"
            >
              <Avatar className="size-8 rounded-sm">
                <AvatarFallback className="rounded-sm text-xs">
                  {getInitials(modelProvider.name)}
                </AvatarFallback>
              </Avatar>

              <span className="font-medium text-sm">{modelProvider.name}</span>

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
                        href={`/orgs/${params.organizationSlug}/~/integrations/model-providers/${modelProvider.id}`}
                      >
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <ModelProviderActionDelete
                      params={params}
                      modelProviderId={modelProvider.id}
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

function ModelProviderActionDelete({
  params,
  modelProviderId,
}: {
  params: Params
  modelProviderId: string
}) {
  const [isPending, startTransition] = React.useTransition()

  const onRemove = async () => {
    startTransition(async () => {
      const { error } = await sdk.deleteModelProvider({
        headers: {
          'x-organization-slug': params.organizationSlug,
        },
        modelProviderId,
        data: {},
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Model provider deleted successfully')
      await updateTag('delete-model-provider')
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
