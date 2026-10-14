'use client';

import React, { useState, useMemo } from 'react';
import { ConfiguracaoLoja, Cliente, Pedido, PagamentoCrediario } from '@/types';
import { gerarPixCopiaECola } from '@/lib/pix';
import {
  X,
  Printer,
  Copy,
  Check,
  CheckCircle2,
  Share2,
  FileText,
  QrCode,
  Building2,
  Coins,
} from 'lucide-react';

interface CobrancaPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConfiguracaoLoja;
  cliente?: Cliente;
  pedido?: Pedido; // Se for cobrança de um pedido individual
  pedidosDoCliente?: Pedido[]; // Se for extrato consolidado de todas as compras do cliente
  pagamentosDoCliente?: PagamentoCrediario[]; // Pagamentos já realizados pelo cliente
  valorTotal: number;
  titulo?: string;
}

export default function CobrancaPdfModal({
  isOpen,
  onClose,
  config,
  cliente,
  pedido,
  pedidosDoCliente,
  pagamentosDoCliente = [],
  valorTotal,
  titulo = 'Cobrança Detalhada de Compras',
}: CobrancaPdfModalProps) {
  const [copiadoChave, setCopiadoChave] = useState(false);
  const [copiadoPayload, setCopiadoPayload] = useState(false);

  // Totais contábeis
  const totalPago = useMemo(() => {
    return (pagamentosDoCliente || []).reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
  }, [pagamentosDoCliente]);

  const totalCompras = useMemo(() => {
    if (pedidosDoCliente && pedidosDoCliente.length > 0) {
      return pedidosDoCliente.reduce((acc, p) => acc + (Number(p.totalLiquido) || 0), 0);
    }
    if (pedido) {
      return Number(pedido.totalLiquido) || valorTotal;
    }
    return valorTotal + totalPago;
  }, [pedidosDoCliente, pedido, valorTotal, totalPago]);

  // Gera o código Pix Copia e Cola
  const pixPayload = useMemo(() => {
    if (!config?.chavePix) return '';
    return gerarPixCopiaECola({
      chavePix: config.chavePix,
      nomeTitular: config.titularPix || config.nomeLoja,
      cidade: config.cidadePix || 'SAO PAULO',
      valor: valorTotal,
      identificador: pedido ? `PED${pedido.codigo}` : 'FATURA',
    });
  }, [config, valorTotal, pedido]);

  if (!isOpen) return null;

  const handleCopyChave = () => {
    if (!config?.chavePix) return;
    navigator.clipboard.writeText(config.chavePix);
    setCopiadoChave(true);
    setTimeout(() => setCopiadoChave(false), 2000);
  };

  const handleCopyPayload = () => {
    if (!pixPayload) return;
    navigator.clipboard.writeText(pixPayload);
    setCopiadoPayload(true);
    setTimeout(() => setCopiadoPayload(false), 2000);
  };

  const handleShareWhatsApp = () => {
    let msg = `*🧾 ${titulo.toUpperCase()}*\n`;
    msg += `*${config?.nomeLoja || 'LOJA'}*\n`;
    msg += `Cliente: ${cliente?.nome || pedido?.nomeClienteAvulso || 'Cliente'}\n\n`;

    if (pagamentosDoCliente && pagamentosDoCliente.length > 0) {
      msg += `🛍️ *Total em Compras:* R$ ${totalCompras.toFixed(2)}\n`;
      msg += `✅ *Total Pago/Abatido:* - R$ ${totalPago.toFixed(2)}\n`;
      msg += `*💰 SALDO RESTANTE A PAGAR: R$ ${valorTotal.toFixed(2)}*\n\n`;

      msg += `*Histórico de Pagamentos Recebidos:*\n`;
      pagamentosDoCliente.forEach((pag) => {
        const dt = new Date(pag.dataPagamento).toLocaleDateString('pt-BR');
        msg += `• ${dt} - R$ ${Number(pag.valor).toFixed(2)} via ${pag.formaPagamento}${pag.observacao ? ` (${pag.observacao})` : ''}\n`;
      });
      msg += `\n`;
    } else {
      msg += `*Valor Total a Pagar:* R$ ${valorTotal.toFixed(2)}\n\n`;
    }

    if (config?.chavePix) {
      msg += `*PAGUE COM PIX (${config.tipoChavePix}):*\n`;
      msg += `Chave: ${config.chavePix}\n`;
      msg += `Favorecido: ${config.titularPix || config.nomeLoja}\n\n`;
      if (pixPayload) {
        msg += `*Código Pix Copia e Cola:*\n\`${pixPayload}\`\n\n`;
      }
    }

    msg += `${config?.mensagemRodape || 'Obrigado pela preferência!'}`;

    const fone = cliente?.telefone ? cliente.telefone.replace(/\D/g, '') : '';
    const url = fone
      ? `https://wa.me/55${fone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl flex flex-col max-h-[95vh] space-y-4">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-cyan-400">
            <FileText className="w-5 h-5" />
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">
              {titulo}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ================= DOCUMENTO DE COBRANÇA EM PDF (FORMATO CLARO / PRINT-FRIENDLY) ================= */}
        <div
          id="printable-receipt"
          className="bg-white text-zinc-900 p-5 rounded-2xl shadow-sm text-xs font-sans space-y-4 overflow-y-auto flex-1 border border-zinc-200"
        >
          {/* Cabeçalho da Loja */}
          <div className="flex justify-between items-start border-b border-zinc-300 pb-3">
            <div>
              <h2 className="text-base font-black tracking-tight text-zinc-900 uppercase">
                {config?.nomeLoja || 'ERP & PDV MANU'}
              </h2>
              {config?.cnpjCpf && <p className="text-[11px] text-zinc-600">CNPJ/CPF: {config.cnpjCpf}</p>}
              {config?.telefone && <p className="text-[11px] text-zinc-600">Contato: {config.telefone}</p>}
              {config?.endereco && <p className="text-[11px] text-zinc-600">{config.endereco} • {config.cidade}</p>}
            </div>

            <div className="text-right">
              <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-300 text-[10px] font-mono font-bold uppercase block">
                FATURA DE COBRANÇA
              </span>
              <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                Emissão: {new Date().toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>

          {/* Dados do Cliente */}
          <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-200 text-xs">
            <p className="font-bold text-zinc-800">
              Cliente: {cliente?.nome || pedido?.nomeClienteAvulso || 'Consumidor'}
            </p>
            {cliente?.telefone && <p className="text-[11px] text-zinc-600">Telefone: {cliente.telefone}</p>}
            {cliente?.cpf && <p className="text-[11px] text-zinc-600 font-mono">CPF: {cliente.cpf}</p>}
            {cliente?.endereco && <p className="text-[11px] text-zinc-600">{cliente.endereco}</p>}
          </div>

          {/* Itens Comprados Detalhados */}
          <div className="space-y-2">
            <h4 className="font-bold text-zinc-800 text-[11px] uppercase tracking-wider">
              Detalhamento dos Itens / Compras
            </h4>

            {pedido && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-300 text-[10px] text-zinc-600 uppercase">
                    <th className="py-1">Item</th>
                    <th className="py-1 text-center">Qtd</th>
                    <th className="py-1 text-right">Unitário</th>
                    <th className="py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 font-mono">
                  {pedido.itens.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-1.5 font-sans font-medium">{it.nomeProduto}</td>
                      <td className="py-1.5 text-center">{it.quantidade}</td>
                      <td className="py-1.5 text-right">R$ {it.precoUnitario.toFixed(2)}</td>
                      <td className="py-1.5 text-right font-bold">R$ {it.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Se for extrato consolidado de pedidos do cliente */}
            {pedidosDoCliente && pedidosDoCliente.length > 0 && (
              <div className="space-y-2 font-mono">
                {pedidosDoCliente.map((p) => (
                  <div key={p.id} className="p-2 bg-zinc-50 rounded border border-zinc-200">
                    <div className="flex justify-between font-bold text-[11px] text-zinc-800 pb-1 border-b border-zinc-200">
                      <span>Pedido #{p.codigo} ({new Date(p.dataVenda).toLocaleDateString('pt-BR')})</span>
                      <span>R$ {p.totalLiquido.toFixed(2)}</span>
                    </div>
                    <div className="pt-1 text-[10px] text-zinc-600">
                      {p.itens.map((it, i) => (
                        <div key={i} className="flex justify-between">
                          <span>{it.quantidade}x {it.nomeProduto}</span>
                          <span>R$ {it.subtotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Seção de Pagamentos / Abatimentos Já Realizados */}
            {pagamentosDoCliente && pagamentosDoCliente.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-zinc-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-emerald-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pagamentos & Abatimentos Já Realizados ({pagamentosDoCliente.length})</span>
                  </h4>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Total Pago: R$ {totalPago.toFixed(2)}
                  </span>
                </div>

                <div className="space-y-1.5 font-mono text-xs">
                  {pagamentosDoCliente.map((pag) => (
                    <div
                      key={pag.id}
                      className="p-2 bg-emerald-50/60 rounded-xl border border-emerald-200 flex justify-between items-center"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-sans font-bold text-zinc-900 text-[11px]">
                            Pago via {pag.formaPagamento}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {new Date(pag.dataPagamento).toLocaleDateString('pt-BR')} às{' '}
                            {new Date(pag.dataPagamento).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {pag.observacao && (
                          <span className="text-[10px] text-zinc-600 font-sans block italic mt-0.5">
                            Obs: {pag.observacao}
                          </span>
                        )}
                      </div>
                      <span className="font-black text-emerald-700 font-mono text-xs">
                        - R$ {Number(pag.valor).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Totalizador Contábil da Cobrança */}
            <div className="pt-3 border-t-2 border-zinc-800 space-y-1.5 font-mono">
              {pagamentosDoCliente && pagamentosDoCliente.length > 0 ? (
                <>
                  <div className="flex justify-between text-xs text-zinc-600 font-sans">
                    <span>Total das Compras Realizadas:</span>
                    <span className="font-mono font-bold text-zinc-900">R$ {totalCompras.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-emerald-700 font-sans">
                    <span>(-) Total de Pagamentos Abatidos:</span>
                    <span className="font-mono font-bold">- R$ {totalPago.toFixed(2)}</span>
                  </div>
                  <div className="pt-1.5 border-t border-zinc-200 flex justify-between items-center">
                    <span className="font-black text-sm uppercase font-sans text-zinc-950">
                      Saldo Restante a Pagar:
                    </span>
                    <span className="text-xl font-black text-zinc-950">
                      R$ {valorTotal.toFixed(2)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm uppercase font-sans">Total da Cobrança:</span>
                  <span className="text-xl font-black text-zinc-950">
                    R$ {valorTotal.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ================= BLOCO OFICIAL DE PAGAMENTO PIX ================= */}
          {config?.chavePix && (
            <div className="p-3 bg-emerald-50 rounded-2xl border-2 border-dashed border-emerald-500 space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs uppercase tracking-wide">
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span>Instruções de Pagamento via Pix</span>
              </div>

              <div className="text-xs space-y-1 font-mono text-zinc-800">
                <div className="flex justify-between">
                  <span className="text-zinc-600 font-sans">Tipo de Chave:</span>
                  <strong>{config.tipoChavePix}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600 font-sans">Chave Pix:</span>
                  <strong className="text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                    {config.chavePix}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600 font-sans">Favorecido:</span>
                  <strong>{config.titularPix || config.nomeLoja}</strong>
                </div>
              </div>

              {/* Código Pix Copia e Cola */}
              {pixPayload && (
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">
                    Código Pix Copia e Cola:
                  </span>
                  <div className="p-2 bg-white rounded-lg border border-zinc-300 font-mono text-[9px] text-zinc-600 break-all select-all">
                    {pixPayload}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mensagem de Rodapé */}
          <div className="text-center pt-2 text-[10px] text-zinc-500 italic border-t border-zinc-200">
            {config?.mensagemRodape || 'Agradecemos a sua preferência!'}
          </div>
        </div>

        {/* Botões de Ação na Thumb Zone */}
        <div className="space-y-2">
          {/* Botões Rápidos de Cópia */}
          {config?.chavePix && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopyChave}
                className="py-2.5 px-3 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95"
              >
                {copiadoChave ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiadoChave ? 'Chave Copiada!' : 'Copiar Chave Pix'}</span>
              </button>

              <button
                onClick={handleCopyPayload}
                className="py-2.5 px-3 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95"
              >
                {copiadoPayload ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <QrCode className="w-3.5 h-3.5" />}
                <span>{copiadoPayload ? 'Copia e Cola Copiado!' : 'Copiar Código Pix'}</span>
              </button>
            </div>
          )}

          {/* Botões Principais: Imprimir PDF e WhatsApp */}
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-neon-cyan active:scale-95 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-neon-green active:scale-95 transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>Enviar WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
