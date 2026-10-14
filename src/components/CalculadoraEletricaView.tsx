'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Produto, ConfiguracaoLoja, MaquinaEletrica } from '@/types';
import { salvarConfigLocalEOnline, salvarProdutoLocalEOnline } from '@/lib/dataService';
import {
  Zap,
  Clock,
  Coins,
  Settings,
  Plus,
  Edit2,
  Trash2,
  Check,
  CheckCircle2,
  Sparkles,
  ChefHat,
  Copy,
  RotateCcw,
  AlertTriangle,
  Info,
  Plug,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface CalculadoraEletricaViewProps {
  produtos: Produto[];
  config?: ConfiguracaoLoja;
  onRefresh: () => void;
  onConfigUpdated?: (config: ConfiguracaoLoja) => void;
  onNavigateToReceitas?: () => void;
}

interface PresetMaquina {
  nome: string;
  potenciaWatts: number;
  tempoUsoPadraoMinutos: number;
  horasUsoDiario: number;
}

const PRESETS_MAQUINAS: PresetMaquina[] = [
  { nome: 'Batedeira Planetária', potenciaWatts: 500, tempoUsoPadraoMinutos: 15, horasUsoDiario: 2 },
  { nome: 'Forno Elétrico Convector', potenciaWatts: 2000, tempoUsoPadraoMinutos: 45, horasUsoDiario: 4 },
  { nome: 'Panela Mexedora de Doces', potenciaWatts: 150, tempoUsoPadraoMinutos: 30, horasUsoDiario: 3 },
  { nome: 'Liquidificador Industrial', potenciaWatts: 800, tempoUsoPadraoMinutos: 10, horasUsoDiario: 1 },
  { nome: 'Seladora de Embalagens', potenciaWatts: 300, tempoUsoPadraoMinutos: 15, horasUsoDiario: 1 },
  { nome: 'Freezer / Refrigerador Comercial', potenciaWatts: 250, tempoUsoPadraoMinutos: 60, horasUsoDiario: 24 },
  { nome: 'Fogão de Indução (1 Boca)', potenciaWatts: 2000, tempoUsoPadraoMinutos: 30, horasUsoDiario: 3 },
  { nome: 'Micro-ondas 30L', potenciaWatts: 1200, tempoUsoPadraoMinutos: 10, horasUsoDiario: 1 },
];

export default function CalculadoraEletricaView({
  produtos,
  config,
  onRefresh,
  onConfigUpdated,
  onNavigateToReceitas,
}: CalculadoraEletricaViewProps) {
  // Tarifa em R$/kWh (padrão R$ 0.95 ou obtida da config)
  const tarifaKwh: number = useMemo(() => {
    return typeof config?.tarifaKwh === 'number' && config.tarifaKwh > 0 ? config.tarifaKwh : 0.95;
  }, [config?.tarifaKwh]);

  // Lista de máquinas cadastradas
  const maquinas: MaquinaEletrica[] = useMemo(() => {
    return Array.isArray(config?.maquinasEletricas) ? config.maquinasEletricas : [];
  }, [config?.maquinasEletricas]);

  // Estado para editar tarifa
  const [modalTarifaOpen, setModalTarifaOpen] = useState(false);
  const [editTarifa, setEditTarifa] = useState(tarifaKwh.toString());
  const [savingTarifa, setSavingTarifa] = useState(false);

  // Estado para Criar / Editar Máquina
  const [modalMaquinaOpen, setModalMaquinaOpen] = useState(false);
  const [editingMaquina, setEditingMaquina] = useState<MaquinaEletrica | null>(null);
  const [nomeMaquina, setNomeMaquina] = useState('');
  const [potenciaWatts, setPotenciaWatts] = useState('500');
  const [tempoMinutosPadrao, setTempoMinutosPadrao] = useState('30');
  const [horasUsoDiario, setHorasUsoDiario] = useState('2');
  const [savingMaquina, setSavingMaquina] = useState(false);

  // Auxiliar conversor de Volts x Amperes para Watts
  const [showConversorVA, setShowConversorVA] = useState(false);
  const [volts, setVolts] = useState('220');
  const [amperes, setAmperes] = useState('2.5');

  // Estado para Excluir Máquina
  const [modalExcluirOpen, setModalExcluirOpen] = useState(false);
  const [maquinaParaExcluir, setMaquinaParaExcluir] = useState<MaquinaEletrica | null>(null);
  const [deletingMaquina, setDeletingMaquina] = useState(false);

  // Seleção de Máquinas no Simulador da Produção
  const [selectedMaquinasIds, setSelectedMaquinasIds] = useState<string[]>([]);
  // Mapa de tempo em minutos por máquina para permitir que cada máquina tenha seu tempo de uso real no lote
  const [temposPorMaquina, setTemposPorMaquina] = useState<Record<string, number>>({});
  const [rendimentoLote, setRendimentoLote] = useState<string>('1');

  // Toast / Feedback rápido
  const [feedbackRapido, setFeedbackRapido] = useState('');
  const [copiado, setCopiado] = useState(false);

  // Integração com Receitas
  const [selectedProdutoId, setSelectedProdutoId] = useState<string>('');
  const [modoAplicacao, setModoAplicacao] = useState<'somar' | 'substituir'>('somar');
  const [aplicandoReceita, setAplicandoReceita] = useState(false);
  const [feedbackSucesso, setFeedbackSucesso] = useState('');

  // Ao carregar ou receber novas máquinas, inicializa os tempos e garante seleção inicial se necessário
  useEffect(() => {
    if (maquinas.length > 0) {
      setTemposPorMaquina((prev) => {
        const next = { ...prev };
        maquinas.forEach((m) => {
          if (next[m.id] === undefined) {
            next[m.id] = m.tempoUsoPadraoMinutos || 30;
          }
        });
        return next;
      });

      setSelectedMaquinasIds((prev) => {
        if (prev.length === 0) {
          return [maquinas[0].id];
        }
        return prev;
      });
    }
  }, [maquinas]);

  // Converter VA para Watts
  const handleCalcularWatts = () => {
    const v = parseFloat(volts.replace(',', '.')) || 0;
    const a = parseFloat(amperes.replace(',', '.')) || 0;
    const calcWatts = Math.round(v * a);
    if (calcWatts > 0) {
      setPotenciaWatts(calcWatts.toString());
    }
  };

  // Abrir Modal de Nova Máquina
  const handleOpenNovaMaquina = () => {
    setEditingMaquina(null);
    setNomeMaquina('');
    setPotenciaWatts('500');
    setTempoMinutosPadrao('30');
    setHorasUsoDiario('2');
    setShowConversorVA(false);
    setModalMaquinaOpen(true);
  };

  // Adicionar preset rápido com 1 toque diretamente
  const handleAdicionarPresetRapido = async (preset: PresetMaquina) => {
    const novaMaq: MaquinaEletrica = {
      id: `maq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      nome: preset.nome,
      potenciaWatts: preset.potenciaWatts,
      tempoUsoPadraoMinutos: preset.tempoUsoPadraoMinutos,
      horasUsoDiario: preset.horasUsoDiario,
    };

    const novaListaMaquinas = [...maquinas, novaMaq];

    const configAtualizada: ConfiguracaoLoja = {
      ...(config || {
        nomeLoja: 'Minha Loja',
        chavePix: '',
        tipoChavePix: 'CELULAR',
        titularPix: '',
      }),
      maquinasEletricas: novaListaMaquinas,
    };

    if (onConfigUpdated) onConfigUpdated(configAtualizada);
    await salvarConfigLocalEOnline(configAtualizada);

    setSelectedMaquinasIds((prev) => [...prev, novaMaq.id]);
    setTemposPorMaquina((prev) => ({
      ...prev,
      [novaMaq.id]: preset.tempoUsoPadraoMinutos,
    }));

    onRefresh();
    setFeedbackRapido(`Máquina "${preset.nome}" adicionada com sucesso!`);
    setTimeout(() => setFeedbackRapido(''), 3000);
  };

  // Abrir Modal de Edição de Máquina
  const handleOpenEditMaquina = (maq: MaquinaEletrica) => {
    setEditingMaquina(maq);
    setNomeMaquina(maq.nome);
    setPotenciaWatts(maq.potenciaWatts.toString());
    setTempoMinutosPadrao((maq.tempoUsoPadraoMinutos || 30).toString());
    setHorasUsoDiario((maq.horasUsoDiario || 2).toString());
    setShowConversorVA(false);
    setModalMaquinaOpen(true);
  };

  // Salvar Máquina (Criar ou Atualizar)
  const handleSaveMaquina = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeMaquina.trim()) return;
    setSavingMaquina(true);

    try {
      const watts = Math.max(1, parseFloat(potenciaWatts.replace(',', '.')) || 500);
      const minPadrao = Math.max(1, parseInt(tempoMinutosPadrao) || 30);
      const horasDia = Math.max(0.1, parseFloat(horasUsoDiario.replace(',', '.')) || 2);

      let novaListaMaquinas: MaquinaEletrica[] = [...maquinas];

      if (editingMaquina) {
        novaListaMaquinas = novaListaMaquinas.map((m) =>
          m.id === editingMaquina.id
            ? {
                ...m,
                nome: nomeMaquina.trim(),
                potenciaWatts: watts,
                tempoUsoPadraoMinutos: minPadrao,
                horasUsoDiario: horasDia,
              }
            : m
        );
      } else {
        const novaMaq: MaquinaEletrica = {
          id: `maq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          nome: nomeMaquina.trim(),
          potenciaWatts: watts,
          tempoUsoPadraoMinutos: minPadrao,
          horasUsoDiario: horasDia,
        };
        novaListaMaquinas.push(novaMaq);
        setSelectedMaquinasIds((prev) => [...prev, novaMaq.id]);
        setTemposPorMaquina((prev) => ({
          ...prev,
          [novaMaq.id]: minPadrao,
        }));
      }

      const configAtualizada: ConfiguracaoLoja = {
        ...(config || {
          nomeLoja: 'Minha Loja',
          chavePix: '',
          tipoChavePix: 'CELULAR',
          titularPix: '',
        }),
        maquinasEletricas: novaListaMaquinas,
      };

      if (onConfigUpdated) onConfigUpdated(configAtualizada);
      await salvarConfigLocalEOnline(configAtualizada);
      setModalMaquinaOpen(false);
      onRefresh();

      setFeedbackRapido(editingMaquina ? 'Máquina atualizada!' : 'Máquina cadastrada!');
      setTimeout(() => setFeedbackRapido(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar máquina');
    } finally {
      setSavingMaquina(false);
    }
  };

  // Confirmar Exclusão de Máquina
  const handleConfirmarExcluirMaquina = async () => {
    if (!maquinaParaExcluir) return;
    setDeletingMaquina(true);

    try {
      const novaLista = maquinas.filter((m) => m.id !== maquinaParaExcluir.id);
      setSelectedMaquinasIds((prev) => prev.filter((id) => id !== maquinaParaExcluir.id));

      const configAtualizada: ConfiguracaoLoja = {
        ...(config || {
          nomeLoja: 'Minha Loja',
          chavePix: '',
          tipoChavePix: 'CELULAR',
          titularPix: '',
        }),
        maquinasEletricas: novaLista,
      };

      if (onConfigUpdated) onConfigUpdated(configAtualizada);
      await salvarConfigLocalEOnline(configAtualizada);
      setModalExcluirOpen(false);
      setMaquinaParaExcluir(null);
      onRefresh();

      setFeedbackRapido('Máquina excluída com sucesso.');
      setTimeout(() => setFeedbackRapido(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir máquina');
    } finally {
      setDeletingMaquina(false);
    }
  };

  // Salvar Tarifa de Energia
  const handleSaveTarifa = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTarifa(true);
    try {
      const tarifaNum = Math.max(0.01, parseFloat(editTarifa.replace(',', '.')) || 0.95);
      const configAtualizada: ConfiguracaoLoja = {
        ...(config || {
          nomeLoja: 'Minha Loja',
          chavePix: '',
          tipoChavePix: 'CELULAR',
          titularPix: '',
        }),
        tarifaKwh: tarifaNum,
      };

      if (onConfigUpdated) onConfigUpdated(configAtualizada);
      await salvarConfigLocalEOnline(configAtualizada);
      setModalTarifaOpen(false);
      onRefresh();

      setFeedbackRapido('Tarifa atualizada com sucesso!');
      setTimeout(() => setFeedbackRapido(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar tarifa');
    } finally {
      setSavingTarifa(false);
    }
  };

  // Alternar seleção de máquina para o cálculo combinado
  const toggleSelectMaquina = (id: string) => {
    setSelectedMaquinasIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
    });
  };

  // Ajustar tempo individual de uma máquina
  const handleAjustarTempoMaquina = (maqId: string, deltaMinutos: number) => {
    setTemposPorMaquina((prev) => {
      const atual = prev[maqId] !== undefined ? prev[maqId] : 30;
      return {
        ...prev,
        [maqId]: Math.max(0, atual + deltaMinutos),
      };
    });
  };

  const handleSetTempoMaquina = (maqId: string, minutos: number) => {
    setTemposPorMaquina((prev) => ({
      ...prev,
      [maqId]: Math.max(0, minutos),
    }));
  };

  // Aplicar um tempo geral para todas as máquinas ativas
  const handleAplicarTempoGeral = (min: number) => {
    setTemposPorMaquina((prev) => {
      const next = { ...prev };
      selectedMaquinasIds.forEach((id) => {
        next[id] = Math.max(0, min);
      });
      return next;
    });
  };

  // Máquinas ativas no cálculo
  const maquinasAtivas = useMemo(() => {
    return maquinas.filter((m) => selectedMaquinasIds.includes(m.id));
  }, [maquinas, selectedMaquinasIds]);

  // Cálculos de Energia Elétrica Precisa (Máquina por Máquina)
  const metricas = useMemo(() => {
    let kwhConsumidoTotal = 0;
    let custoTotalCiclo = 0;
    let somaPotenciaWatts = 0;
    let somaCustoHora = 0;
    let somaProjecaoMensal = 0;

    const detalhesMaquinas = maquinasAtivas.map((maq) => {
      const minutos = temposPorMaquina[maq.id] !== undefined ? temposPorMaquina[maq.id] : (maq.tempoUsoPadraoMinutos || 30);
      const horas = minutos / 60;
      const kwh = (maq.potenciaWatts * horas) / 1000;
      const custo = kwh * tarifaKwh;
      const custoHora = (maq.potenciaWatts / 1000) * tarifaKwh;

      const horasDia = maq.horasUsoDiario || 2;
      const custoMensal = (maq.potenciaWatts * horasDia / 1000) * 30 * tarifaKwh;

      kwhConsumidoTotal += kwh;
      custoTotalCiclo += custo;
      somaPotenciaWatts += maq.potenciaWatts;
      somaCustoHora += custoHora;
      somaProjecaoMensal += custoMensal;

      return {
        id: maq.id,
        nome: maq.nome,
        potenciaWatts: maq.potenciaWatts,
        minutos,
        horas,
        kwh,
        custo,
        custoHora,
        custoMensal,
      };
    });

    const rendimentoNum = Math.max(1, parseFloat(rendimentoLote.replace(',', '.')) || 1);
    const custoPorUnidade = custoTotalCiclo / rendimentoNum;
    const custoPorMinuto = somaCustoHora / 60;

    return {
      detalhesMaquinas,
      somaPotenciaWatts,
      kwhConsumidoTotal,
      custoTotalCiclo,
      somaCustoHora,
      custoPorMinuto,
      custoPorUnidade,
      rendimentoNum,
      somaProjecaoMensal,
    };
  }, [maquinasAtivas, temposPorMaquina, tarifaKwh, rendimentoLote]);

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
      const custoEletricoAdicionar = Number(metricas.custoTotalCiclo.toFixed(2));
      const custoGasAtual = produtoSelecionado.custoGasEnergia || 0;

      const novoCustoGasEnergia =
        modoAplicacao === 'somar'
          ? Number((custoGasAtual + custoEletricoAdicionar).toFixed(2))
          : custoEletricoAdicionar;

      const rendimentoReceita = produtoSelecionado.rendimentoReceita || 1;
      const custoInsumos = produtoSelecionado.custoInsumos || 0;
      const custoUnitarioInsumos = custoInsumos / rendimentoReceita;
      const custoEmbalagem = produtoSelecionado.custoEmbalagem || 0;
      const custoMaoDeObra = produtoSelecionado.custoMaoDeObra || 0;

      const rateioFixos = custoEmbalagem + (custoMaoDeObra + novoCustoGasEnergia) / rendimentoReceita;
      const novoCustoTotalUnitario = Number((custoUnitarioInsumos + rateioFixos).toFixed(2));

      const produtoAtualizado: Produto = {
        ...produtoSelecionado,
        custoGasEnergia: novoCustoGasEnergia,
        custoTotal: novoCustoTotalUnitario,
      };

      await salvarProdutoLocalEOnline(produtoAtualizado);
      setFeedbackSucesso(
        `Custo elétrico de R$ ${custoEletricoAdicionar.toFixed(2)} aplicado na receita "${produtoSelecionado.nome}" (Total Gás/Energia: R$ ${novoCustoGasEnergia.toFixed(2)})!`
      );
      onRefresh();

      setTimeout(() => setFeedbackSucesso(''), 5000);
    } catch (err: any) {
      alert(err.message || 'Erro ao aplicar custo elétrico');
    } finally {
      setAplicandoReceita(false);
    }
  };

  const handleCopiarResumo = () => {
    const linhas = metricas.detalhesMaquinas.map(
      (d) => `• ${d.nome} (${d.potenciaWatts}W): ${d.minutos} min -> ${d.kwh.toFixed(3)} kWh (R$ ${d.custo.toFixed(2)})`
    );

    const texto = `⚡ *Cálculo de Consumo Elétrico - Tarifa: R$ ${tarifaKwh.toFixed(2)}/kWh*
${linhas.join('\n') || '• Nenhuma máquina selecionada'}
------------------------------------
• Potência Total Ativa: ${metricas.somaPotenciaWatts} Watts
• Consumo Total: ${metricas.kwhConsumidoTotal.toFixed(3)} kWh
• Custo por Hora: R$ ${metricas.somaCustoHora.toFixed(2)}/h
• *Custo Total da Produção: R$ ${metricas.custoTotalCiclo.toFixed(2)}*
${metricas.rendimentoNum > 1 ? `• Custo por Unidade (${metricas.rendimentoNum} un): R$ ${metricas.custoPorUnidade.toFixed(3)}` : ''}`;

    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4 pb-24">
      {/* ================= BANNER NEON ELÉTRICO ================= */}
      <div className="p-4 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black rounded-3xl border border-yellow-500/40 shadow-[0_0_20px_rgba(234,179,8,0.2)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.35)]">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-yellow-400 block">
                Calculadora Elétrica & Máquinas
              </span>
              <h2 className="text-base font-black text-white">Consumo & Custo das Máquinas</h2>
            </div>
          </div>

          <button
            onClick={() => {
              setEditTarifa(tarifaKwh.toString());
              setModalTarifaOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-yellow-500/30 hover:border-yellow-400 text-yellow-300 text-xs font-bold transition-all active:scale-95 shadow-sm"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Editar Tarifa</span>
          </button>
        </div>

        {/* Card Resumo da Tarifa da Concessionária */}
        <div className="mt-3.5 p-3 rounded-2xl bg-black/60 border border-zinc-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-zinc-500 block uppercase font-bold">Tarifa de Energia</span>
            <span className="font-bold text-white block">Conta de Luz Local</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-zinc-500 block uppercase font-bold">Preço do kWh</span>
            <span className="font-black text-yellow-400 font-mono text-sm">
              R$ {tarifaKwh.toFixed(2)} / kWh
            </span>
          </div>
        </div>
      </div>

      {/* Toast Feedback */}
      {feedbackRapido && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-emerald-400 text-xs font-bold animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedbackRapido}</span>
        </div>
      )}

      {/* ================= GESTÃO DE MÁQUINAS CADASTRADAS ================= */}
      <div className="p-4 bg-zinc-950 rounded-3xl border border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Plug className="w-4 h-4 text-yellow-400" />
              <span>Minhas Máquinas ({maquinas.length})</span>
            </label>
            <span className="text-[10px] text-zinc-500">
              Marque as máquinas que você vai usar nesta produção
            </span>
          </div>

          <button
            onClick={handleOpenNovaMaquina}
            className="flex items-center gap-1 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl text-xs font-black shadow-[0_0_12px_rgba(234,179,8,0.4)] active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Máquina</span>
          </button>
        </div>

        {/* Lista de Máquinas com controle individual de tempo de uso no lote */}
        {maquinas.length === 0 ? (
          <div className="p-5 text-center bg-zinc-900/40 rounded-2xl border border-zinc-800/80 space-y-2">
            <Plug className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-xs text-zinc-400 font-medium">Nenhuma máquina cadastrada ainda.</p>
            <p className="text-[11px] text-zinc-500">
              Toque abaixo em um dos equipamentos para adicionar com 1 clique:
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {maquinas.map((maq) => {
              const isSelected = selectedMaquinasIds.includes(maq.id);
              const minutosUso = temposPorMaquina[maq.id] !== undefined ? temposPorMaquina[maq.id] : (maq.tempoUsoPadraoMinutos || 30);
              const horasUso = minutosUso / 60;
              const kwhCiclo = (maq.potenciaWatts * horasUso) / 1000;
              const custoCiclo = kwhCiclo * tarifaKwh;
              const custoPorHoraMaq = (maq.potenciaWatts / 1000) * tarifaKwh;

              const horasDia = maq.horasUsoDiario || 2;
              const custoMensalEst = (maq.potenciaWatts * horasDia / 1000) * 30 * tarifaKwh;

              return (
                <div
                  key={maq.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-yellow-500/10 border-yellow-500/60 shadow-[0_0_12px_rgba(234,179,8,0.15)]'
                      : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {/* Checkbox e Nome */}
                    <button
                      type="button"
                      onClick={() => toggleSelectMaquina(maq.id)}
                      className="flex-1 text-left flex items-start gap-2.5 mr-2"
                    >
                      <div
                        className={`w-5 h-5 rounded-lg border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-yellow-500 border-yellow-400 text-black'
                            : 'border-zinc-700 bg-zinc-950 text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 font-black stroke-[3]" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block line-clamp-1">{maq.nome}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono font-bold text-yellow-400">
                            {maq.potenciaWatts} W
                          </span>
                          <span className="text-[10px] text-zinc-500">•</span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            R$ {custoPorHoraMaq.toFixed(2)}/h
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* Botões de Ação: Editar e Excluir */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditMaquina(maq);
                        }}
                        title="Editar Máquina"
                        className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-yellow-500/50 text-zinc-400 hover:text-yellow-400 transition-colors active:scale-95"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMaquinaParaExcluir(maq);
                          setModalExcluirOpen(true);
                        }}
                        title="Excluir Máquina"
                        className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-rose-500/50 text-zinc-400 hover:text-rose-400 transition-colors active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Controle de Tempo do Lote se a máquina estiver selecionada */}
                  {isSelected && (
                    <div className="mt-3 pt-2.5 border-t border-zinc-800/80 space-y-2 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-300 uppercase flex items-center gap-1">
                          <Clock className="w-3 h-3 text-yellow-400" />
                          <span>Tempo nesta produção:</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-zinc-400">
                            {kwhCiclo.toFixed(3)} kWh
                          </span>
                          <span className="text-xs font-black font-mono text-yellow-400">
                            R$ {custoCiclo.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Ajuste de Minutos */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAjustarTempoMaquina(maq.id, -10)}
                          className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-[10px] font-bold text-zinc-300 active:scale-95"
                        >
                          -10m
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAjustarTempoMaquina(maq.id, -5)}
                          className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-[10px] font-bold text-zinc-300 active:scale-95"
                        >
                          -5m
                        </button>
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min="0"
                            value={minutosUso}
                            onChange={(e) => handleSetTempoMaquina(maq.id, parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 bg-zinc-950 border border-yellow-500/40 rounded-lg text-center text-xs font-mono font-bold text-white focus:outline-none focus:border-yellow-400"
                          />
                          <span className="absolute right-2 top-1 text-[10px] text-zinc-500">min</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAjustarTempoMaquina(maq.id, 5)}
                          className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-[10px] font-bold text-zinc-300 active:scale-95"
                        >
                          +5m
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAjustarTempoMaquina(maq.id, 15)}
                          className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-[10px] font-bold text-zinc-300 active:scale-95"
                        >
                          +15m
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Projeção mensal discreta */}
                  <div className="mt-2 pt-1.5 border-t border-zinc-850 flex items-center justify-between text-[10px] text-zinc-500">
                    <span>Mês (~{horasDia}h/dia):</span>
                    <span className="font-mono text-zinc-400">
                      <strong className="text-white">R$ {custoMensalEst.toFixed(2)}</strong> / mês
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Presets Rápidos com 1 Toque */}
        <div className="pt-2 border-t border-zinc-900">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
            Adicionar Pré-Cadastrados Rápidos (1 Toque):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS_MAQUINAS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAdicionarPresetRapido(preset)}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-medium text-zinc-300 hover:text-yellow-300 hover:border-yellow-500/40 transition-colors flex items-center gap-1 active:scale-95"
              >
                <Plus className="w-3 h-3 text-yellow-500" />
                <span>{preset.nome}</span>
                <span className="text-zinc-500 font-mono">({preset.potenciaWatts}W)</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ================= AJUSTE RÁPIDO GERAL DE TEMPO E RENDIMENTO ================= */}
      {maquinasAtivas.length > 0 && (
        <div className="p-4 bg-zinc-950 rounded-3xl border border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span>Ajustar Todas as Máquinas Ativas ({maquinasAtivas.length})</span>
            </span>
            <span className="text-[10px] text-zinc-500">Tempo simultâneo</span>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            <button
              type="button"
              onClick={() => handleAplicarTempoGeral(15)}
              className="py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-300 active:scale-95"
            >
              15m
            </button>
            <button
              type="button"
              onClick={() => handleAplicarTempoGeral(30)}
              className="py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-300 active:scale-95"
            >
              30m
            </button>
            <button
              type="button"
              onClick={() => handleAplicarTempoGeral(45)}
              className="py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-300 active:scale-95"
            >
              45m
            </button>
            <button
              type="button"
              onClick={() => handleAplicarTempoGeral(60)}
              className="py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-300 active:scale-95"
            >
              1h
            </button>
            <button
              type="button"
              onClick={() => handleAplicarTempoGeral(0)}
              title="Zerar"
              className="py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-rose-400 active:scale-95 flex items-center justify-center"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Rendimento Opcional da Receita */}
          <div className="pt-2 border-t border-zinc-900 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-zinc-300 block">Rendimento do Lote</span>
              <span className="text-[10px] text-zinc-500">Para calcular o custo por unidade/fatia</span>
            </div>
            <div className="w-24">
              <input
                type="text"
                inputMode="numeric"
                value={rendimentoLote}
                onChange={(e) => setRendimentoLote(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-right text-xs font-mono text-white focus:outline-none focus:border-yellow-400"
                placeholder="Ex: 30"
              />
            </div>
          </div>
        </div>
      )}

      {/* ================= RESULTADO DETALHADO DO CONSUMO ================= */}
      <div className="p-5 bg-zinc-950 rounded-3xl border border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.25)] space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
            <Coins className="w-4 h-4" />
            <span>Resultado do Consumo Elétrico</span>
          </span>
          <button
            onClick={handleCopiarResumo}
            className="flex items-center gap-1 text-[11px] font-bold text-zinc-400 hover:text-yellow-400 transition-colors"
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

        {/* Destaque Principal do Custo do Ciclo */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent border border-yellow-500/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">Custo Total de Energia</span>
            <span className="text-3xl font-black text-white font-mono mt-0.5 block">
              R$ {metricas.custoTotalCiclo.toFixed(2)}
            </span>
            <span className="text-[11px] text-zinc-400 font-mono">
              {metricas.kwhConsumidoTotal.toFixed(3)} kWh • {metricas.somaPotenciaWatts}W ativos
            </span>
          </div>

          {metricas.rendimentoNum > 1 && (
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">Por Unidade</span>
              <span className="text-xl font-black text-yellow-400 font-mono block">
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
              R$ {metricas.somaCustoHora.toFixed(2)} /h
            </span>
          </div>
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-[10px] text-zinc-500 block uppercase font-bold">Impacto Mensal</span>
            <span className="font-mono font-black text-white text-sm">
              R$ {metricas.somaProjecaoMensal.toFixed(2)} /mês
            </span>
          </div>
        </div>
      </div>

      {/* ================= APLICAR NA RECEITA / FICHA TÉCNICA ================= */}
      <div className="p-4 bg-zinc-950 rounded-3xl border border-zinc-800/80 space-y-3">
        <div className="flex items-center gap-2">
          <ChefHat className="w-4 h-4 text-rose-400" />
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-white block">
              Aplicar este Custo em uma Receita
            </span>
            <span className="text-[10px] text-zinc-500 block">
              Salva o custo de energia elétrica na ficha técnica do produto
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
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-yellow-400"
          >
            <option value="">Selecione uma receita cadastrada...</option>
            {receitasFabricadas.map((prod) => (
              <option key={prod.id} value={prod.id}>
                {prod.nome} (Atual Gás/Energia: R$ {(prod.custoGasEnergia || 0).toFixed(2)})
              </option>
            ))}
          </select>

          {/* Opção Somar ou Substituir */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setModoAplicacao('somar')}
              className={`p-2 rounded-xl border font-bold text-center transition-all ${
                modoAplicacao === 'somar'
                  ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400'
              }`}
            >
              + Somar ao custo atual
            </button>
            <button
              type="button"
              onClick={() => setModoAplicacao('substituir')}
              className={`p-2 rounded-xl border font-bold text-center transition-all ${
                modoAplicacao === 'substituir'
                  ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400'
              }`}
            >
              Substituir valor
            </button>
          </div>

          <button
            type="button"
            disabled={!selectedProdutoId || aplicandoReceita || maquinasAtivas.length === 0}
            onClick={handleAplicarNaReceita}
            className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              !selectedProdutoId || aplicandoReceita || maquinasAtivas.length === 0
                ? 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                : 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)] active:scale-98'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {aplicandoReceita
                ? 'Salvando na Ficha Técnica...'
                : `Salvar R$ ${metricas.custoTotalCiclo.toFixed(2)} nesta Receita`}
            </span>
          </button>
        </div>
      </div>

      {/* ================= MODAL NOVA / EDITAR MÁQUINA ================= */}
      {modalMaquinaOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-yellow-500/40 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Plug className="w-4 h-4 text-yellow-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  {editingMaquina ? 'Editar Máquina' : 'Cadastrar Nova Máquina'}
                </h3>
              </div>
              <button
                onClick={() => setModalMaquinaOpen(false)}
                className="w-7 h-7 rounded-full bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMaquina} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">
                  Nome do Equipamento *
                </label>
                <input
                  type="text"
                  required
                  value={nomeMaquina}
                  onChange={(e) => setNomeMaquina(e.target.value)}
                  placeholder="Ex: Forno Elétrico 60L"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">
                    Potência (Watts) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowConversorVA(!showConversorVA)}
                    className="text-[10px] text-yellow-400 hover:underline font-bold"
                  >
                    {showConversorVA ? 'Ocultar conversor' : 'Não sei os Watts (V × A)'}
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    inputMode="decimal"
                    value={potenciaWatts}
                    onChange={(e) => setPotenciaWatts(e.target.value)}
                    placeholder="Ex: 1500"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-yellow-400"
                  />
                  <span className="absolute right-3 top-2 text-xs text-zinc-500 font-mono">Watts</span>
                </div>
              </div>

              {/* Conversor Auxiliar Volts x Amperes */}
              {showConversorVA && (
                <div className="p-3 rounded-2xl bg-zinc-900/80 border border-yellow-500/30 space-y-2 animate-in fade-in duration-150">
                  <span className="text-[10px] font-bold text-yellow-400 uppercase block">
                    Conversor Rápido: Volts × Amperes = Watts
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] text-zinc-500 block">Voltagem (V)</span>
                      <input
                        type="text"
                        value={volts}
                        onChange={(e) => setVolts(e.target.value)}
                        placeholder="220"
                        className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-500 block">Amperes (A)</span>
                      <input
                        type="text"
                        value={amperes}
                        onChange={(e) => setAmperes(e.target.value)}
                        placeholder="5.5"
                        className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-white"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCalcularWatts}
                    className="w-full py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-300 rounded-lg text-[10px] font-bold"
                  >
                    Calcular Potência: {(parseFloat(volts.replace(',', '.')) || 0) * (parseFloat(amperes.replace(',', '.')) || 0)}W
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">
                    Uso por Lote (min)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={tempoMinutosPadrao}
                    onChange={(e) => setTempoMinutosPadrao(e.target.value)}
                    placeholder="30"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">
                    Uso Diário (horas)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={horasUsoDiario}
                    onChange={(e) => setHorasUsoDiario(e.target.value)}
                    placeholder="2"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalMaquinaOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingMaquina}
                  className="flex-1 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-black shadow-[0_0_12px_rgba(234,179,8,0.4)]"
                >
                  {savingMaquina ? 'Salvando...' : editingMaquina ? 'Salvar Edição' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL EXCLUIR MÁQUINA ================= */}
      {modalExcluirOpen && maquinaParaExcluir && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-rose-500/40 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Excluir Máquina
              </h3>
            </div>

            <p className="text-xs text-zinc-400">
              Tem certeza que deseja remover o equipamento <strong className="text-white">{maquinaParaExcluir.nome}</strong>?
            </p>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setModalExcluirOpen(false);
                  setMaquinaParaExcluir(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingMaquina}
                onClick={handleConfirmarExcluirMaquina}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-black shadow-[0_0_12px_rgba(244,63,94,0.4)]"
              >
                {deletingMaquina ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL EDITAR TARIFA (R$/kWh) ================= */}
      {modalTarifaOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-yellow-500/40 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-yellow-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Tarifa de Energia Elétrica
                </h3>
              </div>
              <button
                onClick={() => setModalTarifaOpen(false)}
                className="w-7 h-7 rounded-full bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTarifa} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">
                  Valor do kWh na sua Conta de Luz (R$)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    inputMode="decimal"
                    value={editTarifa}
                    onChange={(e) => setEditTarifa(e.target.value)}
                    placeholder="0.95"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-yellow-400"
                  />
                  <span className="absolute right-3 top-2 text-xs text-zinc-500 font-mono">R$/kWh</span>
                </div>
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Dica: Verifique no talão de luz o valor total da tarifa com impostos (normalmente entre R$ 0,75 e R$ 1,20 por kWh no Brasil).
                </span>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalTarifaOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTarifa}
                  className="flex-1 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-black shadow-[0_0_12px_rgba(234,179,8,0.4)]"
                >
                  {savingTarifa ? 'Salvando...' : 'Salvar Tarifa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
