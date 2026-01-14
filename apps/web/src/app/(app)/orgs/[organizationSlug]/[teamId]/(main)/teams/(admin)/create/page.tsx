import { getOrganizationIdBySlug } from '@/actions/organizations'
import type { OrganizationTeamParams } from '@/lib/types'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { CreateTeamForm } from './_components/create-team-form'

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams>
}>) {
  const { organizationSlug } = await params

  const organizationId = await getOrganizationIdBySlug({ organizationSlug })

  if (!organizationId) {
    return null
  }

  return (
    <div className="w-full max-w-xl p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create Team</CardTitle>
          <CardDescription>
            Create a team within your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateTeamForm
            organizationSlug={organizationSlug}
            organizationId={organizationId}
          />
        </CardContent>
      </Card>
    </div>
  )
}
