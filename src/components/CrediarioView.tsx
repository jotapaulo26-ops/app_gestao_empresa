'use client';

import React, { useState } from 'react';
import { Cliente, PagamentoCrediario, ConfiguracaoLoja, Pedido, FormaPagamentoCrediario } from '@/types';
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
  CheckCircle2,
  FileText,
  MapPin,
  QrCode,
  CreditCard,
  Banknote,
} from 'lucide-react';
import CobrancaPdfModal from './CobrancaPdfModal';
import { apiFetch } from '@/lib/api';
import {
  salvarClienteLocalEOnline,
  removerClienteLocalEOnline,
  amortizarCrediarioLocalEOnline,
  obterPagamentosCrediarioLocais,
} from '@/lib/dataService';
import { useEffect, useCallback } from 'react';

interface CrediarioViewProps {
  clientes: Cliente[];
  pedidos?: Pedido[];
  config?: ConfiguracaoLoja;
  onRefresh: () => void;
}

export default function CrediarioView({ clientes, pedidos = [], config, onRefresh }: CrediarioViewProps) {
  const [search, setSearch] = useState('');
  const [cobrancaModalCliente, setCobrancaModalCliente] = useState<Cliente | null>(null);
  const [pagamentos, setPagamentos] = useState<PagamentoCrediario[]>([]);

  const carregarPagamentos = useCallback(async () => {
    try {
      const pags = await obterPagamentosCrediarioLocais();
      setPagamentos(pags);
    } catch {}
  }, []);

  useEffect(() => {
    carregarPagamentos();
  }, [carregarPagamentos]);

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
  const [formaPagamentoAmortizar, setFormaPagamentoAmortizar] = useState<FormaPagamentoCrediario>('PIX');
  const [obsAmortizar, setObsAmortizar] = useState('');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [clienteParaExcluir, setClienteParaExcluir] = useState<Cliente | null>(null);

  const [reciboAmortizacao, setReciboAmortizacao] = useState<{
    cliente: Cliente;
    pagamento: PagamentoCrediario;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const totalDevedor = (clientes || []).reduce((acc, c) => acc + (Number(c?.saldoDevedor) || 0), 0);

  const filteredClientes = (clientes || []).filter((c) => {
    if (!c) return false;
    const qLower = (search || '').toLowerCase();
    const nomeMatch = (c.nome || '').toLowerCase().includes(qLower);
    const telMatch = (c.telefone || '').includes(search);
    const cpfMatch = c.cpf ? c.cpf.includes(search) : false;
    return nomeMatch || telMatch || cpfMatch;
  });

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

      await salvarClienteLocalEOnline(payload);

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
      await removerClienteLocalEOnline(clienteParaExcluir.id);

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
      const novoPagamento = await amortizarCrediarioLocalEOnline({
        clienteId: clienteAmortizar.id,
        valor: valorAmortizar,
        formaPagamento: formaPagamentoAmortizar,
        observacao: obsAmortizar,
      });

      if (novoPagamento) {
        setPagamentos((prev) => [novoPagamento, ...prev]);
        setReciboAmortizacao({
          cliente: {
            ...clienteAmortizar,
            saldoDevedor: Math.max(0, clienteAmortizar.saldoDevedor - valorAmortizar),
          },
          pagamento: novoPagamento,
        });
      }

      setAmortizarModalOpen(false);
      setClienteAmortizar(null);
      setValorAmortizar(0);
      setObsAmortizar('');
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
          const cliPagamentos = pagamentos.filter((p) => p.clienteId === cli.id);
          const totalPagoCli = cliPagamentos.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);

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
                  {cli.endereco && (
                    <span className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-pink-400 shrink-0" />
                      <span className="truncate">{cli.endereco}</span>
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
                  <strong className={temDivida ? 'text-rose-400 font-bold' : 'text-zinc-300'}>
                    R$ {cli.saldoDevedor.toFixed(2)}
                  </strong>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold border-t border-zinc-800/80 pt-1">
                  <span>Crédito Disponível:</span>
                  <span>R$ {Math.max(0, cli.limiteCredito - cli.saldoDevedor).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-500 text-[11px]">
                  <span>Limite Total Autorizado:</span>
                  <span className="text-zinc-300">R$ {cli.limiteCredito.toFixed(2)}</span>
                </div>

                {totalPagoCli > 0 && (
                  <div className="flex justify-between text-emerald-400 text-[11px] border-t border-zinc-800/80 pt-1">
                    <span>Total Já Amortizado:</span>
                    <span className="font-bold">- R$ {totalPagoCli.toFixed(2)}</span>
                  </div>
                )}

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
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-xs text-emerald-400 font-semibold py-1 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Sem débitos
                    </span>
                    <button
                      onClick={() => setCobrancaModalCliente(cli)}
                      title="Ver Extrato de Compras e Pagamentos em PDF"
                      className="py-1.5 px-2.5 bg-zinc-900 hover:bg-cyan-500/20 text-cyan-300 rounded-xl text-xs font-bold border border-cyan-500/30 flex items-center gap-1 active:scale-95"
                    >
                      <FileText className="w-3.5 h-3.5 text-cyan-400" /> Extrato PDF
                    </button>
                  </div>
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
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">Endereço Residencial / Comercial</label>
                <input
                  type="text"
                  placeholder="Rua, número, bairro ou referência..."
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
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
                  Pagar Dívida Total (R$ {clienteAmortizar.saldoDevedor.toFixed(2)})
                </button>
              </div>

              {/* Seletor Rápido da Forma de Pagamento */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1.5">
                  Forma de Pagamento Recebida *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormaPagamentoAmortizar('PIX')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all active:scale-95 ${
                      formaPagamentoAmortizar === 'PIX'
                        ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.5)] font-black'
                        : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-cyan-500/40'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-cyan-400" /> Pix
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormaPagamentoAmortizar('DINHEIRO')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all active:scale-95 ${
                      formaPagamentoAmortizar === 'DINHEIRO'
                        ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_12px_rgba(34,197,94,0.5)] font-black'
                        : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-emerald-500/40'
                    }`}
                  >
                    <Banknote className="w-4 h-4 text-emerald-400" /> Dinheiro
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormaPagamentoAmortizar('CARTAO_CREDITO')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all active:scale-95 ${
                      formaPagamentoAmortizar === 'CARTAO_CREDITO'
                        ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.5)] font-black'
                        : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-purple-500/40'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-purple-400" /> Cartão Crédito
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormaPagamentoAmortizar('CARTAO_DEBITO')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all active:scale-95 ${
                      formaPagamentoAmortizar === 'CARTAO_DEBITO'
                        ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.5)] font-black'
                        : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-blue-500/40'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-blue-400" /> Cartão Débito
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                  Observação / Identificador (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pago pelo filho, transferência nº..."
                  value={obsAmortizar}
                  onChange={(e) => setObsAmortizar(e.target.value)}
                  className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
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
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-sm w-full p-5 text-center space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="font-bold text-white text-sm flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Comprovante de Pagamento</span>
              </h3>
              <button
                onClick={() => setReciboAmortizacao(null)}
                className="w-6 h-6 rounded-full bg-zinc-900 text-zinc-400 flex items-center justify-center hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-3.5 bg-white text-zinc-900 rounded-2xl text-left text-xs font-mono space-y-1.5 border border-zinc-200" id="printable-receipt">
              <div className="border-b border-zinc-300 pb-1.5 mb-1.5">
                <p className="font-sans font-black text-sm uppercase text-zinc-900">{config?.nomeLoja || 'ERP & PDV MANU'}</p>
                <p className="text-[10px] text-zinc-600 font-bold">COMPROVANTE DE ABATIMENTO / PAGAMENTO</p>
                <p className="text-[10px] text-zinc-500">
                  {new Date(reciboAmortizacao.pagamento.dataPagamento).toLocaleDateString('pt-BR')} às{' '}
                  {new Date(reciboAmortizacao.pagamento.dataPagamento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <p><strong className="text-zinc-700">Cliente:</strong> {reciboAmortizacao.cliente.nome}</p>
              <p className="text-emerald-700 font-bold text-sm">
                <strong>Valor Pago:</strong> R$ {Number(reciboAmortizacao.pagamento.valor).toFixed(2)}
              </p>
              <p><strong className="text-zinc-700">Forma:</strong> {reciboAmortizacao.pagamento.formaPagamento}</p>
              {reciboAmortizacao.pagamento.observacao && (
                <p className="text-[11px] text-zinc-600 font-sans italic">
                  <strong>Obs:</strong> {reciboAmortizacao.pagamento.observacao}
                </p>
              )}

              <div className="border-t border-zinc-200 pt-1.5 mt-1.5 flex justify-between font-bold text-zinc-900">
                <span>Saldo Devedor Atual:</span>
                <span className={reciboAmortizacao.cliente.saldoDevedor > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                  R$ {reciboAmortizacao.cliente.saldoDevedor.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir
                </button>
                <button
                  onClick={() => {
                    const cli = reciboAmortizacao.cliente;
                    setReciboAmortizacao(null);
                    setCobrancaModalCliente(cli);
                  }}
                  className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 active:scale-95 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                >
                  <FileText className="w-3.5 h-3.5" /> Extrato Completo
                </button>
              </div>
              <button
                onClick={() => setReciboAmortizacao(null)}
                className="w-full py-2 bg-emerald-500 text-black rounded-xl text-xs font-bold active:scale-95"
              >
                Concluir
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
          pagamentosDoCliente={pagamentos.filter(
            (p) => p.clienteId === cobrancaModalCliente.id
          )}
          valorTotal={cobrancaModalCliente.saldoDevedor}
          titulo={
            cobrancaModalCliente.saldoDevedor > 0
              ? 'Fatura & Cobrança de Crediário'
              : 'Extrato de Pagamentos & Compras'
          }
        />
      )}
    </div>
  );
}
