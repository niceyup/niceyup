import type { OrganizationTeamParams } from '@/lib/types'
import { Button } from '@workspace/ui/components/button'
import {
  ButtonGroup,
  ButtonGroupSeparator,
} from '@workspace/ui/components/button-group'
import { PlusIcon } from 'lucide-react'
import Link from 'next/link'
import type { SearchParams } from 'nuqs/server'
import { getItemInSourceExplorerNode } from './_actions/source-explorer-nodes'
import { NewSourceFolderDialog } from './_components/new-source-folder-dialog'
import { SourceExplorerWrapper } from './_components/source-explorer-wrapper'
import { loadSearchParams } from './_lib/search-params'

export default async function Page({
  params,
  searchParams,
}: Readonly<{
  params: Promise<OrganizationTeamParams>
  searchParams: Promise<SearchParams>
}>) {
  const { organizationSlug } = await params
  const { folderId, itemId, search } = await loadSearchParams(searchParams)

  let _folderId: string | undefined = folderId

  if (itemId) {
    const item = await getItemInSourceExplorerNode(
      { organizationSlug },
      { itemId },
    )

    if (item) {
      _folderId = item.parentId || undefined
    }
  }

  return (
    <div className="flex size-full flex-1 flex-col">
      <div className="border-b bg-background p-4">
        <div className="mx-auto flex max-w-4xl flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h2 className="font-semibold text-sm">Sources</h2>
              <p className="mt-1 text-muted-foreground text-sm">
                Add and manage data sources for your AI agents.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ButtonGroup>
              <Button asChild>
                <Link
                  href={`/orgs/${organizationSlug}/~/sources/create${_folderId ? `?folderId=${_folderId}` : ''}`}
                >
                  <PlusIcon />
                  Add source
                </Link>
              </Button>
              <ButtonGroupSeparator />
              <NewSourceFolderDialog
                params={{ organizationSlug }}
                folderId={_folderId}
              />
            </ButtonGroup>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center gap-4 p-4">
        <SourceExplorerWrapper
          params={{ organizationSlug }}
          folderId={_folderId}
          search={search}
        />
      </div>
    </div>
  )
}
