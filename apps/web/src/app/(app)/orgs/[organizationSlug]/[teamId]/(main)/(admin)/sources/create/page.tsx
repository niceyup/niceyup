import type { OrganizationTeamParams } from '@/lib/types'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import type { SearchParams } from 'nuqs/server'
import { loadSearchParams } from '../_lib/search-params'
import { CreateSourceForm } from './_components/create-source-form'

export default async function Page({
  params,
  searchParams,
}: Readonly<{
  params: Promise<OrganizationTeamParams>
  searchParams: Promise<SearchParams>
}>) {
  const { organizationSlug } = await params
  const { folderId } = await loadSearchParams(searchParams)

  return (
    <div className="w-full max-w-2xl p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Source</CardTitle>
          <CardDescription>Add a data source to an agent.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateSourceForm
            organizationSlug={organizationSlug}
            folderId={folderId}
          />
        </CardContent>
      </Card>
    </div>
  )
}
