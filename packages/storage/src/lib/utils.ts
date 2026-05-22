import { env } from './env'
import type { Bucket } from './types'

export const resolveBucket = (bucket: Bucket) => {
  return bucket === 'engine' ? env.S3_ENGINE_BUCKET : env.S3_DEFAULT_BUCKET
}
