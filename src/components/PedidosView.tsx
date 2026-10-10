'use client';

import React, { useState } from 'react';
import { Pedido, Cliente, ConfiguracaoLoja } from '@/types';
import { Receipt, Search, Printer, Ban, X, AlertTriangle, FileText, QrCode } from 'lucide-react';
import CobrancaPdfModal from './CobrancaPdfModal';

interface PedidosViewProps {
  pedidos: Pedido[];
  clientes: Cliente[];
  config?: ConfiguracaoLoja;
  onRefresh: () => void;
}

export default function PedidosView({ pedidos, clientes, config, onRefresh }: PedidosViewProps) {
  const [search, setSearch] = useState('');
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);

  // Modal Cobrança PDF
  const [cobrancaModalPedido, setCobrancaModalPedido] = useState<Pedido | null>(null);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [pedidoParaCancelar, setPedidoParaCancelar] = useState<Pedido | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const filteredPedidos = pedidos.filter((p) => {
    const matchCod = p.codigo.toString().includes(search);
    const cli = clientes.find((c) => c.id === p.clienteId);
    const matchNome =
      (cli && cli.nome.toLowerCase().includes(search.toLowerCase())) ||
      (p.nomeClienteAvulso && p.nomeClienteAvulso.toLowerCase().includes(search.toLowerCase()));
    return matchCod || matchNome;
  });

  const handleCancelarPedido = async () => {
    if (!pedidoParaCancelar) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/pedidos/${pedidoParaCancelar.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao cancelar');

      setCancelModalOpen(false);
      setPedidoParaCancelar(null);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao cancelar');
    } finally {
      setLoading(false);
    }
  };

  const getClienteDoPedido = (p: Pedido) => {
    return clientes.find((c) => c.id === p.clienteId);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      {/* Banner Resumo Vendas */}
      <div className="p-4 bg-zinc-950 rounded-3xl border border-pink-500/40 shadow-neon-pink flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400 block">
            Vendas & Cobranças
          </span>
          <span className="text-xl font-black text-white font-mono mt-0.5 block">
            {pedidos.length} Pedidos
          </span>
          <span className="text-[11px] text-zinc-400">Emissão de notas e PDF com Pix</span>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
          <Receipt className="w-5 h-5" />
        </div>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
        <input
          type="text"
          placeholder="Buscar por código ou cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-2xl text-xs text-white focus:outline-none focus:border-pink-500"
        />
      </div>

      {/* Lista de Pedidos */}
      <div className="space-y-3 pb-16">
        {filteredPedidos.map((ped) => {
          const cliente = getClienteDoPedido(ped);
          const nomeCliente = cliente?.nome || ped.nomeClienteAvulso || 'Consumidor Final';
          const isCancelado = ped.status === 'CANCELADO';

          return (
            <div
              key={ped.id}
              className={`p-4 rounded-3xl bg-zinc-950 border transition-all ${
                isCancelado ? 'opacity-40 border-zinc-900' : 'border-zinc-800/80 hover:border-pink-500/30'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 mb-1 font-mono">
                    <span className="text-xs font-black text-pink-400">#{ped.codigo}</span>
                    <span className="text-[10px] text-zinc-500">
                      {new Date(ped.dataVenda).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-sm">{nomeCliente}</h3>
                </div>

                <div className="text-right">
                  <span className="text-base font-black text-emerald-400 font-mono block">
                    R$ {ped.totalLiquido.toFixed(2)}
                  </span>
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                      ped.formaPagamento === 'CREDIARIO'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {ped.formaPagamento}
                  </span>
                </div>
              </div>

              {/* Botões de Ação na Thumb Zone */}
              <div className="mt-3 pt-2.5 border-t border-zinc-900 flex items-center justify-between gap-2">
                {/* Botão Gerar Cobrança PDF com Pix */}
                <button
                  onClick={() => setCobrancaModalPedido(ped)}
                  className="flex-1 py-1.5 px-2 bg-zinc-900 hover:bg-cyan-500/20 text-cyan-300 rounded-xl text-[11px] font-bold border border-cyan-500/40 flex items-center justify-center gap-1 active:scale-95 transition-all shadow-[0_0_8px_rgba(0,240,255,0.15)]"
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-400" /> Cobrança PDF Pix
                </button>

                {/* Ver Cupom */}
                <button
                  onClick={() => setSelectedPedido(ped)}
                  className="py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold border border-zinc-800 flex items-center justify-center gap-1 active:scale-95"
                >
                  <Receipt className="w-3.5 h-3.5 text-pink-400" /> Cupom
                </button>

                {/* Cancelar */}
                {!isCancelado && (
                  <button
                    onClick={() => {
                      setPedidoParaCancelar(ped);
                      setErrorMsg('');
                      setCancelModalOpen(true);
                    }}
                    className="p-1.5 px-2 bg-zinc-900 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-bold border border-zinc-800 flex items-center gap-1 active:scale-95"
                  >
                    <Ban className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Cobrança em PDF com Pix */}
      {cobrancaModalPedido && config && (
        <CobrancaPdfModal
          isOpen={!!cobrancaModalPedido}
          onClose={() => setCobrancaModalPedido(null)}
          config={config}
          cliente={getClienteDoPedido(cobrancaModalPedido)}
          pedido={cobrancaModalPedido}
          valorTotal={cobrancaModalPedido.totalLiquido}
          titulo={`Cobrança do Pedido #${cobrancaModalPedido.codigo}`}
        />
      )}

      {/* Modal Ver Cupom Térmico */}
      {selectedPedido && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-xs w-full p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="font-bold text-white text-sm">Pedido #{selectedPedido.codigo}</h3>
              <button onClick={() => setSelectedPedido(null)}>
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            <div className="p-3 bg-white text-black rounded-2xl text-xs font-mono space-y-1.5" id="printable-receipt">
              <div className="text-center pb-1 border-b border-dashed border-zinc-400">
                <p className="font-black text-sm">{config?.nomeLoja || 'ERP MANU'}</p>
                {config?.cnpjCpf && <p className="text-[9px] text-zinc-600">Doc: {config.cnpjCpf}</p>}
                {config?.telefone && <p className="text-[9px] text-zinc-600">Contato: {config.telefone}</p>}
                <p className="text-[10px] text-zinc-600">
                  {new Date(selectedPedido.dataVenda).toLocaleString('pt-BR')}
                </p>
              </div>

              {selectedPedido.itens.map((it, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{it.quantidade}x {it.nomeProduto}</span>
                  <span>R$ {it.subtotal.toFixed(2)}</span>
                </div>
              ))}

              <div className="pt-1.5 border-t border-dashed border-zinc-400 font-bold flex justify-between">
                <span>TOTAL:</span>
                <span>R$ {selectedPedido.totalLiquido.toFixed(2)}</span>
              </div>

              {config?.mensagemRodape && (
                <p className="text-center pt-1 text-[9px] text-zinc-500 italic">
                  {config.mensagemRodape}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-zinc-900 border border-zinc-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" /> Imprimir
              </button>
              <button
                onClick={() => setSelectedPedido(null)}
                className="flex-1 py-2 bg-pink-500 text-black rounded-xl text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cancelar Pedido */}
      {cancelModalOpen && pedidoParaCancelar && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-xs w-full p-5 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
            <h3 className="font-bold text-white text-sm">Cancelar Pedido #{pedidoParaCancelar.codigo}?</h3>
            <p className="text-[11px] text-zinc-400">
              O estoque será devolvido automaticamente e, se for crediário, a dívida será estornada.
            </p>
            {errorMsg && (
              <p className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded-xl text-left">{errorMsg}</p>
            )}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="flex-1 py-2 bg-zinc-900 text-zinc-300 rounded-xl text-xs font-bold"
              >
                Voltar
              </button>
              <button
                disabled={loading}
                onClick={handleCancelarPedido}
                className="flex-1 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
