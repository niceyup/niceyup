import type { OrganizationTeamParams } from '@/lib/types'
import { Button } from '@workspace/ui/components/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import { PlusIcon } from 'lucide-react'
import Link from 'next/link'
import {
  listFolderItemsInSourceExplorerNode,
  listFoldersInSourceExplorerNode,
  listSearchItemsInSourceExplorerNode,
} from '../_actions/source-explorer-nodes'
import { SearchInput } from './search-input'
import { SourceExplorer } from './source-explorer'
import { SourceExplorerSearchItems } from './source-explorer-search-items'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
}

export async function SourceExplorerWrapper({
  params,
  folderId,
  search,
}: {
  params: Params
  folderId?: string
  search?: string
}) {
  const [listFolders, listFolderItems, listSourceItems] = await Promise.all(
    search
      ? [
          [], // listFoldersInSourceExplorerNode (empty)
          [], // listFolderItemsInSourceExplorerNode (empty)
          listSearchItemsInSourceExplorerNode(params, { search }),
        ]
      : [
          listFoldersInSourceExplorerNode(params, { folderId }),
          listFolderItemsInSourceExplorerNode(params, { folderId }),
          [], // listSearchItemsInSourceExplorerNode (empty)
        ],
  )

  if (!folderId && !search && !listFolders.length && !listFolderItems.length) {
    return (
      <div className="w-full max-w-4xl rounded-lg border bg-background p-4">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No Sources Yet</EmptyTitle>
            <EmptyDescription>Add a source to get started.</EmptyDescription>
          </EmptyHeader>

          <EmptyContent>
            <Button asChild>
              <Link href={`/orgs/${params.organizationSlug}/~/sources/create`}>
                <PlusIcon />
                Add source
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    )
  }

  return (
    <>
      <div className="flex w-full max-w-4xl flex-col">
        <SearchInput />
      </div>

      {search && (
        <SourceExplorerSearchItems
          params={params}
          search={search}
          listSourceItems={listSourceItems}
        />
      )}

      {!search && (
        <SourceExplorer
          params={params}
          folderId={folderId}
          listFolders={listFolders}
          listFolderItems={listFolderItems}
        />
      )}
    </>
  )
}
