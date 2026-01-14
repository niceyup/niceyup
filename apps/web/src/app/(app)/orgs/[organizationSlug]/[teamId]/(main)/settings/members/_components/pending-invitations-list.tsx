'use client'

import { updateTag } from '@/actions/cache'
import type { listPendingInvitations } from '@/actions/invitations'
import type { listTeams } from '@/actions/teams'
import { authClient } from '@/lib/auth/client'
import type { OrganizationTeamParams } from '@/lib/types'
import { getInitials } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@workspace/ui/components/avatar'
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
import { InviteMemberDialog } from './invite-member-dialog'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  organizationId: string
}

type PendingInvitation = Awaited<
  ReturnType<typeof listPendingInvitations>
>[number]

type Team = Awaited<ReturnType<typeof listTeams>>[number]

export function PendingInvitationsList({
  params,
  isPremium,
  pendingInvitations,
  teams,
}: {
  params: Params
  isPremium?: boolean
  pendingInvitations?: PendingInvitation[]
  teams?: Team[]
}) {
  const [inviteMemberDialogOpen, setInviteMemberDialogOpen] =
    React.useState(false)
  const [search, setSearch] = React.useState('')

  const filteredPendingInvitations = React.useMemo(() => {
    return pendingInvitations?.filter(({ email }) =>
      email.toLowerCase().includes(search.toLowerCase()),
    )
  }, [pendingInvitations, search])

  return (
    <div className="flex w-full flex-col gap-4">
      <InviteMemberDialog
        params={params}
        isPremium={isPremium}
        teams={teams}
        open={inviteMemberDialogOpen}
        onOpenChange={setInviteMemberDialogOpen}
      />

      <div className="flex w-full flex-row items-center gap-2">
        <InputGroup className="h-10 bg-background">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find Pending Invitations..."
            className="[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none"
            disabled={!pendingInvitations?.length}
          />
        </InputGroup>

        <Button
          variant="outline"
          className="h-10"
          onClick={() => setInviteMemberDialogOpen(true)}
        >
          <PlusIcon />
          Invite member
        </Button>
      </div>

      {!pendingInvitations?.length && (
        <div className="w-full rounded-lg border bg-background p-4">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No Pending Invitations Found</EmptyTitle>
              <EmptyDescription>
                Invite members to get started.
              </EmptyDescription>
            </EmptyHeader>

            <EmptyContent>
              <Button onClick={() => setInviteMemberDialogOpen(true)}>
                <PlusIcon />
                Invite member
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      )}

      {search && !filteredPendingInvitations?.length && (
        <div className="w-full rounded-lg border bg-background p-4">
          <Empty>
            <EmptyHeader>
              <EmptyTitle className="text-sm">
                No Pending Invitations Found
              </EmptyTitle>
              <EmptyDescription>
                Your search for "{search}" did not return any pending
                invitations.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      )}

      {!!filteredPendingInvitations?.length && (
        <div className="flex w-full flex-col divide-y divide-border rounded-lg border bg-background">
          {filteredPendingInvitations?.map((pendingInvitation) => {
            const isExpired = new Date() > new Date(pendingInvitation.expiresAt)

            return (
              <div
                key={pendingInvitation.id}
                className="flex items-center justify-start gap-4 px-4 py-3"
              >
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs">
                    {getInitials(pendingInvitation.email)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex flex-col">
                  <span className="line-clamp-1 break-all text-start font-medium text-sm">
                    {pendingInvitation.email}
                  </span>
                  {pendingInvitation.team && (
                    <span className="line-clamp-1 break-all text-start text-muted-foreground text-xs">
                      {pendingInvitation.team.name}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="capitalize">
                    {pendingInvitation.role}
                  </Badge>
                  {isExpired && <Badge variant="destructive">Expired</Badge>}
                </div>

                <div className="ml-auto flex items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontalIcon />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent>
                      {!isExpired && (
                        <PendingInvitationActionCancel
                          invitationId={pendingInvitation.id}
                        />
                      )}
                      <PendingInvitationActionReInvite
                        params={params}
                        email={pendingInvitation.email}
                        role={pendingInvitation.role}
                        teamId={pendingInvitation.teamId}
                      />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PendingInvitationActionCancel({
  invitationId,
}: { invitationId: string }) {
  const [isPending, startTransition] = React.useTransition()

  const onCancel = async () => {
    startTransition(async () => {
      const { data, error } = await authClient.organization.cancelInvitation({
        invitationId,
      })

      if (data) {
        toast.success('Invitation canceled successfully')
        await updateTag('cancel-invitation')
      }

      if (error) {
        toast.error(error.message)
      }
    })
  }

  return (
    <DropdownMenuItem
      variant="destructive"
      onClick={onCancel}
      disabled={isPending}
    >
      {isPending && <Spinner />}
      Cancel invitation
    </DropdownMenuItem>
  )
}

function PendingInvitationActionReInvite({
  params,
  email,
  role,
  teamId,
}: {
  params: Params
  email: string
  role?: string | null
  teamId?: string | null
}) {
  const [isPending, startTransition] = React.useTransition()

  const onReInvite = async () => {
    startTransition(async () => {
      const { data, error } = await authClient.organization.inviteMember({
        organizationId: params.organizationId,
        email,
        role: role || 'member',
        teamId: teamId || undefined,
        resend: true,
      })

      if (data) {
        toast.success('Invitation re-sent successfully')
        await updateTag('invite-member')
      }

      if (error) {
        toast.error(error.message)
      }
    })
  }

  return (
    <DropdownMenuItem onClick={onReInvite} disabled={isPending}>
      {isPending && <Spinner />}
      Re-invite
    </DropdownMenuItem>
  )
}
