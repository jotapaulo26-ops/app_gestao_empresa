'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar, { ActiveTab } from '@/components/Navbar';
import DashboardView from '@/components/DashboardView';
import PDVView from '@/components/PDVView';
import PedidosView from '@/components/PedidosView';
import EncomendasView from '@/components/EncomendasView';
import CrediarioView from '@/components/CrediarioView';
import ProdutosView from '@/components/ProdutosView';
import ReceitasView from '@/components/ReceitasView';
import InsumosView from '@/components/InsumosView';
import CategoriasView from '@/components/CategoriasView';
import LojaConfigView from '@/components/LojaConfigView';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Categoria, Insumo, Produto, Cliente, Pedido, ConfiguracaoLoja } from '@/types';
import { obterItensLocais, salvarItensLocais, obterFilaSincronizacao } from '@/lib/indexedDb';
import { calcularDashboardMetrics } from '@/lib/dashboardMetrics';

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

const SESSAO_PADRAO: SessaoState = {
  usuario: {
    id: 'user-local',
    nome: 'Administrador',
    email: 'local@erp.com',
    lojaId: 'loja-local',
    nomeLoja: 'Minha Loja',
  },
  token: 'token-local',
  lojaId: 'loja-local',
};

export default function HomePage() {
  const [sessao, setSessao] = useState<SessaoState>(SESSAO_PADRAO);

  const [activeTab, setActiveTab] = useState<ActiveTab>('pdv');
  const [visitedTabs, setVisitedTabs] = useState<Set<ActiveTab>>(() => new Set<ActiveTab>(['pdv']));

  const handleSelectTab = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  }, []);
  
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [configLoja, setConfigLoja] = useState<ConfiguracaoLoja | null>(null);

  const [loading, setLoading] = useState(true);

  // Carrega os dados da loja conectada (Local-First com Mesclagem Inteligente)
  const loadAllData = useCallback(async (lojaIdAlvo?: string, tokenAlvo?: string) => {
    const lId = lojaIdAlvo || sessao?.lojaId || (typeof window !== 'undefined' ? localStorage.getItem('erp_usuario_loja_id') : null);
    const tok = tokenAlvo || sessao?.token || (typeof window !== 'undefined' ? localStorage.getItem('erp_usuario_token') : null);

    if (!lId) return;

    // 1. CARREGAMENTO INSTANTÂNEO DO BANCO LOCAL DO CELULAR (0ms)
    let localCat: Categoria[] = [];
    let localIns: Insumo[] = [];
    let localProd: Produto[] = [];
    let localCli: Cliente[] = [];
    let localPed: Pedido[] = [];

    try {
      [localCat, localIns, localProd, localCli, localPed] = await Promise.all([
        obterItensLocais<Categoria>('categorias'),
        obterItensLocais<Insumo>('insumos'),
        obterItensLocais<Produto>('produtos'),
        obterItensLocais<Cliente>('clientes'),
        obterItensLocais<Pedido>('pedidos'),
      ]);

      if (Array.isArray(localCat) && localCat.length > 0) setCategorias(localCat);
      if (Array.isArray(localIns) && localIns.length > 0) setInsumos(localIns);
      if (Array.isArray(localProd) && localProd.length > 0) setProdutos(localProd);
      if (Array.isArray(localCli) && localCli.length > 0) setClientes(localCli);
      if (Array.isArray(localPed) && localPed.length > 0) setPedidos(localPed);

      // Se já temos produtos ou categorias no celular, libera a interface na hora
      if ((Array.isArray(localProd) && localProd.length > 0) || (Array.isArray(localCat) && localCat.length > 0)) {
        setLoading(false);
      }
    } catch (errLocal) {
      console.warn('Leitura local falhou:', errLocal);
    }

    // 2. SINCRONIZAÇÃO COM A NUVEM EM SEGUNDO PLANO
    const headers: Record<string, string> = {
      'x-loja-id': lId,
    };
    if (tok) {
      headers['Authorization'] = `Bearer ${tok}`;
    }

    try {
      const filaPendentes = await obterFilaSincronizacao();

      const [resCat, resIns, resProd, resCli, resPed, resDash, resCfg] = await Promise.all([
        fetch('/api/categorias', { headers }).then((r) => r.json()).catch(() => null),
        fetch('/api/insumos', { headers }).then((r) => r.json()).catch(() => null),
        fetch('/api/produtos', { headers }).then((r) => r.json()).catch(() => null),
        fetch('/api/clientes', { headers }).then((r) => r.json()).catch(() => null),
        fetch('/api/pedidos', { headers }).then((r) => r.json()).catch(() => null),
        fetch('/api/dashboard', { headers }).then((r) => r.json()).catch(() => null),
        fetch('/api/configuracoes', { headers }).then((r) => r.json()).catch(() => null),
      ]);

      // Categorias - Mesclagem inteligente
      if (Array.isArray(resCat)) {
        const mapa = new Map<string, Categoria>();
        resCat.forEach((c) => mapa.set(c.id, c));
        localCat.forEach((c) => {
          const pendente = filaPendentes.some((t) => t.method === 'POST' && (t.body?.id === c.id || t.endpoint === '/api/categorias'));
          if (!mapa.has(c.id) && pendente) mapa.set(c.id, c);
        });
        const finalCat = Array.from(mapa.values());
        setCategorias(finalCat);
        salvarItensLocais('categorias', finalCat);
      }

      // Insumos - Mesclagem inteligente
      if (Array.isArray(resIns)) {
        const mapa = new Map<string, Insumo>();
        resIns.forEach((i) => mapa.set(i.id, i));
        localIns.forEach((i) => {
          const pendente = filaPendentes.some((t) => t.method === 'POST' && (t.body?.id === i.id || t.endpoint === '/api/insumos'));
          if (!mapa.has(i.id) && pendente) mapa.set(i.id, i);
        });
        const finalIns = Array.from(mapa.values());
        setInsumos(finalIns);
        salvarItensLocais('insumos', finalIns);
      }

      // Produtos - Mesclagem inteligente
      if (Array.isArray(resProd)) {
        const mapa = new Map<string, Produto>();
        resProd.forEach((p) => mapa.set(p.id, p));
        localProd.forEach((p) => {
          const pendente = filaPendentes.some((t) => t.method === 'POST' && (t.body?.id === p.id || t.endpoint === '/api/produtos'));
          if (!mapa.has(p.id) && pendente) mapa.set(p.id, p);
        });
        const finalProd = Array.from(mapa.values());
        setProdutos(finalProd);
        salvarItensLocais('produtos', finalProd);
      }

      // Clientes - Mesclagem inteligente
      if (Array.isArray(resCli)) {
        const mapa = new Map<string, Cliente>();
        resCli.forEach((c) => mapa.set(c.id, c));
        localCli.forEach((c) => {
          const pendente = filaPendentes.some((t) => t.method === 'POST' && (t.body?.id === c.id || t.endpoint === '/api/clientes'));
          if (!mapa.has(c.id) && pendente) mapa.set(c.id, c);
        });
        const finalCli = Array.from(mapa.values());
        setClientes(finalCli);
        salvarItensLocais('clientes', finalCli);
      }

      // Pedidos - Mesclagem inteligente (excluindo cancelados)
      if (Array.isArray(resPed)) {
        const mapa = new Map<string, Pedido>();
        resPed.filter((p) => p && p.status !== 'CANCELADO').forEach((p) => mapa.set(p.id, p));
        localPed.filter((p) => p && p.status !== 'CANCELADO').forEach((p) => {
          const pendente = filaPendentes.some((t) => t.method === 'POST' && (t.body?.id === p.id || t.endpoint === '/api/pedidos'));
          if (!mapa.has(p.id) && pendente) mapa.set(p.id, p);
        });
        const finalPed = Array.from(mapa.values()).sort(
          (a, b) => new Date(b.dataVenda).getTime() - new Date(a.dataVenda).getTime()
        );
        setPedidos(finalPed);
        salvarItensLocais('pedidos', finalPed);
      }

      if (resDash && !resDash.error) setDashboardMetrics(resDash);
      if (resCfg && !resCfg.error) setConfigLoja(resCfg);

    } catch (err) {
      console.warn('Modo offline ativo: usando dados salvos no celular.', err);
    } finally {
      setLoading(false);
    }
  }, [sessao.lojaId, sessao.token]);

  // Carrega imediatamente ao iniciar o app no disco local
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Métricas do Dashboard calculadas 100% em TEMPO REAL (Chamada incondicional de Hook no topo)
  const realTimeDashboardMetrics = useMemo(() => {
    return calcularDashboardMetrics(pedidos, produtos, clientes, insumos);
  }, [pedidos, produtos, clientes, insumos]);

  const totalAlertasEstoque =
    (realTimeDashboardMetrics?.insumosBaixos?.length || 0) +
    (realTimeDashboardMetrics?.produtosBaixos?.length || 0);

  return (
    <div className="min-h-screen bg-black text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Header & Bottom Thumb Nav */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleSelectTab}
        alertasEstoque={totalAlertasEstoque}
        nomeLoja={configLoja?.nomeLoja || sessao.usuario.nomeLoja || 'Minha Loja'}
        nomeUsuario={sessao.usuario.nome || 'Administrador'}
      />

      {/* Conteúdo Focado 100% no Módulo Ativo da Loja com Keep-Alive 0ms */}
      <main className="flex-1 pb-20">
        {loading ? (
          <div className="max-w-md mx-auto px-4 py-24 text-center">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3 shadow-[0_0_15px_rgba(0,255,136,0.4)]" />
            <p className="text-zinc-500 font-mono text-xs">Carregando dados da sua loja...</p>
          </div>
        ) : (
          <>
            {visitedTabs.has('pdv') && (
              <div style={{ display: activeTab === 'pdv' ? 'block' : 'none' }}>
                <ErrorBoundary fallbackTitle="PDV Caixa Rápido">
                  <PDVView
                    categorias={categorias}
                    produtos={produtos}
                    clientes={clientes}
                    config={configLoja || undefined}
                    onOrderCompleted={async () => {
                      await loadAllData();
                    }}
                  />
                </ErrorBoundary>
              </div>
            )}

            {visitedTabs.has('dashboard') && (
              <div style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}>
                <ErrorBoundary fallbackTitle="Dashboard Analítico">
                  <DashboardView
                    metrics={realTimeDashboardMetrics}
                    setActiveTab={handleSelectTab}
                  />
                </ErrorBoundary>
              </div>
            )}

            {visitedTabs.has('crediario') && (
              <div style={{ display: activeTab === 'crediario' ? 'block' : 'none' }}>
                <ErrorBoundary fallbackTitle="Crediário & Clientes">
                  <CrediarioView
                    clientes={clientes}
                    pedidos={pedidos}
                    config={configLoja || undefined}
                    onRefresh={() => loadAllData()}
                  />
                </ErrorBoundary>
              </div>
            )}

            {visitedTabs.has('pedidos') && (
              <div style={{ display: activeTab === 'pedidos' ? 'block' : 'none' }}>
                <ErrorBoundary fallbackTitle="Vendas & Cobranças">
                  <PedidosView
                    pedidos={pedidos}
                    clientes={clientes}
                    config={configLoja || undefined}
                    onRefresh={() => loadAllData()}
                  />
                </ErrorBoundary>
              </div>
            )}

            {visitedTabs.has('encomendas') && (
              <div style={{ display: activeTab === 'encomendas' ? 'block' : 'none' }}>
                <ErrorBoundary fallbackTitle="Agenda de Encomendas & Produção">
                  <EncomendasView
                    pedidos={pedidos}
                    clientes={clientes}
                    produtos={produtos}
                    config={configLoja || undefined}
                    onRefresh={() => loadAllData()}
                  />
                </ErrorBoundary>
              </div>
            )}

            {visitedTabs.has('produtos') && (
              <div style={{ display: activeTab === 'produtos' ? 'block' : 'none' }}>
                <ErrorBoundary fallbackTitle="Produtos & Custos">
                  <ProdutosView
                    produtos={produtos}
                    categorias={categorias}
                    insumos={insumos}
                    onRefresh={() => loadAllData()}
                  />
                </ErrorBoundary>
              </div>
            )}

            {visitedTabs.has('receitas') && (
              <div style={{ display: activeTab === 'receitas' ? 'block' : 'none' }}>
                <ErrorBoundary fallbackTitle="Livro de Receitas & Fichas">
                  <ReceitasView
                    produtos={produtos}
                    categorias={categorias}
                    insumos={insumos}
                    config={configLoja || undefined}
                    onRefresh={() => loadAllData()}
                  />
                </ErrorBoundary>
              </div>
            )}

            {visitedTabs.has('insumos') && (
              <div style={{ display: activeTab === 'insumos' ? 'block' : 'none' }}>
                <ErrorBoundary fallbackTitle="Estoque de Insumos">
                  <InsumosView
                    insumos={insumos}
                    onRefresh={() => loadAllData()}
                  />
                </ErrorBoundary>
              </div>
            )}

            {visitedTabs.has('categorias') && (
              <div style={{ display: activeTab === 'categorias' ? 'block' : 'none' }}>
                <ErrorBoundary fallbackTitle="Categorias">
                  <CategoriasView
                    categorias={categorias}
                    produtos={produtos}
                    onRefresh={() => loadAllData()}
                  />
                </ErrorBoundary>
              </div>
            )}

            {visitedTabs.has('loja') && (
              <div style={{ display: activeTab === 'loja' ? 'block' : 'none' }}>
                <ErrorBoundary fallbackTitle="Configurações da Loja">
                  <LojaConfigView
                    config={configLoja || undefined}
                    onRefresh={() => loadAllData()}
                  />
                </ErrorBoundary>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
