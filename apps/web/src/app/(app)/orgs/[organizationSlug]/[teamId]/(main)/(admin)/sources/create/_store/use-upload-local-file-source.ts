import { uploadFileWithSignature } from '@/hooks/use-upload-files'
import { create } from 'zustand'

type UploadFile = {
  id: string
  file: File
  signature: string
  uploaded?: boolean
  error?: string
}

interface UploadLocalFileSourceStore {
  uploadFiles: UploadFile[]
  setUploadFiles: (uploadFiles: UploadFile[]) => void
  addUploadFiles: (uploadFiles: UploadFile[]) => Promise<void>
  clearUploadFiles: () => void
}

const BATCH_SIZE = 15

export const useUploadLocalFileSource = create<UploadLocalFileSourceStore>()(
  (set) => ({
    uploadFiles: [],
    setUploadFiles: (uploadFiles) => set(() => ({ uploadFiles })),
    addUploadFiles: async (uploadFiles) => {
      set((state) => ({ uploadFiles: [...state.uploadFiles, ...uploadFiles] }))

      for (let i = 0; i < uploadFiles.length; i += BATCH_SIZE) {
        const batch = uploadFiles.slice(i, i + BATCH_SIZE)

        await Promise.all(
          batch.map((file) =>
            uploadFile(file)
              .then((metadata) =>
                set((state) => ({
                  uploadFiles: state.uploadFiles.map((item) =>
                    item.id === metadata.id ? { ...item, ...metadata } : item,
                  ),
                })),
              )
              .catch(() => {
                // Do nothing
              }),
          ),
        )
      }
    },
    clearUploadFiles: () => set(() => ({ uploadFiles: [] })),
  }),
)

const uploadFile = async ({ id, file, signature }: UploadFile) => {
  try {
    const uploadedFile = await uploadFileWithSignature({
      scope: 'sources',
      signature,
      file,
    })

    if (uploadedFile.status === 'error') {
      return { id, error: uploadedFile.error.message }
    }

    return { id, uploaded: true }
  } catch {
    return { id, error: 'Failed to upload file' }
  }
}
