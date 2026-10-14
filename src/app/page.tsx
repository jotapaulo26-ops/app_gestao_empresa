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
import LojaSeletorModal from '@/components/LojaSeletorModal';
import CalculadoraGasView from '@/components/CalculadoraGasView';
import CalculadoraEletricaView from '@/components/CalculadoraEletricaView';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Categoria, Insumo, Produto, Cliente, Pedido, ConfiguracaoLoja, PagamentoCrediario } from '@/types';
import { obterItensLocais, salvarItensLocais, obterFilaSincronizacao, limparTodosOsDadosLocais } from '@/lib/indexedDb';
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
  const [pagamentosCrediario, setPagamentosCrediario] = useState<PagamentoCrediario[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [configLoja, setConfigLoja] = useState<ConfiguracaoLoja | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('erp_loja_config');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return null;
  });

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
    let localPags: PagamentoCrediario[] = [];

    try {
      [localCat, localIns, localProd, localCli, localPed, localPags] = await Promise.all([
        obterItensLocais<Categoria>('categorias'),
        obterItensLocais<Insumo>('insumos'),
        obterItensLocais<Produto>('produtos'),
        obterItensLocais<Cliente>('clientes'),
        obterItensLocais<Pedido>('pedidos'),
        obterItensLocais<PagamentoCrediario>('pagamentosCrediario'),
      ]);

      if (Array.isArray(localCat)) setCategorias(localCat);
      if (Array.isArray(localIns)) setInsumos(localIns);
      if (Array.isArray(localProd)) setProdutos(localProd);
      if (Array.isArray(localCli)) setClientes(localCli);
      if (Array.isArray(localPags)) setPagamentosCrediario(localPags);
      if (Array.isArray(localPed)) {
        const pedValidos = localPed
          .filter((p) => p && p.status !== 'CANCELADO')
          .sort((a, b) => new Date(b.dataVenda).getTime() - new Date(a.dataVenda).getTime());
        setPedidos(pedValidos);
      }

      // Libera a tela imediatamente com os dados locais do celular
      setLoading(false);
    } catch (errLocal) {
      console.warn('Leitura local falhou:', errLocal);
      setLoading(false);
    }

    // Se estiver offline no navegador, encerra aqui sem disparar fetch
    if (typeof window !== 'undefined' && !navigator.onLine) {
      return;
    }

    // 2. SINCRONIZAÇÃO OPCIONAL COM O SERVIDOR APENAS SE ONLINE
    const headers: Record<string, string> = {
      'x-loja-id': lId,
    };
    if (tok) {
      headers['Authorization'] = `Bearer ${tok}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const [resCat, resIns, resProd, resCli, resPed, resCfg] = await Promise.all([
        fetch('/api/categorias', { headers, signal: controller.signal }).then((r) => r.json()).catch(() => null),
        fetch('/api/insumos', { headers, signal: controller.signal }).then((r) => r.json()).catch(() => null),
        fetch('/api/produtos', { headers, signal: controller.signal }).then((r) => r.json()).catch(() => null),
        fetch('/api/clientes', { headers, signal: controller.signal }).then((r) => r.json()).catch(() => null),
        fetch('/api/pedidos', { headers, signal: controller.signal }).then((r) => r.json()).catch(() => null),
        fetch('/api/configuracoes', { headers, cache: 'no-store', signal: controller.signal }).then((r) => r.json()).catch(() => null),
      ]);
      clearTimeout(timeoutId);

      // 100% LOCAL PRIMACY: Apenas inicializa (seed) coleções que estiverem totalmente vazias localmente
      if (Array.isArray(resCat) && resCat.length > 0 && localCat.length === 0) {
        setCategorias(resCat);
        salvarItensLocais('categorias', resCat);
      }
      if (Array.isArray(resIns) && resIns.length > 0 && localIns.length === 0) {
        setInsumos(resIns);
        salvarItensLocais('insumos', resIns);
      }
      if (Array.isArray(resProd) && resProd.length > 0 && localProd.length === 0) {
        setProdutos(resProd);
        salvarItensLocais('produtos', resProd);
      }
      if (Array.isArray(resCli) && resCli.length > 0 && localCli.length === 0) {
        setClientes(resCli);
        salvarItensLocais('clientes', resCli);
      }
      if (Array.isArray(resPed) && resPed.length > 0 && localPed.length === 0) {
        const pedFiltrados = resPed
          .filter((p) => p && p.status !== 'CANCELADO')
          .sort((a, b) => new Date(b.dataVenda).getTime() - new Date(a.dataVenda).getTime());
        setPedidos(pedFiltrados);
        salvarItensLocais('pedidos', pedFiltrados);
      }
      if (resCfg && !resCfg.error) {
        const savedLocal = typeof window !== 'undefined' ? localStorage.getItem('erp_loja_config') : null;
        if (!savedLocal) {
          setConfigLoja(resCfg);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('erp_loja_config', JSON.stringify(resCfg));
            } catch {}
          }
        }
      }
    } catch (err) {
      console.log('Operando 100% offline.');
    } finally {
      setLoading(false);
    }
  }, [sessao.lojaId, sessao.token]);

  const [modalLojaAberta, setModalLojaAberta] = useState(false);

  // Carrega imediatamente ao iniciar o app no disco local ou abre seletor de loja
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lojaSalva = localStorage.getItem('erp_usuario_loja_id');
      if (!lojaSalva) {
        setModalLojaAberta(true);
      } else {
        setSessao((prev) => ({
          ...prev,
          lojaId: lojaSalva,
          token: `token-${lojaSalva}`,
          usuario: {
            ...prev.usuario,
            lojaId: lojaSalva,
          },
        }));
        loadAllData(lojaSalva);
      }
    }
  }, [loadAllData]);

  const handleLojaSelecionada = async (novoLojaId: string, novoNomeLoja: string) => {
    setLoading(true);
    await limparTodosOsDadosLocais();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('erp_loja_config');
      localStorage.setItem('erp_usuario_loja_id', novoLojaId);
      localStorage.setItem('erp_loja_codigo', novoLojaId);
    }
    setSessao({
      usuario: {
        id: `user-${novoLojaId}`,
        nome: 'Operador',
        email: '',
        lojaId: novoLojaId,
        nomeLoja: novoNomeLoja,
      },
      token: `token-${novoLojaId}`,
      lojaId: novoLojaId,
    });
    setConfigLoja(null);
    setCategorias([]);
    setInsumos([]);
    setProdutos([]);
    setClientes([]);
    setPedidos([]);
    setModalLojaAberta(false);
    await loadAllData(novoLojaId);
    setLoading(false);
  };

  // Métricas do Dashboard calculadas 100% em TEMPO REAL (Chamada incondicional de Hook no topo)
  const realTimeDashboardMetrics = useMemo(() => {
    return calcularDashboardMetrics(pedidos, produtos, clientes, insumos, pagamentosCrediario);
  }, [pedidos, produtos, clientes, insumos, pagamentosCrediario]);

  const totalAlertasEstoque =
    (realTimeDashboardMetrics?.insumosBaixos?.length || 0) +
    (realTimeDashboardMetrics?.produtosBaixos?.length || 0);

  // Identifica categorias que possuem produtos com estoque baixo
  const categoriasComEstoqueBaixoIds = useMemo(() => {
    const catsSet = new Set<string>();
    (produtos || []).forEach((prod) => {
      if (!prod) return;
      const estAtual = Number(prod.estoqueAtual) || 0;
      const estMin = Number(prod.estoqueMinimo) || 0;
      if (estAtual <= estMin && prod.categoriaId) {
        catsSet.add(prod.categoriaId);
      }
    });
    return Array.from(catsSet);
  }, [produtos]);

  const [blinkCategoriasTrigger, setBlinkCategoriasTrigger] = useState<number>(0);

  // Ao clicar no ícone de alerta de estoque, navega para o PDV e faz a categoria piscar 3 vezes
  const handleAlertaEstoqueClick = useCallback(() => {
    handleSelectTab('pdv');
    setBlinkCategoriasTrigger(Date.now());
  }, [handleSelectTab]);

  return (
    <div className="min-h-screen bg-black text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Header & Bottom Thumb Nav */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleSelectTab}
        alertasEstoque={totalAlertasEstoque}
        onAlertaEstoqueClick={handleAlertaEstoqueClick}
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
                    categoriasComEstoqueBaixo={categoriasComEstoqueBaixoIds}
                    blinkTrigger={blinkCategoriasTrigger}
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
                    categoriasComEstoqueBaixo={categoriasComEstoqueBaixoIds}
                    blinkTrigger={blinkCategoriasTrigger}
                    onRefresh={() => loadAllData()}
                  />
                </ErrorBoundary>
              </div>
            )}

            {/* Nova Aba: Calculadora de Gás */}
            {visitedTabs.has('calculadora-gas') && (
              <div style={{ display: activeTab === 'calculadora-gas' ? 'block' : 'none' }}>
                <ErrorBoundary fallbackTitle="Calculadora de Gás">
                  <CalculadoraGasView
                    produtos={produtos}
                    config={configLoja || undefined}
                    onRefresh={() => loadAllData()}
                    onConfigUpdated={(novaConfig) => setConfigLoja(novaConfig)}
                    onNavigateToReceitas={() => handleSelectTab('receitas')}
                  />
                </ErrorBoundary>
              </div>
            )}

            {/* Nova Aba: Calculadora Elétrica & Máquinas */}
            {visitedTabs.has('calculadora-eletrica') && (
              <div style={{ display: activeTab === 'calculadora-eletrica' ? 'block' : 'none' }}>
                <ErrorBoundary fallbackTitle="Calculadora Elétrica & Máquinas">
                  <CalculadoraEletricaView
                    produtos={produtos}
                    config={configLoja || undefined}
                    onRefresh={() => loadAllData()}
                    onConfigUpdated={(novaConfig) => setConfigLoja(novaConfig)}
                    onNavigateToReceitas={() => handleSelectTab('receitas')}
                  />
                </ErrorBoundary>
              </div>
            )}

            {visitedTabs.has('loja') && (
              <div style={{ display: activeTab === 'loja' ? 'block' : 'none' }}>
                <ErrorBoundary fallbackTitle="Configurações da Loja">
                  <LojaConfigView
                    config={configLoja || undefined}
                    lojaId={sessao.lojaId}
                    onRefresh={() => loadAllData()}
                    onConfigUpdated={(novaConfig) => setConfigLoja(novaConfig)}
                    onTrocarLoja={() => setModalLojaAberta(true)}
                  />
                </ErrorBoundary>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal de Conexão e Troca de Loja para Múltiplos Aparelhos */}
      <LojaSeletorModal
        isOpen={modalLojaAberta}
        onLojaSelecionada={handleLojaSelecionada}
        onClose={() => setModalLojaAberta(false)}
        permiteFechar={Boolean(typeof window !== 'undefined' && localStorage.getItem('erp_usuario_loja_id'))}
      />
    </div>
  );
}
