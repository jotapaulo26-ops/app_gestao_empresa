'use client';

import React, { useState, useMemo } from 'react';
import { Produto, Categoria, Insumo, TipoProduto, ItemFichaTecnica } from '@/types';
import {
  salvarProdutoLocalEOnline,
  removerProdutoLocalEOnline,
  produzirLoteLocalEOnline,
} from '@/lib/dataService';
import {
  Utensils,
  Plus,
  Edit2,
  Trash2,
  Calculator,
  Search,
  Sparkles,
  Package,
  Layers,
  X,
  TrendingUp,
  DollarSign,
  ChevronDown,
  ChevronUp,
  ChefHat,
  Flame,
  Coins,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Percent,
} from 'lucide-react';

interface ProdutosViewProps {
  produtos: Produto[];
  categorias: Categoria[];
  insumos: Insumo[];
  onRefresh: () => void;
}

export default function ProdutosView({
  produtos,
  categorias,
  insumos,
  onRefresh,
}: ProdutosViewProps) {
  const [search, setSearch] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('all');

  // Modais de Cadastro/Edição e Exclusão
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [produtoParaExcluir, setProdutoParaExcluir] = useState<Produto | null>(null);

  // Modal de Produzir Fornada / Lote
  const [produzirModalOpen, setProduzirModalOpen] = useState(false);
  const [produtoParaProduzir, setProdutoParaProduzir] = useState<Produto | null>(null);
  const [qtdLotesProduzir, setQtdLotesProduzir] = useState<number>(1);
  const [produzindoLoading, setProduzindoLoading] = useState(false);

  // Form State
  const [nome, setNome] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [tipo, setTipo] = useState<TipoProduto>('REVENDA');
  const [descricao, setDescricao] = useState('');
  const [estoqueAtual, setEstoqueAtual] = useState<string | number>(0);
  const [estoqueMinimo, setEstoqueMinimo] = useState<string | number>(2);

  // Preço de Venda Direto & Custos
  const [precoVendaDireto, setPrecoVendaDireto] = useState('');
  const [custoDireto, setCustoDireto] = useState('');
  const [mostrarCalculadora, setMostrarCalculadora] = useState(false);

  // Ficha Técnica & Calculadora Avançada com Suporte a Decimais Quebrados
  const [rendimentoReceita, setRendimentoReceita] = useState<string>('1');
  const [custoEmbalagem, setCustoEmbalagem] = useState<string>('0');
  const [custoMaoDeObra, setCustoMaoDeObra] = useState<string>('0');
  const [custoGasEnergia, setCustoGasEnergia] = useState<string>('0');
  const [margemLucroPct, setMargemLucroPct] = useState<string>('100');
  const [fichaTecnica, setFichaTecnica] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auxiliar para converter texto (vírgula ou ponto) em número decimal preciso
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

  // 1. CUSTO TOTAL DOS INSUMOS DA RECEITA INTEIRA
  const custoInsumosReceita = useMemo(() => {
    if (tipo === 'REVENDA') return parsePtBrFloat(custoDireto);
    const safeFicha = Array.isArray(fichaTecnica) ? fichaTecnica : [];
    const safeInsumos = Array.isArray(insumos) ? insumos : [];
    return safeFicha.reduce((acc, item) => {
      const ins = safeInsumos.find((i) => i.id === item.insumoId);
      if (!ins) return acc;
      let fator = item.fatorConversao ?? 1;
      if (!item.fatorConversao && item.unidadeUso) {
        if (ins.unidade === 'kg' && item.unidadeUso === 'g') fator = 0.001;
        else if (ins.unidade === 'g' && item.unidadeUso === 'kg') fator = 1000;
        else if (ins.unidade === 'l' && item.unidadeUso === 'ml') fator = 0.001;
        else if (ins.unidade === 'ml' && item.unidadeUso === 'l') fator = 1000;
      }
      const qtd = parsePtBrFloat(item.quantidade);
      return acc + (Number(ins.custoUnitario) || 0) * (qtd * fator);
    }, 0);
  }, [tipo, custoDireto, fichaTecnica, insumos]);

  // 2. RENDIMENTO DO LOTE (quantidade de unidades produzidas - suporte a decimais como 0,250 ou 1,82)
  const rendimento = useMemo(() => {
    const val = parsePtBrFloat(rendimentoReceita);
    return Math.max(0.0001, val > 0 ? val : 1);
  }, [rendimentoReceita]);

  // 3. CUSTO DE INSUMOS POR UNIDADE
  const custoUnitarioInsumos = useMemo(() => {
    if (tipo === 'REVENDA') return parsePtBrFloat(custoDireto);
    return Number((custoInsumosReceita / rendimento).toFixed(2));
  }, [tipo, custoDireto, custoInsumosReceita, rendimento]);

  // 4. RATEIO DE MÃO DE OBRA E GÁS/ENERGIA POR UNIDADE
  const rateioLotePorUnidade = useMemo(() => {
    if (tipo === 'REVENDA') return 0;
    const totalExtrasLote = parsePtBrFloat(custoMaoDeObra) + parsePtBrFloat(custoGasEnergia);
    return Number((totalExtrasLote / rendimento).toFixed(2));
  }, [tipo, custoMaoDeObra, custoGasEnergia, rendimento]);

  // 5. CUSTO TOTAL DE 1 UNIDADE PRONTA
  const custoTotalUnitario = useMemo(() => {
    if (tipo === 'REVENDA') return parsePtBrFloat(custoDireto);
    return Number((custoUnitarioInsumos + rateioLotePorUnidade + parsePtBrFloat(custoEmbalagem)).toFixed(2));
  }, [tipo, custoDireto, custoUnitarioInsumos, rateioLotePorUnidade, custoEmbalagem]);

  // 6. PREÇO DE VENDA SUGERIDO PELA MARGEM PROGRAMADA
  const precoVendaSugerido = useMemo(() => {
    if (custoTotalUnitario > 0) {
      const margem = parsePtBrFloat(margemLucroPct);
      return Number((custoTotalUnitario * (1 + margem / 100)).toFixed(2));
    }
    return 0;
  }, [custoTotalUnitario, margemLucroPct]);

  // 7. PREÇO FINAL DEFINIDO (Digitado ou Sugerido)
  const precoVendaFinal = useMemo(() => {
    const direto = parsePtBrFloat(precoVendaDireto);
    if (direto > 0) return direto;
    return precoVendaSugerido > 0 ? precoVendaSugerido : 0;
  }, [precoVendaDireto, precoVendaSugerido]);

  // 8. SIMULADOR DE LUCRO LÍQUIDO REAL POR UNIDADE
  const lucroLiquidoReal = useMemo(() => {
    return Math.max(0, precoVendaFinal - custoTotalUnitario);
  }, [precoVendaFinal, custoTotalUnitario]);

  const margemRealEfetivaPct = useMemo(() => {
    if (precoVendaFinal <= 0) return 0;
    return Math.round((lucroLiquidoReal / precoVendaFinal) * 100);
  }, [lucroLiquidoReal, precoVendaFinal]);

  // Filtros de busca e categoria
  const filteredProdutos = (produtos || []).filter((p) => {
    if (!p) return false;
    const matchCat = selectedCategoria === 'all' || p.categoriaId === selectedCategoria;
    const nomeLower = (p.nome || '').toLowerCase();
    const descLower = (p.descricao || '').toLowerCase();
    const qLower = (search || '').toLowerCase();
    const matchSearch = nomeLower.includes(qLower) || descLower.includes(qLower);
    return matchCat && matchSearch;
  });

  const handleOpenNew = () => {
    setEditingProduto(null);
    setNome('');
    setCategoriaId(categorias[0]?.id || 'cat-geral');
    setTipo('FABRICADO');
    setDescricao('');
    setEstoqueAtual(0);
    setEstoqueMinimo(2);
    setPrecoVendaDireto('');
    setCustoDireto('');
    setMostrarCalculadora(true);
    setRendimentoReceita('1');
    setMargemLucroPct('100');
    setCustoEmbalagem('0');
    setCustoMaoDeObra('0');
    setCustoGasEnergia('0');
    setFichaTecnica([]);
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleOpenEdit = (produto: Produto) => {
    setEditingProduto(produto);
    setNome(produto.nome);
    setCategoriaId(produto.categoriaId);
    setTipo(produto.tipo);
    setDescricao(produto.descricao || '');
    setEstoqueAtual(produto.estoqueAtual);
    setEstoqueMinimo(produto.estoqueMinimo);
    setPrecoVendaDireto(produto.precoVenda ? produto.precoVenda.toString() : '');
    setCustoDireto(produto.custoInsumos ? produto.custoInsumos.toString() : '');
    setMostrarCalculadora(produto.tipo === 'FABRICADO');
    setRendimentoReceita((produto.rendimentoReceita || 1).toString());
    setMargemLucroPct((produto.margemLucroPct || 100).toString());
    setCustoEmbalagem((produto.custoEmbalagem || 0).toString());
    setCustoMaoDeObra((produto.custoMaoDeObra || 0).toString());
    setCustoGasEnergia((produto.custoGasEnergia || 0).toString());
    setFichaTecnica(Array.isArray(produto.fichaTecnica) ? [...produto.fichaTecnica] : []);
    setErrorMsg('');
    setModalOpen(true);
  };

  // Gerenciamento de Insumos na Ficha Técnica
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
    setFichaTecnica((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const ins = insumos.find((i) => i.id === insumoId);
        const opcoes = getOpcoesUnidade(ins?.unidade);
        const opt = opcoes.find((o) => o.valor === unidadeUso) || opcoes[0];
        return {
          insumoId,
          quantidade,
          unidadeUso: unidadeUso || opt.valor,
          fatorConversao: fatorConversao !== undefined ? fatorConversao : opt.fator,
        };
      })
    );
  };

  const handleRemoveInsumoNaReceita = (index: number) => {
    setFichaTecnica((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErrorMsg('Informe o nome do produto.');
      return;
    }

    const precoFinalSalvar = precoVendaFinal;
    if (precoFinalSalvar <= 0) {
      setErrorMsg('Informe um preço de venda maior que R$ 0,00.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const payload: Partial<Produto> = {
        id: editingProduto ? editingProduto.id : undefined,
        nome,
        categoriaId: categoriaId || (categorias[0]?.id || 'cat-geral'),
        tipo,
        descricao,
        estoqueAtual: Number(estoqueAtual) || 0,
        estoqueMinimo: Number(estoqueMinimo) || 2,
        rendimentoReceita: tipo === 'FABRICADO' ? rendimento : 1,
        custoInsumos: tipo === 'FABRICADO' ? Number(custoInsumosReceita.toFixed(2)) : parsePtBrFloat(custoDireto),
        custoUnitarioInsumos: tipo === 'FABRICADO' ? custoUnitarioInsumos : parsePtBrFloat(custoDireto),
        custoEmbalagem: tipo === 'FABRICADO' ? parsePtBrFloat(custoEmbalagem) : 0,
        custoMaoDeObra: tipo === 'FABRICADO' ? parsePtBrFloat(custoMaoDeObra) : 0,
        custoGasEnergia: tipo === 'FABRICADO' ? parsePtBrFloat(custoGasEnergia) : 0,
        custoTotal: custoTotalUnitario,
        margemLucroPct: parsePtBrFloat(margemLucroPct) || 100,
        precoVenda: Number(precoFinalSalvar.toFixed(2)),
        modoPreparo: editingProduto?.modoPreparo || '',
        tempoPreparo: editingProduto?.tempoPreparo || '',
        validadeConservacao: editingProduto?.validadeConservacao || '',
        fichaTecnica: tipo === 'FABRICADO'
          ? fichaTecnica.map((ft) => ({
              insumoId: ft.insumoId,
              quantidade: parsePtBrFloat(ft.quantidade),
              unidadeUso: ft.unidadeUso,
              fatorConversao: ft.fatorConversao,
            }))
          : [],
      };

      await salvarProdutoLocalEOnline(payload);
      setModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar produto');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduto = async () => {
    if (!produtoParaExcluir) return;
    setLoading(true);

    try {
      await removerProdutoLocalEOnline(produtoParaExcluir.id);
      setDeleteModalOpen(false);
      setProdutoParaExcluir(null);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao excluir produto');
    } finally {
      setLoading(false);
    }
  };

  // Produzir Fornada
  const handleConfirmarProducao = async () => {
    if (!produtoParaProduzir) return;
    setProduzindoLoading(true);
    setErrorMsg('');

    try {
      const res = await produzirLoteLocalEOnline(produtoParaProduzir.id, qtdLotesProduzir);
      if (!res.success) {
        throw new Error(res.error || 'Erro ao produzir lote');
      }
      setProduzirModalOpen(false);
      setProdutoParaProduzir(null);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao produzir lote');
    } finally {
      setProduzindoLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      {/* Top Banner & Botão Novo Produto */}
      <div className="p-4 bg-zinc-950 rounded-3xl border border-zinc-800 flex items-center justify-between shadow-neon-subtle">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Catálogo & Custos de Produção
          </span>
          <span className="text-xl font-black text-white font-mono mt-0.5 block">
            {(produtos || []).length} Produtos
          </span>
          <span className="text-[11px] text-zinc-400">Calculadora de custo & ficha técnica</span>
        </div>
        <button
          onClick={handleOpenNew}
          className="p-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl shadow-neon-green active:scale-95 transition-all"
          title="Novo Produto"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Busca e Filtro de Categoria */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-2xl text-xs text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <select
          value={selectedCategoria}
          onChange={(e) => setSelectedCategoria(e.target.value)}
          className="py-2.5 px-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-xs text-white focus:outline-none"
        >
          <option value="all">Todas</option>
          {(categorias || []).map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>

      {/* Lista de Produtos com Cards Modernos */}
      <div className="space-y-3 pb-16">
        {filteredProdutos.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-xs bg-zinc-950/60 rounded-3xl border border-zinc-900">
            Nenhum produto cadastrado nesta categoria. Toque no botão <strong>+</strong> acima para criar seu primeiro produto!
          </div>
        ) : (
          filteredProdutos.map((prod) => {
            const cat = (categorias || []).find((c) => c.id === prod.categoriaId);
            const isCritico = Number(prod.estoqueAtual || 0) <= Number(prod.estoqueMinimo || 0);
            const temFicha = prod.tipo === 'FABRICADO' && prod.fichaTecnica && prod.fichaTecnica.length > 0;
            const rend = Math.max(1, Number(prod.rendimentoReceita) || 1);
            const lucroUn = Math.max(0, (Number(prod.precoVenda) || 0) - (Number(prod.custoTotal) || 0));

            return (
              <div
                key={prod.id}
                className="p-4 rounded-3xl bg-zinc-950 border border-zinc-800/80 hover:border-purple-500/30 transition-all space-y-2.5 shadow-sm"
              >
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                          prod.tipo === 'FABRICADO'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        }`}
                      >
                        {prod.tipo === 'FABRICADO' ? 'Produção Própria' : 'Revenda'}
                      </span>
                      {temFicha && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono">
                          Rende {rend} un
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-500 font-medium">{cat?.nome || 'Geral'}</span>
                    </div>
                    <h3 className="font-bold text-white text-sm">{prod.nome}</h3>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 block">Preço PDV</span>
                    <span className="text-base font-black text-emerald-400 font-mono">
                      R$ {Number(prod.precoVenda || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Grid Analítico de Custos, Margem e Estoque */}
                <div className="p-2.5 bg-zinc-900/80 rounded-2xl border border-zinc-800 text-xs font-mono grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[9px] text-zinc-500 block">Custo Unitário</span>
                    <span className="text-zinc-300 font-bold">
                      R$ {Number(prod.custoTotal || 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 block">Lucro no Bolso</span>
                    <span className="text-emerald-400 font-bold">
                      +R$ {lucroUn.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 block">Estoque Pronto</span>
                    <span className={`font-bold ${isCritico ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {Number(prod.estoqueAtual || 0)} un
                    </span>
                  </div>
                </div>

                {/* Botões de Ação: PRODUZIR LOTE, EDITAR, EXCLUIR */}
                <div className="pt-2 border-t border-zinc-900 flex items-center justify-between gap-2">
                  {temFicha && (
                    <button
                      onClick={() => {
                        setProdutoParaProduzir(prod);
                        setQtdLotesProduzir(1);
                        setErrorMsg('');
                        setProduzirModalOpen(true);
                      }}
                      className="py-1.5 px-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-xl text-xs font-bold border border-purple-500/40 flex items-center gap-1.5 active:scale-95 transition-all shadow-neon-purple"
                    >
                      <ChefHat className="w-3.5 h-3.5 text-purple-400" />
                      <span>Produzir Lote</span>
                    </button>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => handleOpenEdit(prod)}
                      className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold border border-zinc-800 flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-cyan-400" /> Editar
                    </button>
                    <button
                      onClick={() => {
                        setProdutoParaExcluir(prod);
                        setErrorMsg('');
                        setDeleteModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold border border-zinc-800 flex items-center gap-1.5 active:scale-95 transition-all hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" /> Excluir
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ================= MODAL PRODUZIR FORNADA / LOTE ================= */}
      {produzirModalOpen && produtoParaProduzir && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-purple-500/40 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-purple-400" />
                Produzir Fornada: {produtoParaProduzir.nome}
              </h3>
              <button
                onClick={() => setProduzirModalOpen(false)}
                className="w-7 h-7 rounded-full bg-zinc-900 text-zinc-400 flex items-center justify-center hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Ao registrar uma produção, os insumos da receita serão automaticamente descontados do estoque de matérias-primas e os produtos prontos serão adicionados ao estoque da vitrine.
            </p>

            {/* Seletor de Fornadas */}
            <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-2">
              <label className="text-[11px] font-bold text-zinc-300 block">
                Quantas receitas/fornadas você produziu?
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQtdLotesProduzir((prev) => Math.max(1, prev - 1))}
                  className="w-10 h-10 rounded-xl bg-zinc-800 text-white font-bold text-base active:scale-95"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={qtdLotesProduzir}
                  onChange={(e) => setQtdLotesProduzir(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 py-2 text-center text-lg font-black bg-black border border-zinc-800 rounded-xl text-white font-mono"
                />
                <button
                  type="button"
                  onClick={() => setQtdLotesProduzir((prev) => prev + 1)}
                  className="w-10 h-10 rounded-xl bg-purple-500 text-black font-bold text-base active:scale-95"
                >
                  +
                </button>
              </div>

              <div className="text-center pt-1">
                <span className="text-xs text-purple-300 font-bold font-mono">
                  = +{(Math.max(1, produtoParaProduzir.rendimentoReceita || 1) * qtdLotesProduzir)} unidades prontas para venda!
                </span>
              </div>
            </div>

            {/* Prévia dos Insumos Consumidos */}
            <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
              <span className="text-[10px] font-bold uppercase text-zinc-500 block">Insumos a Descontar:</span>
              {produtoParaProduzir.fichaTecnica?.map((ft, idx) => {
                const ins = insumos.find((i) => i.id === ft.insumoId);
                const qtdConsumo = (ft.quantidade || 0) * qtdLotesProduzir;
                const temEstoque = ins ? ins.estoqueAtual >= (qtdConsumo * (ft.fatorConversao || 1)) : true;

                return (
                  <div key={idx} className="flex justify-between items-center text-xs p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                    <span className="text-zinc-300 font-medium">{ins?.nome || 'Insumo'}</span>
                    <span className={`font-mono font-bold ${temEstoque ? 'text-zinc-200' : 'text-rose-400'}`}>
                      {qtdConsumo} {ft.unidadeUso || ins?.unidade || 'un'}
                      {!temEstoque && ' (Insuficiente!)'}
                    </span>
                  </div>
                );
              })}
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl font-bold">
                {errorMsg}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setProduzirModalOpen(false)}
                className="flex-1 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={produzindoLoading}
                onClick={handleConfirmarProducao}
                className="flex-1 py-2.5 bg-purple-500 hover:bg-purple-400 text-black font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-neon-purple active:scale-95 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{produzindoLoading ? 'Produzindo...' : 'Confirmar Produção'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL CADASTRO / EDIÇÃO COM CALCULADORA E FICHA TÉCNICA ================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Calculator className="w-4 h-4 text-purple-400" />
                {editingProduto ? 'Editar Produto & Ficha Técnica' : 'Novo Produto & Custos'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 rounded-full bg-zinc-900 text-zinc-400 flex items-center justify-center hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduto} className="space-y-3.5">
              {/* Nome do Produto */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Brigadeiro Gourmet Tradicional, Bolo no Pote..."
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full text-xs p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Categoria & Tipo (Lado a lado) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">Categoria *</label>
                  <select
                    value={categoriaId || (categorias[0]?.id || 'cat-geral')}
                    onChange={(e) => setCategoriaId(e.target.value)}
                    className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none"
                  >
                    {categorias.length === 0 && <option value="cat-geral">Geral (Padrão)</option>}
                    {(categorias || []).map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">Tipo de Produto</label>
                  <div className="grid grid-cols-2 gap-1 bg-zinc-900 p-0.5 rounded-xl border border-zinc-800">
                    <button
                      type="button"
                      onClick={() => {
                        setTipo('FABRICADO');
                        setMostrarCalculadora(true);
                      }}
                      className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                        tipo === 'FABRICADO'
                          ? 'bg-purple-500 text-black shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Produção
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipo('REVENDA')}
                      className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                        tipo === 'REVENDA'
                          ? 'bg-cyan-500 text-black shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Revenda
                    </button>
                  </div>
                </div>
              </div>

              {/* Estoque */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                    {tipo === 'FABRICADO' ? 'Prontos para Venda (Vitrine)' : 'Estoque Atual'}
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={estoqueAtual}
                    onChange={(e) => setEstoqueAtual(e.target.value)}
                    className="w-full text-xs p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-center focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1">Alerta de Estoque Mínimo</label>
                  <input
                    type="number"
                    step="1"
                    value={estoqueMinimo}
                    onChange={(e) => setEstoqueMinimo(e.target.value)}
                    className="w-full text-xs p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-center focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Se for Revenda Direta: Custo de Compra Simples */}
              {tipo === 'REVENDA' && (
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1">Custo de Compra Unitário (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-zinc-500 text-xs">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={custoDireto}
                      onChange={(e) => setCustoDireto(e.target.value)}
                      className="w-full text-xs pl-8 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* ================= PAINEL INTELIGENTE: FICHA TÉCNICA & CALCULADORA ================= */}
              {tipo === 'FABRICADO' && (
                <div className="p-3.5 bg-zinc-900/90 rounded-2xl border border-purple-500/40 space-y-4 shadow-neon-purple">
                  {/* SEÇÃO 1: RENDIMENTO DA RECEITA / FORNADA */}
                  <div className="space-y-1.5 pb-3 border-b border-zinc-800">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-purple-300 flex items-center gap-1.5">
                        <ChefHat className="w-4 h-4 text-purple-400" /> Rendimento da Receita (Lote)
                      </label>
                      <span className="text-[10px] text-zinc-400">Total Produzido</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      Quantas unidades prontas esta receita inteira produz?
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Ex: 0,250 ou 1,82"
                        value={rendimentoReceita}
                        onChange={(e) => setRendimentoReceita(e.target.value)}
                        className="w-28 text-center text-sm font-black py-2 bg-black border border-purple-500/60 rounded-xl text-purple-300 font-mono focus:outline-none focus:border-purple-400"
                      />
                      <span className="text-xs font-bold text-white">unidades por receita</span>
                    </div>

                    {/* Presets Rápidos */}
                    <div className="flex gap-1.5 pt-1 flex-wrap">
                      {[0.25, 0.5, 1, 6, 12, 25, 30, 50, 100].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setRendimentoReceita(preset.toString().replace('.', ','))}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all ${
                            rendimento === preset
                              ? 'bg-purple-500 text-black font-black'
                              : 'bg-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {preset.toString().replace('.', ',')} un
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* SEÇÃO 2: INGREDIENTES DA RECEITA INTEIRA */}
                  <div className="space-y-2 pb-3 border-b border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white flex items-center gap-1.5">
                        <Utensils className="w-3.5 h-3.5 text-cyan-400" /> Ingredientes da Receita Inteira
                      </span>
                      <button
                        type="button"
                        onClick={handleAddInsumoNaReceita}
                        className="text-[10px] font-black text-cyan-400 px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-xl border border-cyan-500/40 flex items-center gap-1 active:scale-95 transition-all"
                      >
                        <Plus className="w-3 h-3" /> Adicionar Insumo
                      </button>
                    </div>

                    {fichaTecnica.length === 0 ? (
                      <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800 text-center text-[10px] text-zinc-500">
                        Nenhum ingrediente adicionado. Toque em <strong>+ Adicionar Insumo</strong> para incluir leite condensado, chocolate, farinha, etc.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {fichaTecnica.map((item, idx) => {
                          const insumo = insumos.find((i) => i.id === item.insumoId);
                          const opcoes = getOpcoesUnidade(insumo?.unidade);
                          const fatorAtual = item.fatorConversao ?? (opcoes.find((o) => o.valor === item.unidadeUso)?.fator ?? 1);
                          const qtdNum = parsePtBrFloat(item.quantidade);
                          const custoTotalIngrediente = insumo ? (insumo.custoUnitario * (qtdNum * fatorAtual)) : 0;
                          const custoPorDoce = custoTotalIngrediente / rendimento;

                          return (
                            <div key={idx} className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1.5 text-xs">
                              <div className="flex items-center justify-between gap-1.5">
                                <select
                                  value={item.insumoId}
                                  onChange={(e) => handleUpdateItemReceita(idx, e.target.value, item.quantidade)}
                                  className="flex-1 p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-[11px] font-bold"
                                >
                                  {insumos.map((i) => (
                                    <option key={i.id} value={i.id}>
                                      {i.nome} (R$ {i.custoUnitario.toFixed(2)} / {i.unidade})
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveInsumoNaReceita(idx)}
                                  className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                  title="Remover insumo"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-1">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="Qtd (ex: 0,250)"
                                    value={item.quantidade !== undefined ? item.quantidade : ''}
                                    onChange={(e) =>
                                      handleUpdateItemReceita(
                                        idx,
                                        item.insumoId,
                                        e.target.value,
                                        item.unidadeUso,
                                        item.fatorConversao
                                      )
                                    }
                                    className="w-20 p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white font-mono font-bold text-center text-xs focus:outline-none focus:border-cyan-400"
                                  />
                                  <select
                                    value={item.unidadeUso || opcoes[0].valor}
                                    onChange={(e) => {
                                      const opt = opcoes.find((o) => o.valor === e.target.value);
                                      handleUpdateItemReceita(idx, item.insumoId, item.quantidade, opt?.valor, opt?.fator);
                                    }}
                                    className="p-1.5 bg-zinc-900 border border-cyan-500/40 rounded-lg text-cyan-300 font-bold text-[11px] focus:outline-none"
                                  >
                                    {opcoes.map((opt) => (
                                      <option key={opt.valor} value={opt.valor}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="text-right font-mono">
                                  <span className="text-xs font-black text-cyan-300 block">
                                    R$ {custoTotalIngrediente.toFixed(2)}
                                  </span>
                                  <span className="text-[9px] text-zinc-500">
                                    R$ {custoPorDoce.toFixed(2)} / un
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="pt-1.5 flex justify-between text-xs font-mono text-zinc-400 border-t border-zinc-800/80">
                      <span>Total Insumos da Receita:</span>
                      <strong className="text-white">R$ {custoInsumosReceita.toFixed(2)}</strong>
                    </div>
                  </div>

                  {/* SEÇÃO 3: CUSTOS ADICIONAIS (EMBALAGEM, GÁS E MÃO DE OBRA) */}
                  <div className="space-y-2 pb-3 border-b border-zinc-800">
                    <span className="text-xs font-black text-white flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-amber-400" /> Custos Adicionais da Produção
                    </span>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-zinc-400 mb-0.5">
                          Embalagem (p/ un)
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0,00"
                          value={custoEmbalagem}
                          onChange={(e) => setCustoEmbalagem(e.target.value)}
                          className="w-full text-xs p-1.5 bg-black border border-zinc-800 rounded-lg text-white font-mono text-center focus:outline-none focus:border-amber-400"
                        />
                        <span className="text-[8px] text-zinc-500 block text-center mt-0.5">pote / forminha</span>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-zinc-400 mb-0.5">
                          Gás / Energia (Lote)
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0,00"
                          value={custoGasEnergia}
                          onChange={(e) => setCustoGasEnergia(e.target.value)}
                          className="w-full text-xs p-1.5 bg-black border border-zinc-800 rounded-lg text-white font-mono text-center focus:outline-none focus:border-amber-400"
                        />
                        <span className="text-[8px] text-zinc-500 block text-center mt-0.5">da receita</span>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-zinc-400 mb-0.5">
                          Mão de Obra (Lote)
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0,00"
                          value={custoMaoDeObra}
                          onChange={(e) => setCustoMaoDeObra(e.target.value)}
                          className="w-full text-xs p-1.5 bg-black border border-zinc-800 rounded-lg text-white font-mono text-center focus:outline-none focus:border-amber-400"
                        />
                        <span className="text-[8px] text-zinc-500 block text-center mt-0.5">da receita</span>
                      </div>
                    </div>
                  </div>

                  {/* SEÇÃO 4: SIMULADOR DE LUCRO LÍQUIDO & PREÇO FINAL */}
                  <div className="p-3 bg-black rounded-2xl border border-emerald-500/40 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 font-bold">Custo Total de 1 Unidade Pronta:</span>
                      <strong className="text-white text-sm font-mono">
                        R$ {custoTotalUnitario.toFixed(2)}
                      </strong>
                    </div>

                    {/* Margem Desejada */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-900">
                      <span className="text-zinc-400">Margem Sugerida (%):</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={margemLucroPct}
                          onChange={(e) => setMargemLucroPct(e.target.value)}
                          className="w-16 text-center text-xs py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-purple-300 font-bold font-mono focus:outline-none focus:border-purple-400"
                        />
                        <span className="text-zinc-500 text-xs">%</span>
                      </div>
                    </div>

                    {/* Sugestão de Preço com clique para aplicar */}
                    {precoVendaSugerido > 0 && (
                      <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/30 flex items-center justify-between text-xs">
                        <span className="text-purple-300 font-bold">
                          Preço Sugerido: <strong>R$ {precoVendaSugerido.toFixed(2)}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => setPrecoVendaDireto(precoVendaSugerido.toFixed(2).replace('.', ','))}
                          className="py-1 px-2.5 bg-purple-500 text-black font-black rounded-lg text-[10px] active:scale-95"
                        >
                          Usar Sugerido
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ================= PREÇO DE VENDA FINAL NO PDV ================= */}
              <div className="p-3.5 bg-zinc-900 rounded-2xl border border-emerald-500/60 shadow-neon-green space-y-2">
                <label className="block text-xs font-black text-emerald-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" /> Preço de Venda Praticado no PDV (R$) *
                  </span>
                  <span className="text-[10px] text-zinc-400 font-normal">Valor Cobrado</span>
                </label>

                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-zinc-500 font-black text-sm">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="0,00"
                    value={precoVendaDireto}
                    onChange={(e) => setPrecoVendaDireto(e.target.value)}
                    className="w-full text-base font-black pl-10 pr-4 py-2.5 bg-black border border-emerald-500/80 rounded-xl text-emerald-300 font-mono focus:outline-none focus:border-emerald-400 shadow-[0_0_15px_rgba(0,255,136,0.2)]"
                  />
                </div>

                {/* Tag de Lucro Líquido Real no Bolso */}
                {precoVendaFinal > 0 && (
                  <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/40 flex items-center justify-between text-xs animate-in fade-in">
                    <div>
                      <span className="text-[10px] text-emerald-300 block font-bold">LUCRO LÍQUIDO NO BOLSO</span>
                      <strong className="text-emerald-400 font-mono text-sm">
                        + R$ {lucroLiquidoReal.toFixed(2)} por unidade
                      </strong>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500 text-black font-black font-mono">
                      {margemRealEfetivaPct}% margem
                    </span>
                  </div>
                )}
              </div>

              {/* Descrição Opcional */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1">Descrição do Produto (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Feito com chocolate belga, recheio cremoso..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none"
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl font-bold">
                  {errorMsg}
                </p>
              )}

              {/* Botões do Rodapé */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-2xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl text-xs font-black shadow-neon-green active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL EXCLUSÃO ================= */}
      {deleteModalOpen && produtoParaExcluir && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-xs w-full p-5 text-center space-y-3">
            <Trash2 className="w-8 h-8 text-rose-500 mx-auto" />
            <h3 className="font-bold text-white text-sm">Excluir {produtoParaExcluir.nome}?</h3>
            <p className="text-xs text-zinc-400">Esta ação não poderá ser desfeita.</p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteProduto}
                className="flex-1 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold active:scale-95"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
