'use client';

import React, { useState } from 'react';
import { Insumo, UnidadeMedida } from '@/types';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  ArrowUpRight,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { salvarInsumoLocalEOnline, removerInsumoLocalEOnline } from '@/lib/dataService';

interface InsumosViewProps {
  insumos: Insumo[];
  onRefresh: () => void;
}

export default function InsumosView({ insumos, onRefresh }: InsumosViewProps) {
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingInsumo, setEditingInsumo] = useState<Insumo | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    unidade: 'un' as UnidadeMedida,
    custoUnitario: 0,
    estoqueAtual: 0,
    estoqueMinimo: 5,
    fornecedor: '',
  });

  const [entradaModalOpen, setEntradaModalOpen] = useState(false);
  const [insumoEntrada, setInsumoEntrada] = useState<Insumo | null>(null);
  const [quantidadeEntrada, setQuantidadeEntrada] = useState<number>(0);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [insumoParaExcluir, setInsumoParaExcluir] = useState<Insumo | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const filteredInsumos = insumos.filter(
    (i) =>
      i.nome.toLowerCase().includes(search.toLowerCase()) ||
      (i.fornecedor && i.fornecedor.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenNew = () => {
    setEditingInsumo(null);
    setFormData({
      nome: '',
      unidade: 'un',
      custoUnitario: 0,
      estoqueAtual: 0,
      estoqueMinimo: 5,
      fornecedor: '',
    });
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleOpenEdit = (ins: Insumo) => {
    setEditingInsumo(ins);
    setFormData({
      nome: ins.nome,
      unidade: ins.unidade,
      custoUnitario: ins.custoUnitario,
      estoqueAtual: ins.estoqueAtual,
      estoqueMinimo: ins.estoqueMinimo,
      fornecedor: ins.fornecedor || '',
    });
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleSaveInsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) return;
    setLoading(true);

    try {
      const payload: Partial<Insumo> = {
        ...formData,
        id: editingInsumo ? editingInsumo.id : undefined,
      };

      await salvarInsumoLocalEOnline(payload);

      setModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarEntradaEstoque = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!insumoEntrada || quantidadeEntrada <= 0) return;
    setLoading(true);

    try {
      const novoEstoque = Number((insumoEntrada.estoqueAtual + quantidadeEntrada).toFixed(3));
      await salvarInsumoLocalEOnline({
        ...insumoEntrada,
        estoqueAtual: novoEstoque,
      });

      setEntradaModalOpen(false);
      setInsumoEntrada(null);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro na entrada');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInsumo = async () => {
    if (!insumoParaExcluir) return;
    setLoading(true);

    try {
      await removerInsumoLocalEOnline(insumoParaExcluir.id);

      setDeleteModalOpen(false);
      setInsumoParaExcluir(null);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao excluir');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      {/* Banner Resumo Insumos */}
      <div className="p-4 bg-zinc-950 rounded-3xl border border-zinc-800 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
            Estoque de Insumos
          </span>
          <span className="text-xl font-black text-white font-mono mt-0.5 block">
            {insumos.length} Itens
          </span>
          <span className="text-[11px] text-zinc-400">Baixados por receita</span>
        </div>
        <button
          onClick={handleOpenNew}
          className="p-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl shadow-[0_0_12px_rgba(34,197,94,0.3)] active:scale-95"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
        <input
          type="text"
          placeholder="Buscar insumo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-2xl text-xs text-white focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Lista de Insumos com EDITAR e EXCLUIR */}
      <div className="space-y-3 pb-16">
        {filteredInsumos.map((ins) => {
          const isCritico = ins.estoqueAtual <= ins.estoqueMinimo;

          return (
            <div
              key={ins.id}
              className={`p-4 rounded-3xl bg-zinc-950 border transition-all ${
                isCritico ? 'border-amber-500/40' : 'border-zinc-800/80'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-white text-sm">{ins.nome}</h3>
                  <span className="text-[11px] text-zinc-500 block">
                    Custo: <strong className="text-zinc-300 font-mono">R$ {ins.custoUnitario.toFixed(2)}</strong> / {ins.unidade}
                  </span>
                </div>

                <div className="text-right font-mono">
                  <span className={`text-sm font-black block ${isCritico ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {ins.estoqueAtual} {ins.unidade}
                  </span>
                  <span className="text-[10px] text-zinc-500">Mín: {ins.estoqueMinimo}</span>
                </div>
              </div>

              {/* Botões na Thumb Zone */}
              <div className="mt-3 pt-2.5 border-t border-zinc-900 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    setInsumoEntrada(ins);
                    setQuantidadeEntrada(1);
                    setEntradaModalOpen(true);
                  }}
                  className="flex-1 py-1.5 px-3 bg-zinc-900 hover:bg-emerald-500 hover:text-black text-emerald-400 rounded-xl text-xs font-bold border border-emerald-500/30 flex items-center justify-center gap-1 active:scale-95 transition-all"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" /> + Entrada
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(ins)}
                    className="p-2 text-zinc-400 hover:text-white bg-zinc-900 rounded-xl border border-zinc-800 active:scale-95"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setInsumoParaExcluir(ins);
                      setErrorMsg('');
                      setDeleteModalOpen(true);
                    }}
                    className="p-2 text-zinc-400 hover:text-rose-400 bg-zinc-900 rounded-xl border border-zinc-800 active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Criar / Editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-sm w-full p-5 space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="font-bold text-white text-sm">
                {editingInsumo ? 'Editar Insumo' : 'Novo Insumo'}
              </h3>
              <button onClick={() => setModalOpen(false)}>
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleSaveInsumo} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">Nome do Insumo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Leite Condensado"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">Unidade</label>
                  <select
                    value={formData.unidade}
                    onChange={(e) => setFormData({ ...formData, unidade: e.target.value as UnidadeMedida })}
                    className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none"
                  >
                    <option value="un">un (Unidade)</option>
                    <option value="kg">kg (Quilograma)</option>
                    <option value="g">g (Grama)</option>
                    <option value="l">l (Litro)</option>
                    <option value="ml">ml (Mililitro)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">Custo Unitário (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.custoUnitario}
                    onChange={(e) => setFormData({ ...formData, custoUnitario: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-emerald-400 font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">Estoque Atual</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.estoqueAtual}
                    onChange={(e) => setFormData({ ...formData, estoqueAtual: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">Estoque Mínimo</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.estoqueMinimo}
                    onChange={(e) => setFormData({ ...formData, estoqueMinimo: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none"
                  />
                </div>
              </div>

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
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Entrada Rápida */}
      {entradaModalOpen && insumoEntrada && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-xs w-full p-5 space-y-3">
            <h3 className="font-bold text-white text-sm">Entrada de {insumoEntrada.nome}</h3>
            <form onSubmit={handleSalvarEntradaEstoque} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">Qtd Comprada ({insumoEntrada.unidade})</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={quantidadeEntrada}
                  onChange={(e) => setQuantidadeEntrada(parseFloat(e.target.value) || 0)}
                  className="w-full text-base font-bold p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-emerald-400 font-mono text-center"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEntradaModalOpen(false)}
                  className="flex-1 py-2 bg-zinc-900 text-zinc-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-emerald-500 text-black rounded-xl text-xs font-bold"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Exclusão */}
      {deleteModalOpen && insumoParaExcluir && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-xs w-full p-5 text-center space-y-3">
            <Trash2 className="w-8 h-8 text-rose-500 mx-auto" />
            <h3 className="font-bold text-white text-sm">Excluir {insumoParaExcluir.nome}?</h3>
            {errorMsg && (
              <p className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded-xl text-left">{errorMsg}</p>
            )}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-2 bg-zinc-900 text-zinc-300 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteInsumo}
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
