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
  description: z.string().trim().max(255),
})

export function EditAgentDescriptionForm({
  params,
  description,
  isAdmin,
}: {
  params: Params
  description: string | null
  isAdmin?: boolean
}) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: description || '',
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const { error } = await sdk.updateAgent({
      agentId: params.agentId,
      data: {
        organizationSlug: params.organizationSlug,
        description: values.description,
      },
    })

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Agent description updated successfully')
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="rounded-lg border border-border bg-background"
      >
        <div className="relative flex flex-col gap-5 p-5 sm:gap-6 sm:p-6">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-col gap-3">
                  <h2 className="font-semibold text-xl">Agent Description</h2>
                  <p className="text-muted-foreground text-sm">
                    This is your agent's description.
                  </p>
                  <FormControl>
                    <Input
                      {...field}
                      className="w-full max-w-md"
                      placeholder="Your AI-Powered Personal Assistant"
                      readOnly={!isAdmin}
                    />
                  </FormControl>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-b-lg border-border border-t bg-foreground/2 p-3 sm:px-6">
          {isAdmin ? (
            <>
              <p className="text-muted-foreground text-sm">
                Please use 255 characters at maximum.
              </p>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Spinner />}
                Save
              </Button>
            </>
          ) : (
            <div className="h-9" />
          )}
        </div>
      </form>
    </Form>
  )
}
