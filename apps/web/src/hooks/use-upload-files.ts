'use client'

import {
  type GenerateUploadSignatureParams,
  generateUploadSignature,
} from '@/actions/upload-files'
import * as React from 'react'

type UploadedFile =
  | {
      status: 'success'
      id: string
      fileName: string
      fileMimeType: string
      fileSize: number
      filePath: string
      [key: string]: any
    }
  | {
      status: 'error'
      error: {
        code: string
        message: string
      }
      fileName: string
    }

export function useUploadFiles(params: GenerateUploadSignatureParams) {
  const [uploading, setUploading] = React.useState<string[]>([])

  const generateSignature = async () => {
    return await generateUploadSignature(params)
  }

  const uploadFiles = async ({ files: filesToUpload }: { files: File[] }) => {
    try {
      setUploading((prev) => [
        ...prev,
        ...filesToUpload.map((f) => `${f.name}-${f.size}`),
      ])

      const { data, error } = await generateSignature()

      if (error) {
        return { data: null, error }
      }

      const files: UploadedFile[] = await Promise.all(
        filesToUpload.map((file) =>
          uploadFileWithSignature({
            scope: params.scope,
            signature: data.signature,
            file,
          }),
        ),
      )

      return { data: { files }, error: null }
    } catch {
      return {
        data: null,
        error: { message: 'Error uploading files, please try again' },
      }
    } finally {
      setUploading((prev) =>
        prev.filter(
          (fId) =>
            !filesToUpload.map((f) => `${f.name}-${f.size}`).includes(fId),
        ),
      )
    }
  }

  const uploadFile = async ({ file: fileToUpload }: { file: File }) => {
    try {
      setUploading((prev) => [
        ...prev,
        `${fileToUpload.name}-${fileToUpload.size}`,
      ])

      const { data, error } = await generateSignature()

      if (error) {
        return { data: null, error }
      }

      const file = await uploadFileWithSignature({
        scope: params.scope,
        signature: data.signature,
        file: fileToUpload,
      })

      return { data: { file }, error: null }
    } catch {
      return {
        data: null,
        error: { message: 'Error uploading file, please try again' },
      }
    } finally {
      setUploading((prev) =>
        prev.filter(
          (fId) => fId !== `${fileToUpload.name}-${fileToUpload.size}`,
        ),
      )
    }
  }

  return {
    uploading: Boolean(uploading.length),
    generateSignature,
    uploadFiles,
    uploadFile,
  }
}

export const uploadFileWithSignature = async ({
  scope = 'public',
  signature,
  file,
}: {
  scope: GenerateUploadSignatureParams['scope']
  signature: string
  file: File
}): Promise<UploadedFile> => {
  try {
    let url = '/api/files'

    if (scope === 'conversations') {
      url = '/api/conversations/files'
    } else if (scope === 'sources') {
      url = '/api/sources/files'
    }

    const formData = new FormData()
    formData.set('file', file as File)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-upload-signature': signature,
      },
      body: formData,
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error()
    }

    const [uploadedFile] = result.files

    return uploadedFile
  } catch {
    return {
      status: 'error' as const,
      error: {
        code: 'FAILED_TO_UPLOAD_FILE',
        message: 'Failed to upload file',
      },
      fileName: file.name,
    }
  }
}
