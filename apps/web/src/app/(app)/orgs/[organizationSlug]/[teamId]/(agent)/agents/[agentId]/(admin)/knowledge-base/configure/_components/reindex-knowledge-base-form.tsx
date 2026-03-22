'use client'

import { updateTag } from '@/actions/cache'
import { sdk } from '@/lib/sdk'
import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import { Button } from '@workspace/ui/components/button'
import { Spinner } from '@workspace/ui/components/spinner'
import * as React from 'react'
import { toast } from 'sonner'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  agentId: AgentParams['agentId']
}

export function ReindexKnowledgeBaseForm({
  params,
  disabled,
}: {
  params: Params
  disabled: boolean
}) {
  const [isPending, startTransition] = React.useTransition()

  const onSubmit = async () => {
    startTransition(async () => {
      const { error } = await sdk.reindexKnowledgeBase({
        agentId: params.agentId,
        data: {
          organizationSlug: params.organizationSlug,
        },
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Knowledge base reindexed successfully')
      await updateTag('update-agent-knowledge-base')
    })
  }

  return (
    <div className="rounded-lg border border-destructive bg-background">
      <div className="relative flex min-h-39 flex-col gap-5 p-5 sm:gap-6 sm:p-6">
        <div className="flex flex-col gap-3">
          <h2 className="font-semibold text-xl">Reindex Knowledge Base</h2>
          <p className="text-muted-foreground text-sm">
            This will regenerate all embeddings and update the knowledge base.
            This process may take some time.
          </p>
        </div>
      </div>
      <div className="flex min-h-15 items-center justify-end gap-4 rounded-b-lg border-destructive border-t bg-destructive/5 p-3 sm:px-6">
        <Button
          variant="destructive"
          onClick={onSubmit}
          disabled={isPending || disabled}
        >
          {isPending && <Spinner />}
          Reindex Knowledge Base
        </Button>
      </div>
    </div>
  )
}
