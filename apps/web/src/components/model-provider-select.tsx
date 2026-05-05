'use client'

import { sdk } from '@/lib/sdk'
import type { ModelProvider } from '@workspace/core/model-providers'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover'
import { Spinner } from '@workspace/ui/components/spinner'
import { cn } from '@workspace/ui/lib/utils'
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

type ModelProviderOption = {
  id: string
  value: {
    id: string
    name: string
    provider: ModelProvider | string
  }
}

type ModelProviderSelectProps = {
  organizationSlug: string
  providers?: ModelProvider[]
  value?: ModelProviderOption | null
  onChange?: (value: ModelProviderOption | null) => void
  disabled?: boolean
}

export function ModelProviderSelect({
  organizationSlug,
  providers,
  value,
  onChange,
  disabled,
}: ModelProviderSelectProps) {
  const [open, setOpen] = React.useState(false)

  const [selectedOption, setSelectedOption] =
    React.useState<ModelProviderOption | null>(value ?? null)

  React.useEffect(() => {
    setSelectedOption(value ?? null)
  }, [value])

  const [inputValue, setInputValue] = React.useState('')
  const [options, setOptions] = React.useState<ModelProviderOption[]>([])
  const [isPending, startTransition] = React.useTransition()
  const debouncedInputValue = useDebounce(inputValue, 350)

  React.useEffect(() => {
    startTransition(async () => {
      const { data, error } = await sdk.listModelProviderSelectOptions({
        headers: {
          'x-organization-slug': organizationSlug,
        },
        params: {
          providers,
          search: debouncedInputValue,
        },
      })

      if (error) {
        toast.error(error.message)
        return
      }

      setOptions(
        data.modelProviders.map((provider) => ({
          id: provider.id,
          value: provider,
        })),
      )
    })
  }, [debouncedInputValue])

  const onSelect = (option: ModelProviderOption) => {
    setSelectedOption(option)
    onChange?.(option)
    setOpen(false)
    setInputValue('')
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-between',
            !selectedOption && 'text-muted-foreground',
          )}
          disabled={disabled}
        >
          {selectedOption?.value.name || 'Select model provider'}
          <ChevronsUpDownIcon className="shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
        <Command shouldFilter={false}>
          <CommandInput
            value={inputValue}
            onValueChange={setInputValue}
            placeholder="Search"
          />
          <CommandList>
            {isPending ? (
              <CommandEmpty
                className={cn(
                  'py-6 text-center text-sm',
                  'flex items-center justify-center gap-2',
                )}
              >
                <Spinner className="size-4" />
                Loading...
              </CommandEmpty>
            ) : (
              <CommandEmpty>No results found</CommandEmpty>
            )}

            {!isPending && !!options.length && (
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.id}
                    onSelect={() => onSelect(option)}
                  >
                    <CheckIcon
                      className={cn(
                        'shrink-0',
                        option.id === selectedOption?.id
                          ? 'opacity-100'
                          : 'opacity-0',
                      )}
                    />
                    {option.value.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
