import { sdk } from '@/lib/sdk'
import type { OrganizationTeamParams } from '@/lib/types'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@workspace/ui/components/accordion'
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
import { useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

type Params = OrganizationTeamParams

const formSchema = z.object({
  name: z.string(),
  text: z.string().nonempty(),
})

type TextSourceProps = {
  onSuccess: () => void
  onBack: () => void
  sourceType: {
    value: 'text'
    label: string
    description: string
    icon: React.ReactNode
  }
  folderId?: string | null
}

export function TextSource({
  onSuccess,
  onBack,
  sourceType,
  folderId,
}: TextSourceProps) {
  const params = useParams<Params>()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      text: '',
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const { error } = await sdk.createSource({
      data: {
        organizationSlug: params.organizationSlug,
        type: 'text',
        name: values.name,
        text: values.text,
        explorerNode: {
          folderId,
        },
      },
    })

    if (error) {
      toast.error(error.message)
      return
    }

    onSuccess()
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full flex-col gap-4"
      >
        <div className="flex select-none items-center justify-start gap-4 rounded-md border p-2">
          <div className="flex size-8 items-center justify-center rounded-sm bg-muted">
            {sourceType.icon}
          </div>

          <div className="flex flex-1 flex-col">
            <span className="line-clamp-1 break-all text-start font-medium text-sm">
              {sourceType.label}
            </span>
            <span className="line-clamp-1 break-all text-start font-normal text-muted-foreground text-xs">
              {sourceType.description}
            </span>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2">
          <div className="flex w-full flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g. Customer Support Docs"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Text</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Paste or write the content you want this agent to learn from"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="advanced-settings">
              <AccordionTrigger>Advanced settings</AccordionTrigger>
              <AccordionContent className="flex flex-col gap-2 px-1">
                <p className="py-6 text-center text-muted-foreground text-xs">
                  Coming soon
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="flex w-full flex-row items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Spinner />}
            Add
          </Button>
        </div>
      </form>
    </Form>
  )
}
