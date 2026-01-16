/**
 * Error Boundary Component
 * 
 * Catches React component errors and displays a fallback UI
 * Prevents white screen of death on unhandled errors
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console (in development) or error tracking service (production)
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // Store error for debugging on page
    if (!window.__errorLog) {
      window.__errorLog = [];
    }
    window.__errorLog.push({
      component: 'ErrorBoundary',
      timestamp: new Date().toISOString(),
      message: error.message,
      error: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
    
    this.setState({
      error,
      errorInfo
    });

    // TODO: Send to error tracking service (e.g., Sentry)
    // if (import.meta.env.PROD) {
    //   Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
    // }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 md:p-12 text-center space-y-6">
              {/* Error Icon */}
              <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-[24px] flex items-center justify-center">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>

              {/* Error Message */}
              <div className="space-y-3">
                <h1 className="text-3xl font-black text-white">
                  Something went wrong
                </h1>
                <p className="text-slate-400 text-lg font-medium">
                  We encountered an unexpected error. Don't worry, your data is safe.
                </p>
              </div>

              {/* Error Details - Always visible for debugging */}
              {this.state.error && (
                <details className="text-left bg-slate-950 border border-red-900/50 rounded-xl p-4" open>
                  <summary className="cursor-pointer text-sm font-bold text-red-400 mb-3">
                    ⚠️ Error Details (Click to collapse)
                  </summary>
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-bold text-slate-400 mb-1">Error Message:</div>
                      <pre className="text-xs text-red-300 overflow-auto max-h-32 bg-slate-900 p-2 rounded">
{this.state.error.toString()}
                      </pre>
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <div className="text-xs font-bold text-slate-400 mb-1">Stack Trace:</div>
                        <pre className="text-xs text-slate-400 overflow-auto max-h-40 bg-slate-900 p-2 rounded">
{this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <div className="text-xs font-bold text-slate-400 mb-1">Component Stack:</div>
                        <pre className="text-xs text-slate-500 overflow-auto max-h-40 bg-slate-900 p-2 rounded">
{this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <button
                  onClick={this.handleReset}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
                
                <button
                  onClick={this.handleReload}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </button>
              </div>

              {/* Support Link */}
              <p className="text-sm text-slate-500 pt-4">
                If this problem persists, please contact{' '}
                <a 
                  href="mailto:support@mail.eventnexus.eu" 
                  className="text-indigo-400 hover:text-indigo-300 underline"
                >
                  support@mail.eventnexus.eu
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
