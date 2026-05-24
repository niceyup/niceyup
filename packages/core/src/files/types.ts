import type { z } from 'zod'
import type { fileBucketScopeSchema } from './schemas'

export type FileBucketScope = z.infer<typeof fileBucketScopeSchema>

export type FileBucket = FileBucketScope['bucket']

export type FileScope = FileBucketScope['scope']

export type FileMetadata = {
  sentByUserId?: string
  sourceId?: string
}
