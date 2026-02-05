import { useCallbackRef } from '@workspace/ui/hooks/use-callback-ref'
import * as React from 'react'

export function useDebouncedCallback<T extends (...args: never[]) => any>(
  callback: T,
  delay: number,
) {
  const handleCallback = useCallbackRef(callback)
  const debounceTimerRef = React.useRef(0)
  React.useEffect(() => () => window.clearTimeout(debounceTimerRef.current), [])

  const setValue = React.useCallback(
    (...args: Parameters<T>) => {
      window.clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = window.setTimeout(
        () => handleCallback(...args),
        delay,
      )
    },
    [handleCallback, delay],
  )

  return setValue
}
