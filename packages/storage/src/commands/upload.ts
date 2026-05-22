import type { Readable } from 'node:stream'
import { Upload } from '@aws-sdk/lib-storage'
import type { Bucket } from '../lib/types'
import { resolveBucket } from '../lib/utils'
import { s3Client } from '../s3-client'

type UploadParams = {
  bucket: Bucket
  key: string
  body: string | Uint8Array | Buffer | Readable
  contentType: string
}

export async function upload(params: UploadParams) {
  let fileSize = 0

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: resolveBucket(params.bucket),
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    },
  })

  upload.on('httpUploadProgress', (progress) => {
    fileSize = progress.loaded || fileSize
  })

  const result = await upload.done()

  return {
    etag: result.ETag,
    location: result.Location,
    fileSize,
  }
}
