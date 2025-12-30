import { listAgents } from '@/actions/agents'
import {
  listOrganizationTeams,
  listOrganizations,
} from '@/actions/organizations'
import { Logo } from '@/components/logo'
import { OrganizationSwitcher } from '@/components/organization-switcher'
import { ProfileButton } from '@/components/profile-button'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { authenticatedUser } from '@/lib/auth/server'
import type { Agent, OrganizationTeamParams, Team } from '@/lib/types'
import { Separator } from '@workspace/ui/components/separator'
import { SlashIcon } from 'lucide-react'
import Link from 'next/link'
import { AgentSwitcher } from './agent-switcher'

export async function Header({
  organizationSlug,
  teamId,
  activeAgent,
  selectedOrganizationLabel,
}: Partial<OrganizationTeamParams> & {
  activeAgent?: Agent
  selectedOrganizationLabel?: string
}) {
  const {
    session: { activeOrganizationId, activeTeamId },
  } = await authenticatedUser()

  const organizations = await listOrganizations()

  const activeOrganization = organizations.find(
    ({ slug }) => slug === organizationSlug,
  )

  let teams: Team[] = []
  let activeTeam: Team | undefined

  if (activeOrganization?.slug) {
    teams = await listOrganizationTeams({
      organizationSlug: activeOrganization.slug,
    })

    const currentTeamId =
      activeOrganizationId === activeOrganization.id &&
      (!teamId || teamId === '~')
        ? activeTeamId
        : teamId

    activeTeam = teams.find(({ id }) => id === currentTeamId)
  }

  let agents: Agent[] = []

  if (activeAgent) {
    agents = await listAgents({ organizationId: activeOrganization?.id })
  }

  return (
    <header className="z-50 flex flex-col items-center justify-center bg-background">
      <div className="no-scrollbar flex w-full items-center justify-between gap-4 overflow-auto px-4 py-2">
        <div className="flex items-center gap-1">
          <div className="px-2">
            <Link href="/">
              <Logo className="size-8" />
            </Link>
          </div>

          <SlashIcon className="-rotate-[24deg] size-3 text-border" />

          <OrganizationSwitcher
            selectedOrganizationLabel={selectedOrganizationLabel}
            activeOrganization={activeOrganization}
            activeTeam={activeTeam}
            organizations={organizations}
            teams={teams}
          />

          {activeAgent && (
            <>
              <SlashIcon className="-rotate-[24deg] size-3 text-border" />

              <AgentSwitcher activeAgent={activeAgent} agents={agents} />
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          <ThemeSwitcher />

          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-4"
          />

          <ProfileButton />
        </div>
      </div>

      <Separator />
    </header>
  )
}
