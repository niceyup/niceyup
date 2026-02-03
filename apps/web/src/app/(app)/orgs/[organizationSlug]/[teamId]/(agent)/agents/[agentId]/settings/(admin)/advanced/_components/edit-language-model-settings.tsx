'use client'

import { sdk } from '@/lib/sdk'
import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import { zodResolver } from '@hookform/resolvers/zod'
import { type Provider, providerSchema } from '@workspace/core/providers'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@workspace/ui/components/accordion'
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
import { Input } from '@workspace/ui/components/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover'
import { Spinner } from '@workspace/ui/components/spinner'
import { cn } from '@workspace/ui/lib/utils'
import {
  CheckIcon,
  ChevronsUpDownIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'
import { useFieldArray, useForm } from 'react-hook-form'
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
    { value: 'gpt-5.2-pro', label: 'GPT-5.2 Pro' },
    // { value: 'gpt-5.2-chat-latest', label: 'GPT-5.2 Chat (latest)' },
    { value: 'gpt-5.2', label: 'GPT-5.2' },
    // { value: 'gpt-5.1-codex-mini', label: 'GPT-5.1 Codex Mini' },
    // { value: 'gpt-5.1-codex', label: 'GPT-5.1 Codex' },
    // { value: 'gpt-5.1-chat-latest', label: 'GPT-5.1 Chat (latest)' },
    { value: 'gpt-5.1', label: 'GPT-5.1' },
    { value: 'gpt-5-pro', label: 'GPT-5 Pro' },
    { value: 'gpt-5', label: 'GPT-5' },
    // { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
    // { value: 'gpt-5-nano', label: 'GPT-5 Nano' },
    // { value: 'gpt-5-codex', label: 'GPT-5 Codex' },
    // { value: 'gpt-5-chat-latest', label: 'GPT-5 Chat (latest)' },
    { value: 'gpt-4.1', label: 'GPT-4.1' },
    // { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    // { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    // { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  ],
  google: [
    { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro (preview)' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
    // { value: 'gemini-2.5-flash-lite-preview-06-17', label: 'Gemini 2.5 Flash Lite (preview 06-17)' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    // { value: 'gemini-1.5-pro-latest', label: 'Gemini 1.5 Pro (latest)' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    // { value: 'gemini-1.5-flash-latest', label: 'Gemini 1.5 Flash (latest)' },
    // { value: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B' },
    // { value: 'gemini-1.5-flash-8b-latest', label: 'Gemini 1.5 Flash 8B (latest)' },
  ],
}

const formSchema = z.object({
  provider: providerSchema,
  model: z.string().nonempty(),
  options: z.array(
    z.object({
      key: z.string().trim().nonempty(),
      value: z.string().trim(),
    }),
  ),
})

export function EditLanguageModelSettingsForm({
  params,
  languageModelSettings,
}: {
  params: Params
  languageModelSettings: {
    provider: Provider
    model: string
    options?: Record<string, unknown> | null
  } | null
}) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      provider: languageModelSettings?.provider || 'openai',
      model: languageModelSettings?.model || '',
      options: languageModelSettings?.options
        ? Object.entries(languageModelSettings.options).map(([key, value]) => ({
            key,
            value: String(value),
          }))
        : [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'options',
  })

  const selectedProvider = form.watch('provider')
  const availableModels = modelsByProvider[selectedProvider] || []

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const optionsObject = values.options.reduce(
      (acc, { key, value }) => {
        if (key) {
          acc[key] = value
        }
        return acc
      },
      {} as Record<string, string>,
    )

    const { error } = await sdk.updateAgentConfiguration({
      agentId: params.agentId,
      data: {
        organizationSlug: params.organizationSlug,
        languageModelSettings: {
          provider: values.provider,
          model: values.model,
          options: optionsObject,
        },
      },
    })

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Language model updated successfully')
  }

  const addOption = () => {
    append({ key: '', value: '' })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="rounded-lg border border-border bg-background"
      >
        <div className="relative flex min-h-39 flex-col gap-5 p-5 sm:gap-6 sm:p-6">
          <div className="flex flex-col gap-3">
            <h2 className="font-semibold text-xl">Language Model</h2>
            <p className="text-muted-foreground text-sm">
              Configure the AI model provider and model that powers your agent's
              responses.
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

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="advanced-options">
              <AccordionTrigger className="py-0">
                Advanced options
              </AccordionTrigger>
              <AccordionContent className="flex flex-col gap-3">
                <p className="text-muted-foreground text-sm">
                  Add custom configuration options as key-value pairs.
                </p>

                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-2">
                    <FormField
                      control={form.control}
                      name={`options.${index}.key`}
                      render={({ field: keyField }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input {...keyField} placeholder="Key" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`options.${index}.value`}
                      render={({ field: valueField }) => (
                        <FormItem className="flex-1">
                          <InputGroup>
                            <InputGroupInput
                              {...valueField}
                              placeholder="Value"
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
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  className="w-fit"
                >
                  <PlusIcon />
                  Add option
                </Button>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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
