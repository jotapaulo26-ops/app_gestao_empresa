'use client';

import React, { useState, useMemo } from 'react';
import { Produto, Categoria, Insumo, TipoProduto, ItemFichaTecnica } from '@/types';
import { apiFetch } from '@/lib/api';
import { salvarProdutoLocalEOnline, removerProdutoLocalEOnline } from '@/lib/dataService';
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

  // Modais
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);

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

  // Ficha Técnica / Calculadora Avançada
  const [margemLucroPct, setMargemLucroPct] = useState(100);
  const [custoEmbalagem, setCustoEmbalagem] = useState(0);
  const [custoMaoDeObra, setCustoMaoDeObra] = useState(0);
  const [fichaTecnica, setFichaTecnica] = useState<ItemFichaTecnica[]>([]);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [produtoParaExcluir, setProdutoParaExcluir] = useState<Produto | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // CALCULADORA DE CUSTOS EM TEMPO REAL
  const custoInsumosCalculado = useMemo(() => {
    if (tipo === 'REVENDA') return Number(custoDireto) || 0;
    return fichaTecnica.reduce((acc, item) => {
      const ins = insumos.find((i) => i.id === item.insumoId);
      if (!ins) return acc;
      return acc + ins.custoUnitario * item.quantidade;
    }, 0);
  }, [tipo, custoDireto, fichaTecnica, insumos]);

  const custoTotalProducao = useMemo(() => {
    if (tipo === 'REVENDA') return Number(custoDireto) || 0;
    return Number((custoInsumosCalculado + (Number(custoEmbalagem) || 0) + (Number(custoMaoDeObra) || 0)).toFixed(2));
  }, [tipo, custoDireto, custoInsumosCalculado, custoEmbalagem, custoMaoDeObra]);

  const precoVendaSugerido = useMemo(() => {
    if (custoTotalProducao > 0) {
      return Number((custoTotalProducao * (1 + (Number(margemLucroPct) || 0) / 100)).toFixed(2));
    }
    return 0;
  }, [custoTotalProducao, margemLucroPct]);

  // Preço final: se o usuário digitou direto, usa o digitado!
  const precoVendaFinal = useMemo(() => {
    const direto = parseFloat(precoVendaDireto);
    if (!isNaN(direto) && direto > 0) return direto;
    return precoVendaSugerido > 0 ? precoVendaSugerido : 0;
  }, [precoVendaDireto, precoVendaSugerido]);

  // Filtros
  const filteredProdutos = produtos.filter((p) => {
    const matchCat = selectedCategoria === 'all' || p.categoriaId === selectedCategoria;
    const matchSearch =
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.descricao?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleOpenNew = () => {
    setEditingProduto(null);
    setNome('');
    setCategoriaId(categorias[0]?.id || '');
    setTipo('REVENDA');
    setDescricao('');
    setEstoqueAtual(0);
    setEstoqueMinimo(2);
    setPrecoVendaDireto('');
    setCustoDireto('');
    setMostrarCalculadora(false);
    setMargemLucroPct(100);
    setCustoEmbalagem(0);
    setCustoMaoDeObra(0);
    setFichaTecnica([]);
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleOpenEdit = (prod: Produto) => {
    setEditingProduto(prod);
    setNome(prod.nome);
    setCategoriaId(prod.categoriaId);
    setTipo(prod.tipo);
    setDescricao(prod.descricao || '');
    setEstoqueAtual(prod.estoqueAtual);
    setEstoqueMinimo(prod.estoqueMinimo);
    setPrecoVendaDireto(prod.precoVenda ? prod.precoVenda.toString() : '');
    setCustoDireto(prod.custoTotal ? prod.custoTotal.toString() : '');
    setMargemLucroPct(prod.margemLucroPct || 100);
    setCustoEmbalagem(prod.custoEmbalagem || 0);
    setCustoMaoDeObra(prod.custoMaoDeObra || 0);
    setFichaTecnica(prod.fichaTecnica ? [...prod.fichaTecnica] : []);
    setMostrarCalculadora(Boolean(prod.tipo === 'FABRICADO' && prod.fichaTecnica && prod.fichaTecnica.length > 0));
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleAddInsumoNaReceita = () => {
    if (insumos.length === 0) return;
    setFichaTecnica([...fichaTecnica, { insumoId: insumos[0].id, quantidade: 1 }]);
  };

  const handleRemoveInsumoNaReceita = (index: number) => {
    setFichaTecnica(fichaTecnica.filter((_, idx) => idx !== index));
  };

  const handleUpdateItemReceita = (index: number, insumoId: string, quantidade: number) => {
    const updated = [...fichaTecnica];
    updated[index] = { insumoId, quantidade: Math.max(0.001, quantidade) };
    setFichaTecnica(updated);
  };

  const handleSaveProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErrorMsg('Informe o nome do produto.');
      return;
    }
    const finalCategoriaId = categoriaId || categorias[0]?.id || 'cat-geral';

    const precoFinalSalvar = precoVendaFinal;
    if (precoFinalSalvar <= 0) {
      setErrorMsg('Informe um Preço de Venda válido (maior que zero).');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const payload: Partial<Produto> = {
        id: editingProduto ? editingProduto.id : undefined,
        nome: nome.trim(),
        categoriaId: finalCategoriaId,
        tipo,
        descricao,
        estoqueAtual: Number(estoqueAtual) || 0,
        estoqueMinimo: Number(estoqueMinimo) || 0,
        margemLucroPct: Number(margemLucroPct) || 0,
        custoInsumos: custoInsumosCalculado,
        custoEmbalagem: tipo === 'FABRICADO' ? Number(custoEmbalagem) || 0 : 0,
        custoMaoDeObra: tipo === 'FABRICADO' ? Number(custoMaoDeObra) || 0 : 0,
        custoTotal: custoTotalProducao,
        precoVenda: Number(precoFinalSalvar.toFixed(2)),
        fichaTecnica: tipo === 'FABRICADO' ? fichaTecnica : [],
      };

      await salvarProdutoLocalEOnline(payload);

      setModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar');
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
      setErrorMsg(err.message || 'Erro ao excluir');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      {/* Top Banner & Botão Novo Produto */}
      <div className="p-4 bg-zinc-950 rounded-3xl border border-zinc-800 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
            Catálogo & Custos
          </span>
          <span className="text-xl font-black text-white font-mono mt-0.5 block">
            {produtos.length} Produtos
          </span>
          <span className="text-[11px] text-zinc-400">Margem e baixa por receita</span>
        </div>
        <button
          onClick={handleOpenNew}
          className="p-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl shadow-[0_0_12px_rgba(34,197,94,0.3)] active:scale-95"
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
            className="w-full pl-9 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-2xl text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={selectedCategoria}
          onChange={(e) => setSelectedCategoria(e.target.value)}
          className="py-2.5 px-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-xs text-white focus:outline-none"
        >
          <option value="all">Todas</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>

      {/* Lista de Produtos com EDITAR e EXCLUIR */}
      <div className="space-y-3 pb-16">
        {filteredProdutos.map((prod) => {
          const cat = categorias.find((c) => c.id === prod.categoriaId);
          const isCritico = prod.estoqueAtual <= prod.estoqueMinimo;

          return (
            <div
              key={prod.id}
              className="p-4 rounded-3xl bg-zinc-950 border border-zinc-800/80 space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                        prod.tipo === 'FABRICADO'
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {prod.tipo === 'FABRICADO' ? 'Própria' : 'Revenda'}
                    </span>
                    <span className="text-[10px] text-zinc-500">{cat?.nome}</span>
                  </div>
                  <h3 className="font-bold text-white text-sm">{prod.nome}</h3>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 block">Preço</span>
                  <span className="text-base font-black text-emerald-400 font-mono">
                    R$ {prod.precoVenda.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Informações de Custo e Margem */}
              <div className="p-2.5 bg-zinc-900/80 rounded-2xl border border-zinc-800 text-xs font-mono grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[9px] text-zinc-500 block">Custo Total</span>
                  <span className="text-zinc-300 font-bold">R$ {prod.custoTotal.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 block">Margem</span>
                  <span className="text-purple-400 font-bold">+{prod.margemLucroPct}%</span>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 block">Estoque</span>
                  <span className={`font-bold ${isCritico ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {prod.estoqueAtual} un
                  </span>
                </div>
              </div>

              {/* Botões EDITAR e EXCLUIR */}
              <div className="pt-2 border-t border-zinc-900 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenEdit(prod)}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold border border-zinc-800 flex items-center gap-1.5 active:scale-95"
                >
                  <Edit2 className="w-3.5 h-3.5 text-cyan-400" /> Editar
                </button>
                <button
                  onClick={() => {
                    setProdutoParaExcluir(prod);
                    setErrorMsg('');
                    setDeleteModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold border border-zinc-800 flex items-center gap-1.5 active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" /> Excluir
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Cadastro/Edição com Calculadora de Custos */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-sm w-full p-5 space-y-3.5 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-emerald-400" />
                {editingProduto ? 'Editar Produto' : 'Novo Produto & Custo'}
              </h3>
              <button onClick={() => setModalOpen(false)}>
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleSaveProduto} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome do produto"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">Categoria *</label>
                <select
                  value={categoriaId || (categorias[0]?.id || 'cat-geral')}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none"
                >
                  {categorias.length === 0 && (
                    <option value="cat-geral">Geral (Padrão)</option>
                  )}
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipo('FABRICADO')}
                    className={`p-2 rounded-xl border text-xs font-bold ${
                      tipo === 'FABRICADO'
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    Produção (Receita)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo('REVENDA')}
                    className={`p-2 rounded-xl border text-xs font-bold ${
                      tipo === 'REVENDA'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    Revenda Direta
                  </button>
                </div>
              </div>

              {/* PREÇO DE VENDA DIRETO (DESTAQUE) */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <DollarSign className="w-3.5 h-3.5" /> Preço de Venda (R$) *
                  </span>
                  <span className="text-[10px] text-zinc-500 font-normal">Valor no PDV</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-zinc-500 font-bold text-xs">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="Ex: 25.00"
                    value={precoVendaDireto}
                    onChange={(e) => setPrecoVendaDireto(e.target.value)}
                    className="w-full text-sm font-black pl-9 pr-3 py-2.5 bg-zinc-900 border border-emerald-500/50 rounded-xl text-emerald-400 focus:outline-none focus:border-emerald-400 shadow-[0_0_12px_rgba(0,255,136,0.15)] placeholder:text-zinc-600"
                  />
                </div>
              </div>

              {/* Estoque */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1">Estoque Atual</label>
                  <input
                    type="number"
                    step="1"
                    value={estoqueAtual}
                    onChange={(e) => setEstoqueAtual(e.target.value)}
                    className="w-full text-xs p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-center focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1">Estoque Mínimo</label>
                  <input
                    type="number"
                    step="1"
                    value={estoqueMinimo}
                    onChange={(e) => setEstoqueMinimo(e.target.value)}
                    className="w-full text-xs p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-center focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Custo Unitário Direto (Opcional) */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1 flex items-center justify-between">
                  <span>Custo de Compra / Produção (R$)</span>
                  <span className="text-[10px] text-zinc-600">Opcional</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-zinc-500 text-xs">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={custoDireto}
                    onChange={(e) => setCustoDireto(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-zinc-700"
                  />
                </div>
              </div>

              {/* Botão de Abrir Calculadora de Custos com Insumos (Opcional) */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const novoEstado = !mostrarCalculadora;
                    setMostrarCalculadora(novoEstado);
                    if (novoEstado) setTipo('FABRICADO');
                  }}
                  className="w-full py-2 px-3 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-400 hover:text-white flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5 text-purple-400" />
                    <span>Calcular com Ficha Técnica / Insumos</span>
                  </div>
                  {mostrarCalculadora ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Seção Opcional de Ficha Técnica */}
              {mostrarCalculadora && (
                <div className="p-3 bg-zinc-900 rounded-2xl border border-purple-500/30 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-300">Ficha Técnica da Receita</span>
                    <button
                      type="button"
                      onClick={handleAddInsumoNaReceita}
                      className="text-[10px] font-bold text-purple-400 px-2 py-0.5 bg-purple-500/10 rounded-lg border border-purple-500/30"
                    >
                      + Insumo
                    </button>
                  </div>

                  {fichaTecnica.length === 0 ? (
                    <p className="text-[10px] text-zinc-500 italic">Nenhum insumo adicionado ainda.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {fichaTecnica.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1 text-xs">
                          <select
                            value={item.insumoId}
                            onChange={(e) => handleUpdateItemReceita(idx, e.target.value, item.quantidade)}
                            className="flex-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-[11px]"
                          >
                            {insumos.map((i) => (
                              <option key={i.id} value={i.id}>{i.nome}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            step="0.01"
                            min="0.001"
                            value={item.quantidade}
                            onChange={(e) => handleUpdateItemReceita(idx, item.insumoId, parseFloat(e.target.value) || 0)}
                            className="w-16 p-1 bg-zinc-950 border border-zinc-800 rounded-lg text-center text-white text-[11px]"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveInsumoNaReceita(idx)}
                            className="p-1 text-rose-400"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-zinc-800 text-[11px] space-y-1 font-mono">
                    <div className="flex justify-between text-zinc-400">
                      <span>Custo dos Insumos:</span>
                      <span className="text-white">R$ {custoInsumosCalculado.toFixed(2)}</span>
                    </div>
                    {precoVendaSugerido > 0 && (
                      <div className="flex justify-between text-purple-300 font-bold">
                        <span>Preço Sugerido ({margemLucroPct}%):</span>
                        <button
                          type="button"
                          onClick={() => setPrecoVendaDireto(precoVendaSugerido.toFixed(2))}
                          className="underline hover:text-white"
                        >
                          Usar R$ {precoVendaSugerido.toFixed(2)}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-emerald-500 text-black rounded-xl text-xs font-black shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                >
                  {loading ? 'Salvando...' : 'Salvar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Exclusão */}
      {deleteModalOpen && produtoParaExcluir && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-xs w-full p-5 text-center space-y-3">
            <Trash2 className="w-8 h-8 text-rose-500 mx-auto" />
            <h3 className="font-bold text-white text-sm">Excluir {produtoParaExcluir.nome}?</h3>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteProduto}
                className="flex-1 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold"
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
