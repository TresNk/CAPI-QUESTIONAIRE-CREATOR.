import { Component, ReactNode, ErrorInfo } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo?: ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error | null; errorInfo?: ErrorInfo }>;
  onError?: (error: Error, errorInfo?: ErrorInfo) => void;
}

/**
 * Error Boundary component to catch and handle React rendering errors
 * Prevents entire app from crashing when a single component fails
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: undefined
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console (in production, send to error tracking service)
    console.error('Error caught by boundary:', error, errorInfo);
    
    this.setState({ errorInfo });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  reset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: undefined
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback component if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} errorInfo={this.state.errorInfo} />;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-slate-800 rounded-xl border border-red-800/50 p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-red-300 mb-2">
                  Something went wrong
                </h2>
                <p className="text-slate-400 text-sm mb-4">
                  An error occurred while rendering this part of the application. 
                  You can try to recover or report this issue.
                </p>
                
                {this.state.error && (
                  <div className="bg-slate-900/50 rounded-lg p-3 mb-4 max-h-48 overflow-y-auto">
                    <p className="text-red-400 text-xs font-mono break-words">
                      {this.state.error.toString()}
                    </p>
                  </div>
                )}

                {this.state.errorInfo && (
                  <details className="mb-4">
                    <summary className="text-slate-400 text-xs cursor-pointer hover:text-slate-300">
                      Show error details
                    </summary>
                    <pre className="mt-2 text-xs text-slate-500 font-mono whitespace-pre-wrap break-words bg-slate-900/50 p-2 rounded">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={this.reset}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Reload Page
                  </button>
                  <button
                    onClick={() => {
                      // Clear any corrupted localStorage data
                      localStorage.removeItem('capi-builder-questionnaire');
                      window.location.reload();
                    }}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium"
                    title="Clear saved data and reload"
                  >
                    Clear Data & Reload
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
