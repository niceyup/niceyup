'use client'

import { updateTag } from '@/actions/cache'
import { sdk } from '@/lib/sdk'
import type { OrganizationTeamParams } from '@/lib/types'
import { zodResolver } from '@hookform/resolvers/zod'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@workspace/ui/components/form'
import { Input } from '@workspace/ui/components/input'
import { Spinner } from '@workspace/ui/components/spinner'
import { cn } from '@workspace/ui/lib/utils'
import { FolderIcon, MoreHorizontalIcon } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import type { listFoldersInSourceExplorerNode } from '../_actions/source-explorer-nodes'
import { MoveSourceDialog } from './move-source-dialog'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
}

export function SourceExplorerFolders({
  params,
  listFolders,
}: {
  params: Params
  listFolders: Awaited<ReturnType<typeof listFoldersInSourceExplorerNode>>
}) {
  return (
    <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-3">
      {listFolders.map((folder) => (
        <SourceExplorerFolder key={folder.id} params={params} folder={folder} />
      ))}
    </div>
  )
}

function SourceExplorerFolder({
  params,
  folder,
}: {
  params: Params
  folder: Awaited<ReturnType<typeof listFoldersInSourceExplorerNode>>[number]
}) {
  const [modalOpen, setModalOpen] = React.useState<'move' | 'rename' | null>(
    null,
  )

  return (
    <>
      <Link
        href={`/orgs/${params.organizationSlug}/~/sources?folderId=${folder.id}`}
        className="flex cursor-pointer flex-row items-center justify-start gap-2 rounded-xl border bg-background p-2 hover:bg-muted/50"
      >
        <FolderIcon className="ml-2 size-4 shrink-0 text-muted-foreground" />

        <span
          className={cn('line-clamp-1 break-all font-medium text-sm', {
            italic: !folder.name,
          })}
        >
          {folder.name || 'Unnamed folder'}
        </span>

        {folder.sourceType && (
          <Badge variant="secondary" className="text-[11px]">
            {folder.sourceType}
          </Badge>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="ml-auto">
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                setModalOpen('rename')
              }}
            >
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                setModalOpen('move')
              }}
            >
              Move
            </DropdownMenuItem>
            <SourceExplorerFolderActionDelete
              params={params}
              folderId={folder.id}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </Link>

      <Dialog
        open={modalOpen === 'rename'}
        onOpenChange={(open) => setModalOpen(open ? 'rename' : null)}
      >
        <RenameSourceExplorerFolderDialog
          params={params}
          folderId={folder.id}
          name={folder.name}
        />
      </Dialog>

      <Dialog
        open={modalOpen === 'move'}
        onOpenChange={(open) => setModalOpen(open ? 'move' : null)}
      >
        <MoveSourceDialog
          params={params}
          itemId={folder.id}
          name={folder.name}
          folder
        />
      </Dialog>
    </>
  )
}

function SourceExplorerFolderActionDelete({
  params,
  folderId,
}: {
  params: Params
  folderId: string
}) {
  const [isPending, startTransition] = React.useTransition()

  const onRemove = async () => {
    startTransition(async () => {
      const { error } = await sdk.deleteSourceFolder({
        folderId,
        data: {
          organizationSlug: params.organizationSlug,
        },
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Folder deleted successfully')
      await updateTag('delete-source-folder')
    })
  }

  return (
    <DropdownMenuItem
      variant="destructive"
      onClick={(e) => {
        e.stopPropagation()
        onRemove()
      }}
      disabled={isPending}
    >
      {isPending && <Spinner />}
      Delete
    </DropdownMenuItem>
  )
}

const formSchema = z.object({
  name: z.string().trim().max(255),
})

function RenameSourceExplorerFolderDialog({
  params,
  folderId,
  name,
}: {
  params: Params
  folderId: string
  name?: string | null
}) {
  const ref = React.useRef<HTMLButtonElement>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: name || '',
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const { error } = await sdk.updateSourceFolder({
      folderId,
      data: {
        organizationSlug: params.organizationSlug,
        name: values.name,
      },
    })

    if (error) {
      toast.error(error.message)
      return
    }

    ref.current?.click()
    toast.success('Folder renamed successfully')
    await updateTag('update-source-folder')
  }

  return (
    <DialogContent>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col items-stretch justify-center gap-4"
        >
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
            <DialogDescription>
              Create a new folder to organize your sources.
            </DialogDescription>
          </DialogHeader>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Unnamed folder" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter>
            <DialogClose asChild>
              <Button
                ref={ref}
                type="button"
                variant="outline"
                onClick={() => form.reset()}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Spinner />}
              Rename
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  )
}
