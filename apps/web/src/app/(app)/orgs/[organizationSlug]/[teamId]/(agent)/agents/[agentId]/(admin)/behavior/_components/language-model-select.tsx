'use client'

import { defaultLanguageModels } from '@/lib/default-models'
import type { ModelProvider } from '@workspace/core/model-providers'
import { Button } from '@workspace/ui/components/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@workspace/ui/components/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover'
import { cn } from '@workspace/ui/lib/utils'
import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from 'lucide-react'
import * as React from 'react'

type LanguageModelSelectProps = {
  provider?: ModelProvider | string | null
  value?: string
  onChange?: (value: string) => void
}

export function LanguageModelSelect({
  provider,
  value,
  onChange,
}: LanguageModelSelectProps) {
  const [open, setOpen] = React.useState(false)

  const [selectedOption, setSelectedOption] = React.useState(value)

  React.useEffect(() => {
    setSelectedOption(value)
  }, [value])

  const [inputValue, setInputValue] = React.useState('')

  const languageModels = React.useMemo(() => {
    if (!provider) {
      return []
    }

    return defaultLanguageModels[provider as ModelProvider] ?? []
  }, [provider])

  const filteredLanguageModels = React.useMemo(() => {
    if (!provider) {
      return []
    }

    return languageModels.filter(
      ({ value, label }) =>
        value.toLowerCase().includes(inputValue.toLowerCase()) ||
        label.toLowerCase().includes(inputValue.toLowerCase()),
    )
  }, [languageModels, inputValue])

  const shouldShowAddCustomModel = React.useMemo(() => {
    return Boolean(
      inputValue &&
        inputValue !== selectedOption &&
        !languageModels.find(({ value }) => value === inputValue),
    )
  }, [languageModels, inputValue, selectedOption])

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-between',
            !selectedOption && 'text-muted-foreground',
          )}
        >
          {selectedOption
            ? (languageModels.find(({ value }) => value === selectedOption)
                ?.label ?? selectedOption)
            : 'Select language model'}
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
            <CommandEmpty>No results found</CommandEmpty>

            <CommandGroup>
              {filteredLanguageModels.map((model) => (
                <CommandItem
                  key={model.value}
                  value={model.value}
                  onSelect={() => {
                    setSelectedOption(model.value)
                    onChange?.(model.value)
                    setOpen(false)
                    setInputValue('')
                  }}
                >
                  <CheckIcon
                    className={cn(
                      'shrink-0',
                      model.value === selectedOption
                        ? 'opacity-100'
                        : 'opacity-0',
                    )}
                  />
                  {model.label}
                </CommandItem>
              ))}

              {shouldShowAddCustomModel && (
                <>
                  <CommandSeparator />

                  <CommandItem
                    value={inputValue}
                    onSelect={() => {
                      setSelectedOption(inputValue)
                      onChange?.(inputValue)
                      setOpen(false)
                      setInputValue('')
                    }}
                  >
                    <PlusIcon /> Add "{inputValue}"
                  </CommandItem>
                </>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
