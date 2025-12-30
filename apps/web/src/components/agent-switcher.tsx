'use client'

import type { Agent, OrganizationTeamParams } from '@/lib/types'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@workspace/ui/components/avatar'
import { Button } from '@workspace/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { ChevronsUpDownIcon, PlusCircleIcon } from 'lucide-react'
import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'

export function AgentSwitcher({
  activeAgent,
  agents,
}: {
  activeAgent?: Agent
  agents?: Agent[]
}) {
  const { organizationSlug, teamId } = useParams<OrganizationTeamParams>()
  const pathname = usePathname()
  const router = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="max-w-[250px]">
          {activeAgent ? (
            <>
              <Avatar className="size-5">
                {activeAgent.logo && <AvatarImage src={activeAgent.logo} />}
                <AvatarFallback />
              </Avatar>
              <span className="truncate">{activeAgent.name}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Select agent</span>
          )}
          <ChevronsUpDownIcon className="ml-auto size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={12} className="w-[200px]">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Agents</DropdownMenuLabel>
          {agents?.map((agent) => {
            return (
              <DropdownMenuItem
                key={agent.id}
                onClick={async () => {
                  router.push(
                    `/orgs/${organizationSlug}/${teamId}/agents/${agent.id}/chats/new`,
                  )
                }}
              >
                <Avatar className="size-4">
                  {agent.logo && <AvatarImage src={agent.logo} />}
                  <AvatarFallback />
                </Avatar>
                <span className="line-clamp-1">{agent.name}</span>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>

        {pathname !== `/orgs/${organizationSlug}/${teamId}/agents/create` && (
          <DropdownMenuItem asChild>
            <Link href={`/orgs/${organizationSlug}/${teamId}/agents/create`}>
              <PlusCircleIcon className="size-4" />
              Create agent
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
