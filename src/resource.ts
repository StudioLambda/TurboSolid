import {
  TurboQueryOptions,
  TurboQuery,
  TurboMutateValue,
  query as turboQuery,
  subscribe as turboSubscribe,
  mutate as turboMutate,
  forget as turboForget,
  abort as turboAbort,
} from 'turbo-query'

import {
  createResource,
  startTransition,
  createContext,
  useContext,
  Resource,
  onCleanup,
  createMemo,
  createEffect,
  createSignal,
  Accessor,
} from 'solid-js'

/**
 * Available options for a turbo resource.
 */
export interface TurboSolidResourceOptions extends TurboQueryOptions {
  /**
   * Determines the turbo query instance to use. If not specified,
   * neither in the resource nor the context, the default instance
   * will be used instead.
   */
  turbo?: TurboQuery

  /**
   * Determines a transition function to perform async operations.
   */
  transition?: boolean | ((fn: () => void) => Promise<void>)

  /**
   * Determines if it should refetch keys when
   * the window regains focus. You can also
   * set the desired `focusInterval`.
   */
  refetchOnFocus?: boolean

  /**
   * Determines if it should refetch keys when
   * the window regains focus.
   */
  refetchOnConnect?: boolean

  /**
   * Determines a throttle interval for the
   * `refetchOnFocus`. Defaults to 5000 ms.
   */
  focusInterval?: number
}

/**
 * The actions available on a turbo resource.
 */
export interface TurboSolidResourceActions<T> {
  /**
   * Performs a local mutation of the data.
   * This also broadcasts it to all other key listeners.
   */
  mutate(value: TurboMutateValue<T>): void

  /**
   * Performs a refetching of the resource.
   * This also broadcasts it to all other key listeners.
   * Returns undefined if it's unable to refetch.
   */
  refetch(): Promise<T | undefined>

  /**
   * Unsibscribes the event listeners. If createResource was
   * used outside of a component, this method will need to be
   * called manually when it's no longer needed.
   */
  unsubscribe(): void

  /**
   * Forgets the current resource key.
   */
  forget(): void

  /**
   * Aborts the current resource key.
   */
  abort(reason?: any): void

  /**
   * Determines if a refetch is currently
   * running.
   */
  isRefetching: Accessor<boolean>
}

/**
 * Determines the type of a turbo resource.
 */
export type TurboSolidResource<T> = [Resource<T | undefined>, TurboSolidResourceActions<T>]

/**
 * The context used to supply turbo resources with default options.
 */
export const TurboContext = createContext<TurboSolidResourceOptions>()

/**
 * The type of a turbo solid key.
 */
export type TurboSolidKeyType = string | false | null | undefined

/**
 * The type of a turbo solid key. Accepting a resolver function.
 */
export type TurboSolidKey = () => TurboSolidKeyType

/**
 * Creates a new turbo resource with the given key
 * and options.
 */
