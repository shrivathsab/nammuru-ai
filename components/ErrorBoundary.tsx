'use client';
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackLabel?: string;
}
interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            background: '#0e1a15',
            borderLeft: '4px solid #e53e3e',
            borderRadius: 12,
            padding: 20,
            margin: 16,
          }}
        >
          <p
            style={{
              color: '#e53e3e',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            {this.props.fallbackLabel ?? 'Something went wrong'}
          </p>
          <p
            style={{
              color: '#8a9e96',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 12,
              marginBottom: 12,
            }}
          >
            This section failed to load. Your report data is safe.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              color: '#0F6E56',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 13,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
