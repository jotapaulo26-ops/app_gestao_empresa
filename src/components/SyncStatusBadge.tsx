'use client';

import React, { useState, useEffect } from 'react';
import { Cloud, CloudUpload, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { syncService, StatusSincronizacao } from '@/lib/syncService';

export default function SyncStatusBadge() {
  const [status, setStatus] = useState<StatusSincronizacao>('SINCRONIZADO');
  const [pendentes, setPendentes] = useState<number>(0);
  const [ultimoBackup, setUltimoBackup] = useState<string | null>(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [sincronizandoManual, setSincronizandoManual] = useState(false);

  useEffect(() => {
    const unsubscribe = syncService.subscribe((novoStatus, qtdPendentes, ultimoBkp) => {
      setStatus(novoStatus);
      setPendentes(qtdPendentes);
      if (ultimoBkp) setUltimoBackup(ultimoBkp);
    });
    return () => unsubscribe();
  }, []);

  const handleForcarSync = async () => {
    setSincronizandoManual(true);
    await syncService.forcarSincronizacao();
    setTimeout(() => {
      setSincronizandoManual(false);
    }, 600);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setMenuAberto(!menuAberto)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all active:scale-95 bg-zinc-900/90"
        title="Status de Sincronização e Backup em Nuvem"
      >
        {status === 'SINCRONIZADO' && (
          <div className="flex items-center gap-1.5 text-emerald-400 border-emerald-500/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline text-[10px] text-zinc-300">Nuvem OK</span>
          </div>
        )}

        {(status === 'SINCRONIZANDO' || status === 'PENDENTE') && (
          <div className="flex items-center gap-1.5 text-amber-400 border-amber-500/30">
            <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span className="text-[10px] text-amber-300">
              {pendentes > 0 ? `${pendentes} pendente${pendentes > 1 ? 's' : ''}` : 'Salvando...'}
            </span>
          </div>
        )}

        {status === 'OFFLINE' && (
          <div className="flex items-center gap-1.5 text-zinc-400 border-zinc-700">
            <span className="h-2 w-2 rounded-full bg-amber-500/80"></span>
            <CloudOff className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline text-[10px] text-zinc-400">Offline (Celular)</span>
          </div>
        )}
      </button>

      {/* Popover com Detalhes ao Clicar */}
      {menuAberto && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuAberto(false)}
          />
          <div className="absolute right-0 mt-2 w-64 p-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl z-50 text-xs text-white font-sans space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
              <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                <CloudUpload className="w-4 h-4 text-emerald-400" /> Armazenamento
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                Local-First
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Seus dados estão protegidos e salvos no <strong className="text-zinc-200">armazenamento interno do seu celular</strong>.
            </p>

            <div className="p-2 bg-zinc-900 rounded-xl space-y-1 text-[11px]">
              <div className="flex justify-between text-zinc-400">
                <span>Status da Nuvem:</span>
                <span className={status === 'SINCRONIZADO' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {status === 'SINCRONIZADO' ? '100% Atualizada' : status === 'OFFLINE' ? 'Salvo no Celular' : 'Sincronizando...'}
                </span>
              </div>
              {ultimoBackup && (
                <div className="flex justify-between text-zinc-400">
                  <span>Último backup:</span>
                  <span className="text-zinc-200 font-mono">{ultimoBackup}</span>
                </div>
              )}
              {pendentes > 0 && (
                <div className="flex justify-between text-amber-400 font-bold">
                  <span>Alterações no celular:</span>
                  <span>{pendentes}</span>
                </div>
              )}
            </div>

            <button
              onClick={handleForcarSync}
              disabled={sincronizandoManual}
              className="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold rounded-xl border border-emerald-500/40 flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sincronizandoManual ? 'animate-spin' : ''}`} />
              {sincronizandoManual ? 'Sincronizando...' : 'Sincronizar Nuvem Agora'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
