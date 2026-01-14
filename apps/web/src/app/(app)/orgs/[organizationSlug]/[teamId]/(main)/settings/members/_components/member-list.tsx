'use client'

import { updateTag } from '@/actions/cache'
import {
  type listOrganizationMembers,
  setActiveOrganizationTeam,
} from '@/actions/organizations'
import type { listTeams } from '@/actions/teams'
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
import {
  LockIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'
import { InviteMemberDialog } from './invite-member-dialog'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  organizationId: string
}

type OrganizationMember = Awaited<
  ReturnType<typeof listOrganizationMembers>
>[number]

type Team = Awaited<ReturnType<typeof listTeams>>[number]

export function MemberList({
  params,
  userId,
  isOwner,
  isAdmin,
  isPremium,
  members,
  teams,
}: {
  params: Params
  userId: string
  isOwner?: boolean
  isAdmin?: boolean
  isPremium?: boolean
  members?: OrganizationMember[]
  teams?: Team[]
}) {
  const [inviteMemberDialogOpen, setInviteMemberDialogOpen] =
    React.useState(false)
  const [search, setSearch] = React.useState('')

  const filteredMembers = React.useMemo(() => {
    return members?.filter(
      ({ name, email }) =>
        name.toLowerCase().includes(search.toLowerCase()) ||
        email.toLowerCase().includes(search.toLowerCase()),
    )
  }, [members, search])

  return (
    <div className="flex w-full flex-col gap-4">
      {isAdmin && (
        <InviteMemberDialog
          params={params}
          isPremium={isPremium}
          teams={teams}
          open={inviteMemberDialogOpen}
          onOpenChange={setInviteMemberDialogOpen}
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
            placeholder="Find Members..."
            className="[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none"
            disabled={!members?.length}
          />
        </InputGroup>

        {isAdmin && (
          <Button
            variant="outline"
            className="h-10"
            onClick={() => setInviteMemberDialogOpen(true)}
          >
            <PlusIcon />
            Invite member
          </Button>
        )}
      </div>

      {!members?.length && (
        <div className="w-full rounded-lg border bg-background p-4">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No Members Yet</EmptyTitle>
              <EmptyDescription>
                Invite members to get started.
              </EmptyDescription>
            </EmptyHeader>

            {isAdmin && (
              <EmptyContent>
                <Button onClick={() => setInviteMemberDialogOpen(true)}>
                  <PlusIcon />
                  Invite member
                </Button>
              </EmptyContent>
            )}
          </Empty>
        </div>
      )}

      {search && !filteredMembers?.length && (
        <div className="w-full rounded-lg border bg-background p-4">
          <Empty>
            <EmptyHeader>
              <EmptyTitle className="text-sm">No Members Found</EmptyTitle>
              <EmptyDescription>
                Your search for "{search}" did not return any members.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      )}

      {!!filteredMembers?.length && (
        <div className="flex w-full flex-col divide-y divide-border rounded-lg border bg-background">
          {filteredMembers?.map((member) => {
            const isMemberOwner = member.role === 'owner'

            return (
              <div
                key={member.id}
                className="flex items-center justify-start gap-4 px-4 py-3"
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
                  {userId === member.id && <Badge variant="outline">You</Badge>}
                  <Badge variant="outline" className="capitalize">
                    {member.role}
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
                        {!isOwner && isMemberOwner ? (
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={true}
                          >
                            Remove from organization
                            <LockIcon className="ml-auto" />
                          </DropdownMenuItem>
                        ) : (
                          <MemberActionRemove
                            params={params}
                            memberId={member.memberId}
                            isLeave={userId === member.id}
                          />
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MemberActionRemove({
  params,
  memberId,
  isLeave,
}: {
  params: Params
  memberId: string
  isLeave: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  const onLeave = async () => {
    startTransition(async () => {
      const { data, error } = await authClient.organization.leave({
        organizationId: params.organizationId,
      })

      if (data) {
        toast.success('You have left the organization')

        await setActiveOrganizationTeam()
        router.push('/')
      }

      if (error) {
        toast.error(error.message)
      }
    })
  }

  const onRemove = async () => {
    startTransition(async () => {
      const { data, error } = await authClient.organization.removeMember({
        organizationId: params.organizationId,
        memberIdOrEmail: memberId,
      })

      if (data) {
        toast.success('Member removed successfully')
        await updateTag('remove-member')
      }

      if (error) {
        toast.error(error.message)
      }
    })
  }

  return (
    <DropdownMenuItem
      variant="destructive"
      onClick={isLeave ? onLeave : onRemove}
      disabled={isPending}
    >
      {isPending && <Spinner />}
      {isLeave ? 'Leave organization' : 'Remove from organization'}
    </DropdownMenuItem>
  )
}
