import { randomUUID } from 'node:crypto'
import { extname } from 'node:path'
import { BadRequestError } from '@/http/errors/bad-request-error'
import { UnauthorizedError } from '@/http/errors/unauthorized-error'
import { env } from '@/lib/env'
import type { MultipartFile } from '@fastify/multipart'
import { queries } from '@workspace/db/queries'
import type { FileMetadata } from '@workspace/db/types'
import { storage } from '@workspace/storage'
import jwt from 'jsonwebtoken'

export type FileBucket = 'default' | 'engine'

export type FileScope = 'public' | 'conversations' | 'sources'

export type FileBucketScope =
  | {
      bucket: 'default'
      scope: 'public' | 'conversations'
    }
  | {
      bucket: 'engine'
      scope: 'sources'
    }

export type FileData = FileBucketScope & {
  metadata?: FileMetadata
  organizationId?: string | null
}

const BucketScope = {
  default: ['public', 'conversations'],
  engine: ['sources'],
}

type FileUploadPayload<T> = T & {
  data: FileData
  accept?: string
}

type GenerateSignatureForUploadParams<T> = {
  key?: string | null
  payload: FileUploadPayload<T>
  expires: number
}

export function generateSignatureForUpload<T>(
  params: GenerateSignatureForUploadParams<T>,
) {
  const signature = jwt.sign(
    params.payload,
    `${params.key ? `${params.key}:` : ''}${env.UPLOAD_SECRET}`,
    {
      expiresIn: params.expires,
    },
  )

  return signature
}

type VerifySignatureForUploadParams = {
  key?: string | null
  signature: string
}

export function verifySignatureForUpload<T>(
  params: VerifySignatureForUploadParams,
) {
  try {
    const payload = jwt.verify(
      params.signature,
      `${params.key ? `${params.key}:` : ''}${env.UPLOAD_SECRET}`,
    ) as FileUploadPayload<T>

    return payload
  } catch {
    throw new UnauthorizedError({
      code: 'INVALID_UPLOAD_SIGNATURE',
      message: 'Invalid upload signature',
    })
  }
}

type ValidatedFileForUploadParams = {
  file: MultipartFile
  accept: string
}

export async function validatedFileForUpload(
  params: ValidatedFileForUploadParams,
) {
  if (!params.file.filename) {
    throw new BadRequestError({
      code: 'FILE_NAME_NOT_FOUND',
      message: 'File name not found',
    })
  }

  if (params.accept !== '*') {
    const acceptedTypes = params.accept.split(',').map((type) => type.trim())

    const fileMimeType = params.file.mimetype
    const fileExtension = extname(params.file.filename)

    const isAccepted = acceptedTypes.some((type) => {
      if (type.startsWith('.')) {
        return fileExtension.toLowerCase() === type.toLowerCase()
      }

      if (type.endsWith('/*')) {
        const [baseType] = type.split('/')
        return fileMimeType.startsWith(`${baseType}/`)
      }

      return fileMimeType === type
    })

    if (!isAccepted) {
      throw new BadRequestError({
        code: 'FILE_TYPE_NOT_ALLOWED',
        message: `File type "${fileMimeType}" is not allowed. Allowed types: "${params.accept}"`,
      })
    }
  }

  return params.file
}

type UploadFileToStorageParams = {
  data: FileData
  file: MultipartFile
}

export async function uploadFileToStorage(params: UploadFileToStorageParams) {
  if (!BucketScope[params.data.bucket].includes(params.data.scope)) {
    throw new BadRequestError({
      code: 'INVALID_BUCKET_SCOPE',
      message: 'Invalid bucket scope',
    })
  }

  const s3Bucket =
    params.data.bucket === 'engine'
      ? env.S3_ENGINE_BUCKET
      : env.S3_DEFAULT_BUCKET

  const uniqueFileName = `${Date.now().toString()}-${randomUUID()}`
  const fileExtension = extname(params.file.filename)

  const filePath = `${params.data.scope}/${uniqueFileName}${fileExtension}`

  const { fileSize } = await storage.upload({
    bucket: s3Bucket,
    key: filePath,
    body: params.file.file,
    contentType: params.file.mimetype,
  })

  const createdFile = await queries.createFile({
    fileName: params.file.filename,
    fileMimeType: params.file.mimetype,
    fileSize,
    filePath,
    ...params.data,
  })

  if (!createdFile) {
    // Delete the file from S3 if it was not created
    await storage.delete({ bucket: s3Bucket, key: filePath })

    throw new BadRequestError({
      code: 'FILE_NOT_CREATED',
      message: 'File not created',
    })
  }

  return createdFile
}
