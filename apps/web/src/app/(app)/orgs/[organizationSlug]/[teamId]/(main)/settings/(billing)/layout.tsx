import { getMembershipRole } from '@/actions/membership'
import { PermissionDenied } from '@/components/permission-denied'
import type { OrganizationTeamParams } from '@/lib/types'

export default async function Layout({
  params,
  children,
}: Readonly<{
  params: Promise<OrganizationTeamParams>
  children: React.ReactNode
}>) {
  const { organizationSlug } = await params

  const membershipRole = await getMembershipRole({ organizationSlug })

  if (!membershipRole.isBilling) {
    return (
      <div className="w-full rounded-lg border bg-background p-4 py-24">
        <PermissionDenied />
      </div>
    )
  }

  return children
}
