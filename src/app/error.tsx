'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Home } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Capturado pelo ErrorBoundary do ERP:', error);
  }, [error]);

  const handleResetCache = () => {
    if (typeof window !== 'undefined') {
      try {
        indexedDB.deleteDatabase('ErpPdvManuLocalDB');
      } catch {}
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-black text-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-zinc-950 border border-rose-500/40 rounded-3xl p-6 space-y-4 shadow-[0_0_30px_rgba(255,42,133,0.25)] text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(255,42,133,0.3)]">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-black text-white">Recuperação do Sistema</h2>
          <p className="text-xs text-zinc-400">
            Ocorreu uma oscilação na renderização. Seus dados estão preservados.
          </p>
        </div>

        {error?.message && (
          <div className="p-3 bg-zinc-900/90 rounded-2xl border border-zinc-800 text-left">
            <span className="text-[10px] text-zinc-500 uppercase font-mono block">Detalhe Técnico:</span>
            <p className="text-xs font-mono text-rose-300 break-words mt-0.5">
              {error.message}
            </p>
          </div>
        )}

        <div className="space-y-2 pt-2">
          <button
            onClick={() => reset()}
            className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,255,136,0.3)] active:scale-95 transition-all"
          >
            <RefreshCw className="w-4 h-4" /> Tentar Novamente
          </button>

          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-2xl border border-zinc-800 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Home className="w-4 h-4 text-cyan-400" /> Recarregar ERP
          </button>

          <button
            onClick={handleResetCache}
            className="w-full py-2.5 px-4 text-zinc-500 hover:text-rose-400 text-[11px] font-mono flex items-center justify-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Limpar cache local corrompido
          </button>
        </div>
      </div>
    </div>
  );
}
