import { isOrganizationMemberAdmin } from '@/actions/membership'
import { sdk } from '@/lib/sdk'
import type { OrganizationTeamParams } from '@/lib/types'
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
import { CirclePlusIcon, MoreHorizontalIcon } from 'lucide-react'
import Link from 'next/link'

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams>
}>) {
  const { organizationSlug, teamId } = await params

  const isAdmin = await isOrganizationMemberAdmin({ organizationSlug })

  const { data } = await sdk.listAgents({
    params: { organizationSlug },
  })

  return (
    <div className="flex size-full flex-1 flex-col">
      <div className="border-b bg-background p-4">
        <div className="mx-auto flex max-w-4xl flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h2 className="font-semibold text-sm">Agents</h2>
              <p className="mt-1 text-muted-foreground text-sm">
                Create and manage AI agents for your organization.
              </p>
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-4">
              <Button asChild>
                <Link
                  href={`/orgs/${organizationSlug}/${teamId}/agents/create`}
                >
                  New Agent
                  <CirclePlusIcon className="size-4" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center gap-4 p-4">
        {!data?.agents.length && (
          <div className="w-full max-w-4xl rounded-lg border bg-background p-4">
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No Agents Yet</EmptyTitle>
                <EmptyDescription>
                  Create an agent to get started.
                </EmptyDescription>
              </EmptyHeader>

              {isAdmin && (
                <EmptyContent>
                  <Button asChild>
                    <Link
                      href={`/orgs/${organizationSlug}/${teamId}/agents/create`}
                    >
                      New Agent
                      <CirclePlusIcon className="size-4" />
                    </Link>
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          </div>
        )}

        {!!data?.agents.length && (
          <div className="grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
            {data.agents.map((agent) => (
              <Link
                key={agent.id}
                href={`/orgs/${organizationSlug}/${teamId}/agents/${agent.id}/chats/new`}
                className="group/card flex cursor-pointer flex-col gap-4 rounded-xl border bg-background p-4"
              >
                <div className="flex flex-row items-center justify-between gap-3">
                  <Avatar className="size-8">
                    {agent.logo && <AvatarImage src={agent.logo} />}
                    <AvatarFallback />
                  </Avatar>

                  <span className="line-clamp-2 w-full font-semibold text-sm">
                    {agent.name}
                  </span>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 transition-opacity group-hover/card:opacity-100"
                      >
                        <MoreHorizontalIcon className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent>
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/orgs/${organizationSlug}/${teamId}/agents/${agent.id}/settings`}
                        >
                          Settings
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {agent.description && (
                  <p className="line-clamp-3 text-muted-foreground text-sm">
                    {agent.description}
                  </p>
                )}

                {agent.tags && (
                  <div className="flex flex-wrap gap-1">
                    {agent.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
