/* @refresh reload */
import { render } from 'solid-js/web'
import App from './App'
import { configure } from 'turbo-query'

configure({
  async fetcher(key) {
    await new Promise((r) => setTimeout(r, 1000))
    const response = await fetch(key)
    if (!response.ok) throw new Error('Invalid response')
    return response.json()
  },
})

render(() => <App />, document.getElementById('root') as HTMLElement)
