import { Component, Suspense, ErrorBoundary } from 'solid-js'
import PostView from './PostView'

interface ErrorProps {
  error: Error
  retry(): void
}

const Issue: Component<ErrorProps> = (props) => {
  return (
    <div>
      <div>There was an error: {props.error.message ?? 'Unknown error'}</div>
      <button onClick={() => props.retry()}>Retry</button>
    </div>
  )
}

const App: Component = () => {
  return (
    <ErrorBoundary fallback={(error, retry) => <Issue error={error} retry={retry} />}>
      <Suspense fallback={<div>Loading...</div>}>
        <PostView />
      </Suspense>
    </ErrorBoundary>
  )
}

export default App
