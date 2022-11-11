import { Component, Suspense, ErrorBoundary } from 'solid-js'
// import PostView from './PostView'
import Test from './Test'
// import SinglePost from './SinglePost'

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
        <Test />
        {/* <PostView /> */}
        {/* <SinglePost id={1} /> */}
      </Suspense>
    </ErrorBoundary>
  )
}

export default App
