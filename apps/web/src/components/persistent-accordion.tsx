'use client'

import { Accordion } from '@workspace/ui/components/accordion'
import type * as React from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PersistentAccordionStore {
  value: { [key: string]: string | string[] }
  setValue: (key: string, value: string | string[]) => void
}

const usePersistentAccordion = create<PersistentAccordionStore>()(
  persist(
    (set) => ({
      value: {},
      setValue: (key, value) =>
        set((state) => ({ value: { ...state.value, [key]: value } })),
    }),
    {
      name: 'persistent-accordion-storage',
    },
  ),
)

export function PersistentAccordion({
  type,
  ...props
}: Omit<
  React.ComponentProps<typeof Accordion>,
  'defaultValue' | 'value' | 'onValueChange'
> & { name: string }) {
  const { value, setValue } = usePersistentAccordion()

  return (
    // @ts-expect-error
    <Accordion
      {...props}
      type={type}
      value={value[props.name]}
      onValueChange={(value: any) => setValue(props.name, value)}
    />
  )
}
