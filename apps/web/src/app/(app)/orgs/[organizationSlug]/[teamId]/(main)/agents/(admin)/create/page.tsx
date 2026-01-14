import type { OrganizationTeamParams } from '@/lib/types'
import {
  Card,
  CardContent,
  CardDescription,
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
    <div className="w-full max-w-xl p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create Agent</CardTitle>
          <CardDescription>Create and configure an AI agent.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateAgentForm
            organizationSlug={organizationSlug}
            teamId={teamId}
          />
        </CardContent>
      </Card>
    </div>
  )
}
