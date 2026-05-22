import { getActiveSubscription } from '@/actions/billing'
import { getMembershipRole } from '@/actions/membership'
import { PermissionDenied } from '@/components/permission-denied'
import type { OrganizationTeamParams } from '@/lib/types'
import { redirect } from 'next/navigation'

export default async function Layout({
  params,
  children,
}: Readonly<{
  params: Promise<OrganizationTeamParams>
  children: React.ReactNode
}>) {
  const { organizationSlug } = await params

  const membershipRole = await getMembershipRole({ organizationSlug })

  if (!membershipRole.isAdmin) {
    return <PermissionDenied />
  }

  const activeSubscription = await getActiveSubscription({ organizationSlug })

  if (!activeSubscription) {
    return redirect(`/orgs/${organizationSlug}/~/settings/billing`)
  }

  return children
}
