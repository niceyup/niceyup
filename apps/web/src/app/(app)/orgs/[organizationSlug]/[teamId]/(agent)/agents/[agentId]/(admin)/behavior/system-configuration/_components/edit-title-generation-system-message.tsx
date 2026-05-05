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
import { Spinner } from '@workspace/ui/components/spinner'
import { Textarea } from '@workspace/ui/components/textarea'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  agentId: AgentParams['agentId']
}

const formSchema = z.object({
  titleGenerationSystemMessage: z.string().trim(),
})

export function EditTitleGenerationSystemMessageForm({
  params,
  titleGenerationSystemMessage,
}: {
  params: Params
  titleGenerationSystemMessage: string | null | undefined
}) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titleGenerationSystemMessage: titleGenerationSystemMessage ?? '',
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const { error } = await sdk.updateAgentSystemConfiguration({
      headers: {
        'x-organization-slug': params.organizationSlug,
      },
      agentId: params.agentId,
      data: {
        titleGenerationSystemMessage: values.titleGenerationSystemMessage,
      },
    })

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Title generation system message updated successfully')
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
            name="titleGenerationSystemMessage"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-col gap-3">
                  <h2 className="font-semibold text-xl">
                    Title Generation System Message
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Define how the agent should generate titles for
                    conversations.
                  </p>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="w-full"
                      placeholder="Generate a concise title that summarizes the conversation"
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
