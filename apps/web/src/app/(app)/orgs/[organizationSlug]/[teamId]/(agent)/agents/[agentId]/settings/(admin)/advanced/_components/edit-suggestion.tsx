'use client'

import { updateTag } from '@/actions/cache'
import { sdk } from '@/lib/sdk'
import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@workspace/ui/components/button'
import {
  Form,
  FormField,
  FormItem,
  FormMessage,
} from '@workspace/ui/components/form'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import { Spinner } from '@workspace/ui/components/spinner'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  agentId: AgentParams['agentId']
}

const formSchema = z.object({
  suggestions: z.array(
    z.object({
      value: z.string().trim().nonempty(),
    }),
  ),
})

export function EditSuggestionsForm({
  params,
  suggestions,
}: {
  params: Params
  suggestions: string[]
}) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      suggestions: suggestions.map((s) => ({ value: s })),
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'suggestions',
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const { error } = await sdk.updateAgentConfiguration({
      agentId: params.agentId,
      data: {
        organizationSlug: params.organizationSlug,
        suggestions: values.suggestions.map((s) => s.value),
      },
    })

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Suggestions updated successfully')
    await updateTag('update-agent-configuration')
  }

  const addSuggestion = () => {
    append({ value: '' })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="rounded-lg border border-border bg-background"
      >
        <div className="relative flex min-h-39 flex-col gap-5 p-5 sm:gap-6 sm:p-6">
          <div className="flex flex-col gap-3">
            <h2 className="font-semibold text-xl">Suggestions</h2>
            <p className="text-muted-foreground text-sm">
              Define conversation starters that appear before the user begins
              chatting with the agent. These help users understand what they can
              ask.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {fields.map((field, index) => (
              <FormField
                key={field.id}
                control={form.control}
                name={`suggestions.${index}.value`}
                render={({ field: inputField }) => (
                  <FormItem>
                    <InputGroup className="bg-background">
                      <InputGroupInput
                        {...inputField}
                        placeholder="Enter a suggestion"
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => remove(index)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2Icon />
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSuggestion}
              className="w-fit"
            >
              <PlusIcon />
              Add suggestion
            </Button>
          </div>
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
