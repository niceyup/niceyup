'use client'

import { useUploadFiles } from '@/hooks/use-upload-files'
import { authClient } from '@/lib/auth/client'
import { env } from '@/lib/env'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@workspace/ui/components/button'
import {
  Form,
  FormField,
  FormItem,
  FormMessage,
} from '@workspace/ui/components/form'
import { Spinner } from '@workspace/ui/components/spinner'
import { useFileUpload } from '@workspace/ui/hooks/use-file-upload'
import { ImageIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const formSchema = z.object({
  image: z.string(),
})

export function EditUserImageForm({
  image,
}: { image: string | null | undefined }) {
  const [
    { files, isDragging },
    {
      openFileDialog,
      getInputProps,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
    },
  ] = useFileUpload({
    accept: 'image/png, image/jpeg',
    maxSize: 2 * 1024 * 1024, // 2 MB
  })

  const { uploadFile } = useUploadFiles({
    bucket: 'default',
    scope: 'public',
    accept: 'image/png, image/jpeg',
    maxSize: 2 * 1024 * 1024, // 2 MB
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      image: image || '',
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    let url = values.image

    const [fileToUpload] = files

    if (fileToUpload) {
      const { data, error } = await uploadFile({
        file: fileToUpload.file as File,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      if (data) {
        if (data.file.status === 'error') {
          toast.error(data.file.error.message)
          return
        }

        url = new URL(
          data.file.filePath,
          env.NEXT_PUBLIC_STORAGE_URL,
        ).toString()
      }
    }

    const { data, error } = await authClient.updateUser({
      image: url,
    })

    if (data) {
      toast.success('Avatar updated successfully')
    }

    if (error) {
      toast.error(error.message)
    }
  }

  const [file] = files

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="rounded-lg border border-border bg-background"
      >
        <div className="relative flex min-h-39 flex-col gap-5 p-5 sm:gap-6 sm:p-6">
          <FormField
            control={form.control}
            name="image"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-col gap-3">
                  <h2 className="font-semibold text-xl">Avatar</h2>
                  <div className="flex flex-row items-start justify-between gap-3">
                    <div className="flex flex-col items-start gap-2">
                      <p className="text-muted-foreground text-sm">
                        This is your user's avatar.
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Click on the image to upload a custom one from your
                        files.
                      </p>
                    </div>

                    <div className="relative inline-flex max-w-min">
                      <button
                        type="button"
                        className="relative flex size-20 items-center justify-center overflow-hidden rounded-full border border-input border-dashed outline-none transition-colors hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-disabled:pointer-events-none has-[img]:border-none has-disabled:opacity-50 data-[dragging=true]:bg-accent/50"
                        onClick={openFileDialog}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        data-dragging={isDragging || undefined}
                      >
                        {file?.preview || field.value ? (
                          <img
                            className="size-full object-cover"
                            src={file?.preview || field.value || ''}
                            alt={file?.file?.name || ''}
                            width={64}
                            height={64}
                            style={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <div>
                            <ImageIcon className="size-4 opacity-60" />
                          </div>
                        )}
                      </button>
                      <input
                        {...getInputProps()}
                        className="sr-only"
                        tabIndex={-1}
                      />
                    </div>
                  </div>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
        </div>
        <div className="flex min-h-15 items-center justify-between gap-4 rounded-b-lg border-border border-t bg-foreground/2 p-3 sm:px-6">
          <p className="text-muted-foreground text-sm">
            An avatar is optional but strongly recommended.
          </p>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Spinner />}
            Save
          </Button>
        </div>
      </form>
    </Form>
  )
}
