import type { FileBucket } from '@workspace/core/files'
import { env } from './env'

export function resolveBucket(bucket: FileBucket) {
  if (bucket === 'private') {
    return env.S3_PRIVATE_BUCKET
  }

  return env.S3_BUCKET
}
