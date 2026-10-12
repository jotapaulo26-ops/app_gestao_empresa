'use client';

import React, { useState, useMemo } from 'react';
import { Produto, Categoria, Insumo, ItemFichaTecnica, ConfiguracaoLoja } from '@/types';
import {
  salvarProdutoLocalEOnline,
  removerProdutoLocalEOnline,
  produzirLoteLocalEOnline,
} from '@/lib/dataService';
import {
  ChefHat,
  Search,
  Plus,
  Edit2,
  Trash2,
  Printer,
  Share2,
  Copy,
  Clock,
  ShieldCheck,
  Scale,
  Sparkles,
  TrendingUp,
  Package,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle2,
  AlertCircle,
  Flame,
  Coins,
  MessageCircle,
  Eye,
  EyeOff,
  Percent,
  Check,
  FileText,
} from 'lucide-react';

interface ReceitasViewProps {
  produtos: Produto[];
  categorias: Categoria[];
  insumos: Insumo[];
  config?: ConfiguracaoLoja;
  onRefresh: () => void;
}

export default function ReceitasView({
  produtos,
  categorias,
  insumos,
  config,
  onRefresh,
}: ReceitasViewProps) {
  // Filtros
  const [search, setSearch] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('all');

  // Multiplicadores dinâmicos de lote por receita (id -> multiplicador)
  const [multiplicadores, setMultiplicadores] = useState<Record<string, number>>({});

  // Modais
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);

  const [modalShareOpen, setModalShareOpen] = useState(false);
  const [sharingProduto, setSharingProduto] = useState<Produto | null>(null);
  const [shareMode, setShareMode] = useState<'gestao' | 'cozinha'>('gestao');
  const [shareMultiplier, setShareMultiplier] = useState<number>(1);
  const [copiedToast, setCopiedToast] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [produtoParaExcluir, setProdutoParaExcluir] = useState<Produto | null>(null);

  const [produzirModalOpen, setProduzirModalOpen] = useState(false);
  const [produtoParaProduzir, setProdutoParaProduzir] = useState<Produto | null>(null);
  const [qtdLotesProduzir, setQtdLotesProduzir] = useState<number>(1);
  const [produzindoLoading, setProduzindoLoading] = useState(false);

  // Estados do formulário de criação/edição
  const [nome, setNome] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [rendimentoReceita, setRendimentoReceita] = useState<string>('1');
  const [tempoPreparo, setTempoPreparo] = useState('');
  const [validadeConservacao, setValidadeConservacao] = useState('');
  const [modoPreparo, setModoPreparo] = useState('');

  const [custoEmbalagem, setCustoEmbalagem] = useState<string>('0');
  const [custoMaoDeObra, setCustoMaoDeObra] = useState<string>('0');
  const [custoGasEnergia, setCustoGasEnergia] = useState<string>('0');
  const [margemLucroPct, setMargemLucroPct] = useState<string>('100');
  const [precoVendaDireto, setPrecoVendaDireto] = useState<string>('');
  const [fichaTecnica, setFichaTecnica] = useState<ItemFichaTecnica[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auxiliar para parsing de números decimais com vírgula ou ponto
  const parsePtBrFloat = (val: string | number | undefined | null): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const s = val.toString().trim().replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };

  // Unidades com conversão automática inteligente
  const getOpcoesUnidade = (insumoUnidade?: string) => {
    const u = (insumoUnidade || 'un').toLowerCase();
    if (u === 'kg' || u === 'g') {
      return [
        { label: 'g (gramas)', valor: 'g', fator: u === 'kg' ? 0.001 : 1 },
        { label: 'kg (quilos)', valor: 'kg', fator: u === 'kg' ? 1 : 1000 },
      ];
    }
    if (u === 'l' || u === 'ml') {
      return [
        { label: 'ml (mililitros)', valor: 'ml', fator: u === 'l' ? 0.001 : 1 },
        { label: 'l (litros)', valor: 'l', fator: u === 'l' ? 1 : 1000 },
      ];
    }
    return [{ label: 'un (unidade)', valor: 'un', fator: 1 }];
  };

  // Filtra apenas produtos que são FABRICADOS ou que têm ficha técnica
  const receitasList = useMemo(() => {
    return produtos.filter(
      (p) => p.tipo === 'FABRICADO' || (Array.isArray(p.fichaTecnica) && p.fichaTecnica.length > 0)
    );
  }, [produtos]);

  // Filtra por busca e categoria
  const receitasFiltradas = useMemo(() => {
    return receitasList.filter((r) => {
      const matchCat = selectedCategoria === 'all' || r.categoriaId === selectedCategoria;
      const term = search.toLowerCase().trim();
      if (!term) return matchCat;

      const matchNome = r.nome.toLowerCase().includes(term);
      const matchDesc = r.descricao?.toLowerCase().includes(term) || false;
      const matchModo = r.modoPreparo?.toLowerCase().includes(term) || false;

      // Busca também se algum ingrediente da receita contém o termo
      const matchInsumo = r.fichaTecnica?.some((item) => {
        const ins = insumos.find((i) => i.id === item.insumoId);
        return ins?.nome.toLowerCase().includes(term);
      });

      return matchCat && (matchNome || matchDesc || matchModo || matchInsumo);
    });
  }, [receitasList, selectedCategoria, search, insumos]);

  // Métricas Globais das Receitas
  const metricas = useMemo(() => {
    const total = receitasList.length;
    if (total === 0) return { total: 0, custoMedioUnit: 0, margemMedia: 0, totalInsumosUsados: 0 };

    const somaCustoUnit = receitasList.reduce((acc, r) => acc + (r.custoTotal || 0), 0);
    const somaMargem = receitasList.reduce((acc, r) => acc + (r.margemLucroPct || 0), 0);

    const idsInsumos = new Set<string>();
    receitasList.forEach((r) => {
      r.fichaTecnica?.forEach((ft) => idsInsumos.add(ft.insumoId));
    });

    return {
      total,
      custoMedioUnit: somaCustoUnit / total,
      margemMedia: somaMargem / total,
      totalInsumosUsados: idsInsumos.size,
    };
  }, [receitasList]);

  // Função auxiliar para calcular o peso total aproximado de uma receita
  const calcularPesoTotalReceita = (ft: ItemFichaTecnica[], mult: number = 1): string => {
    if (!ft || ft.length === 0) return '0 g';
    let totalGramas = 0;
    let totalMl = 0;
    let totalUnidades = 0;

    ft.forEach((item) => {
      const ins = insumos.find((i) => i.id === item.insumoId);
      const u = (item.unidadeUso || ins?.unidade || 'un').toLowerCase();
      const qtd = (item.quantidade || 0) * mult;

      if (u === 'g') totalGramas += qtd;
      else if (u === 'kg') totalGramas += qtd * 1000;
      else if (u === 'ml') totalMl += qtd;
      else if (u === 'l') totalMl += qtd * 1000;
      else totalUnidades += qtd;
    });

    // Se houver gramas ou ml (assumindo densidade ~1 para líquidos comuns)
    const pesoLiquidoGramas = totalGramas + totalMl;
    if (pesoLiquidoGramas > 0) {
      if (pesoLiquidoGramas >= 1000) {
        return `${(pesoLiquidoGramas / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} kg`;
      }
      return `${Math.round(pesoLiquidoGramas)} g`;
    }

    if (totalUnidades > 0) {
      return `${totalUnidades} un`;
    }

    return '—';
  };

  // Helper para obter o multiplicador atual de um card
  const getMultiplier = (prodId: string) => multiplicadores[prodId] || 1;

  const setMultiplierFor = (prodId: string, val: number) => {
    setMultiplicadores((prev) => ({
      ...prev,
      [prodId]: Math.max(0.1, val),
    }));
  };

  // Cálculos dinâmicos dentro do modal de edição
  const rendimentoEdit = Math.max(0.0001, parsePtBrFloat(rendimentoReceita));

  const custoInsumosEditReceita = useMemo(() => {
    return fichaTecnica.reduce((acc, item) => {
      const ins = insumos.find((i) => i.id === item.insumoId);
      if (!ins) return acc;
      const fator = item.fatorConversao || 1;
      const custoUnitario = ins.custoUnitario || 0;
      const custoItem = parsePtBrFloat(item.quantidade) * fator * custoUnitario;
      return acc + custoItem;
    }, 0);
  }, [fichaTecnica, insumos]);

  const custoUnitarioInsumosEdit = custoInsumosEditReceita / rendimentoEdit;
  const rateioFixosEdit =
    parsePtBrFloat(custoEmbalagem) +
    (parsePtBrFloat(custoMaoDeObra) + parsePtBrFloat(custoGasEnergia)) / rendimentoEdit;

  const custoTotalUnitarioEdit = custoUnitarioInsumosEdit + rateioFixosEdit;
  const margemFloatEdit = parsePtBrFloat(margemLucroPct);
  const precoSugeridoEdit = custoTotalUnitarioEdit * (1 + margemFloatEdit / 100);

  const precoVendaFinalEdit = useMemo(() => {
    const direto = parsePtBrFloat(precoVendaDireto);
    return direto > 0 ? direto : precoSugeridoEdit;
  }, [precoVendaDireto, precoSugeridoEdit]);

  // Abertura do Modal de Edição/Criação
  const handleOpenNew = () => {
    setEditingProduto(null);
    setNome('');
    setCategoriaId(categorias[0]?.id || 'cat-geral');
    setDescricao('');
    setRendimentoReceita('1');
    setTempoPreparo('');
    setValidadeConservacao('');
    setModoPreparo('');
    setCustoEmbalagem('0');
    setCustoMaoDeObra('0');
    setCustoGasEnergia('0');
    setMargemLucroPct('100');
    setPrecoVendaDireto('');
    setFichaTecnica([]);
    setErrorMsg('');
    setModalEditOpen(true);
  };

  const handleOpenEdit = (produto: Produto) => {
    setEditingProduto(produto);
    setNome(produto.nome);
    setCategoriaId(produto.categoriaId);
    setDescricao(produto.descricao || '');
    setRendimentoReceita((produto.rendimentoReceita || 1).toString());
    setTempoPreparo(produto.tempoPreparo || '');
    setValidadeConservacao(produto.validadeConservacao || '');
    setModoPreparo(produto.modoPreparo || '');
    setCustoEmbalagem((produto.custoEmbalagem || 0).toString());
    setCustoMaoDeObra((produto.custoMaoDeObra || 0).toString());
    setCustoGasEnergia((produto.custoGasEnergia || 0).toString());
    setMargemLucroPct((produto.margemLucroPct || 100).toString());
    setPrecoVendaDireto(produto.precoVenda ? produto.precoVenda.toString() : '');
    setFichaTecnica(Array.isArray(produto.fichaTecnica) ? [...produto.fichaTecnica] : []);
    setErrorMsg('');
    setModalEditOpen(true);
  };

  // Gerenciamento de Insumos na Ficha Técnica do Modal
  const handleAddInsumoNaReceita = () => {
    if (insumos.length === 0) {
      alert('Você precisa cadastrar ao menos 1 insumo na aba "Insumos" primeiro.');
      return;
    }
    const primeiro = insumos[0];
    const opcoes = getOpcoesUnidade(primeiro.unidade);
    setFichaTecnica((prev) => [
      ...prev,
      {
        insumoId: primeiro.id,
        quantidade: primeiro.unidade === 'kg' ? 100 : 1,
        unidadeUso: opcoes[0].valor,
        fatorConversao: opcoes[0].fator,
      },
    ]);
  };

  const handleUpdateItemReceita = (
    index: number,
    insumoId: string,
    quantidade: number | string,
    unidadeUso?: string,
    fatorConversao?: number
  ) => {
    setFichaTecnica((prev) => {
      const copy = [...prev];
      const insumo = insumos.find((i) => i.id === insumoId);
      const opcoes = getOpcoesUnidade(insumo?.unidade);
      const unit = unidadeUso || copy[index]?.unidadeUso || opcoes[0]?.valor || 'un';
      const fator =
        fatorConversao !== undefined
          ? fatorConversao
          : opcoes.find((o) => o.valor === unit)?.fator || 1;

      copy[index] = {
        insumoId,
        quantidade: typeof quantidade === 'string' ? (parsePtBrFloat(quantidade) as any) : quantidade,
        unidadeUso: unit,
        fatorConversao: fator,
      };
      return copy;
    });
  };

  const handleRemoveItemReceita = (index: number) => {
    setFichaTecnica((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Salvar Receita / Produto Fabricado
  const handleSaveReceita = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErrorMsg('Informe o nome da receita.');
      return;
    }

    if (fichaTecnica.length === 0) {
      setErrorMsg('Adicione ao menos 1 insumo na ficha técnica da receita.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const payload: Partial<Produto> = {
        id: editingProduto ? editingProduto.id : undefined,
        nome,
        categoriaId: categoriaId || (categorias[0]?.id || 'cat-geral'),
        tipo: 'FABRICADO',
        descricao,
        estoqueAtual: editingProduto ? editingProduto.estoqueAtual : 0,
        estoqueMinimo: editingProduto ? editingProduto.estoqueMinimo : 2,
        rendimentoReceita: rendimentoEdit,
        tempoPreparo,
        validadeConservacao,
        modoPreparo,
        custoInsumos: Number(custoInsumosEditReceita.toFixed(2)),
        custoUnitarioInsumos: custoUnitarioInsumosEdit,
        custoEmbalagem: parsePtBrFloat(custoEmbalagem),
        custoMaoDeObra: parsePtBrFloat(custoMaoDeObra),
        custoGasEnergia: parsePtBrFloat(custoGasEnergia),
        custoTotal: custoTotalUnitarioEdit,
        margemLucroPct: parsePtBrFloat(margemLucroPct) || 100,
        precoVenda: Number(precoVendaFinalEdit.toFixed(2)),
        fichaTecnica: fichaTecnica.map((ft) => ({
          insumoId: ft.insumoId,
          quantidade: parsePtBrFloat(ft.quantidade),
          unidadeUso: ft.unidadeUso,
          fatorConversao: ft.fatorConversao,
        })),
      };

      await salvarProdutoLocalEOnline(payload);
      setModalEditOpen(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar receita');
    } finally {
      setLoading(false);
    }
  };

  // Excluir Receita
  const handleDeleteReceita = async () => {
    if (!produtoParaExcluir) return;
    setLoading(true);

    try {
      await removerProdutoLocalEOnline(produtoParaExcluir.id);
      setDeleteModalOpen(false);
      setProdutoParaExcluir(null);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao excluir receita');
    } finally {
      setLoading(false);
    }
  };

  // Produzir Lote
  const handleConfirmarProducao = async () => {
    if (!produtoParaProduzir) return;
    setProduzindoLoading(true);

    try {
      const res = await produzirLoteLocalEOnline(produtoParaProduzir.id, qtdLotesProduzir);
      if (!res.success) {
        alert(`Não foi possível produzir: ${res.error}`);
        return;
      }
      setProduzirModalOpen(false);
      setProdutoParaProduzir(null);
      onRefresh();
    } catch (err: any) {
      alert(`Erro ao produzir lote: ${err.message}`);
    } finally {
      setProduzindoLoading(false);
    }
  };

  // Modal de Compartilhamento / Impressão
  const handleOpenShare = (produto: Produto, initialMult: number = 1) => {
    setSharingProduto(produto);
    setShareMultiplier(initialMult);
    setShareMode('gestao');
    setCopiedToast(false);
    setModalShareOpen(true);
  };

  // Gerador de Texto Formatado para WhatsApp / Clipboard
  const gerarTextoReceita = (produto: Produto, mult: number, modo: 'gestao' | 'cozinha'): string => {
    const nomeLoja = config?.nomeLoja || 'Minha Loja';
    const cat = categorias.find((c) => c.id === produto.categoriaId)?.nome || 'Geral';
    const rend = (produto.rendimentoReceita || 1) * mult;
    const peso = calcularPesoTotalReceita(produto.fichaTecnica || [], mult);

    let texto = `*👩‍🍳 ${produto.nome.toUpperCase()}* (${nomeLoja})\n`;
    texto += `📁 Categoria: ${cat}\n`;
    texto += `🥣 Rendimento: ${rend.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ${rend === 1 ? 'porção/un' : 'porções/un'}\n`;
    if (peso && peso !== '—') texto += `⚖️ Peso Total: ${peso}\n`;
    if (produto.tempoPreparo) texto += `⏱️ Tempo: ${produto.tempoPreparo}\n`;
    if (produto.validadeConservacao) texto += `❄️ Validade: ${produto.validadeConservacao}\n`;
    if (mult !== 1) texto += `⚡ Multiplicador aplicado: ${mult}x (Lote ajustado)\n`;

    texto += `\n*🛒 INGREDIENTES (${mult}x):*\n`;
    (produto.fichaTecnica || []).forEach((item) => {
      const ins = insumos.find((i) => i.id === item.insumoId);
      const qtd = (item.quantidade || 0) * mult;
      const unit = item.unidadeUso || ins?.unidade || 'un';
      texto += `• ${ins?.nome || 'Insumo'}: ${qtd.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ${unit}\n`;
    });

    if (produto.modoPreparo) {
      texto += `\n*📝 MODO DE PREPARO:*\n${produto.modoPreparo}\n`;
    }

    if (modo === 'gestao') {
      const custoInsumosMult = (produto.custoInsumos || 0) * mult;
      const custoUnit = produto.custoTotal || 0;
      const precoVenda = produto.precoVenda || 0;
      const lucroUnit = Math.max(0, precoVenda - custoUnit);

      texto += `\n*💼 DADOS DE GESTÃO & CUSTOS:*\n`;
      texto += `💵 Custo Insumos (${mult}x): R$ ${custoInsumosMult.toFixed(2)}\n`;
      texto += `🏷️ Custo Unitário: R$ ${custoUnit.toFixed(2)}\n`;
      texto += `💰 Preço de Venda: R$ ${precoVenda.toFixed(2)}\n`;
      texto += `📈 Lucro por Unidade: R$ ${lucroUnit.toFixed(2)} (${produto.margemLucroPct || 0}% margem)\n`;
    }

    texto += `\n_Gerado por ${nomeLoja} ERP_`;
    return texto;
  };

  const handleCopiarTexto = () => {
    if (!sharingProduto) return;
    const texto = gerarTextoReceita(sharingProduto, shareMultiplier, shareMode);
    navigator.clipboard.writeText(texto);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  const handleCompartilharWhatsApp = () => {
    if (!sharingProduto) return;
    const texto = gerarTextoReceita(sharingProduto, shareMultiplier, shareMode);
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  };

  const handleCompartilharNativo = async () => {
    if (!sharingProduto) return;
    const texto = gerarTextoReceita(sharingProduto, shareMultiplier, shareMode);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receita: ${sharingProduto.nome}`,
          text: texto,
        });
      } catch (err) {
        // Usuário cancelou ou navegador não suportou compartilhamento nativo
      }
    } else {
      handleCopiarTexto();
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* ================= ESTILO EXCLUSIVO DE IMPRESSÃO (A4 LIMPO) ================= */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-recipe-card,
          #printable-recipe-card * {
            visibility: visible;
          }
          #printable-recipe-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 24px;
            margin: 0;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* ================= CABEÇALHO DO MÓDULO ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shadow-neon-pink">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-2">
                <span>Livro de Receitas & Fichas</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {receitasList.length} receitas
                </span>
              </h1>
              <p className="text-xs text-zinc-400">
                Fichas técnicas, cálculo de custos fracionados, escalonador de lotes e compartilhamento
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenNew}
          className="px-4 py-2.5 rounded-xl bg-rose-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-neon-pink hover:bg-rose-400 active:scale-98 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Receita</span>
        </button>
      </div>

      {/* ================= CARDS DE MÉTRICAS RÁPIDAS ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-950 border border-zinc-900 p-3.5 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
            Total de Receitas
          </span>
          <div className="flex items-center gap-2">
            <ChefHat className="w-4 h-4 text-rose-400" />
            <span className="text-xl font-black text-white">{metricas.total}</span>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-3.5 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
            Custo Médio Unitário
          </span>
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-400" />
            <span className="text-xl font-black text-emerald-400">
              R$ {metricas.custoMedioUnit.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-3.5 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
            Margem Média
          </span>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <span className="text-xl font-black text-cyan-400">
              {metricas.margemMedia.toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-3.5 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
            Insumos em Uso
          </span>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-400" />
            <span className="text-xl font-black text-amber-400">
              {metricas.totalInsumosUsados} itens
            </span>
          </div>
        </div>
      </div>

      {/* ================= BARRA DE BUSCA E FILTROS DE CATEGORIA ================= */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar receita por nome, ingrediente ou modo de preparo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
          />
        </div>

        {/* Chips de Categoria */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategoria('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategoria === 'all'
                ? 'bg-rose-500 text-white shadow-neon-pink'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Todas as Categorias ({receitasList.length})
          </button>
          {categorias.map((cat) => {
            const count = receitasList.filter((r) => r.categoriaId === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoria(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategoria === cat.id
                    ? 'bg-rose-500 text-white shadow-neon-pink'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                {cat.nome} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= LISTA DE RECEITAS ================= */}
      {receitasFiltradas.length === 0 ? (
        <div className="text-center py-16 bg-zinc-950 border border-zinc-900 rounded-3xl space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 mx-auto">
            <ChefHat className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-white">Nenhuma receita encontrada</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {search || selectedCategoria !== 'all'
              ? 'Tente ajustar sua busca ou categoria para encontrar o que procura.'
              : 'Cadastre sua primeira receita com ficha técnica para calcular custos e imprimir fichas de produção.'}
          </p>
          <button
            onClick={handleOpenNew}
            className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-400 transition-all inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Primeira Receita</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {receitasFiltradas.map((receita) => {
            const mult = getMultiplier(receita.id);
            const cat = categorias.find((c) => c.id === receita.categoriaId);
            const pesoTotal = calcularPesoTotalReceita(receita.fichaTecnica || [], mult);
            const rendimentoBase = receita.rendimentoReceita || 1;
            const rendimentoMultiplicado = rendimentoBase * mult;
            const custoInsumosEscalado = (receita.custoInsumos || 0) * mult;

            return (
              <div
                key={receita.id}
                className="bg-zinc-950 border border-zinc-900 hover:border-zinc-800 rounded-3xl p-5 space-y-4 transition-all shadow-xl"
              >
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                        {cat?.nome || 'Geral'}
                      </span>
                      {receita.estoqueAtual > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {receita.estoqueAtual} em estoque
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-black text-white">{receita.nome}</h3>
                    {receita.descricao && (
                      <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">{receita.descricao}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Botão de Compartilhar / Imprimir */}
                    <button
                      onClick={() => handleOpenShare(receita, mult)}
                      title="Imprimir ou Compartilhar Receita"
                      className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-rose-400 hover:border-rose-500/50 hover:bg-rose-500/10 transition-all"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>

                    {/* Botão Editar */}
                    <button
                      onClick={() => handleOpenEdit(receita)}
                      title="Editar Receita & Ficha Técnica"
                      className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Botão Excluir */}
                    <button
                      onClick={() => {
                        setProdutoParaExcluir(receita);
                        setDeleteModalOpen(true);
                      }}
                      title="Excluir Receita"
                      className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-rose-400 hover:border-rose-500/40 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Badges de Atributos da Receita */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-zinc-900/80 border border-zinc-800/80 p-2 rounded-xl">
                    <span className="text-[10px] text-zinc-500 block">Rendimento</span>
                    <span className="font-bold text-white">
                      {rendimentoMultiplicado.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}{' '}
                      {rendimentoMultiplicado === 1 ? 'un' : 'un'}
                    </span>
                  </div>

                  <div className="bg-zinc-900/80 border border-zinc-800/80 p-2 rounded-xl">
                    <span className="text-[10px] text-zinc-500 block">Peso Total</span>
                    <span className="font-bold text-cyan-400 flex items-center gap-1">
                      <Scale className="w-3 h-3 text-cyan-500" />
                      {pesoTotal}
                    </span>
                  </div>

                  <div className="bg-zinc-900/80 border border-zinc-800/80 p-2 rounded-xl">
                    <span className="text-[10px] text-zinc-500 block">Tempo</span>
                    <span className="font-bold text-zinc-300 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      {receita.tempoPreparo || '—'}
                    </span>
                  </div>

                  <div className="bg-zinc-900/80 border border-zinc-800/80 p-2 rounded-xl">
                    <span className="text-[10px] text-zinc-500 block">Validade</span>
                    <span className="font-bold text-zinc-300 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-zinc-500" />
                      {receita.validadeConservacao || '—'}
                    </span>
                  </div>
                </div>

                {/* Bloco Financeiro e de Custos */}
                <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Custo Unitário</span>
                    <span className="text-xs font-black text-rose-400">
                      R$ {(receita.custoTotal || 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Preço de Venda</span>
                    <span className="text-xs font-black text-emerald-400">
                      R$ {(receita.precoVenda || 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Margem / Lucro</span>
                    <span className="text-xs font-black text-cyan-400">
                      {receita.margemLucroPct || 0}%
                    </span>
                  </div>
                </div>

                {/* Escalonador de Lotes Dinâmico (0.5x, 1x, 2x, 3x, 5x) */}
                <div className="bg-black/60 border border-zinc-900 rounded-2xl p-2.5 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-rose-400" />
                    Multiplicador:
                  </span>
                  <div className="flex items-center gap-1">
                    {[0.5, 1, 2, 3, 5].map((val) => (
                      <button
                        key={val}
                        onClick={() => setMultiplierFor(receita.id, val)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          mult === val
                            ? 'bg-rose-500 text-white shadow-neon-pink'
                            : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                        }`}
                      >
                        {val}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tabela de Insumos da Ficha Técnica com quantidades escalonadas */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 px-1">
                    <span>Ingredientes ({receita.fichaTecnica?.length || 0})</span>
                    <span>Qtd {mult !== 1 ? `(${mult}x)` : ''}</span>
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                    {(receita.fichaTecnica || []).map((item, idx) => {
                      const ins = insumos.find((i) => i.id === item.insumoId);
                      const qtdCalculada = (item.quantidade || 0) * mult;
                      const unit = item.unidadeUso || ins?.unidade || 'un';

                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs bg-zinc-900/40 border border-zinc-900 px-2.5 py-1.5 rounded-xl text-zinc-300"
                        >
                          <span className="truncate pr-2">{ins?.nome || 'Insumo'}</span>
                          <span className="font-mono font-bold text-white whitespace-nowrap">
                            {qtdCalculada.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {unit}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Modo de Preparo (se houver) */}
                {receita.modoPreparo && (
                  <div className="border-t border-zinc-900 pt-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                      Modo de Preparo
                    </span>
                    <p className="text-xs text-zinc-300 whitespace-pre-line bg-zinc-900/30 p-2.5 rounded-xl border border-zinc-900/60 max-h-28 overflow-y-auto">
                      {receita.modoPreparo}
                    </p>
                  </div>
                )}

                {/* Botões de Ação na Base do Card */}
                <div className="flex items-center gap-2 pt-1 border-t border-zinc-900">
                  <button
                    onClick={() => {
                      setProdutoParaProduzir(receita);
                      setQtdLotesProduzir(mult);
                      setProduzirModalOpen(true);
                    }}
                    className="flex-1 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Produzir ({mult}x)</span>
                  </button>

                  <button
                    onClick={() => handleOpenShare(receita, mult)}
                    className="py-2 px-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-rose-500/40 text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Ficha / Imprimir</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL DE COMPARTILHAMENTO / IMPRESSÃO ================= */}
      {modalShareOpen && sharingProduto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Header do Modal */}
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-white">Imprimir & Compartilhar</h3>
              </div>
              <button
                onClick={() => setModalShareOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Seletor de Modo: Ficha de Gestão vs Ficha de Cozinha */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                Tipo de Ficha:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShareMode('gestao')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    shareMode === 'gestao'
                      ? 'bg-rose-500/10 border-rose-500 text-white shadow-neon-pink'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                    <FileText className="w-3.5 h-3.5 text-rose-400" />
                    <span>Ficha de Gestão</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-tight">
                    Completa: Ingredientes + Custos, Margens de Lucro e Preços.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setShareMode('cozinha')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    shareMode === 'cozinha'
                      ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-neon-green'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                    <EyeOff className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Ficha de Cozinha</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-tight">
                    Operacional: Apenas ingredientes, rendimento e preparo (sem valores).
                  </p>
                </button>
              </div>
            </div>

            {/* Seletor de Multiplicador no Compartilhamento */}
            <div className="flex items-center justify-between bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800">
              <span className="text-xs font-bold text-zinc-300">Escalar Receita:</span>
              <div className="flex items-center gap-1">
                {[0.5, 1, 2, 3, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setShareMultiplier(val)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                      shareMultiplier === val
                        ? 'bg-rose-500 text-white shadow-neon-pink'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {val}x
                  </button>
                ))}
              </div>
            </div>

            {/* Visualização Prévia Formatada / Card de Impressão */}
            <div
              id="printable-recipe-card"
              className="bg-black/80 border border-zinc-800 rounded-2xl p-4 space-y-3 text-xs max-h-56 overflow-y-auto"
            >
              <div className="border-b border-zinc-800 pb-2 flex items-center justify-between">
                <div>
                  <h4 className="font-black text-sm text-white uppercase">{sharingProduto.nome}</h4>
                  <span className="text-[10px] text-zinc-400">
                    {config?.nomeLoja || 'Minha Loja'} • {shareMode === 'gestao' ? 'Ficha Técnica de Gestão' : 'Ficha Operacional de Cozinha'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-400 block">Rendimento ({shareMultiplier}x)</span>
                  <span className="font-bold text-white">
                    {((sharingProduto.rendimentoReceita || 1) * shareMultiplier).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} un
                  </span>
                </div>
              </div>

              {/* Detalhes Rápidos */}
              <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                {sharingProduto.tempoPreparo && (
                  <span>⏱️ Tempo: <strong className="text-white">{sharingProduto.tempoPreparo}</strong></span>
                )}
                {sharingProduto.validadeConservacao && (
                  <span>❄️ Validade: <strong className="text-white">{sharingProduto.validadeConservacao}</strong></span>
                )}
                <span>⚖️ Peso: <strong className="text-white">{calcularPesoTotalReceita(sharingProduto.fichaTecnica || [], shareMultiplier)}</strong></span>
              </div>

              {/* Lista de Ingredientes Prévia */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Ingredientes:
                </span>
                {(sharingProduto.fichaTecnica || []).map((item, idx) => {
                  const ins = insumos.find((i) => i.id === item.insumoId);
                  const qtd = (item.quantidade || 0) * shareMultiplier;
                  const unit = item.unidadeUso || ins?.unidade || 'un';
                  return (
                    <div key={idx} className="flex justify-between text-zinc-300 text-[11px]">
                      <span>• {ins?.nome || 'Insumo'}</span>
                      <span className="font-mono font-bold text-white">
                        {qtd.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {unit}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Modo de Preparo Prévia */}
              {sharingProduto.modoPreparo && (
                <div className="border-t border-zinc-800 pt-2 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                    Modo de Preparo:
                  </span>
                  <p className="text-[11px] text-zinc-300 whitespace-pre-line">
                    {sharingProduto.modoPreparo}
                  </p>
                </div>
              )}

              {/* Custos na Ficha de Gestão */}
              {shareMode === 'gestao' && (
                <div className="border-t border-zinc-800 pt-2 grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div className="bg-zinc-900/60 p-1.5 rounded-lg">
                    <span className="text-zinc-500 block">Custo Lote</span>
                    <strong className="text-rose-400">
                      R$ {((sharingProduto.custoInsumos || 0) * shareMultiplier).toFixed(2)}
                    </strong>
                  </div>
                  <div className="bg-zinc-900/60 p-1.5 rounded-lg">
                    <span className="text-zinc-500 block">Custo Unit</span>
                    <strong className="text-rose-400">
                      R$ {(sharingProduto.custoTotal || 0).toFixed(2)}
                    </strong>
                  </div>
                  <div className="bg-zinc-900/60 p-1.5 rounded-lg">
                    <span className="text-zinc-500 block">Preço Venda</span>
                    <strong className="text-emerald-400">
                      R$ {(sharingProduto.precoVenda || 0).toFixed(2)}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* Ações: WhatsApp, Imprimir, Celular, Copiar */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-900">
              <button
                type="button"
                onClick={handleCompartilharWhatsApp}
                className="py-3 px-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-neon-green transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleImprimir}
                className="py-3 px-3 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-white text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Printer className="w-4 h-4 text-rose-400" />
                <span>Imprimir / PDF</span>
              </button>

              <button
                type="button"
                onClick={handleCompartilharNativo}
                className="py-2.5 px-3 rounded-2xl bg-zinc-900 border border-zinc-800 hover:text-white text-zinc-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Share2 className="w-4 h-4 text-cyan-400" />
                <span>Mais Opções</span>
              </button>

              <button
                type="button"
                onClick={handleCopiarTexto}
                className="py-2.5 px-3 rounded-2xl bg-zinc-900 border border-zinc-800 hover:text-white text-zinc-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                {copiedToast ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-amber-400" />
                    <span>Copiar Texto</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL DE CADASTRO / EDIÇÃO DE RECEITA ================= */}
      {modalEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-5 shadow-2xl my-8 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-white">
                  {editingProduto ? 'Editar Receita & Ficha Técnica' : 'Nova Receita'}
                </h3>
              </div>
              <button
                onClick={() => setModalEditOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveReceita} className="space-y-4">
              {/* Nome e Categoria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Nome da Receita *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Bolo de Cenoura com Brigadeiro"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Categoria
                  </label>
                  <select
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Rendimento Fracionado, Tempo e Validade */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      Rendimento *
                    </label>
                    <span className="text-[10px] text-rose-400 font-bold">ex: 0,250 ou 1,82</span>
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={rendimentoReceita}
                    onChange={(e) => setRendimentoReceita(e.target.value)}
                    placeholder="1"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white font-mono font-bold focus:outline-none focus:border-rose-500"
                  />
                  {/* Atalhos Rápidos de Rendimento */}
                  <div className="flex items-center gap-1 overflow-x-auto pt-1 scrollbar-none">
                    {[0.25, 0.5, 1, 6, 12, 25, 30].map((rVal) => (
                      <button
                        key={rVal}
                        type="button"
                        onClick={() => setRendimentoReceita(rVal.toString())}
                        className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800"
                      >
                        {rVal}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Tempo de Preparo
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 45 min, 1h 20m"
                    value={tempoPreparo}
                    onChange={(e) => setTempoPreparo(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Validade & Conservação
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 5 dias na geladeira"
                    value={validadeConservacao}
                    onChange={(e) => setValidadeConservacao(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Ficha Técnica: Insumos da Receita com Fracionamento */}
              <div className="space-y-2 border border-zinc-900 bg-zinc-900/30 p-3.5 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-rose-400" />
                      Insumos na Receita
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Aceita quantidades fracionadas (ex: 0,250 kg ou 1,82 L)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddInsumoNaReceita}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-bold hover:bg-rose-500/30 transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Adicionar Insumo</span>
                  </button>
                </div>

                {fichaTecnica.length === 0 ? (
                  <p className="text-center py-4 text-xs text-zinc-500">
                    Nenhum insumo adicionado ainda. Clique em "+ Adicionar Insumo".
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                    {fichaTecnica.map((item, idx) => {
                      const insumo = insumos.find((i) => i.id === item.insumoId);
                      const opcoes = getOpcoesUnidade(insumo?.unidade);
                      const custoItem =
                        parsePtBrFloat(item.quantidade) *
                        (item.fatorConversao || 1) *
                        (insumo?.custoUnitario || 0);

                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-zinc-950 p-2 rounded-xl border border-zinc-800/80"
                        >
                          {/* Seletor de Insumo */}
                          <select
                            value={item.insumoId}
                            onChange={(e) => handleUpdateItemReceita(idx, e.target.value, item.quantidade)}
                            className="flex-1 px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none"
                          >
                            {insumos.map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.nome} (R$ {i.custoUnitario.toFixed(2)}/{i.unidade})
                              </option>
                            ))}
                          </select>

                          {/* Quantidade Fracionada */}
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.quantidade}
                            onChange={(e) =>
                              handleUpdateItemReceita(idx, item.insumoId, e.target.value, item.unidadeUso)
                            }
                            className="w-20 px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white font-mono text-center focus:outline-none"
                          />

                          {/* Unidade */}
                          <select
                            value={item.unidadeUso}
                            onChange={(e) => {
                              const op = opcoes.find((o) => o.valor === e.target.value);
                              handleUpdateItemReceita(
                                idx,
                                item.insumoId,
                                item.quantidade,
                                op?.valor,
                                op?.fator
                              );
                            }}
                            className="w-24 px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none"
                          >
                            {opcoes.map((op) => (
                              <option key={op.valor} value={op.valor}>
                                {op.label}
                              </option>
                            ))}
                          </select>

                          {/* Custo Proporcional */}
                          <span className="text-[11px] font-mono font-bold text-rose-400 w-16 text-right">
                            R$ {custoItem.toFixed(2)}
                          </span>

                          {/* Remover */}
                          <button
                            type="button"
                            onClick={() => handleRemoveItemReceita(idx)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Custos Fixos & Precificação */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-900/40 p-3 rounded-2xl border border-zinc-900">
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 block">Embalagem (un)</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={custoEmbalagem}
                    onChange={(e) => setCustoEmbalagem(e.target.value)}
                    className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 block">Gás / Energia (lote)</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={custoGasEnergia}
                    onChange={(e) => setCustoGasEnergia(e.target.value)}
                    className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 block">Mão de Obra (lote)</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={custoMaoDeObra}
                    onChange={(e) => setCustoMaoDeObra(e.target.value)}
                    className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 block">Margem (%)</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={margemLucroPct}
                    onChange={(e) => setMargemLucroPct(e.target.value)}
                    className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Resumo de Custos e Preço de Venda Final */}
              <div className="bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-800 grid grid-cols-2 sm:grid-cols-3 gap-3 items-center">
                <div>
                  <span className="text-[10px] text-zinc-500 block">Custo Total / Unidade</span>
                  <span className="text-sm font-black text-rose-400">
                    R$ {custoTotalUnitarioEdit.toFixed(2)}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-500 block">Preço Sugerido</span>
                  <span className="text-xs font-bold text-zinc-400">
                    R$ {precoSugeridoEdit.toFixed(2)}
                  </span>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-zinc-400 block font-bold">
                    Preço Praticado (R$)
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={precoVendaDireto}
                    onChange={(e) => setPrecoVendaDireto(e.target.value)}
                    placeholder={precoSugeridoEdit.toFixed(2)}
                    className="w-full px-2 py-1 bg-zinc-900 border border-emerald-500/40 rounded-lg text-xs text-emerald-400 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Modo de Preparo (Textarea Grande) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Modo de Preparo / Instruções Passo a Passo
                </label>
                <textarea
                  rows={4}
                  placeholder="1. Em uma panela, coloque todos os ingredientes...&#10;2. Mexa em fogo médio até desgrudar do fundo...&#10;3. Deixe esfriar e modele as porções."
                  value={modoPreparo}
                  onChange={(e) => setModoPreparo(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Botões do Rodapé */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setModalEditOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs uppercase tracking-wider shadow-neon-pink disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar Receita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL DE PRODUZIR LOTE ================= */}
      {produzirModalOpen && produtoParaProduzir && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
              <Package className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Produzir Receita</h3>
            </div>

            <p className="text-xs text-zinc-400">
              Produzir <strong>{produtoParaProduzir.nome}</strong> dará baixa automática no estoque dos
              insumos proporcionalmente e aumentará o estoque do produto pronto.
            </p>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Quantidade de Lotes / Fornadas:
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                value={qtdLotesProduzir}
                onChange={(e) => setQtdLotesProduzir(parseFloat(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white font-mono font-bold text-center"
              />
              <span className="text-[10px] text-zinc-500 block text-center">
                Vai gerar aprox.{' '}
                {(
                  (produtoParaProduzir.rendimentoReceita || 1) * qtdLotesProduzir
                ).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}{' '}
                unidades prontas
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-900">
              <button
                type="button"
                onClick={() => setProduzirModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={produzindoLoading}
                onClick={handleConfirmarProducao}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase shadow-neon-green disabled:opacity-50"
              >
                {produzindoLoading ? 'Produzindo...' : 'Confirmar Produção'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL DE EXCLUSÃO ================= */}
      {deleteModalOpen && produtoParaExcluir && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-rose-400 border-b border-zinc-900 pb-3">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Excluir Receita</h3>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Tem certeza que deseja excluir a receita <strong>{produtoParaExcluir.nome}</strong>? Essa ação
              não poderá ser desfeita.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-900">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleDeleteReceita}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs uppercase shadow-neon-pink disabled:opacity-50"
              >
                {loading ? 'Excluindo...' : 'Excluir Receita'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
