import { z } from 'zod'
import { FILE_BUCKET_SCOPES } from './constants'

export const fileBucketScopeSchema = z.discriminatedUnion('bucket', [
  z.object({
    bucket: z.literal('public'),
    scope: z.enum(FILE_BUCKET_SCOPES.public),
  }),
  z.object({
    bucket: z.literal('private'),
    scope: z.enum(FILE_BUCKET_SCOPES.private),
  }),
])
