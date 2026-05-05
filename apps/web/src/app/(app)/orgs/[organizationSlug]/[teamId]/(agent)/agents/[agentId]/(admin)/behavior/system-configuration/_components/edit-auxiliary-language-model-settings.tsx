'use client'

import { ModelProviderSelect } from '@/components/model-provider-select'
import {
  type ModelOptionValue,
  inferModelOptionType,
  modelOptionSchema,
  parseBooleanLikeString,
  parseModelOptionValue,
  serializeModelOptionValue,
} from '@/lib/model-options'
import { sdk } from '@/lib/sdk'
import type { AgentParams, OrganizationTeamParams } from '@/lib/types'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ModelProvider } from '@workspace/core/model-providers'
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Spinner } from '@workspace/ui/components/spinner'
import {
  CalculatorIcon,
  CircleOffIcon,
  PlusIcon,
  ToggleRightIcon,
  Trash2Icon,
  TypeIcon,
} from 'lucide-react'
import { useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { LanguageModelSelect } from '../../_components/language-model-select'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  agentId: AgentParams['agentId']
}

const formSchema = z.object({
  provider: z
    .object({
      id: z.string(),
      value: z.object({
        id: z.string(),
        name: z.string(),
        provider: z.string(),
      }),
    })
    .nullable(),
  model: z.string().nonempty(),
  options: z.array(modelOptionSchema),
})

export function EditAuxiliaryLanguageModelSettingsForm({
  params,
  auxiliaryLanguageModelSettings,
}: {
  params: Params
  auxiliaryLanguageModelSettings: {
    provider: {
      id: string
      value: {
        id: string
        name: string
        provider: ModelProvider | string
      }
    } | null
    model: string
    options?: Record<string, unknown> | null
  } | null
}) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      provider: auxiliaryLanguageModelSettings?.provider ?? null,
      model: auxiliaryLanguageModelSettings?.model || '',
      options: auxiliaryLanguageModelSettings?.options
        ? Object.entries(auxiliaryLanguageModelSettings.options).map(
            ([key, value]) => {
              const type = inferModelOptionType(value)

              return {
                key,
                type,
                value: serializeModelOptionValue(value, type),
              }
            },
          )
        : [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'options',
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const providerId = values.provider?.id ?? null

    const optionsObject = values.options.reduce(
      (acc, { key, type, value }) => {
        if (key) {
          acc[key] = parseModelOptionValue(value, type)
        }

        return acc
      },
      {} as Record<string, ModelOptionValue>,
    )

    const { error } = await sdk.updateAgentSystemConfiguration({
      headers: {
        'x-organization-slug': params.organizationSlug,
      },
      agentId: params.agentId,
      data: {
        auxiliaryLanguageModelSettings: {
          providerId,
          model: values.model,
          options: optionsObject,
        },
      },
    })

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Auxiliary language model updated successfully')
  }

  const addOption = () => {
    append({ key: '', type: 'string', value: '' })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="rounded-lg border border-border bg-background"
      >
        <div className="relative flex min-h-39 flex-col gap-5 p-5 sm:gap-6 sm:p-6">
          <div className="flex flex-col gap-3">
            <h2 className="font-semibold text-xl">Auxiliary Language Model</h2>
            <p className="text-muted-foreground text-sm">
              Configure an auxiliary model used to generate conversation titles,
              suggestions, and other internal agent tasks.
            </p>
          </div>

          <div className="grid items-start gap-3 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider</FormLabel>
                  <FormControl>
                    <ModelProviderSelect
                      organizationSlug={params.organizationSlug}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
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
                  <FormControl>
                    <LanguageModelSelect
                      provider={form.watch('provider')?.value.provider}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
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
                      name={`options.${index}.type`}
                      render={({ field: typeField }) => (
                        <FormItem className="flex-1">
                          <Select
                            onValueChange={typeField.onChange}
                            value={typeField.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="string">
                                <TypeIcon />
                                String
                              </SelectItem>
                              <SelectItem value="number">
                                <CalculatorIcon />
                                Number
                              </SelectItem>
                              <SelectItem value="boolean">
                                <ToggleRightIcon />
                                Boolean
                              </SelectItem>
                              <SelectItem value="null">
                                <CircleOffIcon />
                                Null
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`options.${index}.value`}
                      render={({ field: valueField }) => {
                        const type = form.watch(`options.${index}.type`)

                        return (
                          <FormItem className="flex-1">
                            {type === 'boolean' ? (
                              <>
                                <Select
                                  onValueChange={valueField.onChange}
                                  value={String(
                                    parseBooleanLikeString(valueField.value),
                                  )}
                                >
                                  <FormControl>
                                    <InputGroup>
                                      <SelectTrigger
                                        data-slot="input-group-control"
                                        className="flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
                                      >
                                        <SelectValue placeholder="Select value" />
                                      </SelectTrigger>
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
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="true">True</SelectItem>
                                    <SelectItem value="false">False</SelectItem>
                                  </SelectContent>
                                </Select>
                              </>
                            ) : (
                              <FormControl>
                                <InputGroup>
                                  <InputGroupInput
                                    {...valueField}
                                    value={
                                      type === 'null'
                                        ? 'NULL'
                                        : valueField.value
                                    }
                                    placeholder="Value"
                                    type={type === 'number' ? 'number' : 'text'}
                                    disabled={type === 'null'}
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
                              </FormControl>
                            )}
                            <FormMessage />
                          </FormItem>
                        )
                      }}
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
