/** App-level error boundary with GA4 crash reporting and recovery action. */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { track } from '../lib/analytics';
import { Button, Card } from './ui';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    track('react_error', {
      message: error.message,
      componentStack: info.componentStack?.slice(0, 300),
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-lg p-6">
          <Card className="text-center">
            <h1 className="font-display text-xl font-semibold text-white">Something went wrong</h1>
            <p className="mt-2 text-sm text-mist-500">{this.state.message}</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Reload VayuSense
            </Button>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}
