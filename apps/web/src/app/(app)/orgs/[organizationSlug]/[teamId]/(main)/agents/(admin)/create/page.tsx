import type { OrganizationTeamParams } from '@/lib/types'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { CreateAgentForm } from './_components/create-agent-form'

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams>
}>) {
  const { organizationSlug, teamId } = await params

  return (
    <div className="w-full max-w-xl p-4 md:p-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-center font-semibold text-xl leading-none">
            Create an Agent
          </CardTitle>
        </CardHeader>
        <CardContent className="mt-5">
          <CreateAgentForm
            organizationSlug={organizationSlug}
            teamId={teamId}
          />
        </CardContent>
      </Card>
    </div>
  )
}
