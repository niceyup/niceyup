import { decrypt, encrypt } from '@workspace/encryption'
import { generateId } from '@workspace/utils'
import { customType, text, timestamp } from 'drizzle-orm/pg-core'

export const id = {
  id: text('id').primaryKey().$defaultFn(generateId),
}

export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .$onUpdateFn(() => new Date()),
}

export function encryptedJson<TData>(name: string) {
  return customType<{ data: TData; driverData: string }>({
    dataType() {
      return 'text'
    },
    toDriver(value: TData) {
      return encrypt(JSON.stringify(value))
    },
    fromDriver(driverData: string): TData {
      return JSON.parse(decrypt(driverData))
    },
  })(name)
}

export function encryptedText(name: string) {
  return customType<{ data: string; driverData: string }>({
    dataType() {
      return 'text'
    },
    toDriver(value: string) {
      return encrypt(value)
    },
    fromDriver(driverData: string) {
      return decrypt(driverData)
    },
  })(name)
}
