import { and, eq, isNull } from 'drizzle-orm'
import { db } from '../../db'
import { files } from '../../schema'

type ContextGetFileParams = {
  organizationId?: string | null
  isAdmin?: boolean
}

type GetFileParams = {
  fileId: string
}

export async function getFile(
  context: ContextGetFileParams,
  params: GetFileParams,
) {
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
        context.organizationId
          ? eq(files.organizationId, context.organizationId)
          : isNull(files.organizationId),
      ),
    )
    .limit(1)

  if (file?.bucket === 'engine' && !context.isAdmin) {
    return null
  }

  return file || null
}
