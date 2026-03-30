import { updateTag } from '@/actions/cache'
import { sdk } from '@/lib/sdk'
import type { OrganizationTeamParams } from '@/lib/types'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ModelProviderOpenAI } from '@workspace/core/model-providers'
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
import { Spinner } from '@workspace/ui/components/spinner'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useParams } from 'next/navigation'
import * as React from 'react'
import { useForm } from 'react-hook-form'
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
  apiKey: z.string().nonempty(),
})

type OpenAIModelProviderProps = {
  onSuccess: () => void
  onBack: () => void
  initialData?: {
    name: string
    credentials: ModelProviderOpenAI['credentials']
  }
}

export function OpenAIModelProvider({
  onSuccess,
  onBack,
  initialData,
}: OpenAIModelProviderProps) {
  const params = useParams<Params>()

  const [showApiKey, setShowApiKey] = React.useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      apiKey: initialData?.credentials?.apiKey ?? '',
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (params.modelProviderId) {
      const { error } = await sdk.updateModelProvider({
        modelProviderId: params.modelProviderId,
        data: {
          organizationSlug: params.organizationSlug,
          provider: 'openai',
          name: values.name,
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
        data: {
          organizationSlug: params.organizationSlug,
          provider: 'openai',
          name: values.name,
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

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full flex-col gap-4"
      >
        <ModelProviderCard provider={availableModelProviders.openai} />

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
