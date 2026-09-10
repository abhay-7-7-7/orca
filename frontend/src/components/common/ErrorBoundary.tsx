import React, { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-charcoal-700 bg-sand-50/50">
          <p className="text-sm font-medium">Map view temporarily unavailable.</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="mt-3 px-3 py-1.5 text-xs bg-charcoal-900 text-cream-100 rounded-lg hover:bg-charcoal-800 transition-colors"
          >
            Retry Map
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
