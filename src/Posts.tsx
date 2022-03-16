import { Component, createSignal, Show, Suspense } from 'solid-js'
import Post from './Post'

interface Post {
  id: number
  title: string
}

const Posts: Component = () => {
  const [opened, setOpened] = createSignal<number | undefined>(1)

  return (
    <>
      <ul>
        <li>
          <button onClick={() => setOpened(1)}>Open 1</button>
          <Show when={opened() === 1}>
            <Suspense fallback={<div>Loading post...</div>}>
              <Post id={1} />
            </Suspense>
          </Show>
        </li>
        <li>
          <button onClick={() => setOpened(2)}>Open 2</button>
          <Show when={opened() === 2}>
            <Suspense fallback={<div>Loading post...</div>}>
              <Post id={2} />
            </Suspense>
          </Show>
        </li>
        {/* <For each={posts() ?? []}>
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
        </For> */}
      </ul>
    </>
  )
}

export default Posts
