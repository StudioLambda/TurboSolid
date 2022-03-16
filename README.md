# Turbo Solid

> Lightweight asynchronous data management for solid

**Documentation is in progress**. To know more check the `src/` folder. It contains enough readable information to get you started.

```
npm i turbo-solid
```

## Features

- 2KB (gzip)
- Same API as `createResource`.
- `<Suspense>` support.
- Dependent fetching using a function as key.
- Request deduping.
- Optimistic mutation.
- Manual refetching.
- Automatic refetching upon key change.
- Data synchronization (using keys).
- Keys can be strings or functions (functions can throw or return false/null - and must be used for dependent fetching).
- All available options from [Turbo Query](https://github.com/StudioLambda/TurboQuery).

## Usage

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

  return (
    <Show when={user()}>
      <h4>Published by {user()!.name}</h4>
    </Show>
  )
}

interface Post {
  id: number
  userId: number
  title: string
  body: string
}

const Post: Component<{ id: number }> = (props) => {
  const [post] = createTurboResource<Post>(
    () => `https://jsonplaceholder.typicode.com/posts/${props.id}`
  )

  return (
    <Show when={post()}>
      <div>
        <h1>{post()!.title}</h1>
        <Suspense fallback={<div>Loading published information...</div>}>
          <PublishedBy userId={post()!.userId} />
        </Suspense>
        <p>{post()!.body}</p>
      </div>
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
