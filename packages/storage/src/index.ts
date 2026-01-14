import { del, deleteDirectory } from './commands/delete'
import { download } from './commands/download'
import { signedUrl } from './commands/signed-url'
import { upload } from './commands/upload'
import { s3Client } from './s3-client'

export const storage = {
  upload,
  download,
  delete: del,
  deleteDirectory,
  signedUrl,
  s3Client,
}

export * from './s3-client'
