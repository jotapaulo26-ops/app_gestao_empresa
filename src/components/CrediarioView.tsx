'use client';

import React, { useState } from 'react';
import { Cliente, PagamentoCrediario, ConfiguracaoLoja, Pedido } from '@/types';
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  DollarSign,
  AlertCircle,
  Phone,
  Search,
  X,
  Printer,
  Check,
  FileText,
} from 'lucide-react';
import CobrancaPdfModal from './CobrancaPdfModal';

interface CrediarioViewProps {
  clientes: Cliente[];
  pedidos?: Pedido[];
  config?: ConfiguracaoLoja;
  onRefresh: () => void;
}

export default function CrediarioView({ clientes, pedidos = [], config, onRefresh }: CrediarioViewProps) {
  const [search, setSearch] = useState('');
  const [cobrancaModalCliente, setCobrancaModalCliente] = useState<Cliente | null>(null);

  // Modais
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    cpf: '',
    endereco: '',
    limiteCredito: 250,
  });

  const [amortizarModalOpen, setAmortizarModalOpen] = useState(false);
  const [clienteAmortizar, setClienteAmortizar] = useState<Cliente | null>(null);
  const [valorAmortizar, setValorAmortizar] = useState<number>(0);
  const [formaPagamentoAmortizar, setFormaPagamentoAmortizar] = useState<'DINHEIRO' | 'PIX' | 'CARTAO'>('PIX');
  const [obsAmortizar, setObsAmortizar] = useState('');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [clienteParaExcluir, setClienteParaExcluir] = useState<Cliente | null>(null);

  const [reciboAmortizacao, setReciboAmortizacao] = useState<{
    cliente: Cliente;
    pagamento: PagamentoCrediario;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const totalDevedor = clientes.reduce((acc, c) => acc + (c.saldoDevedor || 0), 0);

  const filteredClientes = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.telefone.includes(search) ||
      (c.cpf && c.cpf.includes(search))
  );

  const handleOpenNew = () => {
    setEditingCliente(null);
    setFormData({
      nome: '',
      telefone: '',
      cpf: '',
      endereco: '',
      limiteCredito: 250,
    });
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleOpenEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormData({
      nome: cliente.nome,
      telefone: cliente.telefone,
      cpf: cliente.cpf || '',
      endereco: cliente.endereco || '',
      limiteCredito: cliente.limiteCredito,
    });
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleSaveCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      setErrorMsg('O nome do cliente é obrigatório.');
      return;
    }
    setLoading(true);
    setErrorMsg('');

    try {
      const payload: Partial<Cliente> = {
        ...formData,
        id: editingCliente ? editingCliente.id : undefined,
        saldoDevedor: editingCliente ? editingCliente.saldoDevedor : 0,
      };

      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar cliente');

      setModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCliente = async () => {
    if (!clienteParaExcluir) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/clientes?id=${clienteParaExcluir.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir');

      setDeleteModalOpen(false);
      setClienteParaExcluir(null);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao excluir cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleAmortizarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteAmortizar) return;
    if (valorAmortizar <= 0) {
      setErrorMsg('Informe um valor válido.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/crediario/amortizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: clienteAmortizar.id,
          valor: valorAmortizar,
          formaPagamento: formaPagamentoAmortizar,
          observacao: obsAmortizar,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao processar');

      setAmortizarModalOpen(false);
      setReciboAmortizacao({
        cliente: data.cliente,
        pagamento: data.pagamento,
      });
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao amortizar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      {/* Banner Resumo Crediário */}
      <div className="p-4 bg-zinc-950 rounded-3xl border border-zinc-800 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
            Total a Receber no Fiado
          </span>
          <span className="text-2xl font-black text-rose-400 font-mono mt-0.5 block">
            R$ {totalDevedor.toFixed(2)}
          </span>
          <span className="text-[11px] text-zinc-400">
            {clientes.length} clientes na base
          </span>
        </div>
        <button
          onClick={handleOpenNew}
          className="p-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl shadow-[0_0_12px_rgba(34,197,94,0.3)] active:scale-95"
        >
          <UserPlus className="w-5 h-5" />
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
        <input
          type="text"
          placeholder="Buscar cliente por nome ou fone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-2xl text-xs text-white focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Lista de Clientes com Botões EDITAR e EXCLUIR */}
      <div className="space-y-3 pb-16">
        {filteredClientes.map((cli) => {
          const perc = cli.limiteCredito > 0 ? Math.min(100, Math.round((cli.saldoDevedor / cli.limiteCredito) * 100)) : 0;
          const temDivida = cli.saldoDevedor > 0;
          const limiteEstourado = cli.saldoDevedor >= cli.limiteCredito;

          return (
            <div
              key={cli.id}
              className={`p-4 rounded-3xl bg-zinc-950 border transition-all ${
                limiteEstourado
                  ? 'border-rose-500/50 shadow-neon-rose'
                  : temDivida
                  ? 'border-amber-500/30'
                  : 'border-zinc-800/80'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-bold text-white text-sm">{cli.nome}</h3>
                  {cli.telefone && (
                    <span className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5 font-mono">
                      <Phone className="w-3 h-3 text-emerald-400" /> {cli.telefone}
                    </span>
                  )}
                </div>

                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                    limiteEstourado
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : temDivida
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {limiteEstourado ? 'Limite Esgotado' : temDivida ? 'Em Débito' : 'Em Dia'}
                </span>
              </div>

              {/* Bloco de Valores */}
              <div className="p-3 bg-zinc-900/80 rounded-2xl border border-zinc-800 text-xs space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Dívida Atual:</span>
                  <strong className={temDivida ? 'text-rose-400' : 'text-zinc-300'}>
                    R$ {cli.saldoDevedor.toFixed(2)}
                  </strong>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Limite Autorizado:</span>
                  <span className="text-white">R$ {cli.limiteCredito.toFixed(2)}</span>
                </div>

                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className={`h-full rounded-full ${
                      perc > 90 ? 'bg-rose-500' : perc > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${perc}%` }}
                  />
                </div>
              </div>

              {/* Botões de Ação na Thumb Zone: AMORTIZAR, EDITAR, EXCLUIR */}
              <div className="mt-3 pt-2.5 border-t border-zinc-900 flex items-center justify-between gap-2">
                {temDivida ? (
                  <div className="flex-1 flex gap-1.5">
                    <button
                      onClick={() => {
                        setClienteAmortizar(cli);
                        setValorAmortizar(cli.saldoDevedor);
                        setAmortizarModalOpen(true);
                        setErrorMsg('');
                      }}
                      className="flex-1 py-2 px-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 active:scale-95 shadow-[0_0_10px_rgba(34,197,94,0.2)]"
                    >
                      <DollarSign className="w-3.5 h-3.5" /> Quitar
                    </button>
                    <button
                      onClick={() => setCobrancaModalCliente(cli)}
                      title="Gerar Cobrança e Fatura em PDF com Chave Pix"
                      className="py-2 px-2.5 bg-zinc-900 hover:bg-cyan-500/20 text-cyan-300 rounded-xl text-xs font-bold border border-cyan-500/40 flex items-center justify-center gap-1 active:scale-95"
                    >
                      <FileText className="w-3.5 h-3.5 text-cyan-400" /> Cobrança PDF
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-emerald-400 font-semibold py-1 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Sem débitos
                  </span>
                )}

                <div className="flex items-center gap-1">
                  <button
                    title="Editar Cliente"
                    onClick={() => handleOpenEdit(cli)}
                    className="p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-zinc-800 active:scale-95"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    title="Excluir Cliente"
                    onClick={() => {
                      setClienteParaExcluir(cli);
                      setErrorMsg('');
                      setDeleteModalOpen(true);
                    }}
                    className="p-2 text-zinc-400 hover:text-rose-400 bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-zinc-800 active:scale-95"
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
                {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
              </h3>
              <button onClick={() => setModalOpen(false)}>
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleSaveCliente} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome do cliente"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="(11) 99999-9999"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">Limite de Crédito (R$) *</label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  required
                  value={formData.limiteCredito}
                  onChange={(e) =>
                    setFormData({ ...formData, limiteCredito: Math.max(0, parseFloat(e.target.value) || 0) })
                  }
                  className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded-xl">{errorMsg}</p>
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
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Amortização */}
      {amortizarModalOpen && clienteAmortizar && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-sm w-full p-5 space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="font-bold text-white text-sm flex items-center gap-1.5 text-emerald-400">
                <DollarSign className="w-4 h-4" /> Quitar Débito
              </h3>
              <button onClick={() => setAmortizarModalOpen(false)}>
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleAmortizarSubmit} className="space-y-3">
              <div className="p-3 bg-zinc-900 rounded-2xl text-xs font-mono">
                <p className="text-zinc-400">Cliente: <strong className="text-white">{clienteAmortizar.nome}</strong></p>
                <p className="text-rose-400 font-bold mt-0.5">Dívida: R$ {clienteAmortizar.saldoDevedor.toFixed(2)}</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">Valor do Pagamento (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={clienteAmortizar.saldoDevedor}
                  required
                  value={valorAmortizar}
                  onChange={(e) => setValorAmortizar(parseFloat(e.target.value) || 0)}
                  className="w-full text-base font-black p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-emerald-400 font-mono focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setValorAmortizar(clienteAmortizar.saldoDevedor)}
                  className="flex-1 py-1.5 bg-zinc-900 border border-emerald-500/40 text-emerald-400 rounded-xl text-[11px] font-bold"
                >
                  Total (R$ {clienteAmortizar.saldoDevedor.toFixed(2)})
                </button>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setAmortizarModalOpen(false)}
                  className="flex-1 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-emerald-500 text-black rounded-xl text-xs font-black shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                >
                  {loading ? 'Confirmando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recibo Amortização */}
      {reciboAmortizacao && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-xs w-full p-5 text-center space-y-3">
            <h3 className="font-bold text-white text-sm">Recibo de Quitação</h3>
            <div className="p-3 bg-white text-black rounded-2xl text-left text-xs font-mono space-y-1" id="printable-receipt">
              <p><strong>Cliente:</strong> {reciboAmortizacao.cliente.nome}</p>
              <p><strong>Valor Pago:</strong> R$ {reciboAmortizacao.pagamento.valor.toFixed(2)}</p>
              <p><strong>Saldo Restante:</strong> R$ {reciboAmortizacao.cliente.saldoDevedor.toFixed(2)}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-zinc-900 border border-zinc-700 text-white rounded-xl text-xs font-bold"
              >
                Imprimir
              </button>
              <button
                onClick={() => setReciboAmortizacao(null)}
                className="flex-1 py-2 bg-emerald-500 text-black rounded-xl text-xs font-bold"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Exclusão */}
      {deleteModalOpen && clienteParaExcluir && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-sm w-full p-5 text-center space-y-3">
            <Trash2 className="w-8 h-8 text-rose-500 mx-auto" />
            <h3 className="font-bold text-white text-sm">Excluir {clienteParaExcluir.nome}?</h3>
            {clienteParaExcluir.saldoDevedor > 0 && (
              <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl text-left">
                Não é permitido excluir cliente com saldo devedor de R$ {clienteParaExcluir.saldoDevedor.toFixed(2)}.
              </p>
            )}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                disabled={clienteParaExcluir.saldoDevedor > 0 || loading}
                onClick={handleDeleteCliente}
                className="flex-1 py-2.5 bg-rose-600 disabled:opacity-30 text-white rounded-xl text-xs font-bold"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fatura/Cobrança em PDF com Pix Consolidada */}
      {cobrancaModalCliente && config && (
        <CobrancaPdfModal
          isOpen={!!cobrancaModalCliente}
          onClose={() => setCobrancaModalCliente(null)}
          config={config}
          cliente={cobrancaModalCliente}
          pedidosDoCliente={pedidos.filter(
            (p) => p.clienteId === cobrancaModalCliente.id && p.status === 'CONCLUIDO'
          )}
          valorTotal={cobrancaModalCliente.saldoDevedor}
          titulo="Fatura & Cobrança de Crediário"
        />
      )}
    </div>
  );
}
