import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ info: errorInfo });
    console.error('App error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const err = this.state.error;
      const stack = err?.stack || '';
      const componentStack = this.state.info?.componentStack || '';
      return (
        <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
          <div style={{ textAlign: 'center', maxWidth: 420, padding: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--danger-soft)', color: 'var(--danger)',
              display: 'grid', placeItems: 'center', margin: '0 auto 16px',
              fontSize: 28,
            }}>⚠</div>
            <h2 style={{ marginBottom: 8, color: 'var(--ink)' }}>系統發生錯誤</h2>
            <p style={{ color: 'var(--ink-2)', marginBottom: 16, fontSize: 13 }}>
              {err?.message || '未知錯誤'}
            </p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              重新整理
            </button>
            <details style={{ textAlign: 'left', marginTop: 18, fontSize: 11, color: 'var(--ink-3)' }}>
              <summary style={{ cursor: 'pointer', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                技術細節
              </summary>
              <pre style={{
                whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                background: 'var(--surface-2)', padding: 10, borderRadius: 8,
                marginTop: 8, fontSize: 10, lineHeight: 1.5,
                maxHeight: 240, overflow: 'auto',
              }}>
                {stack.slice(0, 800)}
                {componentStack && '\n\n-- Component stack --\n' + componentStack.slice(0, 600)}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
