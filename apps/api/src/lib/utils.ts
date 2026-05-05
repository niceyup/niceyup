import { InvalidArgumentError } from '@workspace/core/errros'
import { z } from 'zod'

type Headers = Record<string, string | string[] | undefined>

const defaultValueSchema = z.string().trim().nonempty().nullable().default(null)

const headersSchema = z.object({
  'x-organization-id': defaultValueSchema,
  'x-organization-slug': defaultValueSchema,
  'x-agent-id': defaultValueSchema,
  'x-agent-slug': defaultValueSchema,
})

export function resolveContextParams({ headers }: { headers: Headers }) {
  const { success, data } = headersSchema.safeParse(headers)

  if (!success) {
    throw new InvalidArgumentError({
      code: 'INVALID_HEADERS',
      message: 'Invalid headers',
    })
  }

  const organizationId = data['x-organization-id']
  const organizationSlug = data['x-organization-slug']
  const agentId = data['x-agent-id']
  const agentSlug = data['x-agent-slug']

  return {
    organizationId,
    organizationSlug,
    agentId,
    agentSlug,
  }
}
