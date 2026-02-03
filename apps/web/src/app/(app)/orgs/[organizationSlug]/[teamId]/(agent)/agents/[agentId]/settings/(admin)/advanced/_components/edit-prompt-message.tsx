'use client'

import { sdk } from '@/lib/sdk'
import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import { zodResolver } from '@hookform/resolvers/zod'
import type { PromptMessage } from '@workspace/db/types'
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
  InputGroupButton,
  InputGroupTextarea,
} from '@workspace/ui/components/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
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
  promptMessages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().trim().nonempty(),
    }),
  ),
})

export function EditPromptMessageForm({
  params,
  promptMessages,
}: {
  params: Params
  promptMessages: PromptMessage[] | null
}) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      promptMessages: promptMessages || [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'promptMessages',
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const { error } = await sdk.updateAgentConfiguration({
      agentId: params.agentId,
      data: {
        organizationSlug: params.organizationSlug,
        promptMessages: values.promptMessages,
      },
    })

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Prompt messages updated successfully')
  }

  const addMessage = () => {
    append({ role: 'user', content: '' })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="rounded-lg border border-border bg-background"
      >
        <div className="relative flex min-h-39 flex-col gap-5 p-5 sm:gap-6 sm:p-6">
          <div className="flex flex-col gap-3">
            <h2 className="font-semibold text-xl">Prompt Messages</h2>
            <p className="text-muted-foreground text-sm">
              Define example conversation messages to guide the agent's
              responses. These messages help establish patterns for how the
              agent should interact.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {fields.map((field, index) => (
              <FormField
                key={field.id}
                control={form.control}
                name={`promptMessages.${index}.content`}
                render={({ field: contentField }) => (
                  <FormItem>
                    <InputGroup className="bg-background">
                      <InputGroupAddon
                        align="block-start"
                        className="flex items-center justify-between border-b"
                      >
                        <FormField
                          control={form.control}
                          name={`promptMessages.${index}.role`}
                          render={({ field: roleField }) => (
                            <Select
                              onValueChange={roleField.onChange}
                              value={roleField.value}
                            >
                              <FormControl>
                                <SelectTrigger
                                  size="sm"
                                  className="w-full max-w-32"
                                >
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="assistant">
                                  Assistant
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />

                        <InputGroupButton
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => remove(index)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2Icon />
                        </InputGroupButton>
                      </InputGroupAddon>

                      <InputGroupTextarea
                        {...contentField}
                        placeholder={
                          form.watch(`promptMessages.${index}.role`) === 'user'
                            ? 'Enter user message'
                            : 'Enter assistant message'
                        }
                      />
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
              onClick={addMessage}
              className="w-fit"
            >
              <PlusIcon />
              Add message
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
