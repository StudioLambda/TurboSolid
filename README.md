# Turbo Solid

> Lightweight asynchronous data management for solid

## Installation

```
npm i turbo-solid
```

## Features

- Less than 3KB (gzip)
- Same API as `createResource`.
- Typescript support out of the box.
- `<Suspense>` support.
- On connect refetching.
- On focus refetching.
- Dependent fetching using a function as key.
- Request deduping.
- Optimistic mutation.
- Manual refetching.
- Automatic refetching upon key change.
- Data synchronization (using keys).
- Keys can throw or return false/null if data is not yet ready.
- Additional controls like `isRefetching` or `lastFocus`.
- Additional optional signals like `isStale` or `isAvailable`.
- All available options from [Turbo Query](https://github.com/StudioLambda/TurboQuery).

## Documentation

While this doucment highlights some basics, it's recommended to read the [Documentation](https://erik.cat/post/turbo-solid-lightweight-asynchronous-data-management-for-solid)

## Walk-Through

Turbo Solid uses [Turbo Query](https://github.com/StudioLambda/TurboQuery) under the hood,
and therefore it needs to be configured first. You'll need to supply a turbo query instance
to turbo solid. You can provide this configuration by using the context API. You can also
provide an existing turbo query instance if you already had one created, the options will be
passed to its query function on demand.

```tsx
import { TurboContext } from 'turbo-solid'

const App = () => {
  const configuration = {
    // Available configuration options:
    // https://erik.cat/post/turbo-solid-lightweight-asynchronous-data-management-for-solid#configuration
  }

  return (
    <TurboContext.Provide value={configuration}>
      {/* You probably want Suspense somewhere down in MyApp */}
      {/* This is just a demo to show its support */}
      <Suspense>
        <MyApp />
      </Suspense>
    </TurboContext.Provide>
  )
}
```

It's also possible not to use the context API and instead rely on the global turbo query instance
exposed on `turbo-solid`. You can therefore also configure the default instance if needed:

```tsx
import { configure } from 'turbo-solid'

configure({
  // Available configuration options:
  // https://erik.cat/post/turbo-solid-lightweight-asynchronous-data-management-for-solid#configuration
})
```

After the configuration has been setup, you can already start using turbo solid. To begin using it,
you can import `createTurboResource` from `turbo-solid`. The API is very similar to the existing
`createResource` from `solid-js`.

```tsx
import { For } from 'solid-js'
import { createTurboResource } from 'turbo-solid'

interface ISimplePost {
  title: string
}

const Posts = () => {
  const [posts] = createTurboResource<ISimplePost[]>(
    () => 'https://jsonplaceholder.typicode.com/posts'
  )

  return (
    <For each={posts() ?? []}>
      <div>{post()!.title}</div>
    </For>
  )
}
```

Awesome! You can learn more about what controls and features you gain over `createResource` on the [Documentation](https://erik.cat/post/turbo-solid-lightweight-asynchronous-data-management-for-solid)

## Full Example (Post viewer)

- Create a context with the configuration.

```tsx
// App.tsx
import { TurboContext, Component } from 'turbo-solid'
import PostSelector from './PostSelector'
import { render } from 'solid-js/web'

const App: Component = () => {
  const configuration = {
    async fetcher(key, { signal }) {
      const response = await fetch(key, { signal })
      if (!response.ok) throw new Error('Not a 4XX response')
      return await response.json()
    },
  }

  return (
    <TurboContext.Provider value={configuration}>
      <PostSelector />
    </TurboContext.Provider>
  )
}

render(() => <App />, document.getElementById('root'))
```

- Create a post selector view to determine what post to show

```tsx
// PostSelector.tsx
import { Component, Show, Suspense } from 'solid-js'
import Post from './Post'

const PostSelector: Component = () => {
  const [current, setCurrent] = createSignal(1)

  return (
    <div>
      <input
        type="number"
        min="1"
        value={current()}
        onInput={(e) => setCurrent(parseInt(e.currentTarget.value))}
      />
      <Suspense fallback={<div>Loading post...</div>}>
        <Show when={current() !== NaN}>
          <Post id={current()} />
        </Show>
      </Suspense>
    </div>
  )
}

export default PostSelector
```

- Create the Post component

```tsx
// Post.tsx
import { Component, Show, Suspense } from 'solid-js'
import { createTurboResource } from 'turbo-solid'

interface IPost {
  id: number
  userId: number
  title: string
  body: string
}

const Post: Component<{ id: number }> = (props) => {
  const [post, { isRefetching }] = createTurboResource<IPost>(
    () => `https://jsonplaceholder.typicode.com/posts/${props.id}`
  )

  return (
    <Show when={post()}>
      <div>
        <Show when={isRefetching()}>
          <div>Refetching...</div>
        </Show>
        <h1>{post()!.title}</h1>
        <Suspense fallback={<div>Loading published information...</div>}>
          <PublishedBy userId={post()!.userId} />
        </Suspense>
        <p>{post()!.body}</p>
      </div>
    </Show>
  )
}

export default Post
```

- Create the Published By component.

```tsx
import { Component, Show } from 'solid-js'
import { createTurboResource } from 'turbo-solid'

interface IUser {
  id: number
  name: string
}

const PublishedBy: Component<{ userId: number }> = (props) => {
  const [user] = createTurboResource<IUser>(
    () => `https://jsonplaceholder.typicode.com/users/${props.userId}`
  )

  return (
    <Show when={user()}>
      <h4>Published by {user()!.name}</h4>
    </Show>
  )
}

export default PublishedBy
```

You're done!
