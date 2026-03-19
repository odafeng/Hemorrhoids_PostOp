// Page-level error boundary — catches errors within a single page
// Unlike the app-level ErrorBoundary, this allows navigating to other pages

import { Component } from 'react';

export default class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[PageError]', error, errorInfo?.componentStack?.slice(0, 300));
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <div style={{ textAlign: 'center', maxWidth: '280px' }}>
            <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>😵</div>
            <p style={{ color: 'var(--danger)', marginBottom: 'var(--space-xs)', fontWeight: 600 }}>
              此頁面發生錯誤
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)', marginBottom: 'var(--space-md)' }}>
              {this.state.error?.message?.slice(0, 80) || '未知錯誤'}
            </p>
            <button
              className="btn btn-secondary"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              重試
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
