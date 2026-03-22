'use client'

import { sdk } from '@/lib/sdk'
import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import { zodResolver } from '@hookform/resolvers/zod'
import type { VectorStoreProvider } from '@workspace/core/vector-stores'
import { Button } from '@workspace/ui/components/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@workspace/ui/components/form'
import { Spinner } from '@workspace/ui/components/spinner'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { VectorStoreSelect } from './vector-store-select'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  agentId: AgentParams['agentId']
}

const formSchema = z.object({
  vectorStore: z
    .object({
      id: z.string(),
      value: z.object({
        id: z.string(),
        name: z.string(),
        provider: z.string(),
      }),
    })
    .nullable(),
})

export function EditVectorStoreForm({
  params,
  vectorStore,
}: {
  params: Params
  vectorStore: {
    id: string
    value: {
      id: string
      name: string
      provider: VectorStoreProvider | string
    }
  } | null
}) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vectorStore: vectorStore ?? null,
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const vectorStoreId = values.vectorStore?.id ?? null

    const { error } = await sdk.updateAgentKnowledgeBase({
      agentId: params.agentId,
      data: {
        organizationSlug: params.organizationSlug,
        vectorStoreId,
      },
    })

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Vector store updated successfully')
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="rounded-lg border border-border bg-background"
      >
        <div className="relative flex min-h-39 flex-col gap-5 p-5 sm:gap-6 sm:p-6">
          <div className="flex flex-col gap-3">
            <h2 className="font-semibold text-xl">Vector Store</h2>
            <p className="text-muted-foreground text-sm">
              Configure the vector store used to store and query the agent’s
              indexed knowledge.
            </p>
          </div>

          <FormField
            control={form.control}
            name="vectorStore"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <VectorStoreSelect
                    organizationSlug={params.organizationSlug}
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex min-h-15 items-center justify-end gap-4 rounded-b-lg border-border border-t bg-foreground/2 p-3 sm:px-6">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Spinner />}
            Save
          </Button>
        </div>
      </form>
    </Form>
  )
}
