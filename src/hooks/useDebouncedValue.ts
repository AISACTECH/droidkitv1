import { useEffect, useState } from "react"

/**
 * Returns `value` after it has stopped changing for `delayMs` milliseconds.
 * Pure UX optimization: keeps filtering/refetch work off the critical path
 * of every keystroke while leaving the *value* the consumer sees unchanged
 * in the long run. Behavior-neutral — used for search inputs whose filtering
 * is already memoized on the debounced value.
 */
export function useDebouncedValue<T>(value: T, delayMs = 200): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])

  return debounced
}
