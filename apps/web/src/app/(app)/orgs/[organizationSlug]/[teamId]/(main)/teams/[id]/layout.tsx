import { getTeam } from '@/actions/teams'
import { Sidebar, type SidebarItem } from '@/components/sidebar'
import { TeamNotFound } from '@/components/team-not-found'
import type { OrganizationTeamParams } from '@/lib/types'
import { cn } from '@workspace/ui/lib/utils'
import { SquareArrowOutUpRightIcon } from 'lucide-react'
import { Header } from './_components/header'

export default async function Layout({
  params,
  children,
}: Readonly<{
  params: Promise<OrganizationTeamParams & { id: string }>
  children: React.ReactNode
}>) {
  const { organizationSlug, id: teamId } = await params

  const team = await getTeam({ organizationSlug, teamId })

  if (!team) {
    return <TeamNotFound organizationSlug={organizationSlug} />
  }

  const items: SidebarItem[] = [
    {
      label: 'General',
      href: `/orgs/${organizationSlug}/~/teams/${teamId}/general`,
    },
    {
      label: 'Team Members',
      href: `/orgs/${organizationSlug}/~/teams/${teamId}/members`,
    },
    {
      label: 'Documentation',
      href: 'https://docs.niceyup.com/teams',
      target: '_blank',
      icon: <SquareArrowOutUpRightIcon className="ml-auto" />,
    },
  ]

  return (
    <div className="flex size-full flex-1 flex-col">
      <Header params={{ organizationSlug }} team={team} />

      <div className="flex flex-1 flex-col items-center gap-4 p-4">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 lg:flex-row">
          <div
            className={cn(
              'flex w-full flex-col gap-1 lg:w-55',
              'lg:sticky lg:top-[58px] lg:self-start',
            )}
          >
            <Sidebar items={items} />
          </div>

          <div
            className={cn(
              'flex w-full flex-1 flex-col gap-4',
              'lg:sticky lg:top-[58px] lg:self-start',
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
