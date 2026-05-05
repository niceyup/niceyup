import { updateTag } from '@/actions/cache'
import { sdk } from '@/lib/sdk'
import type { OrganizationTeamParams } from '@/lib/types'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  type McpServerType,
  mcpServerTypeSchema,
} from '@workspace/core/mcp-servers'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Spinner } from '@workspace/ui/components/spinner'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { McpServerCard } from '../mcp-server-card'
import { availableMcpServers } from './mcp-servers'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  mcpServerId?: string
}

const formSchema = z.object({
  name: z.string().nonempty(),
  type: mcpServerTypeSchema,
  url: z.url(),
  headers: z.array(
    z.object({
      key: z.string().trim().nonempty(),
      value: z.string().trim(),
    }),
  ),
})

type CustomMcpServerProps = {
  onSuccess: () => void
  onBack: () => void
  initialData?: {
    name: string
    type: McpServerType
    url: string
    headers: Record<string, string> | null
  }
}

export function CustomMcpServer({
  onSuccess,
  onBack,
  initialData,
}: CustomMcpServerProps) {
  const params = useParams<Params>()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      type: initialData?.type ?? 'http',
      url: initialData?.url ?? '',
      headers: initialData?.headers
        ? Object.entries(initialData.headers).map(([key, value]) => ({
            key,
            value: String(value),
          }))
        : [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'headers',
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

    if (params.mcpServerId && initialData) {
      const { error } = await sdk.updateMcpServer({
        headers: {
          'x-organization-slug': params.organizationSlug,
        },
        mcpServerId: params.mcpServerId,
        data: {
          name: values.name,
          type: values.type,
          url: values.url,
          headers: headersObject,
        },
      })

      if (error) {
        toast.error(error.message)
        return
      }

      await updateTag('update-mcp-server')
    } else {
      const { error } = await sdk.createMcpServer({
        headers: {
          'x-organization-slug': params.organizationSlug,
        },
        data: {
          name: values.name,
          type: values.type,
          url: values.url,
          headers: headersObject,
        },
      })

      if (error) {
        toast.error(error.message)
        return
      }

      await updateTag('create-mcp-server')
    }

    onSuccess()
  }

  const addHeader = () => {
    append({ key: '', value: '' })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full flex-col gap-4"
      >
        <McpServerCard connection={availableMcpServers['custom-mcp']} />

        <div className="flex w-full flex-col gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Custom MCP" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <FormDescription>
                  Select how the MCP server communicates with your agent.
                </FormDescription>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="http">
                      HTTP — Request/response connection
                    </SelectItem>
                    <SelectItem value="sse">
                      SSE — Real-time streaming connection
                    </SelectItem>
                  </SelectContent>
                </Select>
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
                <FormDescription>
                  Enter the endpoint URL of your MCP server.
                </FormDescription>
                <FormControl>
                  <Input {...field} placeholder="https://your-server.com/mcp" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex w-full flex-col gap-2">
            <Label>Headers</Label>
            <p className="text-muted-foreground text-sm">
              Optional headers to include in every request.
            </p>

            {fields.map((field, index) => (
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
                              onClick={() => remove(index)}
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
