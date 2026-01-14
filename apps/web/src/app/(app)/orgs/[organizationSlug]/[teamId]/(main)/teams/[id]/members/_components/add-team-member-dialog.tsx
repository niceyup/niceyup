'use client'

import { updateTag } from '@/actions/cache'
import { listOrganizationMembers } from '@/actions/organizations'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
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
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Spinner } from '@workspace/ui/components/spinner'
import { SearchIcon } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  teamId: string
}

type OrganizationMember = {
  added: boolean
} & Awaited<ReturnType<typeof listOrganizationMembers>>[number]

export function AddTeamMemberDialog({
  params,
  teamMemberIds,
  open,
  onOpenChange,
}: {
  params: Params
  teamMemberIds?: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [isPending, startTransition] = React.useTransition()
  const [members, setMembers] = React.useState<OrganizationMember[]>([])

  React.useEffect(() => {
    startTransition(async () => {
      const members = await listOrganizationMembers(params)

      setMembers(
        members
          .map((member) => ({
            ...member,
            added: !!teamMemberIds?.includes(member.id),
          }))
          .sort((a, b) => Number(a.added) - Number(b.added)),
      )
    })
  }, [teamMemberIds?.length])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>Add a member to this team.</DialogDescription>
        </DialogHeader>

        {isPending ? (
          <AddTeamMemberContentSkeleton />
        ) : (
          <AddTeamMemberDialogContent params={params} members={members} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function AddTeamMemberDialogContent({
  params,
  members,
}: {
  params: Params
  members: OrganizationMember[]
}) {
  const [search, setSearch] = React.useState('')

  const filteredMembers = React.useMemo(() => {
    return members?.filter(
      ({ name, email }) =>
        name.toLowerCase().includes(search.toLowerCase()) ||
        email.toLowerCase().includes(search.toLowerCase()),
    )
  }, [members, search])

  return (
    <div className="flex w-full flex-col gap-2">
      <InputGroup>
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Find Organization Members..."
          className="[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none"
          disabled={!members?.length}
        />
      </InputGroup>

      {search && !filteredMembers?.length && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle className="text-sm">
              No Organization Members Found
            </EmptyTitle>
            <EmptyDescription>
              Your search for "{search}" did not return any organization
              members.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {!!filteredMembers?.length && (
        <div className="flex max-h-85 w-full flex-col divide-y divide-border overflow-y-auto rounded-lg border">
          {filteredMembers?.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-start gap-3 p-3"
            >
              <Avatar className="size-8">
                {member.image && <AvatarImage src={member.image} />}
                <AvatarFallback className="text-xs">
                  {getInitials(member.name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-col">
                <span className="line-clamp-1 break-all text-start font-medium text-sm">
                  {member.name}
                </span>
                <span className="line-clamp-1 break-all text-start font-normal text-muted-foreground text-xs">
                  {member.email}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {/* {userId === member.id && <Badge variant="outline">You</Badge>} */}
                <Badge variant="outline" className="capitalize">
                  {member.role}
                </Badge>
              </div>

              <div className="ml-auto flex items-center">
                <TeamMemberActionAdd
                  params={params}
                  memberId={member.id}
                  added={member.added}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TeamMemberActionAdd({
  params,
  memberId,
  added,
}: {
  params: Params
  memberId: string
  added: boolean
}) {
  const [isPending, startTransition] = React.useTransition()

  const onAdd = async () => {
    startTransition(async () => {
      const { data, error } = await authClient.organization.addTeamMember({
        teamId: params.teamId,
        userId: memberId,
      })

      if (data) {
        toast.success('Team member added successfully')
        await updateTag('add-team-member')
      }

      if (error) {
        toast.error(error.message)
      }
    })
  }

  return (
    <Button variant="outline" disabled={added || isPending} onClick={onAdd}>
      {isPending && <Spinner />}
      {added ? 'Added' : 'Add'}
    </Button>
  )
}

function AddTeamMemberContentSkeleton() {
  return (
    <div className="flex w-full flex-col gap-2">
      <Skeleton className="h-9 w-full" />

      <div className="flex max-h-85 w-full flex-col divide-y divide-border overflow-y-auto rounded-lg border">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`skeleton-${index + 1}`}
            className="flex items-center justify-start gap-3 p-3"
          >
            <Skeleton className="size-8 rounded-full" />

            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-40" />
            </div>

            <div className="ml-auto flex items-center">
              <Skeleton className="h-9 w-15" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
