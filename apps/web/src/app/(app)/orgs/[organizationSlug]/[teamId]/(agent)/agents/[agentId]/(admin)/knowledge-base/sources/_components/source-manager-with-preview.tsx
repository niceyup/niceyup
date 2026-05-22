'use client'

import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import * as React from 'react'
import { SourceManager } from './source-manager'
import { SourceView } from './source-view'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  agentId: AgentParams['agentId']
}

export function SourceManagerWithPreview({
  params,
  sourceIds,
}: {
  params: Params
  sourceIds?: string[]
}) {
  const [selectedSource, setSelectedSource] = React.useState<{
    sourceId?: string
    indexedSourceId?: string | null
  } | null>(null)

  const [open, setOpen] = React.useState(false)

  return (
    <>
      <SourceManager
        params={params}
        sourceIds={sourceIds}
        onSelectSource={({ sourceId, indexedSourceId }) => {
          if (sourceId) {
            setSelectedSource({ sourceId, indexedSourceId })
            setOpen(true)
          }
        }}
      />

      {selectedSource?.sourceId && (
        <SourceView
          params={params}
          sourceId={selectedSource.sourceId}
          indexedSourceId={selectedSource.indexedSourceId}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  )
}
