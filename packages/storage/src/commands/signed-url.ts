import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { FileBucket } from '@workspace/core/files'
import { resolveBucket } from '../lib/utils'
import { s3Client } from '../s3-client'

type SignedUrlParams = {
  bucket: FileBucket
  key: string
  expires: number
}

export async function signedUrl(params: SignedUrlParams) {
  const command = new GetObjectCommand({
    Bucket: resolveBucket(params.bucket),
    Key: params.key,
  })

  const url = await getSignedUrl(s3Client, command, {
    expiresIn: params.expires,
  })

  return url
}
