'use client';

import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Store,
  User,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

interface AuthViewProps {
  onLoginSuccess: (dados: {
    usuario: { id: string; nome: string; email: string; lojaId: string; nomeLoja: string };
    token: string;
    lojaId: string;
  }) => void;
}

export default function AuthView({ onLoginSuccess }: AuthViewProps) {
  const [modo, setModo] = useState<'LOGIN' | 'CADASTRO'>('LOGIN');

  // Campos Login
  const [emailLogin, setEmailLogin] = useState('');
  const [senhaLogin, setSenhaLogin] = useState('');
  const [lembrarMe, setLembrarMe] = useState(true);

  // Campos Cadastro
  const [nomeCadastro, setNomeCadastro] = useState('');
  const [nomeLojaCadastro, setNomeLojaCadastro] = useState('');
  const [emailCadastro, setEmailCadastro] = useState('');
  const [senhaCadastro, setSenhaCadastro] = useState('');

  // UI
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailLogin.trim() || !senhaLogin) {
      setErrorMsg('Preencha seu e-mail e senha.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailLogin, senha: senhaLogin }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao realizar login.');

      if (lembrarMe && typeof window !== 'undefined') {
        localStorage.setItem('erp_usuario_token', data.token);
        localStorage.setItem('erp_usuario_loja_id', data.lojaId);
      }

      setSuccessMsg('Login realizado com sucesso! Carregando sua loja...');
      setTimeout(() => {
        onLoginSuccess(data);
      }, 400);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado no login.');
    } finally {
      setLoading(false);
    }
  };

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeCadastro.trim()) {
      setErrorMsg('Informe o seu nome.');
      return;
    }
    if (!nomeLojaCadastro.trim()) {
      setErrorMsg('Informe o nome da sua loja.');
      return;
    }
    if (!emailCadastro.trim() || !emailCadastro.includes('@')) {
      setErrorMsg('Informe um e-mail válido.');
      return;
    }
    if (senhaCadastro.length < 4) {
      setErrorMsg('A senha deve conter no mínimo 4 caracteres.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nomeCadastro,
          nomeLoja: nomeLojaCadastro,
          email: emailCadastro,
          senha: senhaCadastro,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar conta.');

      if (typeof window !== 'undefined') {
        localStorage.setItem('erp_usuario_token', data.token);
        localStorage.setItem('erp_usuario_loja_id', data.lojaId);
      }

      setSuccessMsg('Conta criada com sucesso! Inicializando sua loja zerada...');
      setTimeout(() => {
        onLoginSuccess(data);
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado no cadastro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-slate-100 flex flex-col justify-center px-4 py-8 max-w-md mx-auto selection:bg-emerald-500 selection:text-black">
      {/* Logotipo & Apresentação */}
      <div className="text-center mb-6 space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-zinc-950 border border-emerald-500/40 shadow-[0_0_25px_rgba(0,255,136,0.25)] mb-1">
          <Store className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
          <span>ERP & PDV</span>
          <span className="text-emerald-400 drop-shadow-[0_0_12px_rgba(0,255,136,0.6)]">NEON</span>
        </h1>
        <p className="text-xs text-zinc-400">
          Gestão inteligente de pedidos, crediário, estoque e custos
        </p>
      </div>

      {/* Card Principal */}
      <div className="bg-zinc-950/90 border border-zinc-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Abas Alternadoras (Login / Cadastro) */}
        <div className="grid grid-cols-2 p-1 bg-zinc-900 rounded-2xl mb-6 border border-zinc-800">
          <button
            type="button"
            onClick={() => {
              setModo('LOGIN');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              modo === 'LOGIN'
                ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(0,255,136,0.3)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setModo('CADASTRO');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              modo === 'CADASTRO'
                ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(0,255,136,0.3)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Criar Nova Loja
          </button>
        </div>

        {/* Mensagens de Alerta */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-emerald-400 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* FORMULÁRIO DE LOGIN */}
        {modo === 'LOGIN' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-zinc-400 block mb-1.5 uppercase tracking-wider">
                E-mail de Acesso
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-500" />
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={emailLogin}
                  onChange={(e) => setEmailLogin(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-400 block mb-1.5 uppercase tracking-wider">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-500" />
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={senhaLogin}
                  onChange={(e) => setSenhaLogin(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3.5 top-3.5 text-zinc-500 hover:text-zinc-300"
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-zinc-400 hover:text-zinc-200">
                <input
                  type="checkbox"
                  checked={lembrarMe}
                  onChange={(e) => setLembrarMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-0 accent-emerald-500"
                />
                <span>Lembrar neste aparelho</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-black rounded-2xl text-sm transition-all shadow-[0_0_15px_rgba(0,255,136,0.3)] active:scale-98 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* FORMULÁRIO DE CADASTRO */}
        {modo === 'CADASTRO' && (
          <form onSubmit={handleCadastro} className="space-y-3.5">
            <div>
              <label className="text-[11px] font-bold text-zinc-400 block mb-1 uppercase tracking-wider">
                Seu Nome Completo
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3 text-zinc-500" />
                <input
                  type="text"
                  required
                  placeholder="Ex: Manuela Alcantara"
                  value={nomeCadastro}
                  onChange={(e) => setNomeCadastro(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-400 block mb-1 uppercase tracking-wider">
                Nome da sua Loja / Comércio
              </label>
              <div className="relative">
                <Store className="w-4 h-4 absolute left-3.5 top-3 text-zinc-500" />
                <input
                  type="text"
                  required
                  placeholder="Ex: Ateliê Doce Sabor"
                  value={nomeLojaCadastro}
                  onChange={(e) => setNomeLojaCadastro(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-400 block mb-1 uppercase tracking-wider">
                E-mail para Login
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-zinc-500" />
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={emailCadastro}
                  onChange={(e) => setEmailCadastro(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-400 block mb-1 uppercase tracking-wider">
                Crie uma Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-zinc-500" />
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  required
                  placeholder="Mínimo 4 caracteres"
                  value={senhaCadastro}
                  onChange={(e) => setSenhaCadastro(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3.5 top-3 text-zinc-500 hover:text-zinc-300"
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-3 bg-zinc-900/60 rounded-2xl border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Loja 100% Limpa e Exclusiva</span>
              </div>
              <p>
                Sua loja será criada zerada, pronta para você cadastrar seus produtos, estoque e clientes.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-black rounded-2xl text-sm transition-all shadow-[0_0_15px_rgba(0,255,136,0.3)] active:scale-98 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Criar Minha Conta & Loja</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Rodapé seguro */}
      <div className="mt-6 text-center text-[11px] text-zinc-500 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>Seus dados e crediários são 100% isolados e seguros</span>
      </div>
    </div>
  );
}
