'use client'

import { authClient } from '@/lib/auth/client'
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@workspace/ui/components/input-group'
import { Spinner } from '@workspace/ui/components/spinner'
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
})

type CreateOrganizationFormProps = {
  modal?: boolean
}

export function CreateOrganizationForm({ modal }: CreateOrganizationFormProps) {
  const router = useRouter()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      slug: '',
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const { data, error } = await authClient.organization.create({
      name: values.name,
      slug: values.slug,
      keepCurrentActiveOrganization: false,
    })

    if (data) {
      if (modal) {
        // Dismiss the modal
        router.back()
      }

      // Fix: The router is not updated immediately
      setTimeout(() => router.push(`/orgs/${data.slug}`), 300)
    }

    if (error) {
      toast.error(error.message)
    }
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
                <FormLabel>Organization Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Acme Inc" />
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
                <FormLabel>Organization URL</FormLabel>
                <FormControl>
                  <InputGroup>
                    <InputGroupAddon>
                      <InputGroupText>niceyup.io/orgs/</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput {...field} placeholder="acme-inc" />
                  </InputGroup>
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
