import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-void-900 p-6">
        <div className="glass-card rounded-2xl border border-plasma-400/20 p-10 max-w-md w-full text-center"
          style={{ boxShadow: '0 0 40px rgba(255,77,109,0.08)' }}>
          <div className="w-16 h-16 rounded-2xl bg-plasma-400/10 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle size={28} className="text-plasma-400" />
          </div>
          <h2 className="font-display font-bold text-xl text-white mb-2">Something went wrong</h2>
          <p className="text-white/40 text-sm font-body mb-6 leading-relaxed">
            An unexpected error occurred. This has been noted.
            {import.meta.env.DEV && this.state.error && (
              <span className="block mt-3 text-xs text-plasma-400/70 font-mono text-left bg-black/30 rounded-lg p-3">
                {this.state.error.message}
              </span>
            )}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = '/dashboard';
            }}
            className="btn-primary flex items-center gap-2 mx-auto">
            <RefreshCw size={14} />
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }
}
