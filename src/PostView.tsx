import { Component, createSignal, Suspense, Show } from 'solid-js'
import { createTurboResource } from './resource'

interface User {
  id: number
  name: string
}

interface Post {
  id: number
  userId: number
  title: string
  body: string
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

const PostView: Component = () => {
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

export default PostView
