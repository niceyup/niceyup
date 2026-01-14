import { isOrganizationMemberAdmin } from '@/actions/membership'
import { listTeams } from '@/actions/teams'
import type { OrganizationTeamParams } from '@/lib/types'
import { Button } from '@workspace/ui/components/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import { PlusIcon } from 'lucide-react'
import Link from 'next/link'
import { TeamList } from './_components/team-list'

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams>
}>) {
  const { organizationSlug } = await params

  const isAdmin = await isOrganizationMemberAdmin({ organizationSlug })

  const teams = await listTeams({ organizationSlug })

  return (
    <div className="flex size-full flex-1 flex-col">
      <div className="border-b bg-background p-4">
        <div className="mx-auto flex max-w-4xl flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h2 className="font-semibold text-sm">Teams</h2>
              <p className="mt-1 text-muted-foreground text-sm">
                Create and manage teams within your organization.
              </p>
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-4">
              <Button asChild>
                <Link href={`/orgs/${organizationSlug}/~/teams/create`}>
                  <PlusIcon />
                  Create team
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center gap-4 p-4">
        {!teams.length && (
          <div className="w-full max-w-4xl rounded-lg border bg-background p-4">
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No Teams Yet</EmptyTitle>
                <EmptyDescription>
                  Create a team to get started.
                </EmptyDescription>
              </EmptyHeader>

              {isAdmin && (
                <EmptyContent>
                  <Button asChild>
                    <Link href={`/orgs/${organizationSlug}/~/teams/create`}>
                      <PlusIcon />
                      Create team
                    </Link>
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          </div>
        )}

        {!!teams.length && (
          <TeamList params={{ organizationSlug }} teams={teams} />
        )}
      </div>
    </div>
  )
}
