import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  paginateListObjectsV2,
} from '@aws-sdk/client-s3'
import type { Bucket } from '../lib/types'
import { resolveBucket } from '../lib/utils'
import { s3Client } from '../s3-client'

type DeleteParams = {
  bucket: Bucket
  key: string
}

export async function del(params: DeleteParams) {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: resolveBucket(params.bucket),
      Key: params.key,
    }),
  )
}

type DeleteDirectoryParams = {
  bucket: Bucket
  path: `/${string}/`
}

export async function deleteDirectory(params: DeleteDirectoryParams) {
  const prefix = `${params.path.replace(/^\/+|\/+$/g, '')}/`

  let deletedCount = 0

  const paginator = paginateListObjectsV2(
    { client: s3Client },
    { Bucket: resolveBucket(params.bucket), Prefix: prefix },
  )

  for await (const page of paginator) {
    if (!page.Contents?.length) {
      continue
    }

    const objects = page.Contents

    await s3Client.send(
      new DeleteObjectsCommand({
        Bucket: resolveBucket(params.bucket),
        Delete: { Objects: objects.map(({ Key }) => ({ Key })) },
      }),
    )

    deletedCount += objects.length
  }

  return deletedCount
}
