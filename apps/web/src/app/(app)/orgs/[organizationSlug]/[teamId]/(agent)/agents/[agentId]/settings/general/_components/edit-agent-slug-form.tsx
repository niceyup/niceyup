'use client'

import { updateTag } from '@/actions/cache'
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
import { validateSlug } from '@workspace/utils'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  agentId: AgentParams['agentId']
}

const formSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(3)
    .max(255)
    .refine(
      validateSlug,
      'The slug can only contain lowercase letters, numbers, and hyphens',
    ),
})

export function EditAgentSlugForm({
  params,
  slug,
  isAdmin,
}: {
  params: Params
  slug: string
  isAdmin?: boolean
}) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slug,
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const { error } = await sdk.updateAgent({
      agentId: params.agentId,
      data: {
        organizationSlug: params.organizationSlug,
        slug: values.slug,
      },
    })

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Agent slug updated successfully')
    await updateTag('update-agent')
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
            name="slug"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-col gap-3">
                  <h2 className="font-semibold text-xl">Agent Slug</h2>
                  <p className="text-muted-foreground text-sm">
                    This is your agent's slug namespace on Niceyup.
                  </p>
                  <FormControl>
                    <Input
                      {...field}
                      className="w-full max-w-md"
                      placeholder="copilot"
                      readOnly={!isAdmin}
                    />
                  </FormControl>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
        </div>
        <div className="flex min-h-15 items-center justify-between gap-4 rounded-b-lg border-border border-t bg-foreground/2 p-3 sm:px-6">
          {isAdmin && (
            <>
              <p className="text-muted-foreground text-sm">
                Please use 255 characters at maximum.
              </p>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Spinner />}
                Save
              </Button>
            </>
          )}
        </div>
      </form>
    </Form>
  )
}
