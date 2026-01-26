'use client'

import { SourceView } from '@/app/(app)/orgs/[organizationSlug]/[teamId]/(main)/(admin)/sources/_components/source-view'
import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import * as React from 'react'
import { SourceManager } from './source-manager'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  agentId: AgentParams['agentId']
}

export function SourceManagerWithPreview({
  params,
  sourceIds,
  totalCount,
}: {
  params: Params
  sourceIds?: string[]
  totalCount?: number
}) {
  const [selectedSourceId, setSelectedSourceId] = React.useState<string | null>(
    null,
  )
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <SourceManager
        params={params}
        sourceIds={sourceIds}
        totalCount={totalCount}
        onSelectSource={(sourceId) => {
          if (sourceId) {
            setSelectedSourceId(sourceId)
            setOpen(true)
          }
        }}
      />

      {selectedSourceId && (
        <SourceView
          params={params}
          sourceId={selectedSourceId}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  )
}
