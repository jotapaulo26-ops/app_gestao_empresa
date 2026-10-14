'use client';

import React, { useState } from 'react';
import {
  ShoppingCart,
  LayoutDashboard,
  Users,
  Receipt,
  Grid,
  Utensils,
  Package,
  Tags,
  Store,
  X,
  Sparkles,
  ChevronUp,
  LogOut,
  ChefHat,
  CalendarClock,
  Flame,
  Zap,
} from 'lucide-react';
import InstallPwaButton from './InstallPwaButton';

export type ActiveTab =
  | 'dashboard'
  | 'pdv'
  | 'pedidos'
  | 'encomendas'
  | 'crediario'
  | 'produtos'
  | 'receitas'
  | 'insumos'
  | 'categorias'
  | 'loja'
  | 'calculadora-gas'
  | 'calculadora-eletrica';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  alertasEstoque?: number;
  nomeLoja?: string;
  nomeUsuario?: string;
  onLogout?: () => void;
  onAlertaEstoqueClick?: () => void;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  alertasEstoque = 0,
  nomeLoja = 'MANU',
  nomeUsuario,
  onLogout,
  onAlertaEstoqueClick,
}: NavbarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const getTitle = () => {
    switch (activeTab) {
      case 'pdv': return 'PDV Caixa Rápido';
      case 'dashboard': return 'Dashboard Analítico';
      case 'crediario': return 'Crediário & Clientes';
      case 'pedidos': return 'Vendas & Cobranças';
      case 'encomendas': return 'Agenda de Encomendas & Produção';
      case 'produtos': return 'Produtos & Custos';
      case 'receitas': return 'Livro de Receitas & Fichas';
      case 'insumos': return 'Estoque de Insumos';
      case 'categorias': return 'Categorias';
      case 'loja': return 'Minha Loja & Dados da Nota';
      case 'calculadora-gas': return 'Calculadora de Gás';
      case 'calculadora-eletrica': return 'Calculadora Elétrica & Máquinas';
      default: return 'ERP & PDV';
    }
  };

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setDrawerOpen(false);
  };

  return (
    <>
      {/* ================= BARRA SUPERIOR COMPACTA MULTI-NEON ================= */}
      <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-zinc-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-neon-green">
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider uppercase text-white flex items-center gap-1.5">
              <span>{nomeLoja}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                PRO
              </span>
            </h1>
            <p className="text-[11px] text-zinc-400 font-medium">{getTitle()}</p>
          </div>
        </div>

        {/* NAVEGAÇÃO DESKTOP RÁPIDA (MD+) */}
        <div className="hidden lg:flex items-center gap-1 bg-zinc-950/80 p-1 rounded-2xl border border-zinc-800/80 overflow-x-auto max-w-[70vw]">
          <button
            onClick={() => handleSelectTab('pdv')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
              activeTab === 'pdv' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-neon-green' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>PDV</span>
          </button>
          <button
            onClick={() => handleSelectTab('dashboard')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
              activeTab === 'dashboard' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-neon-cyan' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dash</span>
          </button>
          <button
            onClick={() => handleSelectTab('crediario')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
              activeTab === 'crediario' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-neon-amber' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Crediário</span>
          </button>
          <button
            onClick={() => handleSelectTab('pedidos')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
              activeTab === 'pedidos' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40 shadow-neon-pink' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Vendas</span>
          </button>
          <button
            onClick={() => handleSelectTab('encomendas')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
              activeTab === 'encomendas' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-neon-amber' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <CalendarClock className="w-3.5 h-3.5" />
            <span>Encomendas</span>
          </button>
          <button
            onClick={() => handleSelectTab('produtos')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
              activeTab === 'produtos' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-neon-purple' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Produtos</span>
          </button>
          <button
            onClick={() => handleSelectTab('receitas')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
              activeTab === 'receitas' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-neon-pink' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ChefHat className="w-3.5 h-3.5" />
            <span>Receitas</span>
          </button>
          <button
            onClick={() => handleSelectTab('insumos')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
              activeTab === 'insumos' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-neon-amber' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Insumos</span>
          </button>
          <button
            onClick={() => handleSelectTab('categorias')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
              activeTab === 'categorias' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-neon-cyan' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Tags className="w-3.5 h-3.5" />
            <span>Categorias</span>
          </button>

          {/* Menus Novos: Calculadora de Gás e Calculadora Elétrica */}
          <button
            onClick={() => handleSelectTab('calculadora-gas')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
              activeTab === 'calculadora-gas'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'text-zinc-400 hover:text-amber-400'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Calc. Gás</span>
          </button>
          <button
            onClick={() => handleSelectTab('calculadora-eletrica')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
              activeTab === 'calculadora-eletrica'
                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 shadow-[0_0_12px_rgba(234,179,8,0.3)]'
                : 'text-zinc-400 hover:text-yellow-300'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <span>Calc. Elétrica</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {alertasEstoque > 0 && (
            <button
              onClick={() => {
                if (onAlertaEstoqueClick) {
                  onAlertaEstoqueClick();
                } else {
                  handleSelectTab('insumos');
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold animate-pulse hover:bg-amber-500/30 active:scale-95 transition-all cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.3)]"
              title="Estoque baixo! Clique para localizar as categorias afetadas"
            >
              <Package className="w-3.5 h-3.5" />
              <span>{alertasEstoque}</span>
            </button>
          )}

          <button
            onClick={() => handleSelectTab('loja')}
            title="Configurações da Loja"
            className={`p-2 rounded-xl border transition-all ${
              activeTab === 'loja'
                ? 'bg-pink-500/20 border-pink-500 text-pink-400 shadow-neon-pink'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <Store className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ================= BARRA INFERIOR COM CORES NEON DEDICADAS POR TIPO DE MENU ================= */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-zinc-800/80 px-2 py-2 safe-area-pb">
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
          {/* 1. PDV - NEON EMERALD / LIME */}
          <button
            onClick={() => handleSelectTab('pdv')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all ${
              activeTab === 'pdv'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/80 shadow-neon-green'
                : 'text-zinc-500 hover:text-emerald-400'
            }`}
          >
            <ShoppingCart className={`w-5 h-5 ${activeTab === 'pdv' ? 'text-emerald-400 animate-bounce' : ''}`} />
            <span className="text-[10px] font-bold mt-1">PDV</span>
          </button>

          {/* 2. DASHBOARD - NEON CYAN */}
          <button
            onClick={() => handleSelectTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all ${
              activeTab === 'dashboard'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/80 shadow-neon-cyan'
                : 'text-zinc-500 hover:text-cyan-400'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1">Dash</span>
          </button>

          {/* 3. CREDIÁRIO - NEON AMBER / LARANJA */}
          <button
            onClick={() => handleSelectTab('crediario')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all ${
              activeTab === 'crediario'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/80 shadow-neon-amber'
                : 'text-zinc-500 hover:text-amber-400'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1">Crediário</span>
          </button>

          {/* 4. VENDAS - NEON PINK / MAGENTA */}
          <button
            onClick={() => handleSelectTab('pedidos')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all ${
              activeTab === 'pedidos'
                ? 'bg-pink-500/20 text-pink-400 border border-pink-500/80 shadow-neon-pink'
                : 'text-zinc-500 hover:text-pink-400'
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1">Vendas</span>
          </button>

          {/* 5. MAIS - NEON PURPLE / VIOLETA */}
          <button
            onClick={() => setDrawerOpen(true)}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all ${
              drawerOpen || ['encomendas', 'produtos', 'receitas', 'insumos', 'categorias', 'loja', 'calculadora-gas', 'calculadora-eletrica'].includes(activeTab)
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/80 shadow-neon-purple'
                : 'text-zinc-500 hover:text-purple-400'
            }`}
          >
            <Grid className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1">Mais</span>
          </button>
        </div>
      </nav>

      {/* ================= GAVETA INFERIOR (BOTTOM SHEET) PARA MÓDULOS OCULTOS ================= */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col justify-end">
          <div
            className="flex-1"
            onClick={() => setDrawerOpen(false)}
          />

          <div className="bg-zinc-950 border-t border-zinc-800 rounded-t-3xl p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <ChevronUp className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Mais Módulos & Gestão
                </span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grid de Módulos com Cores Neon Individuais */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Calculadora de Gás - Neon Âmbar / Laranja */}
              <button
                onClick={() => handleSelectTab('calculadora-gas')}
                className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${
                  activeTab === 'calculadora-gas'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-amber-500/40'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Flame className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold block">Calc. de Gás</span>
                  <span className="text-[10px] text-zinc-500">Botijão & Fogo</span>
                </div>
              </button>

              {/* Calculadora Elétrica - Neon Amarelo */}
              <button
                onClick={() => handleSelectTab('calculadora-eletrica')}
                className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${
                  activeTab === 'calculadora-eletrica'
                    ? 'bg-yellow-500/10 border-yellow-500 text-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.25)]'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-yellow-500/40'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold block">Calc. Elétrica</span>
                  <span className="text-[10px] text-zinc-500">Máquinas & kWh</span>
                </div>
              </button>

              {/* Encomendas & Agenda - Neon Âmbar */}
              <button
                onClick={() => handleSelectTab('encomendas')}
                className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${
                  activeTab === 'encomendas'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow-neon-amber'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-amber-500/40'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold block">Encomendas</span>
                  <span className="text-[10px] text-zinc-500">Agenda & WhatsApp</span>
                </div>
              </button>

              {/* Produtos & Custos - Neon Violeta */}
              <button
                onClick={() => handleSelectTab('produtos')}
                className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${
                  activeTab === 'produtos'
                    ? 'bg-purple-500/10 border-purple-500 text-purple-300 shadow-neon-purple'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-purple-500/40'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Utensils className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold block">Produtos & Custos</span>
                  <span className="text-[10px] text-zinc-500">Calculadora</span>
                </div>
              </button>

              {/* Receitas & Fichas Técnicas - Neon Rose/Pink */}
              <button
                onClick={() => handleSelectTab('receitas')}
                className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${
                  activeTab === 'receitas'
                    ? 'bg-rose-500/10 border-rose-500 text-rose-300 shadow-neon-pink'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-rose-500/40'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold block">Receitas</span>
                  <span className="text-[10px] text-zinc-500">Fichas & Compartilhar</span>
                </div>
              </button>

              {/* Estoque de Insumos - Neon Laranja */}
              <button
                onClick={() => handleSelectTab('insumos')}
                className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${
                  activeTab === 'insumos'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow-neon-amber'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-amber-500/40'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold block">Insumos</span>
                  <span className="text-[10px] text-zinc-500">Matérias-primas</span>
                </div>
              </button>

              {/* Categorias - Neon Ciano */}
              <button
                onClick={() => handleSelectTab('categorias')}
                className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${
                  activeTab === 'categorias'
                    ? 'bg-cyan-500/10 border-cyan-500 text-cyan-300 shadow-neon-cyan'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-cyan-500/40'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Tags className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold block">Categorias</span>
                  <span className="text-[10px] text-zinc-500">Organização</span>
                </div>
              </button>

              {/* Minha Loja & Dados da Nota - Neon Rosa */}
              <button
                onClick={() => handleSelectTab('loja')}
                className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${
                  activeTab === 'loja'
                    ? 'bg-pink-500/10 border-pink-500 text-pink-300 shadow-neon-pink'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-pink-500/40'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
                  <Store className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold block">Minha Loja</span>
                  <span className="text-[10px] text-zinc-500">Notas & Pix</span>
                </div>
              </button>
            </div>

            <div className="pt-3 border-t border-zinc-900 space-y-2">
              <InstallPwaButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
