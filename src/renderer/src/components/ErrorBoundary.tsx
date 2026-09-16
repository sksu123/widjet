import React from 'react'

export class ErrorBoundary extends React.Component<any, { hasError: boolean, error: any, info: any }> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null, info: null }
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }

  componentDidCatch(error: any, info: any) {
    this.setState({ error, info })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red', background: 'white', height: '100%', overflow: 'auto' }}>
          <h2>Something went wrong in RuleAi.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.info && this.state.info.componentStack}
          </details>
        </div>
      )
    }
    return this.props.children
  }
}
