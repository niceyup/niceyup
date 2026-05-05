import { getMembershipRole } from '@/actions/membership'
import { getOrganization } from '@/actions/organizations'
import type { OrganizationTeamParams } from '@/lib/types'
import { DeleteOrganizationForm } from './_components/delete-organization-form'
import { EditOrganizationLogoForm } from './_components/edit-organization-logo-form'
import { EditOrganizationNameForm } from './_components/edit-organization-name-form'
import { EditOrganizationSlugForm } from './_components/edit-organization-slug-form'
import { LeaveOrganizationForm } from './_components/leave-organization-form'
import { ViewOrganizationId } from './_components/view-organization-id'

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams>
}>) {
  const { organizationSlug, teamId } = await params

  const membershipRole = await getMembershipRole({ organizationSlug })

  const organization = await getOrganization({ organizationSlug })

  if (!organization) {
    return null
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <EditOrganizationNameForm
        params={{ organizationId: organization.id }}
        name={organization.name}
        isAdmin={membershipRole.isAdmin}
      />

      <EditOrganizationSlugForm
        params={{ organizationId: organization.id }}
        slug={organization.slug}
        isAdmin={membershipRole.isAdmin}
      />

      <EditOrganizationLogoForm
        params={{ organizationId: organization.id, organizationSlug, teamId }}
        logo={organization.logo}
        isAdmin={membershipRole.isAdmin}
      />

      <ViewOrganizationId id={organization.id} />

      <LeaveOrganizationForm params={{ organizationId: organization.id }} />

      {membershipRole.isOwner && (
        <DeleteOrganizationForm params={{ organizationId: organization.id }} />
      )}
    </div>
  )
}
