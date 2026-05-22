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
import * as React from 'react'
import { toast } from 'sonner'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  agentId: AgentParams['agentId']
}

export function KnowledgeBaseAlertReindexing({
  params,
}: {
  params: Params
}) {
  const [isPending, startTransition] = React.useTransition()

  const handleCancel = () => {
    startTransition(async () => {
      try {
        const { error } = await sdk.cancelKnowledgeBaseReindexing({
          headers: {
            'x-organization-slug': params.organizationSlug,
          },
          agentId: params.agentId,
          data: {},
        })

        if (error) {
          toast.error(error.message)
          return
        }

        toast.success('Knowledge base reindexing cancellation started')
      } catch {
        toast.error('Failed to start knowledge base reindexing cancellation')
      }

      await updateTag('update-agent-knowledge-base')
    })
  }

  return (
    <Alert>
      <Spinner />
      <AlertTitle>Reindexing knowledge base</AlertTitle>
      <AlertDescription>
        The knowledge base is currently being reindexed. Some settings are
        temporarily disabled until the process is complete.
      </AlertDescription>
      <AlertAction>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancel}
          disabled={isPending}
        >
          {isPending && <Spinner />}
          Cancel
        </Button>
      </AlertAction>
    </Alert>
  )
}
