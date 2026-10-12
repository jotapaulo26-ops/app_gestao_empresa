'use client';

import React, { useState } from 'react';
import { Store, PlusCircle, LogIn, Sparkles, CheckCircle2, AlertCircle, Smartphone } from 'lucide-react';

interface LojaSeletorModalProps {
  isOpen: boolean;
  onLojaSelecionada: (codigoLoja: string, nomeLoja: string) => void;
  onClose?: () => void;
  permiteFechar?: boolean;
}

export default function LojaSeletorModal({
  isOpen,
  onLojaSelecionada,
  onClose,
  permiteFechar = false,
}: LojaSeletorModalProps) {
  const [modo, setModo] = useState<'CRIAR' | 'CONECTAR'>('CRIAR');
  const [nomeLoja, setNomeLoja] = useState('');
  const [codigoLoja, setCodigoLoja] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleGerarCodigo = (nome: string) => {
    setNomeLoja(nome);
    if (modo === 'CRIAR' && nome.trim()) {
      const sugerido = nome
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setCodigoLoja(sugerido);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const codigoLimpo = (codigoLoja || nomeLoja || '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9_-]/g, '-');

    if (!codigoLimpo) {
      setErrorMsg('Informe um código para a loja (ex: MANU-DOCES).');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/lojas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigoLoja: codigoLimpo,
          nomeLoja: nomeLoja.trim() || codigoLimpo,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro ao conectar à loja');
      }

      const idFinal = data.loja.id;
      const nomeFinal = data.loja.nomeLoja;

      if (typeof window !== 'undefined') {
        localStorage.setItem('erp_usuario_loja_id', idFinal);
        localStorage.setItem('erp_loja_codigo', idFinal);
      }

      onLojaSelecionada(idFinal, nomeFinal);
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao processar loja.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Cabeçalho */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-neon-green">
            <Store className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-white tracking-wide uppercase">
            Identificação da Loja
          </h2>
          <p className="text-xs text-zinc-400">
            Cada aparelho pode ter sua loja exclusiva ou compartilhar a mesma digitando o mesmo código.
          </p>
        </div>

        {/* Alternador de Modo */}
        <div className="grid grid-cols-2 p-1 bg-zinc-900 rounded-2xl border border-zinc-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setModo('CRIAR');
              setErrorMsg('');
            }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              modo === 'CRIAR'
                ? 'bg-emerald-500 text-black shadow-neon-green font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Criar Nova Loja</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModo('CONECTAR');
              setErrorMsg('');
            }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              modo === 'CONECTAR'
                ? 'bg-cyan-500 text-black shadow-neon-cyan font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Já Tenho Código</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {modo === 'CRIAR' ? (
            <>
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Nome da Sua Loja / Negócio *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Doces da Manu ou Loja do João"
                  value={nomeLoja}
                  onChange={(e) => handleGerarCodigo(e.target.value)}
                  className="w-full text-xs p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Código de Acesso da Loja *</span>
                  <span className="text-[10px] text-emerald-400 font-normal">Fácil de lembrar</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: MANU-DOCES"
                  value={codigoLoja}
                  onChange={(e) => setCodigoLoja(e.target.value.toUpperCase())}
                  className="w-full text-xs p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-emerald-400 font-mono font-black focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  Use esse código se quiser abrir sua loja em outro celular no futuro.
                </p>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Digite o Código da Loja *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: MANU-DOCES ou JOAO-DOCES"
                value={codigoLoja}
                onChange={(e) => setCodigoLoja(e.target.value.toUpperCase())}
                className="w-full text-xs p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-cyan-400 font-mono font-black focus:outline-none focus:border-cyan-500"
              />
              <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-cyan-400 shrink-0" />
                <span>Conecta este aparelho instantaneamente à loja existente.</span>
              </p>
            </div>
          )}

          <div className="pt-2 flex items-center gap-2">
            {permiteFechar && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold transition-all"
              >
                Cancelar
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl text-black font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 ${
                modo === 'CRIAR'
                  ? 'bg-emerald-500 hover:bg-emerald-400 shadow-neon-green'
                  : 'bg-cyan-500 hover:bg-cyan-400 shadow-neon-cyan'
              }`}
            >
              {loading
                ? 'Conectando...'
                : modo === 'CRIAR'
                ? 'Criar Loja e Entrar'
                : 'Acessar Loja'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
