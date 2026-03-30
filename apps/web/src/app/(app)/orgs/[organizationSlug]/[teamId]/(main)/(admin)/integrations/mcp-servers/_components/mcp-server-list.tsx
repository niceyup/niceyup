'use client'

import { updateTag } from '@/actions/cache'
import { sdk } from '@/lib/sdk'
import type { OrganizationTeamParams } from '@/lib/types'
import { getInitials } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@workspace/ui/components/avatar'
import { Button } from '@workspace/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import { Spinner } from '@workspace/ui/components/spinner'
import { MoreHorizontalIcon, PlusIcon, SearchIcon } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'
import { toast } from 'sonner'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
}

type McpServer = NonNullable<
  Awaited<ReturnType<typeof sdk.listMcpServers>>['data']
>['mcpServers'][number]

export function McpServerList({
  params,
  mcpServers,
}: {
  params: Params
  mcpServers?: McpServer[]
}) {
  const [search, setSearch] = React.useState('')

  const filteredMcpServers = React.useMemo(() => {
    return mcpServers?.filter(({ name }) =>
      name.toLowerCase().includes(search.toLowerCase()),
    )
  }, [mcpServers, search])

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full flex-row items-center gap-2">
        <InputGroup className="h-10 bg-background">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find MCP Servers..."
            className="[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none"
            disabled={!mcpServers?.length}
          />
        </InputGroup>

        <Button variant="outline" className="h-10" asChild>
          <Link
            href={`/orgs/${params.organizationSlug}/~/integrations/mcp-servers/create`}
          >
            <PlusIcon />
            Add MCP server
          </Link>
        </Button>
      </div>

      {!mcpServers?.length && (
        <div className="w-full rounded-lg border bg-background p-4">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No MCP Servers Yet</EmptyTitle>
              <EmptyDescription>
                Add a MCP server to get started.
              </EmptyDescription>
            </EmptyHeader>

            <EmptyContent>
              <Button asChild>
                <Link
                  href={`/orgs/${params.organizationSlug}/~/integrations/mcp-servers/create`}
                >
                  <PlusIcon />
                  Add MCP server
                </Link>
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      )}

      {search && !filteredMcpServers?.length && (
        <div className="w-full rounded-lg border bg-background p-4">
          <Empty>
            <EmptyHeader>
              <EmptyTitle className="text-sm">No MCP Servers Found</EmptyTitle>
              <EmptyDescription>
                Your search for "{search}" did not return any MCP servers.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      )}

      {!!filteredMcpServers?.length && (
        <div className="flex w-full flex-col divide-y divide-border rounded-lg border bg-background">
          {filteredMcpServers.map((mcpServer) => (
            <div
              key={mcpServer.id}
              className="flex items-center justify-start gap-4 px-4 py-3"
            >
              <Avatar className="size-8 rounded-sm">
                <AvatarFallback className="rounded-sm text-xs">
                  {getInitials(mcpServer.name)}
                </AvatarFallback>
              </Avatar>

              <span className="font-medium text-sm">{mcpServer.name}</span>

              <div className="ml-auto flex items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontalIcon />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent>
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/orgs/${params.organizationSlug}/~/integrations/mcp-servers/${mcpServer.id}`}
                      >
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <McpServerActionDelete
                      params={params}
                      mcpServerId={mcpServer.id}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function McpServerActionDelete({
  params,
  mcpServerId,
}: {
  params: Params
  mcpServerId: string
}) {
  const [isPending, startTransition] = React.useTransition()

  const onRemove = async () => {
    startTransition(async () => {
      const { error } = await sdk.deleteMcpServer({
        mcpServerId,
        data: {
          organizationSlug: params.organizationSlug,
        },
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('MCP server deleted successfully')
      await updateTag('delete-mcp-server')
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
