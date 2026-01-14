import type { OrganizationTeamParams } from '@/lib/types'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { CreateSourceForm } from './_components/create-source-form'

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams>
}>) {
  const { organizationSlug } = await params

  return (
    <div className="w-full max-w-2xl p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Source</CardTitle>
          <CardDescription>Add a data source to an agent.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateSourceForm organizationSlug={organizationSlug} />
        </CardContent>
      </Card>
    </div>
  )
}
