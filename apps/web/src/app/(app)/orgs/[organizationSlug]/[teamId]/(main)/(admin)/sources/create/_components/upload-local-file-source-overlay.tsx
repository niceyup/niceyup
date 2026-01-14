'use client'

import { FileTypeIcon } from '@/components/file-type-icon'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@workspace/ui/components/accordion'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { Spinner } from '@workspace/ui/components/spinner'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'
import { CircleCheckIcon, XCircleIcon, XIcon } from 'lucide-react'
import { useUploadLocalFileSource } from '../_store/use-upload-local-file-source'

export function UploadLocalFileSourceOverlay() {
  const { uploadFiles, clearUploadFiles } = useUploadLocalFileSource()

  if (!uploadFiles.length) {
    return null
  }

  const uploadingFiles = uploadFiles.filter(
    (file) => !file.uploaded && !file.error,
  )

  const uploadedFiles = uploadFiles.filter((file) => file.uploaded)

  return (
    <div className="fixed inset-0 z-50 mx-8 mt-auto ml-auto h-min max-w-xs rounded-t-lg border bg-background shadow-sm">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="uploads">
          <AccordionTrigger className="items-center gap-2 px-4">
            <span className="w-full">
              {uploadingFiles.length
                ? `Uploading ${uploadingFiles.length} ${uploadFiles.length > 1 ? 'items' : 'item'}`
                : `Uploaded ${uploadedFiles.length} ${uploadedFiles.length > 1 ? 'items' : 'item'}`}
            </span>

            {!uploadingFiles.length && (
              <div
                className="order-last translate-y-0.5 transition-transform"
                onClick={(e) => {
                  e.stopPropagation()
                  clearUploadFiles()
                }}
              >
                <XIcon className="size-4 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground" />
              </div>
            )}
          </AccordionTrigger>
          <AccordionContent>
            <ScrollArea className="flex max-h-[300px] flex-col">
              {uploadFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-accent"
                >
                  <span className="shrink-0">
                    <FileTypeIcon
                      className="size-4 opacity-60"
                      file={file.file}
                    />
                  </span>
                  <span className="line-clamp-1 break-all font-medium text-foreground text-xs">
                    {file.file.name}
                  </span>
                  <span className="ml-auto shrink-0">
                    {file.uploaded && <CircleCheckIcon className="size-4" />}
                    {file.error && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <XCircleIcon className="size-4 text-destructive" />
                        </TooltipTrigger>
                        <TooltipContent>{file.error}</TooltipContent>
                      </Tooltip>
                    )}
                    {!file.uploaded && !file.error && <Spinner />}
                  </span>
                </div>
              ))}
            </ScrollArea>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
