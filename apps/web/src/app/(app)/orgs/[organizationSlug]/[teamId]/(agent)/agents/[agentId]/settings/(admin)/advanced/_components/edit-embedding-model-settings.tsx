'use client'

import { updateTag } from '@/actions/cache'
import { sdk } from '@/lib/sdk'
import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import { zodResolver } from '@hookform/resolvers/zod'
import { type Provider, providerSchema } from '@workspace/core/providers'
import { Button } from '@workspace/ui/components/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@workspace/ui/components/command'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@workspace/ui/components/form'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover'
import { Spinner } from '@workspace/ui/components/spinner'
import { cn } from '@workspace/ui/lib/utils'
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  agentId: AgentParams['agentId']
}

const providers: { value: Provider; label: string }[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'google', label: 'Google' },
]

const modelsByProvider: Record<Provider, { value: string; label: string }[]> = {
  openai: [
    { value: 'text-embedding-3-small', label: 'Text Embedding 3 Small' },
    // { value: 'text-embedding-3-large', label: 'Text Embedding 3 Large' },
    // { value: 'text-embedding-ada-002', label: 'Text Embedding Ada 002' },
  ],
  google: [
    // { value: 'gemini-embedding-001', label: 'Gemini Embedding 001' },
    // { value: 'text-embedding-004', label: 'Text Embedding 004' },
  ],
}

const formSchema = z.object({
  provider: providerSchema,
  model: z.string().nonempty(),
})

export function EditEmbeddingModelSettingsForm({
  params,
  embeddingModelSettings,
}: {
  params: Params
  embeddingModelSettings: {
    provider: Provider
    model: string
  } | null
}) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      provider: embeddingModelSettings?.provider || 'openai',
      model: embeddingModelSettings?.model || '',
    },
  })

  const selectedProvider = form.watch('provider')
  const availableModels = modelsByProvider[selectedProvider] || []

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const { error } = await sdk.updateAgentConfiguration({
      agentId: params.agentId,
      data: {
        organizationSlug: params.organizationSlug,
        embeddingModelSettings: {
          provider: values.provider,
          model: values.model,
        },
      },
    })

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Embedding model updated successfully')
    await updateTag('update-agent-configuration')
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="rounded-lg border border-border bg-background"
      >
        <div className="relative flex min-h-39 flex-col gap-5 p-5 sm:gap-6 sm:p-6">
          <div className="flex flex-col gap-3">
            <h2 className="font-semibold text-xl">Embedding Model</h2>
            <p className="text-muted-foreground text-sm">
              Configure the embedding model used to index and retrieve knowledge
              for this agent.
            </p>
          </div>

          <div className="grid items-start gap-3 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'justify-between',
                            !field.value && 'text-muted-foreground',
                          )}
                          disabled={!!embeddingModelSettings}
                        >
                          {field.value
                            ? providers.find((p) => p.value === field.value)
                                ?.label
                            : 'Select provider'}
                          <ChevronsUpDownIcon className="shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
                      <Command>
                        <CommandInput placeholder="Search" />
                        <CommandList>
                          <CommandEmpty>No results found</CommandEmpty>
                          <CommandGroup>
                            {providers.map((provider) => (
                              <CommandItem
                                key={provider.value}
                                value={provider.value}
                                onSelect={() => {
                                  field.onChange(provider.value)
                                  form.setValue('model', '')
                                }}
                              >
                                <CheckIcon
                                  className={cn(
                                    'shrink-0',
                                    field.value === provider.value
                                      ? 'opacity-100'
                                      : 'opacity-0',
                                  )}
                                />
                                {provider.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'justify-between',
                            !field.value && 'text-muted-foreground',
                          )}
                          disabled={!!embeddingModelSettings}
                        >
                          {field.value
                            ? availableModels.find(
                                (m) => m.value === field.value,
                              )?.label || field.value
                            : 'Select model'}
                          <ChevronsUpDownIcon className="shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
                      <Command>
                        <CommandInput placeholder="Search" />
                        <CommandList>
                          <CommandEmpty>No results found</CommandEmpty>
                          <CommandGroup>
                            {availableModels.map((model) => (
                              <CommandItem
                                key={model.value}
                                value={model.value}
                                onSelect={() => {
                                  field.onChange(model.value)
                                }}
                              >
                                <CheckIcon
                                  className={cn(
                                    'shrink-0',
                                    field.value === model.value
                                      ? 'opacity-100'
                                      : 'opacity-0',
                                  )}
                                />
                                {model.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        <div className="flex min-h-15 items-center justify-between gap-4 rounded-b-lg border-border border-t bg-foreground/2 p-3 sm:px-6">
          <p className="text-muted-foreground text-sm">
            This model can only be set once and cannot be changed after saving.
          </p>
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || !!embeddingModelSettings}
          >
            {form.formState.isSubmitting && <Spinner />}
            Save
          </Button>
        </div>
      </form>
    </Form>
  )
}
