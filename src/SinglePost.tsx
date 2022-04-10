import { Component, Show } from 'solid-js'
import { createTurboResource } from './resource'

interface Post {
  id: number
  userId: number
  title: string
  body: string
}

interface Props {
  id: number
}

const TurboPost: Component<Props> = (props) => {
  const [post, { refetch, isRefetching }] = createTurboResource<Post>(
    () => `https://jsonplaceholder.typicode.com/posts/${props.id}`
  )

  return (
    <div>
      <Show when={post()}>
        {(post) => (
          <>
            <Show when={isRefetching()}>
              <p>Refetching...</p>
            </Show>
            <h3>{post.title}</h3>
            <p>{post.body}</p>
            <button onClick={() => refetch()}>Refresh</button>
          </>
        )}
      </Show>
    </div>
  )
}

export default TurboPost
