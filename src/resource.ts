import {
  TurboQueryOptions,
  TurboQuery,
  TurboMutateValue,
  query as turboQuery,
  subscribe as turboSubscribe,
  mutate as turboMutate,
  forget as turboForget,
  abort as turboAbort,
  expiration as turboExpiration,
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
  on,
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
  readonly turbo?: TurboQuery

  /**
   * Determines a transition function to perform async operations.
   */
  readonly transition?: boolean | ((fn: () => void) => Promise<void>)

  /**
   * Determines if it should refetch keys when
   * the window regains focus. You can also
   * set the desired `focusInterval`.
   */
  readonly refetchOnFocus?: boolean

  /**
   * Determines if it should refetch keys when
   * the window regains focus.
   */
  readonly refetchOnConnect?: boolean

  /**
   * Determines a throttle interval for the
   * `refetchOnFocus`. Defaults to 5000 ms.
   */
  readonly focusInterval?: number
}

/**
 * The actions available on a turbo resource.
 */
export interface TurboSolidResourceActions<T> {
  /**
   * Performs a local mutation of the data.
   * This also broadcasts it to all other key listeners.
   */
  readonly mutate: (value: TurboMutateValue<T>) => void

  /**
   * Performs a refetching of the resource.
   * This also broadcasts it to all other key listeners.
   * Returns undefined if it's unable to refetch.
   */
  readonly refetch: () => Promise<T | undefined>

  /**
   * Unsibscribes the event listeners. If createResource was
   * used outside of a component, this method will need to be
   * called manually when it's no longer needed.
   */
  readonly unsubscribe: () => void

  /**
   * Forgets the current resource key.
   */
  readonly forget: () => void

  /**
   * Aborts the current resource key.
   */
  readonly abort: (reason?: any) => void

  /**
   * Determines if a refetch is currently
   * running.
   */
  readonly isRefetching: Accessor<boolean>

  /**
   * Determines the date of the last window focus.
   * Useful to calculate how many time is left
   * for the next available focus refetching.
   */
  readonly lastFocus: Accessor<Date>

  /**
   * Creates a signal that every given precision interval
   * will determine if the current key is available
   * to refetch via focus. and how many time need to pass till
   * it's available to refetch by focus. This function helps creating
   * the controlled sigal on demand rather than creating
   * arbitrary signals ourselves just in case.
   * Return value is [isAvailable, availableIn]
   */
  readonly createFocusAvailable: (precision: number) => [Accessor<boolean>, Accessor<number>]

  /**
   * Determines when the current key expires if
   * it's currently in the cache.
   */
  readonly expiration: () => Date | undefined

  /**
   * Creates a signal that every given pricesion interval
   * will determine if the current key is currently expired / stale
   * and how many time needs to pass till its considered expired / stale.
   * This function helps creating
   * the controlled sigal on demand rather than creating
   * arbitrary signals ourselves just in case.
   * Return value is [isStale, staleIn]
   */
  readonly createStale: (precision: number) => [Accessor<boolean>, Accessor<number>]
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
  const expiration =
    options?.turbo?.expiration ?? contextOptions?.turbo?.expiration ?? turboExpiration

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
  function localMutate(value: TurboMutateValue<T>): void {
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

  const [lastFocus, setLastFocus] = createSignal<Date>(new Date())

  /**
   * The onFocus function handler.
   */
  function onFocus(listener: () => void): () => void {
    if (refetchOnFocus && typeof window !== 'undefined') {
      const rawHandler = () => {
        const last = lastFocus()
        const now = new Date()

        if (now.getTime() - last.getTime() > focusInterval) {
          setLastFocus(new Date())
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
   * Composable isFocusAvailable signal.
   */
  function createFocusAvailable(precision: number): [Accessor<boolean>, Accessor<number>] {
    const [isAvailable, setIsAvailable] = createSignal(
      new Date().getTime() - lastFocus().getTime() > focusInterval
    )
    const [availableIn, setAvailableIn] = createSignal(focusInterval)

    const interval = setInterval(function () {
      const last = lastFocus()
      const now = new Date()
      const availability = focusInterval - (now.getTime() - last.getTime())
      if (availability >= 0) setAvailableIn(availability)
      else if (availability < 0 && availableIn() > 0) setAvailableIn(0)
      setIsAvailable(now.getTime() - last.getTime() > focusInterval)
    }, precision)

    onCleanup(function () {
      clearInterval(interval)
    })

    return [isAvailable, availableIn]
  }

  /**
   * Returns the expiration date of the current key.
   * If the item is not in the cache, it will return undefined.
   */
  function localExpiration(): Date | undefined {
    const key = keyMemo()
    if (!key) return undefined

    return expiration(key)
  }

  /**
   * Creates a signal that every given pricesion interval
   * will determine if the current key is currently expired / stale
   * and how many time needs to pass till its considered expired / stale.
   * This function helps creating
   * the controlled sigal on demand rather than creating
   * arbitrary signals ourselves just in case.
   * Return value is [isStale, staleIn]
   */
  function createStale(precision: number): [Accessor<boolean>, Accessor<number>] {
    const now = new Date()
    const initialKey = keyMemo()

    let initialIsStale = true
    let initialStaleIn = 0

    if (initialKey) {
      const expiresAt = expiration(initialKey)
      if (expiresAt) {
        const expirationIn = expiresAt.getTime() - now.getTime()
        if (expirationIn >= 0) initialStaleIn = expirationIn
        initialIsStale = expiresAt.getTime() < now.getTime()
      }
    }

    const [isStale, setIsStale] = createSignal(initialIsStale)
    const [staleIn, setStaleIn] = createSignal(initialStaleIn)

    createEffect(
      on(keyMemo, () => {
        const key = keyMemo()
        const interval = setInterval(function () {
          if (!key) return
          const expiresAt = expiration(key)
          if (expiresAt) {
            const now = new Date()
            const expirationIn = expiresAt.getTime() - now.getTime()
            if (expirationIn >= 0) setStaleIn(expirationIn)
            else if (expirationIn < 0 && staleIn() > 0) setStaleIn(0)
            setIsStale(expiresAt.getTime() < now.getTime())
          }
        }, precision)

        onCleanup(function () {
          clearInterval(interval)
        })
      })
    )

    return [isStale, staleIn]
  }

  createEffect(
    on(keyMemo, () => {
      setIsRefetching(false)
      const key = keyMemo()
      if (!key) return

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
        if (!item.loading) {
          if (transition) transition(() => actions.refetch(promise))
          else actions.refetch(promise)
        }
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
  )

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
      lastFocus,
      createFocusAvailable,
      expiration: localExpiration,
      createStale,
    },
  ]
}
