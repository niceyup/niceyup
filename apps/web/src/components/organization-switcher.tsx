'use client'

import { setActiveOrganizationTeam } from '@/actions/organizations'
import { TeamSwitcher } from '@/components/team-switcher'
import type { Organization, Team } from '@/lib/types'
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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import {
  ChevronsUpDownIcon,
  CircleDashedIcon,
  PlusCircleIcon,
  SlashIcon,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export function OrganizationSwitcher({
  selectedOrganizationLabel,
  activeOrganization,
  activeTeam,
  organizations,
  teams,
}: {
  selectedOrganizationLabel?: string
  activeOrganization?: Organization
  activeTeam?: Team
  organizations?: Organization[]
  teams?: Team[]
}) {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="max-w-[250px]">
            {selectedOrganizationLabel ? (
              <>
                <CircleDashedIcon className="size-5" />
                <span className="truncate">{selectedOrganizationLabel}</span>
              </>
            ) : activeOrganization ? (
              <>
                <Avatar className="size-6 rounded-sm">
                  {activeOrganization.logo && (
                    <AvatarImage src={activeOrganization.logo} />
                  )}
                  <AvatarFallback className="rounded-sm" />
                </Avatar>
                <span className="truncate">{activeOrganization.name}</span>
                <Badge variant="outline" className="rounded-sm">
                  Standard
                </Badge>
              </>
            ) : (
              <span className="text-muted-foreground">Select organization</span>
            )}
            <ChevronsUpDownIcon className="ml-auto text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={12}
          className="w-[200px]"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel>Organizations</DropdownMenuLabel>
            {organizations?.map((organization) => {
              return (
                <DropdownMenuItem
                  key={organization.id}
                  onClick={async () => {
                    await setActiveOrganizationTeam({
                      organizationId: organization.id,
                    })

                    router.push(`/orgs/${organization.slug}/~/overview`)
                  }}
                  disabled={!organization.slug}
                >
                  <Avatar className="size-4 rounded-sm">
                    {organization.logo && (
                      <AvatarImage src={organization.logo} />
                    )}
                    <AvatarFallback className="rounded-sm" />
                  </Avatar>
                  <span className="line-clamp-1">{organization.name}</span>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuGroup>

          {pathname !== '/onboarding/create-organization' && (
            <DropdownMenuItem asChild>
              <Link href="/onboarding/create-organization">
                <PlusCircleIcon />
                Create organization
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {activeOrganization && (
        <>
          <SlashIcon className="-rotate-[24deg] size-3 text-border" />

          <TeamSwitcher activeTeam={activeTeam} teams={teams} />
        </>
      )}
    </>
  )
}
