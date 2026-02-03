'use client'

import { authClient } from '@/lib/auth/client'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@workspace/ui/components/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@workspace/ui/components/form'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@workspace/ui/components/input-group'
import { Spinner } from '@workspace/ui/components/spinner'
import { validateSlug } from '@workspace/utils'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

type Params = { organizationId: string }

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

export function EditOrganizationSlugForm({
  params,
  slug,
  isAdmin,
}: {
  params: Params
  slug: string
  isAdmin?: boolean
}) {
  const router = useRouter()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slug,
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const { data, error } = await authClient.organization.update({
      organizationId: params.organizationId,
      data: {
        slug: values.slug,
      },
    })

    if (data) {
      toast.success('Organization URL updated successfully')
      router.push(`/orgs/${values.slug}/~/settings/general`)
    }

    if (error) {
      toast.error(error.message)
    }
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
                  <h2 className="font-semibold text-xl">Organization URL</h2>
                  <p className="text-muted-foreground text-sm">
                    This is your organization's URL namespace on Niceyup. Within
                    it, your organization can inspect their agents, check out
                    any recent activity, or configure settings to their liking.
                  </p>
                  <FormControl>
                    <InputGroup className="w-full max-w-md">
                      <InputGroupAddon>
                        <InputGroupText>niceyup.io/orgs/</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput
                        {...field}
                        placeholder="acme-inc"
                        readOnly={!isAdmin}
                      />
                    </InputGroup>
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
