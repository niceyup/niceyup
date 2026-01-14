import { queries } from '@workspace/db/queries'

export async function resolveOrganizationContext({
  userId,
  organizationId,
  organizationSlug,
  teamId,
}: {
  userId: string
  organizationId?: string | null
  organizationSlug?: string | null
  teamId?: string | null
}) {
  const orgId =
    organizationId ||
    (await queries.getOrganizationIdBySlug({ organizationSlug }))

  if (!orgId) {
    return null
  }

  return {
    userId,
    organizationId: orgId,
    teamId: teamId && teamId !== '~' ? teamId : null,
  }
}
