'use client'

import type { listTeams } from '@/actions/teams'
import type { OrganizationTeamParams } from '@/lib/types'
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
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import { CircleDashedIcon, MoreHorizontalIcon, SearchIcon } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
}

type Team = Awaited<ReturnType<typeof listTeams>>[number]

export function TeamList({
  params,
  teams,
}: {
  params: Params
  teams?: Team[]
}) {
  const [search, setSearch] = React.useState('')

  const filteredTeams = React.useMemo(() => {
    return teams?.filter(({ name }) =>
      name.toLowerCase().includes(search.toLowerCase()),
    )
  }, [teams, search])

  return (
    <>
      <div className="flex w-full max-w-4xl flex-col">
        <InputGroup className="h-11 bg-background">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find Teams..."
            className="[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none"
          />
        </InputGroup>
      </div>

      {!filteredTeams?.length && (
        <div className="w-full max-w-4xl rounded-lg border bg-background p-4">
          <Empty>
            <EmptyHeader>
              <EmptyTitle className="text-sm">No teams found</EmptyTitle>
              <EmptyDescription>
                Your search for "{search}" did not return any teams.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      )}

      {!!filteredTeams?.length && (
        <div className="flex w-full max-w-4xl flex-col divide-y divide-border rounded-lg border bg-background">
          {filteredTeams.map((team) => (
            <Link
              key={team.id}
              className="flex items-center justify-start gap-4 p-4"
              href={`/orgs/${params.organizationSlug}/~/teams/${team.id}`}
            >
              <div className="flex size-8 items-center justify-center rounded-sm bg-muted">
                <CircleDashedIcon className="size-4" />
              </div>

              <span className="font-medium text-sm">{team.name}</span>

              <Badge variant="outline" className="text-xs">
                {team.memberCount}{' '}
                {team.memberCount > 1 ? 'Team Members' : 'Team Member'}
              </Badge>

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
                        href={`/orgs/${params.organizationSlug}/~/teams/${team.id}`}
                      >
                        Manage
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
