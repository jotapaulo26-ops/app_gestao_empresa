'use client';

import React, { useState } from 'react';
import { Categoria, Produto } from '@/types';
import { Tags, Plus, Edit2, Trash2, X, AlertTriangle, Layers } from 'lucide-react';

interface CategoriasViewProps {
  categorias: Categoria[];
  produtos: Produto[];
  onRefresh: () => void;
}

export default function CategoriasView({ categorias, produtos, onRefresh }: CategoriasViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [nome, setNome] = useState('');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [categoriaParaExcluir, setCategoriaParaExcluir] = useState<Categoria | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleOpenNew = () => {
    setEditingCategoria(null);
    setNome('');
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleOpenEdit = (cat: Categoria) => {
    setEditingCategoria(cat);
    setNome(cat.nome);
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setLoading(true);

    try {
      const payload: Partial<Categoria> = {
        id: editingCategoria ? editingCategoria.id : undefined,
        nome,
      };

      const res = await fetch('/api/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');

      setModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cascade: boolean = false) => {
    if (!categoriaParaExcluir) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/categorias?id=${categoriaParaExcluir.id}${cascade ? '&cascade=true' : ''}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir');

      setDeleteModalOpen(false);
      setCategoriaParaExcluir(null);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao excluir');
    } finally {
      setLoading(false);
    }
  };

  const qtdProdutosVinculados = categoriaParaExcluir
    ? produtos.filter((p) => p.categoriaId === categoriaParaExcluir.id).length
    : 0;

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      {/* Banner Resumo Categorias */}
      <div className="p-4 bg-zinc-950 rounded-3xl border border-cyan-500/40 shadow-neon-cyan flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
            Gestão de Categorias
          </span>
          <span className="text-xl font-black text-white font-mono mt-0.5 block">
            {categorias.length} Categorias
          </span>
          <span className="text-[11px] text-zinc-400">Cards interativos do PDV</span>
        </div>
        <button
          onClick={handleOpenNew}
          className="p-3 bg-cyan-500 hover:bg-cyan-400 text-black rounded-2xl shadow-neon-cyan active:scale-95"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Lista de Categorias com EDITAR e EXCLUIR */}
      <div className="space-y-3 pb-16">
        {categorias.map((cat) => {
          const countProd = produtos.filter((p) => p.categoriaId === cat.id).length;

          return (
            <div
              key={cat.id}
              className="p-4 rounded-3xl bg-zinc-950 border border-zinc-800/80 hover:border-cyan-500/40 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Tags className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-white text-sm block">{cat.nome}</span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {countProd} {countProd === 1 ? 'produto vinculado' : 'produtos vinculados'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(cat)}
                  className="p-2 text-zinc-400 hover:text-white bg-zinc-900 rounded-xl border border-zinc-800 active:scale-95"
                >
                  <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                </button>
                <button
                  onClick={() => {
                    setCategoriaParaExcluir(cat);
                    setErrorMsg('');
                    setDeleteModalOpen(true);
                  }}
                  className="p-2 text-zinc-400 hover:text-rose-400 bg-zinc-900 rounded-xl border border-zinc-800 active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Criar / Editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-xs w-full p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="font-bold text-white text-sm">
                {editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}
              </h3>
              <button onClick={() => setModalOpen(false)}>
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">Nome da Categoria *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Bebidas Especiais"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 font-bold"
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded-xl">{errorMsg}</p>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2 bg-zinc-900 text-zinc-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-cyan-500 text-black rounded-xl text-xs font-black shadow-neon-cyan"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Exclusão de Categoria com Opção de Excluir Todos os Produtos Juntos */}
      {deleteModalOpen && categoriaParaExcluir && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-sm w-full p-5 text-center space-y-3.5 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/40">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-white text-base">Excluir {categoriaParaExcluir.nome}?</h3>
              {qtdProdutosVinculados > 0 ? (
                <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-300 text-left space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Atenção: Categoria com produtos!</span>
                  </div>
                  <p className="text-[11px] text-zinc-300">
                    Existem <strong>{qtdProdutosVinculados} produto(s)</strong> vinculados a esta categoria.
                    Você pode excluir a categoria junto com todos os produtos dela de uma vez só.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-zinc-400 mt-1">
                  Esta categoria está vazia e pode ser excluída imediatamente.
                </p>
              )}
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl text-left">{errorMsg}</p>
            )}

            <div className="space-y-2 pt-1">
              {qtdProdutosVinculados > 0 ? (
                <button
                  disabled={loading}
                  onClick={() => handleDelete(true)}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-[0_0_15px_rgba(244,63,94,0.4)] flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <Layers className="w-4 h-4" />
                  <span>Excluir Categoria e Todos os {qtdProdutosVinculados} Produtos</span>
                </button>
              ) : (
                <button
                  disabled={loading}
                  onClick={() => handleDelete(false)}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-[0_0_15px_rgba(244,63,94,0.4)] active:scale-95 transition-all"
                >
                  Confirmar Exclusão
                </button>
              )}

              <button
                onClick={() => setDeleteModalOpen(false)}
                className="w-full py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl text-xs font-bold hover:text-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
