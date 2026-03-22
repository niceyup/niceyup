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

export function EditEnableKnowledgeBaseToolForm({
  params,
  enableKnowledgeBaseTool,
}: {
  params: Params
  enableKnowledgeBaseTool: boolean | undefined
}) {
  const [isPending, startTransition] = React.useTransition()

  const onSubmit = async () => {
    startTransition(async () => {
      const { error } = await sdk.updateAgentConfiguration({
        agentId: params.agentId,
        data: {
          organizationSlug: params.organizationSlug,
          enableKnowledgeBaseTool: !enableKnowledgeBaseTool,
        },
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success(
        `Knowledge base tool ${enableKnowledgeBaseTool ? 'disabled' : 'enabled'} successfully`,
      )
      await updateTag('update-agent-knowledge-base')
    })
  }

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="relative flex min-h-39 flex-col gap-5 p-5 sm:gap-6 sm:p-6">
        <div className="flex flex-col gap-3">
          <h2 className="font-semibold text-xl">Enable Knowledge Base Tool</h2>
          <p className="text-muted-foreground text-sm">
            When enabled, the agent can use your knowledge base to answer
            questions and provide more accurate and grounded responses.
          </p>
        </div>
      </div>
      <div className="flex min-h-15 items-center justify-end gap-4 rounded-b-lg border-border border-t bg-foreground/2 p-3 sm:px-6">
        <Button type="submit" disabled={isPending} onClick={onSubmit}>
          {isPending && <Spinner />}
          {enableKnowledgeBaseTool ? 'Disable' : 'Enable'}
        </Button>
      </div>
    </div>
  )
}
