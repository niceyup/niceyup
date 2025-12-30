'use client'

import { sdk } from '@/lib/sdk'
import type { OrganizationTeamParams } from '@/lib/types'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@workspace/ui/components/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@workspace/ui/components/form'
import { Input } from '@workspace/ui/components/input'
import { Spinner } from '@workspace/ui/components/spinner'
import { Textarea } from '@workspace/ui/components/textarea'
import { stripSpecialCharacters, validateSlug } from '@workspace/utils'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const formSchema = z.object({
  name: z.string().trim().min(3).max(255),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(255)
    .refine(
      validateSlug,
      'The slug can only contain lowercase letters, numbers, and hyphens',
    ),
  description: z.string().trim().max(255).optional(),
})

type CreateAgentFormProps = {
  modal?: boolean
  organizationSlug: OrganizationTeamParams['organizationSlug']
  teamId: OrganizationTeamParams['teamId']
}

export function CreateAgentForm({
  modal,
  organizationSlug,
  teamId,
}: CreateAgentFormProps) {
  const router = useRouter()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const { data, error } = await sdk.createAgent({
      data: {
        organizationSlug,
        name: values.name,
        slug: values.slug,
        description: values.description,
      },
    })

    if (error) {
      toast.error(error.message)
      return
    }

    if (modal) {
      // Dismiss the modal
      router.back()
    }

    // Fix: The router is not updated immediately
    setTimeout(
      () =>
        router.push(
          `/orgs/${organizationSlug}/${teamId}/agents/${data.agentId}/settings/general`,
        ),
      300,
    )
  }

  React.useEffect(() => {
    form.setValue('slug', stripSpecialCharacters(form.getValues('name')))
  }, [form.watch('name')])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-col items-stretch justify-center gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Agent Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Personal Assistant" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Agent Slug</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="agent-personal-assistant" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Agent Description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Your AI-Powered Personal Assistant"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Spinner />}
            Create
          </Button>
        </div>
      </form>
    </Form>
  )
}
