import { updateTag } from '@/actions/cache'
import { sdk } from '@/lib/sdk'
import type { OrganizationTeamParams } from '@/lib/types'
import { zodResolver } from '@hookform/resolvers/zod'
import type { VectorStoreUpstash } from '@workspace/core/vector-stores'
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
import { VectorStoreCard } from '../vector-store-card'
import { availableVectorStores } from './vector-stores'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  vectorStoreId?: string
}

const formSchema = z.object({
  name: z.string().nonempty(),
  url: z.url(),
  token: z.string().nonempty(),
})

type UpstashVectorStoreProps = {
  onSuccess: () => void
  onBack: () => void
  initialData?: {
    name: string
    settings: VectorStoreUpstash['settings']
    credentials: VectorStoreUpstash['credentials']
  }
}

export function UpstashVectorStore({
  onSuccess,
  onBack,
  initialData,
}: UpstashVectorStoreProps) {
  const params = useParams<Params>()

  const [showApiKey, setShowApiKey] = React.useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      url: initialData?.settings?.url ?? '',
      token: initialData?.credentials?.token ?? '',
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (params.vectorStoreId && initialData) {
      const { error } = await sdk.updateVectorStore({
        vectorStoreId: params.vectorStoreId,
        data: {
          organizationSlug: params.organizationSlug,
          provider: 'upstash',
          name: values.name,
          settings: {
            url: values.url,
          },
          credentials: {
            token: values.token,
          },
        },
      })

      if (error) {
        toast.error(error.message)
        return
      }

      await updateTag('update-vector-store')
    } else {
      const { error } = await sdk.createVectorStore({
        data: {
          organizationSlug: params.organizationSlug,
          provider: 'upstash',
          name: values.name,
          settings: {
            url: values.url,
          },
          credentials: {
            token: values.token,
          },
        },
      })

      if (error) {
        toast.error(error.message)
        return
      }

      await updateTag('create-vector-store')
    }

    onSuccess()
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full flex-col gap-4"
      >
        <VectorStoreCard provider={availableVectorStores.upstash} />

        <div className="flex w-full flex-col gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Upstash" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="https://vector-store.upstash.io"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="token"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Token</FormLabel>
                <FormControl>
                  <InputGroup>
                    <InputGroupInput
                      {...field}
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
