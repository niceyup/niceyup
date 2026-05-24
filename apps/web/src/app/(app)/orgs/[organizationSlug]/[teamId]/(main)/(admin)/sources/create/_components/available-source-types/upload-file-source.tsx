import { useUploadFiles } from '@/hooks/use-upload-files'
import type { OrganizationTeamParams } from '@/lib/types'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@workspace/ui/components/accordion'
import { Button } from '@workspace/ui/components/button'
import { Form } from '@workspace/ui/components/form'
import { Spinner } from '@workspace/ui/components/spinner'
import type { FileWithPreview } from '@workspace/ui/hooks/use-file-upload'
import { useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { useUploadLocalFileSource } from '../../_store/use-upload-local-file-source'
import { FilesUpload } from '../files-upload'
import { SourceTypeCard } from '../source-type-card'
import { availableSourceTypes } from './source-types'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
}

const formSchema = z.object({
  files: z
    .array(
      z.object({
        id: z.string(),
        file: z.file(),
      }),
    )
    .nonempty(),
})

type UploadFileSourceProps = {
  onBack: () => void
  onSuccess: () => void
  folderId?: string | null
}

export function UploadFileSource({
  onBack,
  onSuccess,
  folderId,
}: UploadFileSourceProps) {
  const params = useParams<Params>()

  const { addUploadFiles } = useUploadLocalFileSource()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      files: [],
    },
  })

  const { generateSignature } = useUploadFiles({
    bucket: 'private',
    scope: 'sources',
    params: {
      organizationSlug: params.organizationSlug,
    },
    fileType: 'unstructured',
    explorerNode: {
      folderId,
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const { data, error } = await generateSignature()

    if (error) {
      toast.error(error.message)
      return
    }

    addUploadFiles(
      values.files.map((file) => ({ ...file, signature: data.signature })),
    )

    onSuccess()
  }

  const onFilesChange = (files: FileWithPreview[]) => {
    form.setValue(
      'files',
      files.map((file) => ({ id: file.id, file: file.file as File })),
    )
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full flex-col gap-4"
      >
        <SourceTypeCard sourceType={availableSourceTypes.file} />

        <div className="flex w-full flex-col gap-2">
          <FilesUpload
            maxSize={500 * 1024 * 1024} // 500MB default
            accept="application/pdf, text/plain"
            onFilesChange={onFilesChange}
            errorMessage={form.formState.errors.files?.message}
          />

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="advanced-settings">
              <AccordionTrigger>Advanced settings</AccordionTrigger>
              <AccordionContent className="flex flex-col gap-2 px-1">
                <p className="py-6 text-center text-muted-foreground text-xs">
                  Coming soon
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="flex w-full flex-row items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Spinner />}
            Add
          </Button>
        </div>
      </form>
    </Form>
  )
}
