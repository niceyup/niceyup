import type { FileBucket, FileMetadata, FileScope } from '@workspace/core/files'
import { and, eq } from 'drizzle-orm'
import { type DBTransaction, db } from '../db'
import { files } from '../schema'

type CreateFileParams = {
  fileName: string
  fileMimeType: string
  fileSize: number
  filePath: string
  bucket: FileBucket
  scope: FileScope
  metadata?: FileMetadata
  referenceId: string
}

export async function createFile(params: CreateFileParams, tx?: DBTransaction) {
  const [file] = await (tx || db)
    .insert(files)
    .values({
      fileName: params.fileName,
      fileMimeType: params.fileMimeType,
      fileSize: params.fileSize,
      filePath: params.filePath,
      bucket: params.bucket,
      scope: params.scope,
      metadata: params.metadata,
      referenceId: params.referenceId,
    })
    .returning({
      id: files.id,
      fileName: files.fileName,
      fileMimeType: files.fileMimeType,
      fileSize: files.fileSize,
      filePath: files.filePath,
      bucket: files.bucket,
      scope: files.scope,
      metadata: files.metadata,
    })

  return file || null
}

type GetFileParams = {
  fileId: string
  referenceId: string | null | undefined
}

export async function getFile(params: GetFileParams) {
  if (!params.referenceId) {
    return null
  }

  const [file] = await db
    .select({
      id: files.id,
      fileName: files.fileName,
      fileMimeType: files.fileMimeType,
      fileSize: files.fileSize,
      filePath: files.filePath,
      bucket: files.bucket,
      scope: files.scope,
      metadata: files.metadata,
    })
    .from(files)
    .where(
      and(
        eq(files.id, params.fileId),
        eq(files.referenceId, params.referenceId),
      ),
    )
    .limit(1)

  return file || null
}
