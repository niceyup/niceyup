'use client'

import { updateTag } from '@/actions/cache'
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
import { Input } from '@workspace/ui/components/input'
import { Spinner } from '@workspace/ui/components/spinner'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

type Params = { organizationId: string }

const formSchema = z.object({
  name: z.string().trim().min(3).max(255),
})

export function EditOrganizationNameForm({
  params,
  name,
  isAdmin,
}: {
  params: Params
  name: string
  isAdmin?: boolean
}) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name,
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const { data, error } = await authClient.organization.update({
      organizationId: params.organizationId,
      data: {
        name: values.name,
      },
    })

    if (data) {
      toast.success('Organization name updated successfully')
      await updateTag('update-organization')
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
            name="name"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-col gap-3">
                  <h2 className="font-semibold text-xl">Organization Name</h2>
                  <p className="text-muted-foreground text-sm">
                    This is your organization's visible name within Niceyup. For
                    example, the name of your company or department.
                  </p>
                  <FormControl>
                    <Input
                      {...field}
                      className="w-full max-w-md"
                      placeholder="Acme Inc"
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
