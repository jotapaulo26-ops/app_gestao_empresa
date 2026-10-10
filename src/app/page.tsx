'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Navbar, { ActiveTab } from '@/components/Navbar';
import DashboardView from '@/components/DashboardView';
import PDVView from '@/components/PDVView';
import PedidosView from '@/components/PedidosView';
import CrediarioView from '@/components/CrediarioView';
import ProdutosView from '@/components/ProdutosView';
import InsumosView from '@/components/InsumosView';
import CategoriasView from '@/components/CategoriasView';
import LojaConfigView from '@/components/LojaConfigView';
import AuthView from '@/components/AuthView';
import { Categoria, Insumo, Produto, Cliente, Pedido, ConfiguracaoLoja } from '@/types';

interface SessaoState {
  usuario: {
    id: string;
    nome: string;
    email: string;
    lojaId: string;
    nomeLoja: string;
  };
  token: string;
  lojaId: string;
}

export default function HomePage() {
  const [sessao, setSessao] = useState<SessaoState | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [activeTab, setActiveTab] = useState<ActiveTab>('pdv');
  
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [configLoja, setConfigLoja] = useState<ConfiguracaoLoja | null>(null);

  const [loading, setLoading] = useState(true);

  // Carrega os dados da loja conectada
  const loadAllData = useCallback(async (lojaIdAlvo?: string, tokenAlvo?: string) => {
    const lId = lojaIdAlvo || sessao?.lojaId;
    const tok = tokenAlvo || sessao?.token;

    if (!lId) return;

    setLoading(true);
    const headers: Record<string, string> = {
      'x-loja-id': lId,
    };
    if (tok) {
      headers['Authorization'] = `Bearer ${tok}`;
    }

    try {
      const [resCat, resIns, resProd, resCli, resPed, resDash, resCfg] = await Promise.all([
        fetch('/api/categorias', { headers }).then((r) => r.json()),
        fetch('/api/insumos', { headers }).then((r) => r.json()),
        fetch('/api/produtos', { headers }).then((r) => r.json()),
        fetch('/api/clientes', { headers }).then((r) => r.json()),
        fetch('/api/pedidos', { headers }).then((r) => r.json()),
        fetch('/api/dashboard', { headers }).then((r) => r.json()),
        fetch('/api/configuracoes', { headers }).then((r) => r.json()),
      ]);

      setCategorias(Array.isArray(resCat) ? resCat : []);
      setInsumos(Array.isArray(resIns) ? resIns : []);
      setProdutos(Array.isArray(resProd) ? resProd : []);
      setClientes(Array.isArray(resCli) ? resCli : []);
      setPedidos(Array.isArray(resPed) ? resPed : []);
      setDashboardMetrics(resDash && !resDash.error ? resDash : null);
      setConfigLoja(resCfg && !resCfg.error ? resCfg : null);
    } catch (err) {
      console.error('Erro ao carregar dados da loja:', err);
    } finally {
      setLoading(false);
    }
  }, [sessao?.lojaId, sessao?.token]);

  // Checagem de sessão salva (Lembrar-me)
  useEffect(() => {
    const verificarSessao = async () => {
      try {
        const tokenSalvo = typeof window !== 'undefined' ? localStorage.getItem('erp_usuario_token') : null;

        const headers: Record<string, string> = {};
        if (tokenSalvo) {
          headers['Authorization'] = `Bearer ${tokenSalvo}`;
        }

        const res = await fetch('/api/auth/me', { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.usuario) {
            const novaSessao: SessaoState = {
              usuario: data.usuario,
              token: tokenSalvo || '',
              lojaId: data.lojaId,
            };
            setSessao(novaSessao);
            loadAllData(data.lojaId, tokenSalvo || '');
          }
        }
      } catch (err) {
        console.error('Nenhuma sessão válida ativa.', err);
      } finally {
        setCheckingAuth(false);
      }
    };

    verificarSessao();
  }, [loadAllData]);

  const handleLoginSuccess = (dados: SessaoState) => {
    setSessao(dados);
    loadAllData(dados.lojaId, dados.token);
  };

  const handleLogout = async () => {
    try {
      const headers: Record<string, string> = {};
      if (sessao?.token) {
        headers['Authorization'] = `Bearer ${sessao.token}`;
      }
      await fetch('/api/auth/logout', { method: 'POST', headers });
    } catch {}

    if (typeof window !== 'undefined') {
      localStorage.removeItem('erp_usuario_token');
      localStorage.removeItem('erp_usuario_loja_id');
    }

    setSessao(null);
    setCategorias([]);
    setInsumos([]);
    setProdutos([]);
    setClientes([]);
    setPedidos([]);
    setDashboardMetrics(null);
    setConfigLoja(null);
  };

  // Se ainda estiver validando a sessão no primeiro load
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-black text-slate-100 flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto shadow-[0_0_20px_rgba(0,255,136,0.4)]" />
          <p className="text-zinc-500 font-mono text-xs">Inicializando ERP Dark Neon...</p>
        </div>
      </div>
    );
  }

  // Se não estiver logado, exibe a tela de Login & Cadastro
  if (!sessao) {
    return <AuthView onLoginSuccess={handleLoginSuccess} />;
  }

  const totalAlertasEstoque =
    (dashboardMetrics?.insumosBaixos?.length || 0) +
    (dashboardMetrics?.produtosBaixos?.length || 0);

  return (
    <div className="min-h-screen bg-black text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Header & Bottom Thumb Nav com Botão de Sair */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        alertasEstoque={totalAlertasEstoque}
        nomeLoja={configLoja?.nomeLoja || sessao.usuario.nomeLoja}
        nomeUsuario={sessao.usuario.nome}
        onLogout={handleLogout}
      />

      {/* Conteúdo Focado 100% no Módulo Ativo da Loja */}
      <main className="flex-1 pb-20">
        {loading ? (
          <div className="max-w-md mx-auto px-4 py-24 text-center">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3 shadow-[0_0_15px_rgba(0,255,136,0.4)]" />
            <p className="text-zinc-500 font-mono text-xs">Carregando dados da sua loja...</p>
          </div>
        ) : (
          <>
            {activeTab === 'pdv' && (
              <PDVView
                categorias={categorias}
                produtos={produtos}
                clientes={clientes}
                config={configLoja || undefined}
                onOrderCompleted={() => loadAllData()}
              />
            )}

            {activeTab === 'dashboard' && (
              <DashboardView
                metrics={dashboardMetrics}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === 'crediario' && (
              <CrediarioView
                clientes={clientes}
                pedidos={pedidos}
                config={configLoja || undefined}
                onRefresh={() => loadAllData()}
              />
            )}

            {activeTab === 'pedidos' && (
              <PedidosView
                pedidos={pedidos}
                clientes={clientes}
                config={configLoja || undefined}
                onRefresh={() => loadAllData()}
              />
            )}

            {activeTab === 'produtos' && (
              <ProdutosView
                produtos={produtos}
                categorias={categorias}
                insumos={insumos}
                onRefresh={() => loadAllData()}
              />
            )}

            {activeTab === 'insumos' && (
              <InsumosView
                insumos={insumos}
                onRefresh={() => loadAllData()}
              />
            )}

            {activeTab === 'categorias' && (
              <CategoriasView
                categorias={categorias}
                produtos={produtos}
                onRefresh={() => loadAllData()}
              />
            )}

            {activeTab === 'loja' && (
              <LojaConfigView
                config={configLoja || undefined}
                onRefresh={() => loadAllData()}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
