import { Component, createSignal, For, Show, Suspense } from 'solid-js'
import { createTurboResource } from './resource'
import Post from './Post'

interface Post {
  id: number
  title: string
}

const Posts: Component = () => {
  const [posts] = createTurboResource<Post[]>(() => 'https://jsonplaceholder.typicode.com/posts', {
    transition: true,
  })
  const [opened, setOpened] = createSignal<number | undefined>(1)

  return (
    <>
      <ul>
        <For each={posts() ?? []}>
          {(post) => (
            <li>
              <div>
                <button onClick={() => setOpened(post.id)}>View</button> {post.title}
              </div>
              <Show when={opened() === post.id}>
                <Suspense fallback={<div>Loading post...</div>}>
                  <Post id={post.id} />
                </Suspense>
              </Show>
            </li>
          )}
        </For>
      </ul>
    </>
  )
}

export default Posts
