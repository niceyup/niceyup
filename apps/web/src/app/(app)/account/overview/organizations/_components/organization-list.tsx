'use client'

import type { listOrganizations } from '@/actions/organizations'
import { getInitials } from '@/lib/utils'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@workspace/ui/components/avatar'
import { Badge } from '@workspace/ui/components/badge'
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
import { MoreHorizontalIcon, PlusIcon, SearchIcon } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

type Organization = Awaited<ReturnType<typeof listOrganizations>>[number]

export function OrganizationList({
  organizations,
}: {
  organizations?: Organization[]
}) {
  const [search, setSearch] = React.useState('')

  const filteredOrganizations = React.useMemo(() => {
    return organizations?.filter(({ name }) =>
      name.toLowerCase().includes(search.toLowerCase()),
    )
  }, [organizations, search])

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
            placeholder="Find Organizations..."
            className="[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none"
            disabled={!organizations?.length}
          />
        </InputGroup>

        <Button variant="outline" className="h-10" asChild>
          <Link href="/onboarding/create-organization">
            <PlusIcon />
            Create organization
          </Link>
        </Button>
      </div>

      {!organizations?.length && (
        <div className="w-full rounded-lg border bg-background p-4">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No Organizations Yet</EmptyTitle>
              <EmptyDescription>
                Create an organization to get started.
              </EmptyDescription>
            </EmptyHeader>

            <EmptyContent>
              <Button asChild>
                <Link href="/onboarding/create-organization">
                  <PlusIcon />
                  Create organization
                </Link>
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      )}

      {search && !filteredOrganizations?.length && (
        <div className="w-full rounded-lg border bg-background p-4">
          <Empty>
            <EmptyHeader>
              <EmptyTitle className="text-sm">
                No Organizations Found
              </EmptyTitle>
              <EmptyDescription>
                Your search for "{search}" did not return any organizations.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      )}

      {!!filteredOrganizations?.length && (
        <div className="flex w-full flex-col divide-y divide-border rounded-lg border bg-background">
          {filteredOrganizations?.map((organization) => (
            <div
              key={organization.id}
              className="flex items-center justify-start gap-4 px-4 py-3"
            >
              <Avatar className="size-8 rounded-sm">
                {organization.logo && <AvatarImage src={organization.logo} />}
                <AvatarFallback className="rounded-sm text-xs">
                  {getInitials(organization.name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-col">
                <span className="line-clamp-1 break-all text-start font-medium text-sm">
                  {organization.name}
                </span>
                <span className="line-clamp-1 break-all text-start font-normal text-muted-foreground text-xs capitalize">
                  {organization.member.role}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Badge variant="outline" className="rounded-sm">
                  Standard
                </Badge>
              </div>

              <div className="ml-auto flex items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontalIcon />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent>
                    <DropdownMenuItem asChild>
                      <Link href={`/orgs/${organization.slug}/~/overview`}>
                        View
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/orgs/${organization.slug}/~/settings`}>
                        Manage
                      </Link>
                    </DropdownMenuItem>
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
