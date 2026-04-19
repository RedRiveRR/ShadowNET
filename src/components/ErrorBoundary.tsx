import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ShadowNet] Component crash caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: '#000',
          color: '#ef4444', fontFamily: 'monospace', gap: '16px', padding: '40px', textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem' }}>⚠</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '2px' }}>
            SYSTEM FAILURE — MODULE CRASH
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', maxWidth: '500px', lineHeight: '1.6' }}>
            {this.state.error?.message || 'An unknown error occurred in a ShadowNet subsystem.'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: '16px', padding: '10px 24px', borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444',
              color: '#fca5a5', cursor: 'pointer', fontFamily: 'monospace',
              fontWeight: 'bold', fontSize: '0.8rem', letterSpacing: '1px'
            }}
          >
            REBOOT MODULE
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
