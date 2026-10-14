'use client';

import React, { useState, useMemo } from 'react';
import { Produto, ConfiguracaoLoja, ConfiguracaoGas } from '@/types';
import { salvarConfigLocalEOnline, salvarProdutoLocalEOnline } from '@/lib/dataService';
import {
  Flame,
  Clock,
  Coins,
  Settings,
  Scale,
  ChefHat,
  Check,
  CheckCircle2,
  AlertCircle,
  Copy,
  Plus,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';

interface CalculadoraGasViewProps {
  produtos: Produto[];
  config?: ConfiguracaoLoja;
  onRefresh: () => void;
  onConfigUpdated?: (config: ConfiguracaoLoja) => void;
  onNavigateToReceitas?: () => void;
}

interface QueimadorPreset {
  id: string;
  nome: string;
  descricao: string;
  consumoGh: number; // gramas por hora
}

const QUEIMADORES_PRESETS: QueimadorPreset[] = [
  { id: 'pequena', nome: 'Boca Pequena', descricao: 'Chama baixa / banho-maria', consumoGh: 180 },
  { id: 'media', nome: 'Boca Média', descricao: 'Chama padrão do fogão', consumoGh: 225 },
  { id: 'grande', nome: 'Boca Grande / Tripla Chama', descricao: 'Chama alta / tacho', consumoGh: 350 },
  { id: 'forno', nome: 'Forno a Gás', descricao: 'Forno convencional 180°C - 200°C', consumoGh: 250 },
  { id: 'custom', nome: 'Personalizado', descricao: 'Informar consumo manual em g/h', consumoGh: 200 },
];

export default function CalculadoraGasView({
  produtos,
  config,
  onRefresh,
  onConfigUpdated,
  onNavigateToReceitas,
}: CalculadoraGasViewProps) {
  // Configurações do Botijão (obtidas da config ou padrão P-13 a R$ 115)
  const gasConfig: ConfiguracaoGas = useMemo(() => {
    return (
      config?.configGas || {
        nome: 'Botijão GLP P-13',
        pesoKg: 13,
        preco: 115.0,
      }
    );
  }, [config?.configGas]);

  // Modal para editar o botijão
  const [modalBotijaoOpen, setModalBotijaoOpen] = useState(false);
  const [editNomeBotijao, setEditNomeBotijao] = useState(gasConfig.nome);
  const [editPesoKg, setEditPesoKg] = useState(gasConfig.pesoKg.toString());
  const [editPreco, setEditPreco] = useState(gasConfig.preco.toString());
  const [savingConfig, setSavingConfig] = useState(false);

  // Parâmetros de cálculo
  const [selectedQueimadorId, setSelectedQueimadorId] = useState<string>('media');
  const [customConsumoGh, setCustomConsumoGh] = useState<string>('225');
  const [tempoMinutos, setTempoMinutos] = useState<number>(45);
  const [rendimentoLote, setRendimentoLote] = useState<string>('1');

  // Integração com receita
  const [selectedProdutoId, setSelectedProdutoId] = useState<string>('');
  const [aplicandoReceita, setAplicandoReceita] = useState(false);
  const [feedbackSucesso, setFeedbackSucesso] = useState('');
  const [copiado, setCopiado] = useState(false);

  // Consumo efetivo em g/h
  const consumoAtualGh = useMemo(() => {
    if (selectedQueimadorId === 'custom') {
      return Math.max(1, parseFloat(customConsumoGh.replace(',', '.')) || 200);
    }
    const preset = QUEIMADORES_PRESETS.find((q) => q.id === selectedQueimadorId);
    return preset ? preset.consumoGh : 225;
  }, [selectedQueimadorId, customConsumoGh]);

  // Cálculos de Custo de Gás
  const metricas = useMemo(() => {
    const pesoGramasTotal = (gasConfig.pesoKg || 13) * 1000;
    const precoTotal = gasConfig.preco || 115;
    const custoPorGrama = precoTotal / pesoGramasTotal;

    const horasUsadas = tempoMinutos / 60;
    const gramasConsumidas = consumoAtualGh * horasUsadas;
    const pctBotijao = (gramasConsumidas / pesoGramasTotal) * 100;

    const custoTotalPreparo = gramasConsumidas * custoPorGrama;
    const custoPorHora = consumoAtualGh * custoPorGrama;
    const custoPorMinuto = custoPorHora / 60;

    const rendimentoNum = Math.max(1, parseFloat(rendimentoLote.replace(',', '.')) || 1);
    const custoPorUnidade = custoTotalPreparo / rendimentoNum;

    return {
      custoPorGrama,
      horasUsadas,
      gramasConsumidas,
      pctBotijao,
      custoTotalPreparo,
      custoPorHora,
      custoPorMinuto,
      custoPorUnidade,
      rendimentoNum,
    };
  }, [gasConfig, consumoAtualGh, tempoMinutos, rendimentoLote]);

  // Salvar alterações do botijão
  const handleSaveBotijao = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const novoPeso = Math.max(0.1, parseFloat(editPesoKg.replace(',', '.')) || 13);
      const novoPreco = Math.max(0.01, parseFloat(editPreco.replace(',', '.')) || 115);
      const novoNome = editNomeBotijao.trim() || 'Botijão GLP';

      const novaConfigGas: ConfiguracaoGas = {
        nome: novoNome,
        pesoKg: novoPeso,
        preco: novoPreco,
      };

      const configAtualizada: ConfiguracaoLoja = {
        ...(config || {
          nomeLoja: 'Minha Loja',
          chavePix: '',
          tipoChavePix: 'CELULAR',
          titularPix: '',
        }),
        configGas: novaConfigGas,
      };

      if (onConfigUpdated) {
        onConfigUpdated(configAtualizada);
      }
      await salvarConfigLocalEOnline(configAtualizada);
      setModalBotijaoOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar configurações do botijão');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleOpenEditBotijao = () => {
    setEditNomeBotijao(gasConfig.nome);
    setEditPesoKg(gasConfig.pesoKg.toString());
    setEditPreco(gasConfig.preco.toString());
    setModalBotijaoOpen(true);
  };

  // Ajustes de tempo
  const adicionarTempo = (min: number) => {
    setTempoMinutos((prev) => Math.max(0, prev + min));
  };

  // Aplicar custo na receita
  const receitasFabricadas = useMemo(() => {
    return (produtos || []).filter((p) => p && p.tipo === 'FABRICADO');
  }, [produtos]);

  const produtoSelecionado = useMemo(() => {
    return receitasFabricadas.find((p) => p.id === selectedProdutoId);
  }, [receitasFabricadas, selectedProdutoId]);

  const handleAplicarNaReceita = async () => {
    if (!produtoSelecionado) return;
    setAplicandoReceita(true);
    setFeedbackSucesso('');

    try {
      const custoGasArredondado = Number(metricas.custoTotalPreparo.toFixed(2));
      const rendimentoReceita = produtoSelecionado.rendimentoReceita || 1;
      const custoUnitarioGas = custoGasArredondado / rendimentoReceita;

      // Recalcula o custo total unitário da receita
      const custoInsumos = produtoSelecionado.custoInsumos || 0;
      const custoUnitarioInsumos = custoInsumos / rendimentoReceita;
      const custoEmbalagem = produtoSelecionado.custoEmbalagem || 0;
      const custoMaoDeObra = produtoSelecionado.custoMaoDeObra || 0;

      const rateioFixos = custoEmbalagem + (custoMaoDeObra + custoGasArredondado) / rendimentoReceita;
      const novoCustoTotalUnitario = Number((custoUnitarioInsumos + rateioFixos).toFixed(2));

      // Atualiza o produto
      const produtoAtualizado: Produto = {
        ...produtoSelecionado,
        custoGasEnergia: custoGasArredondado,
        custoTotal: novoCustoTotalUnitario,
      };

      await salvarProdutoLocalEOnline(produtoAtualizado);
      setFeedbackSucesso(`Custo de R$ ${custoGasArredondado.toFixed(2)} aplicado na receita "${produtoSelecionado.nome}"!`);
      onRefresh();

      setTimeout(() => setFeedbackSucesso(''), 5000);
    } catch (err: any) {
      alert(err.message || 'Erro ao aplicar custo na receita');
    } finally {
      setAplicandoReceita(false);
    }
  };

  const handleCopiarResumo = () => {
    const qAtual = QUEIMADORES_PRESETS.find((q) => q.id === selectedQueimadorId);
    const texto = `🔥 *Cálculo de Custo com Gás - ${gasConfig.nome}*
• Queimador: ${qAtual?.nome || 'Personalizado'} (${consumoAtualGh} g/h)
• Tempo de Uso: ${tempoMinutos} min (${(tempoMinutos / 60).toFixed(2)}h)
• Gás Consumido: ${metricas.gramasConsumidas.toFixed(1)}g (${metricas.pctBotijao.toFixed(2)}% do botijão)
• Custo por Hora: R$ ${metricas.custoPorHora.toFixed(2)}/h
• *Custo Total do Preparo: R$ ${metricas.custoTotalPreparo.toFixed(2)}*
${metricas.rendimentoNum > 1 ? `• Custo por Unidade (${metricas.rendimentoNum} un): R$ ${metricas.custoPorUnidade.toFixed(2)}` : ''}`;

    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4 pb-24">
      {/* ================= BANNER NEON CHAMA ================= */}
      <div className="p-4 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black rounded-3xl border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.35)]">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                Calculadora de Gás GLP
              </span>
              <h2 className="text-base font-black text-white">Custo Real por Fogo</h2>
            </div>
          </div>

          <button
            onClick={handleOpenEditBotijao}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-amber-500/30 hover:border-amber-400 text-amber-300 text-xs font-bold transition-all active:scale-95 shadow-sm"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Editar Botijão</span>
          </button>
        </div>

        {/* Card Resumo do Botijão */}
        <div className="mt-3.5 p-3 rounded-2xl bg-black/60 border border-zinc-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-zinc-500 block uppercase font-bold">Botijão Configurado</span>
            <span className="font-bold text-white block">{gasConfig.nome} ({gasConfig.pesoKg} kg)</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-zinc-500 block uppercase font-bold">Preço Pago</span>
            <span className="font-black text-amber-400 font-mono text-sm">
              R$ {gasConfig.preco.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* ================= SELETOR DE QUEIMADOR ================= */}
      <div className="p-4 bg-zinc-950 rounded-3xl border border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>1. Tipo de Queimador / Chama</span>
          </label>
          <span className="text-[11px] font-mono font-bold text-amber-400">
            {consumoAtualGh} g/h
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {QUEIMADORES_PRESETS.map((q) => {
            const isSelected = selectedQueimadorId === q.id;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setSelectedQueimadorId(q.id)}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold block">{q.nome}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                </div>
                <span className="text-[10px] text-zinc-500 block mt-0.5 line-clamp-1">
                  {q.id === 'custom' ? 'Manual' : `${q.consumoGh} g/h • ${q.descricao}`}
                </span>
              </button>
            );
          })}
        </div>

        {/* Campo manual se selecionou personalizado */}
        {selectedQueimadorId === 'custom' && (
          <div className="pt-2">
            <label className="text-[10px] text-zinc-400 font-bold uppercase block mb-1">
              Consumo do Queimador (em gramas por hora - g/h):
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={customConsumoGh}
                onChange={(e) => setCustomConsumoGh(e.target.value)}
                placeholder="Ex: 220"
                className="w-full px-3 py-2 bg-zinc-900 border border-amber-500/40 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-400"
              />
              <span className="absolute right-3 top-2.5 text-xs text-zinc-500 font-mono">g/h</span>
            </div>
          </div>
        )}
      </div>

      {/* ================= SELETOR DE TEMPO DE FOGO ================= */}
      <div className="p-4 bg-zinc-950 rounded-3xl border border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>2. Tempo de Chama Acesa</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black font-mono text-white">
              {Math.floor(tempoMinutos / 60)}h {tempoMinutos % 60}m
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">({tempoMinutos} min)</span>
          </div>
        </div>

        {/* Slider e Input */}
        <div className="space-y-2">
          <input
            type="range"
            min={1}
            max={240}
            step={1}
            value={tempoMinutos}
            onChange={(e) => setTempoMinutos(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer h-2 bg-zinc-800 rounded-lg"
          />

          {/* Botões Rápidos de Tempo */}
          <div className="grid grid-cols-5 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => adicionarTempo(5)}
              className="py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-300 active:scale-95"
            >
              +5m
            </button>
            <button
              type="button"
              onClick={() => adicionarTempo(15)}
              className="py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-300 active:scale-95"
            >
              +15m
            </button>
            <button
              type="button"
              onClick={() => adicionarTempo(30)}
              className="py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-300 active:scale-95"
            >
              +30m
            </button>
            <button
              type="button"
              onClick={() => adicionarTempo(60)}
              className="py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-300 active:scale-95"
            >
              +1h
            </button>
            <button
              type="button"
              onClick={() => setTempoMinutos(0)}
              title="Zerar"
              className="py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-rose-400 active:scale-95 flex items-center justify-center"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Rendimento Opcional da Receita */}
        <div className="pt-2 border-t border-zinc-900 flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-zinc-300 block">Rendimento do Lote</span>
            <span className="text-[10px] text-zinc-500">Para calcular custo por unidade</span>
          </div>
          <div className="w-24">
            <input
              type="text"
              inputMode="numeric"
              value={rendimentoLote}
              onChange={(e) => setRendimentoLote(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-right text-xs font-mono text-white focus:outline-none focus:border-amber-400"
              placeholder="Ex: 30"
            />
          </div>
        </div>
      </div>

      {/* ================= RESULTADO DO CÁLCULO ================= */}
      <div className="p-5 bg-zinc-950 rounded-3xl border border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.25)] space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Coins className="w-4 h-4" />
            <span>Resultado do Gasto</span>
          </span>
          <button
            onClick={handleCopiarResumo}
            className="flex items-center gap-1 text-[11px] font-bold text-zinc-400 hover:text-amber-400 transition-colors"
          >
            {copiado ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>

        {/* Destaque Principal do Custo Total */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">Custo Total de Gás</span>
            <span className="text-3xl font-black text-white font-mono mt-0.5 block">
              R$ {metricas.custoTotalPreparo.toFixed(2)}
            </span>
            <span className="text-[11px] text-zinc-400 font-mono">
              {metricas.gramasConsumidas.toFixed(1)}g ({metricas.pctBotijao.toFixed(2)}% do botijão)
            </span>
          </div>

          {metricas.rendimentoNum > 1 && (
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">Por Unidade</span>
              <span className="text-xl font-black text-amber-400 font-mono block">
                R$ {metricas.custoPorUnidade.toFixed(3)}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {metricas.rendimentoNum} unidades
              </span>
            </div>
          )}
        </div>

        {/* Métricas Detalhadas */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-[10px] text-zinc-500 block uppercase font-bold">Custo por Hora</span>
            <span className="font-mono font-black text-white text-sm">
              R$ {metricas.custoPorHora.toFixed(2)} /h
            </span>
          </div>
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-[10px] text-zinc-500 block uppercase font-bold">Custo por Minuto</span>
            <span className="font-mono font-black text-white text-sm">
              R$ {metricas.custoPorMinuto.toFixed(3)} /min
            </span>
          </div>
        </div>
      </div>

      {/* ================= APLICAR NA FICHA TÉCNICA / RECEITA ================= */}
      <div className="p-4 bg-zinc-950 rounded-3xl border border-zinc-800/80 space-y-3">
        <div className="flex items-center gap-2">
          <ChefHat className="w-4 h-4 text-rose-400" />
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-white block">
              Aplicar este Custo em uma Receita
            </span>
            <span className="text-[10px] text-zinc-500 block">
              Atualiza automaticamente a ficha técnica e a margem de lucro
            </span>
          </div>
        </div>

        {feedbackSucesso && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-emerald-400 text-xs font-bold animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackSucesso}</span>
          </div>
        )}

        <div className="space-y-2">
          <select
            value={selectedProdutoId}
            onChange={(e) => setSelectedProdutoId(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
          >
            <option value="">Selecione uma receita cadastrada...</option>
            {receitasFabricadas.map((prod) => (
              <option key={prod.id} value={prod.id}>
                {prod.nome} (Atual: R$ {(prod.custoGasEnergia || 0).toFixed(2)})
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={!selectedProdutoId || aplicandoReceita}
            onClick={handleAplicarNaReceita}
            className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              !selectedProdutoId || aplicandoReceita
                ? 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)] active:scale-98'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {aplicandoReceita
                ? 'Salvando na Ficha Técnica...'
                : `Salvar R$ ${metricas.custoTotalPreparo.toFixed(2)} nesta Receita`}
            </span>
          </button>
        </div>
      </div>

      {/* ================= MODAL EDITAR BOTIJÃO ================= */}
      {modalBotijaoOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-amber-500/40 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Configurações do Botijão
                </h3>
              </div>
              <button
                onClick={() => setModalBotijaoOpen(false)}
                className="w-7 h-7 rounded-full bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBotijao} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">
                  Nome / Modelo do Botijão
                </label>
                <input
                  type="text"
                  value={editNomeBotijao}
                  onChange={(e) => setEditNomeBotijao(e.target.value)}
                  placeholder="Ex: Botijão GLP P-13"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">
                    Peso Líquido (kg)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editPesoKg}
                    onChange={(e) => setEditPesoKg(e.target.value)}
                    placeholder="13"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">
                    Preço Pago (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editPreco}
                    onChange={(e) => setEditPreco(e.target.value)}
                    placeholder="115.00"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalBotijaoOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                >
                  {savingConfig ? 'Salvando...' : 'Salvar Botijão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
