'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Sparkles } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou uma falha não tratada:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-md mx-auto p-6 my-8 bg-zinc-950 border border-rose-500/30 rounded-3xl text-center space-y-4 shadow-neon-pink">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-neon-pink">
            <AlertCircle className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              {this.props.fallbackTitle || 'Ocorreu uma instabilidade neste módulo'}
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Seus dados locais continuam seguros e salvos. Clique abaixo para restabelecer a tela.
            </p>
          </div>

          {this.state.error?.message && (
            <p className="text-[11px] font-mono text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-900/50 break-words text-left">
              {this.state.error.message}
            </p>
          )}

          <button
            onClick={this.handleRetry}
            className="w-full py-3 px-4 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-neon-pink transition-all active:scale-98"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Recarregar Módulo</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
