import React from 'react';

// Without this, any uncaught render error anywhere in the tree unmounts the
// whole app with zero visible output — a silent black screen. This shows
// the actual error message instead, so a real bug is diagnosable in the UI
// itself without needing devtools access.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Uncaught render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'monospace' }}>
          <div style={{ maxWidth: 700 }}>
            <h1 style={{ color: '#ef4444', fontSize: '1.4rem', marginBottom: '1rem' }}>Something crashed</h1>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#141414', padding: '1rem', borderRadius: 12, fontSize: '0.85rem', color: '#f87171' }}>
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
            <button
              onClick={() => { this.setState({ error: null }); window.location.href = '/'; }}
              style={{ marginTop: '1.5rem', padding: '0.8rem 1.5rem', borderRadius: 100, background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
