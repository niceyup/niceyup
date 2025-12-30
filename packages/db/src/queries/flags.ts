import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import { flags, flagsToOrganizations } from '../schema'
import { getOrganizationIdBySlug } from './organizations'

type GetFlagParams = (
  | {
      organizationId: string
      organizationSlug?: never
    }
  | {
      organizationId?: never
      organizationSlug: string
    }
) &
  (
    | {
        flagId: string
        flagSlug?: never
      }
    | {
        flagId?: never
        flagSlug: string
      }
  )

export async function getFlag(params: GetFlagParams) {
  const orgId =
    params.organizationId ??
    (await getOrganizationIdBySlug({
      organizationSlug: params.organizationSlug,
    }))

  if (!orgId) {
    return null
  }

  const [flag] = await db
    .select({
      id: flags.id,
      slug: flags.slug,
      organizationId: flagsToOrganizations.organizationId,
    })
    .from(flags)
    .innerJoin(flagsToOrganizations, eq(flags.id, flagsToOrganizations.flagId))
    .where(
      and(
        params.flagId !== undefined
          ? eq(flags.id, params.flagId)
          : eq(flags.slug, params.flagSlug),
        eq(flagsToOrganizations.organizationId, orgId),
      ),
    )
    .limit(1)

  return flag || null
}
