import { Component, Show } from 'solid-js'
import { createTurboResource } from './resource'

interface Post {
  id: number
  userId: number
  title: string
  body: string
}

interface User {
  id: number
  name: string
}

interface Props {
  id: number
}

const TurboPost: Component<Props> = (props) => {
  const [post, { refetch }] = createTurboResource<Post>(
    `https://jsonplaceholder.typicode.com/posts/${props.id}`
  )
  const [user] = createTurboResource<User>(
    () => `https://jsonplaceholder.typicode.com/users/${post()!.userId}`
  )

  return (
    <div>
      <Show when={post()}>
        <Show when={user()}>
          <p>{user()!.name}</p>
        </Show>
        <h3>{post()!.title}</h3>
        <p>{post()!.body}</p>
        <button onClick={() => refetch()}>Refresh</button>
      </Show>
    </div>
  )
}

export default TurboPost
