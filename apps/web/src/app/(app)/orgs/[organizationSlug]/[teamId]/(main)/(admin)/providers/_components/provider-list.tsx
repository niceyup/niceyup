'use client'

import { updateTag } from '@/actions/cache'
import { sdk } from '@/lib/sdk'
import type { OrganizationTeamParams } from '@/lib/types'
import { getInitials } from '@/lib/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@workspace/ui/components/avatar'
import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@workspace/ui/components/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
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
import { Spinner } from '@workspace/ui/components/spinner'
import { formatDistanceToNow } from 'date-fns'
import { MoreHorizontalIcon } from 'lucide-react'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import type { Provider, ProviderAppEnum } from '../_lib/utils'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
}

export function ProviderList({
  params,
  providers,
}: {
  params: Params
  providers?: Provider[]
}) {
  const availableProviders = [
    {
      app: 'openai' as const,
      name: 'OpenAI',
    },
    {
      app: 'anthropic' as const,
      name: 'Anthropic',
    },
    {
      app: 'google' as const,
      name: 'Google',
    },
  ]

  return (
    <div className="flex w-full max-w-4xl flex-col divide-y divide-border rounded-lg border bg-background">
      {availableProviders.map(({ app, name }) => {
        const provider = providers?.find((provider) => provider.app === app)

        return (
          <div key={app} className="flex items-center justify-start gap-4 p-4">
            <Avatar className="size-8 border">
              <AvatarImage
                src={`https://7nyt0uhk7sse4zvn.public.blob.vercel-storage.com/docs-assets/static/docs/ai-gateway/logos/${app}.png`}
              />
              <AvatarFallback className="text-xs">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>

            <span className="font-medium text-sm">{name}</span>

            <div className="ml-auto flex items-center">
              {provider ? (
                <div className="flex items-center gap-2">
                  <div className="text-muted-foreground text-sm">
                    Updated{' '}
                    {formatDistanceToNow(new Date(provider.updatedAt), {
                      addSuffix: true,
                    })}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontalIcon className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent>
                      <ProviderActionDelete
                        params={{ organizationSlug: params.organizationSlug }}
                        providerId={provider.id}
                      />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <ProviderActionAdd
                  params={{ organizationSlug: params.organizationSlug }}
                  app={app}
                  name={name}
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ProviderActionDelete({
  params,
  providerId,
}: {
  params: Params
  providerId: string
}) {
  const [isPending, startTransition] = React.useTransition()

  const onRemove = async () => {
    startTransition(async () => {
      const { error } = await sdk.deleteProvider({
        providerId,
        data: {
          organizationSlug: params.organizationSlug,
        },
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Provider deleted successfully')
      await updateTag('delete-provider')
    })
  }

  return (
    <DropdownMenuItem
      variant="destructive"
      onClick={onRemove}
      disabled={isPending}
    >
      {isPending && <Spinner />}
      Delete
    </DropdownMenuItem>
  )
}

const formSchema = z.object({
  apiKey: z.string().trim().nonempty(),
})

function ProviderActionAdd({
  params,
  app,
  name,
}: {
  params: Params
  app: ProviderAppEnum
  name: string
}) {
  const [open, setOpen] = React.useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      apiKey: '',
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const { data, error } = await sdk.createProvider({
      data: {
        organizationSlug: params.organizationSlug,
        app,
        name,
        payload: {
          apiKey: values.apiKey,
        },
      },
    })

    if (data) {
      form.reset()
      toast.success('Provider added successfully')
      setOpen(false)
      await updateTag('create-provider')
    }

    if (error) {
      toast.error(error.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Add</Button>
      </DialogTrigger>

      <DialogContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col items-stretch justify-center gap-4"
          >
            <DialogHeader>
              <DialogTitle>Add {name} API Key</DialogTitle>
            </DialogHeader>

            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{name} API Key</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="sk-abcdefg..."
                      type="password"
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                    />
                  </FormControl>
                  <FormMessage />
                  <FormDescription>
                    Your API key will handle all {name} requests.
                  </FormDescription>
                </FormItem>
              )}
            />

            <DialogFooter>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset()}
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Spinner />}
                Add
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
