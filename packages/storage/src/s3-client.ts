import { S3Client } from '@aws-sdk/client-s3'
import { env } from './lib/env'

export const s3Client = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  credentials: {
    accountId: env.S3_ACCOUNT_ID,
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
})
