'use client';

import React, { useState, useEffect } from 'react';
import { Cloud, CloudUpload, CloudOff, RefreshCw, CheckCircle2, Trash2, Clock, ChevronDown, HardDrive } from 'lucide-react';
import { syncService, StatusSincronizacao } from '@/lib/syncService';

export default function SyncStatusBadge() {
  const [status, setStatus] = useState<StatusSincronizacao>('SINCRONIZADO');
  const [pendentes, setPendentes] = useState<number>(0);
  const [ultimoBackup, setUltimoBackup] = useState<string | null>(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [sincronizandoManual, setSincronizandoManual] = useState(false);
  const [sucessoMsg, setSucessoMsg] = useState(false);

  useEffect(() => {
    const unsubscribe = syncService.subscribe((novoStatus, qtdPendentes, ultimoBkp) => {
      setStatus(novoStatus);
      setPendentes(qtdPendentes);
      if (ultimoBkp) setUltimoBackup(ultimoBkp);
    });
    return () => unsubscribe();
  }, []);

  const handleForcarSync = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (sincronizandoManual || status === 'SINCRONIZANDO') return;

    setSincronizandoManual(true);
    try {
      await syncService.forcarSincronizacao();
      setSucessoMsg(true);
      setTimeout(() => setSucessoMsg(false), 2500);
    } catch (err) {
      console.warn('Erro ao sincronizar manualmente:', err);
    } finally {
      setSincronizandoManual(false);
    }
  };

  const handleLimparFila = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm('Deseja limpar as pendências da fila de sincronização?')) {
      await syncService.limparFila();
      setMenuAberto(false);
    }
  };

  const estaSincronizando = status === 'SINCRONIZANDO' || sincronizandoManual;

  return (
    <div className="relative inline-flex items-center">
      <div className="flex items-center rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950/90 shadow-md">
        {/* Botão Principal: Sincronizar Nuvem com 1 clique */}
        <button
          onClick={handleForcarSync}
          disabled={estaSincronizando}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-60 ${
            estaSincronizando
              ? 'bg-cyan-500/20 text-cyan-300'
              : pendentes > 0
              ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
              : sucessoMsg
              ? 'bg-emerald-500/20 text-emerald-300'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white'
          }`}
          title="Clique para sincronizar com a nuvem agora"
        >
          {estaSincronizando ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span>Sincronizando{pendentes > 0 ? ` (${pendentes})` : '...'}</span>
            </>
          ) : pendentes > 0 ? (
            <>
              <CloudUpload className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Sincronizar Nuvem</span>
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black">
                {pendentes}
              </span>
            </>
          ) : sucessoMsg ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Sincronizado!</span>
            </>
          ) : status === 'OFFLINE' ? (
            <>
              <CloudOff className="w-3.5 h-3.5 text-zinc-400" />
              <span>Offline (Disco)</span>
            </>
          ) : (
            <>
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sincronizar Nuvem</span>
            </>
          )}
        </button>

        {/* Botão de Opções / Detalhes de Armazenamento */}
        <button
          onClick={() => setMenuAberto(!menuAberto)}
          className="px-1.5 py-1.5 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-l border-zinc-800 transition-colors"
          title="Detalhes de armazenamento e fila"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Popover com Detalhes ao Clicar na Seta */}
      {menuAberto && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuAberto(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-72 p-4 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl z-50 text-xs text-white font-sans space-y-3 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
              <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-emerald-400" /> Armazenamento Local
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                Disco Local Ativo
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Todas as informações são salvas diretamente no <strong className="text-zinc-200">disco rígido local (IndexedDB + SQLite/JSON)</strong>. A nuvem é acionada <strong className="text-zinc-200">apenas ao clicar no botão</strong>.
            </p>

            <div className="p-2.5 bg-zinc-900/80 rounded-xl space-y-1.5 text-[11px] border border-zinc-900">
              <div className="flex justify-between text-zinc-400">
                <span>Modo de sincronização:</span>
                <span className="text-amber-400 font-bold">Manual sob demanda</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Status da Nuvem:</span>
                <span className={status === 'SINCRONIZADO' ? 'text-emerald-400 font-bold' : status === 'OFFLINE' ? 'text-zinc-400' : 'text-cyan-400 font-bold'}>
                  {status === 'SINCRONIZADO' ? 'Atualizada' : status === 'OFFLINE' ? 'Offline' : status === 'SINCRONIZANDO' ? 'Enviando...' : 'Pendente'}
                </span>
              </div>
              {ultimoBackup && (
                <div className="flex justify-between text-zinc-400">
                  <span>Última sincronização:</span>
                  <span className="text-zinc-200 font-mono">{ultimoBackup}</span>
                </div>
              )}
              {pendentes > 0 && (
                <div className="flex justify-between text-amber-400 font-bold">
                  <span>Itens aguardando envio:</span>
                  <span>{pendentes}</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5 pt-1">
              <button
                onClick={(e) => {
                  handleForcarSync(e);
                  setMenuAberto(false);
                }}
                disabled={estaSincronizando}
                className="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold rounded-xl border border-emerald-500/40 flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${estaSincronizando ? 'animate-spin' : ''}`} />
                {estaSincronizando ? 'Sincronizando...' : 'Sincronizar Nuvem Agora'}
              </button>

              {pendentes > 0 && (
                <button
                  onClick={handleLimparFila}
                  className="w-full py-1.5 bg-zinc-900 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 text-[10px] font-bold rounded-xl border border-zinc-800 transition-all flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Limpar Fila Travada</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
