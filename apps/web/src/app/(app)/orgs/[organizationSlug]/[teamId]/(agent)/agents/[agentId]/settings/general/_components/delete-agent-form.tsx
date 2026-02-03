'use client'

import { sdk } from '@/lib/sdk'
import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import { Button } from '@workspace/ui/components/button'
import { Spinner } from '@workspace/ui/components/spinner'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

type Params = OrganizationTeamParams & AgentParams

export function DeleteAgentForm({ params }: { params: Params }) {
  const router = useRouter()

  const [isPending, startTransition] = React.useTransition()

  const onSubmit = async () => {
    startTransition(async () => {
      const { error } = await sdk.deleteAgent({
        agentId: params.agentId,
        data: {
          organizationSlug: params.organizationSlug,
        },
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Agent deleted successfully')

      router.push(`/orgs/${params.organizationSlug}/${params.teamId}/agents`)
    })
  }

  return (
    <div className="rounded-lg border border-destructive bg-background">
      <div className="relative flex min-h-39 flex-col gap-5 p-5 sm:gap-6 sm:p-6">
        <div className="flex flex-col gap-3">
          <h2 className="font-semibold text-xl">Delete Agent</h2>
          <p className="text-muted-foreground text-sm">
            Permanently remove your agent from the Niceyup platform. This action
            is not reversible — please continue with caution.
          </p>
        </div>
      </div>
      <div className="flex min-h-15 items-center justify-end gap-4 rounded-b-lg border-destructive border-t bg-destructive/5 p-3 sm:px-6">
        <Button variant="destructive" onClick={onSubmit} disabled={isPending}>
          {isPending && <Spinner />}
          Delete Agent
        </Button>
      </div>
    </div>
  )
}
