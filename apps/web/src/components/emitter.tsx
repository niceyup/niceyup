'use client'

import mitt, { type Emitter as MittEmitter } from 'mitt'
import * as React from 'react'

export type DefaultEmitterEvents = Record<string, unknown>

const emitter: MittEmitter<DefaultEmitterEvents> = mitt<DefaultEmitterEvents>()

export interface EmitterContextValue<
  Events extends Record<string, unknown> = DefaultEmitterEvents,
> {
  emitter: MittEmitter<Events>
}

const EmitterContext = React.createContext<EmitterContextValue>({ emitter })

export function useEmitter<
  Events extends Record<string, unknown> = DefaultEmitterEvents,
>(): EmitterContextValue<Events> {
  return React.useContext(EmitterContext) as EmitterContextValue<Events>
}

export function useEmitterChannel<DATA>(
  channel: string,
  onEvent: (data: DATA) => void,
) {
  const { emitter } = useEmitter<Record<string, DATA>>()

  const onEventRef = React.useRef(onEvent)

  React.useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  React.useEffect(() => {
    const listener = (payload: DATA) => {
      onEventRef.current(payload)
    }

    emitter.on(channel, listener)
    return () => emitter.off(channel, listener)
  }, [channel, emitter])
}

export function Emitter({ children }: { children: React.ReactNode }) {
  return (
    <EmitterContext.Provider value={{ emitter }}>
      {children}
    </EmitterContext.Provider>
  )
}
