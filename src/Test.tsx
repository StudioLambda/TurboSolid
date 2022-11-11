import { Component, createEffect, Show } from 'solid-js'
import { forget, query } from 'turbo-query'
import { createTurboResource } from './resource'

interface User {
  id: number
  name: string
  email: string
}

const NoUser = () => {
  const login = () => {
    query(`https://jsonplaceholder.typicode.com/users/1`)
  }

  return (
    <>
      <div>No User</div>
      <button onClick={login}>Log in</button>
    </>
  )
}

const Test: Component = () => {
  const [user] = createTurboResource<User>(() => `https://jsonplaceholder.typicode.com/users/1`, {
    clearOnForget: true,
    refetchOnConnect: false,
    refetchOnFocus: false,
  })

  createEffect(() => console.log('user', user()))

  const logout = () => {
    forget(`https://jsonplaceholder.typicode.com/users/1`)
  }

  return (
    <>
      <Show when={user()} fallback={<NoUser />}>
        <div>Name: {user()?.name}</div>
        <button onClick={logout}>Logout</button>
      </Show>
    </>
  )
}

export default Test
