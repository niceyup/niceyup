'use client'

import { FileTypeIcon } from '@/components/file-type-icon'
import { Button } from '@workspace/ui/components/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import {
  type FileWithPreview,
  formatBytes,
  useFileUpload,
} from '@workspace/ui/hooks/use-file-upload'
import { FileIcon, Trash2Icon, UploadCloudIcon, UploadIcon } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

export function FilesUpload({
  maxFiles = Number.POSITIVE_INFINITY,
  maxSize = 500 * 1024 * 1024, // 500MB default
  accept = '*',
  multiple = true,
  onFilesChange,
  errorMessage,
}: {
  maxFiles?: number
  maxSize?: number
  accept?: string
  multiple?: boolean
  onFilesChange?: (files: FileWithPreview[]) => void
  errorMessage?: string
}) {
  const [
    { files, isDragging, errors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      clearFiles,
      getInputProps,
    },
  ] = useFileUpload({
    maxFiles,
    maxSize,
    accept,
    multiple,
    onFilesChange,
  })

  React.useEffect(() => {
    if (errors.length) {
      toast.error(errors[0])
    }
  }, [errors])

  return (
    <div className="flex flex-col gap-2">
      {/* Drop area */}
      <div
        className="flex min-h-56 flex-col items-center not-data-[files]:justify-center rounded-xl border border-input border-dashed p-4 transition-colors has-[input:focus]:border-ring has-[input:focus]:ring-[3px] has-[input:focus]:ring-ring/50 data-[files]:hidden data-[dragging=true]:bg-accent/50"
        data-dragging={isDragging || undefined}
        data-files={files.length > 0 || undefined}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input {...getInputProps()} className="sr-only" />
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border bg-background">
            <FileIcon className="size-4 opacity-60" />
          </div>
          <p className="mb-1.5 font-medium text-sm">Upload files</p>
          <p className="text-muted-foreground text-xs">
            Max size: {formatBytes(maxSize)}
          </p>
          <Button
            type="button"
            className="mt-4"
            onClick={openFileDialog}
            variant="outline"
          >
            <UploadIcon className="-ms-1 opacity-60" />
            Select files
          </Button>
        </div>
      </div>
      {files.length > 0 && (
        <>
          {/* Table with files */}
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium text-sm">Files ({files.length})</h3>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={openFileDialog}
                size="sm"
                variant="outline"
              >
                <UploadCloudIcon className="-ms-0.5 size-3.5 opacity-60" />
                Add files
              </Button>
              <Button
                type="button"
                onClick={clearFiles}
                size="sm"
                variant="outline"
              >
                <Trash2Icon className="-ms-0.5 size-3.5 opacity-60" />
                Remove all
              </Button>
            </div>
          </div>
          <div className="max-h-65 overflow-y-auto rounded-md border bg-background">
            <Table>
              <TableHeader className="text-xs">
                <TableRow className="bg-muted/50">
                  <TableHead className="h-9 py-2">Name</TableHead>
                  <TableHead className="h-9 py-2">Type</TableHead>
                  <TableHead className="h-9 py-2">Size</TableHead>
                  <TableHead className="h-9 w-0 py-2 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-[13px]">
                {files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="max-w-48 py-2 font-medium">
                      <span className="flex items-center gap-2">
                        <span className="shrink-0">
                          {
                            <FileTypeIcon
                              className="size-4 opacity-60"
                              file={file.file}
                            />
                          }
                        </span>{' '}
                        <span className="truncate">{file.file.name}</span>
                      </span>
                    </TableCell>
                    <TableCell className="py-2 text-muted-foreground">
                      {file.file.type.split('/')[1]?.toUpperCase() || 'UNKNOWN'}
                    </TableCell>
                    <TableCell className="py-2 text-muted-foreground">
                      {formatBytes(file.file.size)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap py-2 text-right">
                      <Button
                        type="button"
                        className="size-8 text-muted-foreground/80 hover:bg-transparent hover:text-foreground"
                        onClick={() => removeFile(file.id)}
                        size="icon"
                        variant="ghost"
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {errorMessage && (
        <p className="text-destructive text-sm">{errorMessage}</p>
      )}
    </div>
  )
}
