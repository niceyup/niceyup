'use client'

import { updateTag } from '@/actions/cache'
import { sdk } from '@/lib/sdk'
import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@workspace/ui/components/alert'
import { Button } from '@workspace/ui/components/button'
import { Spinner } from '@workspace/ui/components/spinner'
import { AlertCircleIcon, InfoIcon, PlayIcon, RotateCwIcon } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  agentId: AgentParams['agentId']
}

export function IndexedSourceAlert({
  params,
  count,
}: {
  params: Params
  count?: {
    idle: number
    stale: number
    failed: number
  } | null
}) {
  if (count?.idle) {
    return <IndexedSourceAlertIdle params={params} idleCount={count.idle} />
  }

  if (count?.failed) {
    return (
      <IndexedSourceAlertFailed params={params} failedCount={count.failed} />
    )
  }

  if (count?.stale) {
    return <IndexedSourceAlertStale params={params} staleCount={count.stale} />
  }

  return null
}

function IndexedSourceAlertIdle({
  params,
  idleCount,
}: {
  params: Params
  idleCount: number
}) {
  const [isPending, startTransition] = React.useTransition()

  const handleTrigger = () => {
    startTransition(async () => {
      try {
        const { error } = await sdk.triggerSourceIndexing({
          agentId: params.agentId,
          data: {
            organizationSlug: params.organizationSlug,
            status: 'idle',
          },
        })

        if (error) {
          toast.error(error.message)
          return
        }

        toast.success('Source indexing started')
        await updateTag('trigger-source-indexing')
      } catch {
        toast.error('Failed to start source indexing')
      }
    })
  }

  return (
    <Alert>
      <InfoIcon />
      <AlertTitle>
        {idleCount} {idleCount > 1 ? 'sources' : 'source'} not indexed
      </AlertTitle>
      <AlertDescription>
        These sources are not indexed yet and are ready to be indexed.
      </AlertDescription>
      <AlertAction>
        <Button
          variant="outline"
          size="sm"
          onClick={handleTrigger}
          disabled={isPending}
        >
          {isPending ? <Spinner /> : <PlayIcon />}
          Index
        </Button>
      </AlertAction>
    </Alert>
  )
}

function IndexedSourceAlertFailed({
  params,
  failedCount,
}: {
  params: Params
  failedCount: number
}) {
  const [isPending, startTransition] = React.useTransition()

  const handleTrigger = () => {
    startTransition(async () => {
      try {
        const { error } = await sdk.triggerSourceIndexing({
          agentId: params.agentId,
          data: {
            organizationSlug: params.organizationSlug,
            status: 'failed',
          },
        })

        if (error) {
          toast.error(error.message)
          return
        }

        toast.success('Source reindexing started')
      } catch {
        toast.error('Failed to start source reindexing')
      }

      await updateTag('trigger-source-indexing')
    })
  }

  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>
        {failedCount} {failedCount > 1 ? 'sources' : 'source'} failed to index
      </AlertTitle>
      <AlertDescription>
        Indexing failed for these sources. Reindex to try again.
      </AlertDescription>
      <AlertAction>
        <Button
          variant="outline"
          size="sm"
          className="text-foreground"
          onClick={handleTrigger}
          disabled={isPending}
        >
          {isPending ? <Spinner /> : <RotateCwIcon />}
          Reindex
        </Button>
      </AlertAction>
    </Alert>
  )
}

function IndexedSourceAlertStale({
  params,
  staleCount,
}: {
  params: Params
  staleCount: number
}) {
  const [isPending, startTransition] = React.useTransition()

  const handleTrigger = () => {
    startTransition(async () => {
      try {
        const { error } = await sdk.triggerSourceIndexing({
          agentId: params.agentId,
          data: {
            organizationSlug: params.organizationSlug,
            status: 'stale',
          },
        })

        if (error) {
          toast.error(error.message)
          return
        }

        toast.success('Source reindexing started')
      } catch {
        toast.error('Failed to start source reindexing')
      }

      await updateTag('trigger-source-indexing')
    })
  }

  return (
    <Alert>
      <AlertCircleIcon />
      <AlertTitle>
        {staleCount} {staleCount > 1 ? 'sources' : 'source'} are outdated
      </AlertTitle>
      <AlertDescription>
        These sources are outdated and need to be reindexed.
      </AlertDescription>
      <AlertAction>
        <Button
          variant="outline"
          size="sm"
          className="text-foreground"
          onClick={handleTrigger}
          disabled={isPending}
        >
          {isPending ? <Spinner /> : <RotateCwIcon />}
          Reindex
        </Button>
      </AlertAction>
    </Alert>
  )
}
