import type { OrganizationTeamParams } from '@/lib/types'
import { Separator } from '@workspace/ui/components/separator'
import { HomeIcon } from 'lucide-react'
import {
  getParentsInSourceExplorerNode,
  type listFolderItemsInSourceExplorerNode,
  type listFoldersInSourceExplorerNode,
} from '../_actions/source-explorer-nodes'
import { BreadcrumbFile } from './breadcrumb-file'
import { SourceExplorerFolderItems } from './source-explorer-folder-items'
import { SourceExplorerFolders } from './source-explorer-folders'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
}

export async function SourceExplorer({
  params,
  folderId,
  listFolders,
  listFolderItems,
}: {
  params: Params
  folderId?: string
  listFolders: Awaited<ReturnType<typeof listFoldersInSourceExplorerNode>>
  listFolderItems: Awaited<
    ReturnType<typeof listFolderItemsInSourceExplorerNode>
  >
}) {
  const parents = folderId
    ? await getParentsInSourceExplorerNode(params, { folderId })
    : []

  const itemPath = [
    { label: <HomeIcon className="size-4" /> },
    ...parents.map((parent) => ({ label: parent.name, folderId: parent.id })),
  ]

  return (
    <div className="flex w-full max-w-4xl flex-col rounded-lg border bg-background">
      <div className="no-scrollbar flex h-11 w-full flex-row items-center overflow-x-auto px-6">
        <BreadcrumbFile
          params={params}
          className="font-medium"
          items={itemPath}
        />
      </div>

      <Separator />

      <div className="flex w-full flex-col gap-4 p-4">
        {!!listFolders.length && (
          <SourceExplorerFolders params={params} listFolders={listFolders} />
        )}

        <SourceExplorerFolderItems
          params={params}
          listFolderItems={listFolderItems}
        />
      </div>
    </div>
  )
}
