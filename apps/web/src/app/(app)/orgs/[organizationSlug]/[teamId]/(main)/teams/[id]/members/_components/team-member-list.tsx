'use client'

import { updateTag } from '@/actions/cache'
import type { listTeamMembers } from '@/actions/teams'
import { authClient } from '@/lib/auth/client'
import type { OrganizationTeamParams } from '@/lib/types'
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
import { Spinner } from '@workspace/ui/components/spinner'
import { MoreHorizontalIcon, PlusIcon, SearchIcon } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'
import { AddTeamMemberDialog } from './add-team-member-dialog'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  teamId: string
}

type TeamMember = Awaited<ReturnType<typeof listTeamMembers>>[number]

export function TeamMemberList({
  params,
  userId,
  isAdmin,
  teamMembers,
}: {
  params: Params
  userId: string
  isAdmin?: boolean
  teamMembers?: TeamMember[]
}) {
  const [addTeamMemberDialogOpen, setAddTeamMemberDialogOpen] =
    React.useState(false)
  const [search, setSearch] = React.useState('')

  const filteredTeamMembers = React.useMemo(() => {
    return teamMembers?.filter(
      ({ name, email }) =>
        name.toLowerCase().includes(search.toLowerCase()) ||
        email.toLowerCase().includes(search.toLowerCase()),
    )
  }, [teamMembers, search])

  return (
    <div className="flex w-full flex-col gap-4">
      {isAdmin && (
        <AddTeamMemberDialog
          params={params}
          teamMemberIds={teamMembers?.map(({ id }) => id)}
          open={addTeamMemberDialogOpen}
          onOpenChange={setAddTeamMemberDialogOpen}
        />
      )}

      <div className="flex w-full flex-row items-center gap-2">
        <InputGroup className="h-10 bg-background">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find Team Members..."
            className="[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none"
            disabled={!teamMembers?.length}
          />
        </InputGroup>

        {isAdmin && (
          <Button
            variant="outline"
            className="h-10"
            onClick={() => setAddTeamMemberDialogOpen(true)}
          >
            <PlusIcon />
            Add team member
          </Button>
        )}
      </div>

      {!teamMembers?.length && (
        <div className="w-full rounded-lg border bg-background p-4">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No Team Members Yet</EmptyTitle>
              <EmptyDescription>
                Add team members to get started.
              </EmptyDescription>
            </EmptyHeader>

            {isAdmin && (
              <EmptyContent>
                <Button onClick={() => setAddTeamMemberDialogOpen(true)}>
                  <PlusIcon />
                  Add team member
                </Button>
              </EmptyContent>
            )}
          </Empty>
        </div>
      )}

      {search && !filteredTeamMembers?.length && (
        <div className="w-full rounded-lg border bg-background p-4">
          <Empty>
            <EmptyHeader>
              <EmptyTitle className="text-sm">No Team Members Found</EmptyTitle>
              <EmptyDescription>
                Your search for "{search}" did not return any team members.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      )}

      {!!filteredTeamMembers?.length && (
        <div className="flex w-full flex-col divide-y divide-border rounded-lg border bg-background">
          {filteredTeamMembers?.map((teamMember) => (
            <div
              key={teamMember.id}
              className="flex items-center justify-start gap-4 px-4 py-3"
            >
              <Avatar className="size-8">
                {teamMember.image && <AvatarImage src={teamMember.image} />}
                <AvatarFallback className="text-xs">
                  {getInitials(teamMember.name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-col">
                <span className="line-clamp-1 break-all text-start font-medium text-sm">
                  {teamMember.name}
                </span>
                <span className="line-clamp-1 break-all text-start font-normal text-muted-foreground text-xs">
                  {teamMember.email}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {userId === teamMember.id && (
                  <Badge variant="outline">You</Badge>
                )}
                <Badge variant="outline" className="capitalize">
                  {teamMember.role}
                </Badge>
              </div>

              {isAdmin && (
                <div className="ml-auto flex items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontalIcon />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent>
                      <TeamMemberActionRemove
                        params={params}
                        userId={teamMember.id}
                      />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TeamMemberActionRemove({
  params,
  userId,
}: {
  params: Params
  userId: string
}) {
  const [isPending, startTransition] = React.useTransition()

  const onRemove = async () => {
    startTransition(async () => {
      const { data, error } = await authClient.organization.removeTeamMember({
        teamId: params.teamId,
        userId,
      })

      if (data) {
        toast.success('Team member removed successfully')
        await updateTag('remove-team-member')
      }

      if (error) {
        toast.error(error.message)
      }
    })
  }

  return (
    <DropdownMenuItem
      variant="destructive"
      onClick={onRemove}
      disabled={isPending}
    >
      {isPending && <Spinner />}
      Remove from team
    </DropdownMenuItem>
  )
}
