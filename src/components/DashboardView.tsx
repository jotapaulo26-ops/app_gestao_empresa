'use client';

import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Users,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Award,
  Crown,
  Calendar,
  PieChart,
  PackageX,
  CreditCard,
  QrCode,
  Banknote,
  Percent,
  CheckCircle,
} from 'lucide-react';
import { ActiveTab } from './Navbar';

interface DashboardViewProps {
  metrics: any;
  setActiveTab: (tab: ActiveTab) => void;
}

export default function DashboardView({ metrics, setActiveTab }: DashboardViewProps) {
  // Estado para interação do gráfico diário (ao tocar numa barra)
  const [selectedDia, setSelectedDia] = useState<any | null>(null);
  
  if (!metrics) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center text-zinc-500 text-xs">
        Carregando análises analíticas...
      </div>
    );
  }

  const {
    totalHoje = 0,
    quantidadeVendasHoje = 0,
    faturamentoGeral = 0,
    lucroGeral = 0,
    margemGeralPct = 0,
    totalCrediarioRealAcumulado = 0,
    insumosBaixos = [],
    produtosBaixos = [],
    maisVendidos = [],
    produtosMenorSaida = [],
    top5Clientes = [],
    ultimos7Dias = [],
    distribuicaoPagamento = [],
  } = metrics;

  // Valor máximo para escala do gráfico diário
  const maxFaturamentoDia = Math.max(...ultimos7Dias.map((d: any) => d.faturamento), 10);

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      {/* ================= HEADER MULTI-NEON CYBERPUNK ================= */}
      <div className="p-5 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black rounded-3xl border border-cyan-500/40 shadow-neon-cyan space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(0,240,255,0.3)] flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" /> Painel Analítico Interativo
          </span>
          <span className="text-xs text-pink-400 font-mono font-bold animate-pulse">● Online</span>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <span className="text-xs text-zinc-400 block">Faturamento Hoje</span>
            <span className="text-3xl font-black text-cyan-300 drop-shadow-[0_0_12px_rgba(0,240,255,0.5)] font-mono">
              R$ {totalHoje.toFixed(2)}
            </span>
            <span className="text-[11px] text-zinc-400 mt-0.5 block">
              {quantidadeVendasHoje} vendas realizadas hoje
            </span>
          </div>

          <button
            onClick={() => setActiveTab('pdv')}
            className="py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-1.5 shadow-neon-green active:scale-95 transition-all"
          >
            <ShoppingCart className="w-4 h-4" /> PDV Caixa
          </button>
        </div>
      </div>

      {/* ================= MARCADOR ESPECIAL: VALOR REAL ACUMULADO NO CREDIÁRIO ================= */}
      <div className="p-5 bg-gradient-to-br from-amber-950/40 via-zinc-950 to-black rounded-3xl border border-amber-500/50 shadow-neon-amber space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-amber-400" /> Saldo Real no Crediário
          </span>
          <button
            onClick={() => setActiveTab('crediario')}
            className="text-[11px] text-amber-400 font-bold hover:underline flex items-center gap-1"
          >
            Cobrança <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div>
          <span className="text-xs text-zinc-400 block">Somatória Total Acumulada de Todos os Débitos</span>
          <span className="text-3xl font-black text-amber-400 drop-shadow-[0_0_15px_rgba(255,153,0,0.5)] font-mono">
            R$ {totalCrediarioRealAcumulado.toFixed(2)}
          </span>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">
            Capital ativo pendente de quitação na praça
          </span>
        </div>
      </div>

      {/* ================= 3 CARDS DE KPI MULTICOLORIDOS ================= */}
      <div className="grid grid-cols-2 gap-3">
        {/* Faturamento Geral - Neon Cyan */}
        <div className="bg-zinc-950 p-4 rounded-3xl border border-cyan-500/30 shadow-[0_0_10px_rgba(0,240,255,0.15)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Total Vendas</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="text-lg font-black text-cyan-300 font-mono block">
            R$ {faturamentoGeral.toFixed(2)}
          </span>
          <span className="text-[10px] text-zinc-500">Histórico completo</span>
        </div>

        {/* Lucro Bruto - Neon Pink */}
        <div className="bg-zinc-950 p-4 rounded-3xl border border-pink-500/30 shadow-[0_0_10px_rgba(255,42,133,0.15)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Lucro Bruto</span>
            <Percent className="w-4 h-4 text-pink-400" />
          </div>
          <span className="text-lg font-black text-pink-400 font-mono block">
            R$ {lucroGeral.toFixed(2)}
          </span>
          <span className="text-[10px] text-pink-300 font-bold">Margem {margemGeralPct}%</span>
        </div>
      </div>

      {/* ================= GRÁFICO 1: FATURAMENTO DIÁRIO INTERATIVO (7 DIAS) ================= */}
      <div className="bg-zinc-950 p-5 rounded-3xl border border-purple-500/40 shadow-neon-purple space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Vendas dos Últimos 7 Dias
            </h3>
          </div>
          <span className="text-[10px] text-purple-300 font-mono">Toque nas barras</span>
        </div>

        {/* Barras Interativas com altura calculada */}
        <div className="flex items-end justify-between gap-1.5 h-36 pt-4 px-1">
          {ultimos7Dias.map((dia: any, idx: number) => {
            const perc = Math.max(12, Math.round((dia.faturamento / maxFaturamentoDia) * 100));
            const isSelected = selectedDia?.data === dia.data;

            return (
              <div
                key={idx}
                onClick={() => setSelectedDia(dia)}
                className="flex-1 flex flex-col items-center gap-1.5 cursor-pointer group"
              >
                {/* Tooltip / Valor acima da barra */}
                <span className={`text-[9px] font-mono transition-all ${isSelected ? 'text-purple-300 font-bold scale-110' : 'text-zinc-500'}`}>
                  {dia.faturamento > 0 ? `R$${Math.round(dia.faturamento)}` : '0'}
                </span>

                {/* Coluna da Barra */}
                <div className="w-full bg-zinc-900 rounded-xl h-24 flex items-end p-0.5 overflow-hidden">
                  <div
                    className={`w-full rounded-lg transition-all duration-300 ${
                      isSelected
                        ? 'bg-gradient-to-t from-purple-600 to-pink-400 shadow-[0_0_12px_rgba(176,38,255,0.7)]'
                        : 'bg-gradient-to-t from-purple-800/80 to-purple-500 group-hover:from-purple-600 group-hover:to-pink-500'
                    }`}
                    style={{ height: `${perc}%` }}
                  />
                </div>

                {/* Legenda do Dia */}
                <span className={`text-[10px] font-mono uppercase ${isSelected ? 'text-purple-300 font-black' : 'text-zinc-400'}`}>
                  {dia.diaSemana}
                </span>
              </div>
            );
          })}
        </div>

        {/* Detalhe do dia selecionado */}
        {selectedDia && (
          <div className="p-3 bg-purple-950/40 rounded-2xl border border-purple-500/40 text-xs flex items-center justify-between animate-in fade-in">
            <div>
              <span className="text-[10px] text-purple-300 font-bold uppercase block">
                Detalhes de {selectedDia.diaSemana} ({selectedDia.data})
              </span>
              <strong className="text-white text-sm font-mono">
                R$ {selectedDia.faturamento.toFixed(2)}
              </strong>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-xl bg-purple-500/20 text-purple-300 font-mono font-bold border border-purple-500/30">
              {selectedDia.pedidos} {selectedDia.pedidos === 1 ? 'pedido' : 'pedidos'}
            </span>
          </div>
        )}
      </div>

      {/* ================= GRÁFICO 2: FORMAS DE PAGAMENTO INTERATIVO ================= */}
      <div className="bg-zinc-950 p-5 rounded-3xl border border-emerald-500/40 shadow-neon-green space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Divisão por Forma de Pagamento
            </h3>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono">Proporção</span>
        </div>

        {/* Barra de Proporção Multicolorida Contínua */}
        <div className="w-full h-4 rounded-full overflow-hidden flex bg-zinc-900 p-0.5 border border-zinc-800">
          {distribuicaoPagamento.map((item: any, idx: number) => {
            if (item.porcentagem <= 0) return null;
            let cor = 'bg-emerald-400';
            if (item.forma === 'CARTAO_CREDITO' || item.forma === 'CARTAO_DEBITO') cor = 'bg-cyan-400';
            if (item.forma === 'DINHEIRO') cor = 'bg-yellow-400';
            if (item.forma === 'CREDIARIO') cor = 'bg-amber-500';

            return (
              <div
                key={idx}
                className={`${cor} h-full transition-all duration-300`}
                style={{ width: `${item.porcentagem}%` }}
                title={`${item.forma}: ${item.porcentagem}%`}
              />
            );
          })}
        </div>

        {/* Breakdown dos Meios de Pagamento com Cores Neon */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {distribuicaoPagamento.map((item: any, idx: number) => {
            let label = item.forma;
            let icon = <Banknote className="w-3.5 h-3.5 text-yellow-400" />;
            let borderCor = 'border-yellow-500/30 text-yellow-300';

            if (item.forma === 'PIX') {
              label = 'Pix';
              icon = <QrCode className="w-3.5 h-3.5 text-emerald-400" />;
              borderCor = 'border-emerald-500/30 text-emerald-300';
            } else if (item.forma.includes('CARTAO')) {
              label = item.forma === 'CARTAO_CREDITO' ? 'Cartão Crédito' : 'Cartão Débito';
              icon = <CreditCard className="w-3.5 h-3.5 text-cyan-400" />;
              borderCor = 'border-cyan-500/30 text-cyan-300';
            } else if (item.forma === 'CREDIARIO') {
              label = 'Crediário';
              icon = <Users className="w-3.5 h-3.5 text-amber-400" />;
              borderCor = 'border-amber-500/30 text-amber-300';
            }

            return (
              <div
                key={idx}
                className={`p-2.5 rounded-2xl bg-zinc-900/80 border ${borderCor} flex items-center justify-between`}
              >
                <div className="flex items-center gap-1.5">
                  {icon}
                  <span className="text-[11px] font-bold">{label}</span>
                </div>
                <div className="text-right font-mono">
                  <span className="font-bold block text-white text-[11px]">
                    R$ {item.valor.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-zinc-400">{item.porcentagem}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= TOP 5 CLIENTES QUE MAIS GASTAM (VIP) ================= */}
      <div className="bg-zinc-950 p-5 rounded-3xl border border-yellow-500/40 shadow-neon-yellow space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
          <div className="flex items-center gap-2 text-yellow-400">
            <Crown className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Top 5 Clientes que Mais Gastam
            </h3>
          </div>
          <button
            onClick={() => setActiveTab('crediario')}
            className="text-[10px] text-yellow-400 font-bold hover:underline"
          >
            Ver clientes
          </button>
        </div>

        {top5Clientes.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-4">Nenhum cliente com compras vinculadas ainda.</p>
        ) : (
          <div className="space-y-2">
            {top5Clientes.map((cli: any, idx: number) => {
              const medalhas = ['🥇', '🥈', '🥉', '4º', '5º'];
              const temDivida = cli.saldoDevedor > 0;

              return (
                <div
                  key={cli.id}
                  className="p-3 bg-zinc-900/70 rounded-2xl border border-zinc-800 flex items-center justify-between text-xs hover:border-yellow-500/30 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{medalhas[idx]}</span>
                    <div>
                      <strong className="text-white block font-bold">{cli.nome}</strong>
                      <span className="text-[10px] text-zinc-400">
                        {cli.qtdPedidos} {cli.qtdPedidos === 1 ? 'pedido' : 'pedidos'} •{' '}
                        {temDivida ? (
                          <span className="text-amber-400 font-bold">
                            Devendo R$ {cli.saldoDevedor.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold">Em dia</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-sm font-black text-yellow-400 block">
                      R$ {cli.totalGasto.toFixed(2)}
                    </span>
                    <span className="text-[9px] text-zinc-500">Total investido</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= PRODUTOS COM MENOS SAÍDAS (ESTOQUE PARADO / BAIXO GIRO) ================= */}
      <div className="bg-zinc-950 p-5 rounded-3xl border border-rose-500/40 shadow-neon-pink space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
          <div className="flex items-center gap-2 text-rose-400">
            <PackageX className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Produtos com Menor Saída (Baixo Giro)
            </h3>
          </div>
          <span className="text-[10px] text-rose-300 font-mono">Alerta Giro</span>
        </div>

        {produtosMenorSaida.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-4">Sem dados suficientes.</p>
        ) : (
          <div className="space-y-2">
            {produtosMenorSaida.map((prod: any, idx: number) => (
              <div
                key={idx}
                className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20 flex items-center justify-between text-xs"
              >
                <div>
                  <strong className="text-rose-200 block font-bold">{prod.nome}</strong>
                  <span className="text-[10px] text-zinc-400">
                    Apenas <strong className="text-rose-300">{prod.quantidade} un</strong> vendidas • Estoque parado:{' '}
                    <strong className="text-white">{prod.estoqueAtual} un</strong>
                  </span>
                </div>

                <div className="text-right font-mono">
                  <span className="text-xs font-black text-rose-400 block">
                    R$ {prod.capitalParado.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-zinc-500">Custo parado</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= TOP 5 MAIS VENDIDOS ================= */}
      <div className="bg-zinc-950 p-5 rounded-3xl border border-cyan-500/30 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
          <div className="flex items-center gap-2 text-cyan-400">
            <Award className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Produtos Mais Vendidos (Campeões)
            </h3>
          </div>
          <button
            onClick={() => setActiveTab('pedidos')}
            className="text-[10px] text-cyan-400 font-bold hover:underline"
          >
            Ver vendas
          </button>
        </div>

        <div className="space-y-2.5">
          {maisVendidos.map((prod: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-zinc-300">
                <span className="w-5 h-5 rounded-full bg-zinc-900 border border-zinc-800 text-cyan-400 flex items-center justify-center text-[10px] font-mono">
                  {idx + 1}
                </span>
                {prod.nome}
              </span>
              <span className="font-mono text-cyan-400 font-bold">
                {prod.quantidade} un • R$ {prod.faturamento.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
