'use client'

import { sdk } from '@/lib/sdk'
import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@workspace/ui/components/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@workspace/ui/components/form'
import { Input } from '@workspace/ui/components/input'
import { Spinner } from '@workspace/ui/components/spinner'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  agentId: AgentParams['agentId']
}

const formSchema = z.object({
  topK: z.string(),
})

export function EditTopKForm({
  params,
  topK,
}: {
  params: Params
  topK: number | null | undefined
}) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topK: String(topK ?? ''),
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const { error } = await sdk.updateAgentKnowledgeBase({
      headers: {
        'x-organization-slug': params.organizationSlug,
      },
      agentId: params.agentId,
      data: {
        topK: values.topK ? Number(values.topK) : null,
      },
    })

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Top K updated successfully')
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="rounded-lg border border-border bg-background"
      >
        <div className="relative flex min-h-39 flex-col gap-5 p-5 sm:gap-6 sm:p-6">
          <FormField
            control={form.control}
            name="topK"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-col gap-3">
                  <h2 className="font-semibold text-xl">Top K</h2>
                  <p className="text-muted-foreground text-sm">
                    Set the number of results retrieved from the knowledge base
                    for each query.
                  </p>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min={1}
                      className="w-full max-w-xs"
                      placeholder="5"
                    />
                  </FormControl>
                  <FormMessage />
                </div>
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
