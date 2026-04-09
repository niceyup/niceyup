import { z } from 'zod'

export type ModelOptionValue = string | number | boolean | null

export const modelOptionSchema = z.object({
  key: z.string().trim().nonempty(),
  type: z.enum(['string', 'number', 'boolean', 'null']),
  value: z.string(),
})

export type ModelOption = z.infer<typeof modelOptionSchema>

export type ModelOptionType = ModelOption['type']

export function inferModelOptionType(value: unknown): ModelOptionType {
  if (value === null) {
    return 'null'
  }

  if (typeof value === 'boolean') {
    return 'boolean'
  }

  if (typeof value === 'number') {
    return 'number'
  }

  return 'string'
}

export function serializeModelOptionValue(
  value: unknown,
  type: ModelOptionType,
): string {
  if (type === 'null') {
    return ''
  }

  if (type === 'boolean') {
    return value ? 'true' : 'false'
  }

  if (type === 'number') {
    return typeof value === 'number' ? String(value) : String(value ?? '')
  }

  return typeof value === 'string' ? value : String(value ?? '')
}

export function parseBooleanLikeString(value: string): boolean {
  const normalized = value.trim().toLowerCase()

  if (normalized === '' || normalized === '0' || normalized === 'false') {
    return false
  }

  if (normalized === '1' || normalized === 'true') {
    return true
  }

  return Boolean(normalized)
}

export function parseModelOptionValue(
  value: string,
  type: ModelOptionType,
): ModelOptionValue {
  if (type === 'null') {
    return null
  }

  if (type === 'boolean') {
    return parseBooleanLikeString(value)
  }

  if (type === 'number') {
    const n = Number(value)

    return Number.isFinite(n) ? n : 0
  }

  return value
}
