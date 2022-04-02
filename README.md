# Turbo Solid

> Lightweight asynchronous data management for solid

**Documentation is in progress**. To know more check the `src/` folder. It contains enough readable information to get you started.

```
npm i turbo-solid
```

## Features

- 2.5KB (gzip)
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

interface Post {
  title: string
}

const Posts = () => {
  const [post] = createTurboResource<Post>(() => 'https://jsonplaceholder.typicode.com/posts')

  return <For each={posts() ?? []}>{(post) => <div>{post.title}</div>}</For>
}
```

Awesome! You can learn more about what controls and features you gain over `createResource` on the [Documentation](https://erik.cat/post/turbo-solid-lightweight-asynchronous-data-management-for-solid)

## Full Example

```tsx
import { Component, Show } from 'solid-js'
import { createTurboResource } from 'turbo-solid'

interface User {
  id: number
  name: string
}

const PublishedBy: Component<{ userId: number }> = (props) => {
  const [user] = createTurboResource<User>(
    () => `https://jsonplaceholder.typicode.com/users/${props.userId}`
  )

  return <Show when={user()}>{(user) => <h4>Published by {user.name}</h4>}</Show>
}

interface Post {
  id: number
  userId: number
  title: string
  body: string
}

const Post: Component<{ id: number }> = (props) => {
  const [post, { isRefetching }] = createTurboResource<Post>(
    () => `https://jsonplaceholder.typicode.com/posts/${props.id}`
  )

  return (
    <Show when={post()}>
      {(post) => (
        <div>
          <Show when={isRefetching()}>
            <div>Refetching...</div>
          </Show>
          <h1>{post.title}</h1>
          <Suspense fallback={<div>Loading published information...</div>}>
            <PublishedBy userId={post.userId} />
          </Suspense>
          <p>{post.body}</p>
        </div>
      )}
    </Show>
  )
}

const App: Component = () => {
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
```
