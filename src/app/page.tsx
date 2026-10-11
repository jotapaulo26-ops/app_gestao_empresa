'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { obterItensLocais, salvarItensLocais, obterFilaSincronizacao } from '@/lib/indexedDb';
import { syncService } from '@/lib/syncService';
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
          const deletado = filaPendentes.some((t) => t.method === 'DELETE' && t.endpoint.includes(c.id));
          if (!mapa.has(c.id) && !deletado) mapa.set(c.id, c);
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
          const deletado = filaPendentes.some((t) => t.method === 'DELETE' && t.endpoint.includes(i.id));
          if (!mapa.has(i.id) && !deletado) mapa.set(i.id, i);
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
          const deletado = filaPendentes.some((t) => t.method === 'DELETE' && t.endpoint.includes(p.id));
          if (!mapa.has(p.id) && !deletado) mapa.set(p.id, p);
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
          const deletado = filaPendentes.some((t) => t.method === 'DELETE' && t.endpoint.includes(c.id));
          if (!mapa.has(c.id) && !deletado) mapa.set(c.id, c);
        });
        const finalCli = Array.from(mapa.values());
        setClientes(finalCli);
        salvarItensLocais('clientes', finalCli);
      }

      // Pedidos - Mesclagem inteligente
      if (Array.isArray(resPed)) {
        const mapa = new Map<string, Pedido>();
        resPed.forEach((p) => mapa.set(p.id, p));
        localPed.forEach((p) => {
          const deletado = filaPendentes.some((t) => t.method === 'DELETE' && t.endpoint.includes(p.id));
          if (!mapa.has(p.id) && !deletado) mapa.set(p.id, p);
        });
        const finalPed = Array.from(mapa.values()).sort(
          (a, b) => new Date(b.dataVenda).getTime() - new Date(a.dataVenda).getTime()
        );
        setPedidos(finalPed);
        salvarItensLocais('pedidos', finalPed);
      }

      if (resDash && !resDash.error) setDashboardMetrics(resDash);
      if (resCfg && !resCfg.error) setConfigLoja(resCfg);

      // Dispara o background sync para enviar qualquer pendência do celular
      syncService.processarFila();
    } catch (err) {
      console.warn('Modo offline ativo: usando dados salvos no celular.', err);
    } finally {
      setLoading(false);
    }
  }, [sessao?.lojaId, sessao?.token]);

  // Checagem de sessão salva e Restauração Imediata (Auto-login 0ms)
  useEffect(() => {
    const verificarSessao = async () => {
      if (typeof window === 'undefined') return;

      const tokenSalvo = localStorage.getItem('erp_usuario_token');
      const lojaIdSalva = localStorage.getItem('erp_usuario_loja_id');
      const dadosUsuarioSalvo = localStorage.getItem('erp_usuario_dados');

      // 1. Auto-login Imediato se houver credenciais salvas no aparelho
      if (tokenSalvo && lojaIdSalva) {
        let usuario = null;
        try {
          usuario = dadosUsuarioSalvo ? JSON.parse(dadosUsuarioSalvo) : null;
        } catch {}

        if (!usuario) {
          usuario = {
            id: 'user-local',
            nome: 'Lojista',
            email: '',
            lojaId: lojaIdSalva,
            nomeLoja: 'Minha Loja',
          };
        }

        const sessaoImediata: SessaoState = {
          usuario,
          token: tokenSalvo,
          lojaId: lojaIdSalva,
        };

        setSessao(sessaoImediata);
        setCheckingAuth(false);
        loadAllData(lojaIdSalva, tokenSalvo);

        // 2. Validação silenciosa na nuvem em segundo plano (não bloqueia a abertura)
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${tokenSalvo}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.usuario) {
              setSessao((prev) => (prev ? { ...prev, usuario: data.usuario } : prev));
              localStorage.setItem('erp_usuario_dados', JSON.stringify(data.usuario));
            }
          }
        } catch (errSync) {
          // Em caso de falha de rede ou offline, continua no ERP com dados locais
          console.log('Modo offline: sessão local preservada.');
        }
        return;
      }

      setCheckingAuth(false);
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
      localStorage.removeItem('erp_usuario_dados');
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

  // Métricas do Dashboard calculadas 100% em TEMPO REAL (Chamada incondicional de Hook no topo)
  const realTimeDashboardMetrics = useMemo(() => {
    return calcularDashboardMetrics(pedidos, produtos, clientes, insumos);
  }, [pedidos, produtos, clientes, insumos]);

  const totalAlertasEstoque =
    (realTimeDashboardMetrics?.insumosBaixos?.length || 0) +
    (realTimeDashboardMetrics?.produtosBaixos?.length || 0);

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

  return (
    <div className="min-h-screen bg-black text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Header & Bottom Thumb Nav com Botão de Sair */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        alertasEstoque={totalAlertasEstoque}
        nomeLoja={configLoja?.nomeLoja || sessao?.usuario?.nomeLoja || 'Minha Loja'}
        nomeUsuario={sessao?.usuario?.nome || 'Operador'}
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
                onOrderCompleted={async () => {
                  await loadAllData();
                }}
              />
            )}

            {activeTab === 'dashboard' && (
              <DashboardView
                metrics={realTimeDashboardMetrics}
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
