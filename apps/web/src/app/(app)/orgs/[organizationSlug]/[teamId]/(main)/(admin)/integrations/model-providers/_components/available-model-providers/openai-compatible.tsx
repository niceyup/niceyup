import { updateTag } from '@/actions/cache'
import { sdk } from '@/lib/sdk'
import type { OrganizationTeamParams } from '@/lib/types'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ModelProviderOpenAICompatible } from '@workspace/core/model-providers'
import { Button } from '@workspace/ui/components/button'
import {
  Form,
  FormControl,
  FormDescription,
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
import { Label } from '@workspace/ui/components/label'
import { Spinner } from '@workspace/ui/components/spinner'
import { stripSpecialCharacters } from '@workspace/utils'
import { EyeIcon, EyeOffIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useParams } from 'next/navigation'
import * as React from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { ModelProviderCard } from '../model-provider-card'
import { availableModelProviders } from './model-providers'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  modelProviderId?: string
}

const formSchema = z.object({
  name: z.string().nonempty(),
  baseURL: z.url(),
  apiKey: z.string(),
  headers: z.array(
    z.object({
      key: z.string().trim().nonempty(),
      value: z.string().trim(),
    }),
  ),
  queryParams: z.array(
    z.object({
      key: z.string().trim().nonempty(),
      value: z.string().trim(),
    }),
  ),
})

type OpenAICompatibleModelProviderProps = {
  onSuccess: () => void
  onBack: () => void
  initialData?: {
    name: string
    settings: ModelProviderOpenAICompatible['settings']
    credentials: ModelProviderOpenAICompatible['credentials']
  }
}

export function OpenAICompatibleModelProvider({
  onSuccess,
  onBack,
  initialData,
}: OpenAICompatibleModelProviderProps) {
  const params = useParams<Params>()

  const [showApiKey, setShowApiKey] = React.useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      baseURL: initialData?.settings?.baseURL ?? '',
      apiKey: initialData?.credentials?.apiKey ?? '',
      headers: initialData?.settings?.headers
        ? Object.entries(initialData.settings.headers).map(([key, value]) => ({
            key,
            value: String(value),
          }))
        : [],
      queryParams: initialData?.settings?.queryParams
        ? Object.entries(initialData.settings.queryParams).map(
            ([key, value]) => ({
              key,
              value: String(value),
            }),
          )
        : [],
    },
  })

  const headersFieldArray = useFieldArray({
    control: form.control,
    name: 'headers',
  })

  const queryParamsFieldArray = useFieldArray({
    control: form.control,
    name: 'queryParams',
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const headersObject = values.headers.reduce(
      (acc, { key, value }) => {
        if (key) {
          acc[key] = value
        }
        return acc
      },
      {} as Record<string, string>,
    )

    const queryParamsObject = values.queryParams.reduce(
      (acc, { key, value }) => {
        if (key) {
          acc[key] = value
        }
        return acc
      },
      {} as Record<string, string>,
    )

    const settings = {
      baseURL: values.baseURL,
      headers: headersObject,
      queryParams: queryParamsObject,
    }

    const providerName = stripSpecialCharacters(values.name)

    const provider = `openai-compatible/${providerName}`

    if (params.modelProviderId && initialData) {
      const { error } = await sdk.updateModelProvider({
        headers: {
          'x-organization-slug': params.organizationSlug,
        },
        modelProviderId: params.modelProviderId,
        data: {
          provider,
          name: values.name,
          settings,
          credentials: {
            apiKey: values.apiKey,
          },
        },
      })

      if (error) {
        toast.error(error.message)
        return
      }

      await updateTag('update-model-provider')
    } else {
      const { error } = await sdk.createModelProvider({
        headers: {
          'x-organization-slug': params.organizationSlug,
        },
        data: {
          provider,
          name: values.name,
          settings,
          credentials: {
            apiKey: values.apiKey,
          },
        },
      })

      if (error) {
        toast.error(error.message)
        return
      }

      await updateTag('create-model-provider')
    }

    onSuccess()
  }

  const addHeader = () => {
    headersFieldArray.append({ key: '', value: '' })
  }

  const addQueryParam = () => {
    queryParamsFieldArray.append({ key: '', value: '' })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full flex-col gap-4"
      >
        <ModelProviderCard
          provider={availableModelProviders['openai-compatible']}
        />

        <div className="flex w-full flex-col gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="OpenAI" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="baseURL"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base URL</FormLabel>
                <FormDescription>
                  Enter the base URL for the provider’s API.
                </FormDescription>
                <FormControl>
                  <Input {...field} placeholder="https://api.openai.com/v1" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex w-full flex-col gap-2">
            <Label>Query Params</Label>
            <p className="text-muted-foreground text-sm">
              Optional query parameters to include in every request.
            </p>

            {queryParamsFieldArray.fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <FormField
                  control={form.control}
                  name={`queryParams.${index}.key`}
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
                  name={`queryParams.${index}.value`}
                  render={({ field: valueField }) => (
                    <FormItem className="flex-1">
                      <FormControl>
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
                              onClick={() =>
                                queryParamsFieldArray.remove(index)
                              }
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2Icon />
                            </InputGroupButton>
                          </InputGroupAddon>
                        </InputGroup>
                      </FormControl>
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
              onClick={addQueryParam}
              className="w-fit"
            >
              <PlusIcon />
              Add query param
            </Button>
          </div>

          <FormField
            control={form.control}
            name="apiKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>API Key</FormLabel>
                <FormControl>
                  <InputGroup>
                    <InputGroupInput
                      {...field}
                      placeholder="sk-..."
                      type={showApiKey ? 'text' : 'password'}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="button"
                        onClick={() => setShowApiKey((show) => !show)}
                      >
                        {showApiKey ? <EyeOffIcon /> : <EyeIcon />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex w-full flex-col gap-2">
            <Label>Headers</Label>
            <p className="text-muted-foreground text-sm">
              Optional headers to include in every request. These are applied
              after default headers and may override them.
            </p>

            {headersFieldArray.fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <FormField
                  control={form.control}
                  name={`headers.${index}.key`}
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
                  name={`headers.${index}.value`}
                  render={({ field: valueField }) => (
                    <FormItem className="flex-1">
                      <FormControl>
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
                              onClick={() => headersFieldArray.remove(index)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2Icon />
                            </InputGroupButton>
                          </InputGroupAddon>
                        </InputGroup>
                      </FormControl>
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
              onClick={addHeader}
              className="w-fit"
            >
              <PlusIcon />
              Add header
            </Button>
          </div>
        </div>

        <div className="flex w-full flex-row items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Spinner />}
            {initialData ? 'Update' : 'Add'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
