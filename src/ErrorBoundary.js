import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[Krushiverse ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) return this.props.fallback;
      return (
        <div style={{
          padding: '10px 14px',
          background: '#fff8e1',
          border: '1px solid #ffe082',
          borderRadius: 10,
          color: '#795548',
          fontSize: 13
        }}>
          ⚠️ हे feature आत्ता उपलब्ध नाही. Chat चालू आहे.
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{ marginLeft: 10, cursor: 'pointer', background: 'none', border: '1px solid #795548', borderRadius: 6, padding: '2px 8px', fontSize: 12 }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;