export function createTurboResource<T = any>(
  key: TurboSolidKey,
  options?: TurboSolidResourceOptions
): TurboSolidResource<T> {
  /**
   * Gets the transition to use. Translates a boolean value
   * to an actual transition function.
   */
  function getTransition(
    t: TurboSolidResourceOptions['transition']
  ): undefined | ((fn: () => void) => Promise<void>) {
    if (t === undefined) {
      return startTransition
    }
    if (typeof t === 'boolean') {
      return t ? startTransition : undefined
    }
    return t
  }

  /**
   * Creates the memorized key.
   */
  const keyMemo = createMemo<TurboSolidKeyType>(function () {
    try {
      return key()
    } catch {
      return null
    }
  })

  const [isRefetching, setIsRefetching] = createSignal(false)
  const contextOptions = useContext<TurboSolidResourceOptions | undefined>(TurboContext)
  const subscribe = options?.turbo?.subscribe ?? contextOptions?.turbo?.subscribe ?? turboSubscribe
  const query = options?.turbo?.query ?? contextOptions?.turbo?.query ?? turboQuery
  const mutate = options?.turbo?.mutate ?? contextOptions?.turbo?.mutate ?? turboMutate
  const forget = options?.turbo?.forget ?? contextOptions?.turbo?.forget ?? turboForget
  const abort = options?.turbo?.abort ?? contextOptions?.turbo?.abort ?? turboAbort
  const transition = getTransition(options?.transition ?? contextOptions?.transition)
  const refetchOnFocus = options?.refetchOnFocus ?? contextOptions?.refetchOnFocus ?? true
  const refetchOnConnect = options?.refetchOnConnect ?? contextOptions?.refetchOnConnect ?? true
  const focusInterval = options?.focusInterval ?? contextOptions?.focusInterval ?? 5000

  /**
   * Creates the underlying async resource.
   */
  const [item, actions] = createResource<T, string>(keyMemo, function (k, { refetching }) {
    return refetching instanceof Promise
      ? (refetching as Promise<T>)
      : query<T>(k, { stale: true, ...contextOptions, ...options })
  })

  /**
   * Performs a local mutation of the data.
   * This also broadcasts it to all other key listeners.
   */
  function localMutate(value: T): void {
    const key = keyMemo()
    if (!key) return
    mutate<T>(key, value)
  }

  /**
   * Performs a refetching of the resource.
   * This also broadcasts it to all other key listeners.
   * Returns undefined if it's unable to refetch.
   */
  async function localRefetch(): Promise<T | undefined> {
    const key = keyMemo()
    if (!key) return
    const promise = query<T>(key, { stale: false, ...contextOptions, ...options })
    if (transition) transition(() => actions.refetch(promise))
    else actions.refetch(promise)
    return await promise
  }

  let unsubscribeMutations: undefined | (() => void) = undefined
  let unsubscribeRefetching: undefined | (() => void) = undefined
  let unsubscribeFocusRefetch: undefined | (() => void) = undefined
  let unsubscribeConnectRefetch: undefined | (() => void) = undefined
  let unsubscribeResolved: undefined | (() => void) = undefined
  let unsubscribeErrors: undefined | (() => void) = undefined

  /**
   * Unsibscribes the event listeners. If createResource was
   * used outside of a component, this method will need to be
   * called manually when it's no longer needed.
   */
  function localUnsubscribe(): void {
    unsubscribeMutations?.()
    unsubscribeRefetching?.()
    unsubscribeFocusRefetch?.()
    unsubscribeConnectRefetch?.()
    unsubscribeResolved?.()
    unsubscribeErrors?.()
  }

  createEffect(() => {
    setIsRefetching(false)
    const key = keyMemo()
    if (!key) return

    /**
     * The onFocus function handler.
     */
    function onFocus(listener: () => void): () => void {
      if (refetchOnFocus && typeof window !== 'undefined') {
        let lastFocus: number | null = null
        const rawHandler = () => {
          const now = Date.now()
          if (lastFocus === null || now - lastFocus > focusInterval) {
            lastFocus = now
            listener()
          }
        }
        window.addEventListener('focus', rawHandler)
        return () => window.removeEventListener('focus', rawHandler)
      }
      return () => {}
    }

    /**
     * The onConnect function handler.
     */
    function onConnect(listener: () => void): () => void {
      if (refetchOnConnect && typeof window !== 'undefined') {
        window.addEventListener('online', listener)
        return () => window.removeEventListener('online', listener)
      }
      return () => {}
    }

    /**
     * Subscribes to mutations in the key.
     */
    unsubscribeMutations = subscribe<T>(key, 'mutated', function (item) {
      if (transition) transition(() => actions.mutate(() => item))
      else actions.mutate(() => item)
    })

    /**
     * Subscribes to refetching on the key.
     */
    unsubscribeRefetching = subscribe<T>(key, 'refetching', function (promise) {
      setIsRefetching(true)
      if (transition) transition(() => actions.refetch(promise))
      else actions.refetch(promise)
    })

    /**
     * Subscribes to refetching on the key.
     */
    unsubscribeResolved = subscribe<T>(key, 'resolved', function () {
      setIsRefetching(false)
    })

    /**
     * Subscribe to errors.
     */
    unsubscribeErrors = subscribe<unknown>(key, 'error', function () {
      setIsRefetching(false)
    })

    /**
     * Subscribe to focus changes if needed.
     */
    unsubscribeFocusRefetch = onFocus(function () {
      localRefetch()
    })

    /**
     * Subscribe to network connect changes if needed.
     */
    unsubscribeConnectRefetch = onConnect(function () {
      localRefetch()
    })

    /**
     * Unsubscribes the current listeners to avoid memory leaks.
     */
    onCleanup(function () {
      localUnsubscribe()
    })
  })

  /**
   * Forgets the current resource key.
   */
  function localForget(): void {
    const key = keyMemo()
    if (!key) return
    forget(key)
  }

  /**
   * Aborts the current resource key.
   */
  function localAbort(reason?: any): void {
    const key = keyMemo()
    if (!key) return
    abort(key, reason)
  }

  return [
    item,
    {
      mutate: localMutate,
      refetch: localRefetch,
      unsubscribe: localUnsubscribe,
      forget: localForget,
      abort: localAbort,
      isRefetching,
    },
  ]
}
