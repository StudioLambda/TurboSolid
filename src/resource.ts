import {
  TurboQueryOptions,
  TurboQuery,
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
}

/**
 * The actions available on a turbo resource.
 */
export interface TurboSolidResourceActions<T> {
  /**
   * Performs a local mutation of the data.
   * This also broadcasts it to all other key listeners.
   */
  mutate(value: T | ((old: T) => T)): void

  /**
   * Performs a refetching of the resource.
   * This also broadcasts it to all other key listeners.
   */
  refetch(): void

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
export type TurboSolidKeyType = string | false | null

/**
 * The type of a turbo solid key. Accepting a resolver function.
 */
export type TurboSolidKey = TurboSolidKeyType | (() => TurboSolidKeyType)

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
    if (typeof t === 'boolean') {
      return t ? startTransition : undefined
    }
    return t
  }

  /**
   * Creates the memorized key.
   */
  const keyMemo = createMemo<TurboSolidKeyType>(function () {
    if (typeof key === 'function') {
      try {
        return key()
      } catch {
        return null
      }
    }
    return key
  })

  const contextOptions = useContext<TurboSolidResourceOptions | undefined>(TurboContext)
  const subscribe = options?.turbo?.subscribe ?? contextOptions?.turbo?.subscribe ?? turboSubscribe
  const query = options?.turbo?.query ?? contextOptions?.turbo?.query ?? turboQuery
  const mutate = options?.turbo?.mutate ?? contextOptions?.turbo?.mutate ?? turboMutate
  const forget = options?.turbo?.forget ?? contextOptions?.turbo?.forget ?? turboForget
  const abort = options?.turbo?.abort ?? contextOptions?.turbo?.abort ?? turboAbort
  const transition = getTransition(options?.transition ?? contextOptions?.transition)

  /**
   * Creates the underlying async resource.
   */
  const [item, actions] = createResource<T, string>(keyMemo, function (k, { refetching }) {
    return refetching instanceof Promise
      ? (refetching as Promise<T>)
      : query<T>(k, { stale: true, ...contextOptions, ...options })
  })

  let unsubscribeMutations: undefined | (() => void) = undefined
  let unsubscribeRefetching: undefined | (() => void) = undefined

  createEffect(() => {
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
      if (transition) transition(() => actions.refetch(promise))
      else actions.refetch(promise)
    })

    /**
     * Unsubscribes the current listeners to avoid memory leaks.
     */
    onCleanup(function () {
      unsubscribeMutations?.()
      unsubscribeRefetching?.()
    })
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
   */
  function localRefetch(): void {
    const key = keyMemo()
    if (!key) return
    const promise = query<T>(key, { stale: false, ...contextOptions, ...options })
    if (transition) transition(() => actions.refetch(promise))
    else actions.refetch(promise)
  }

  /**
   * Unsibscribes the event listeners. If createResource was
   * used outside of a component, this method will need to be
   * called manually when it's no longer needed.
   */
  function localUnsubscribe(): void {
    unsubscribeMutations?.()
    unsubscribeRefetching?.()
  }

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
    },
  ]
}
