import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import type { FileBucket } from '@workspace/core/files'
import { resolveBucket } from '../lib/utils'
import { s3Client } from '../s3-client'

type DownloadParams = {
  bucket: FileBucket
  key: string
  destinationPath: string
}

export async function download(params: DownloadParams) {
  const command = new GetObjectCommand({
    Bucket: resolveBucket(params.bucket),
    Key: params.key,
  })

  const response = await s3Client.send(command)

  if (!response.Body) {
    throw new Error('No body returned from S3')
  }

  const dir = dirname(params.destinationPath)
  await mkdir(dir, { recursive: true })

  const writeStream = createWriteStream(params.destinationPath)
  await pipeline(response.Body as Readable, writeStream)

  return {
    filePath: params.destinationPath,
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    lastModified: response.LastModified,
    etag: response.ETag,
  }
}
