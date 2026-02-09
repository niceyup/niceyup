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

export function EditEnableSourceRetrievalToolForm({
  params,
  enableSourceRetrievalTool,
}: {
  params: Params
  enableSourceRetrievalTool: boolean
}) {
  const [isPending, startTransition] = React.useTransition()

  const onSubmit = async () => {
    startTransition(async () => {
      const { error } = await sdk.updateAgentConfiguration({
        agentId: params.agentId,
        data: {
          organizationSlug: params.organizationSlug,
          enableSourceRetrievalTool: !enableSourceRetrievalTool,
        },
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success(
        `Source retrieval tool ${enableSourceRetrievalTool ? 'disabled' : 'enabled'} successfully`,
      )
      await updateTag('update-agent-configuration')
    })
  }

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="relative flex min-h-39 flex-col gap-5 p-5 sm:gap-6 sm:p-6">
        <div className="flex flex-col gap-3">
          <h2 className="font-semibold text-xl">
            Enable Source Retrieval Tool
          </h2>
          <p className="text-muted-foreground text-sm">
            When enabled, the agent can retrieve and reference sources from your
            knowledge base to provide more accurate and grounded responses.
          </p>
        </div>
      </div>
      <div className="flex min-h-15 items-center justify-end gap-4 rounded-b-lg border-border border-t bg-foreground/2 p-3 sm:px-6">
        <Button type="submit" disabled={isPending} onClick={onSubmit}>
          {isPending && <Spinner />}
          {enableSourceRetrievalTool ? 'Disable' : 'Enable'}
        </Button>
      </div>
    </div>
  )
}
