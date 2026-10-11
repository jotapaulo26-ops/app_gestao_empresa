'use client';

import React, { useState, useMemo } from 'react';
import {
  Categoria,
  Produto,
  Cliente,
  ItemPedido,
  FormaPagamento,
  Pedido,
  ConfiguracaoLoja,
} from '@/types';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Printer,
  Share2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Banknote,
  QrCode,
  UserCheck,
  X,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  Layers,
  Cake,
  Cookie,
  UtensilsCrossed,
  Coffee,
  Check,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { salvarPedidoLocalEOnline } from '@/lib/dataService';

interface PDVViewProps {
  categorias: Categoria[];
  produtos: Produto[];
  clientes: Cliente[];
  config?: ConfiguracaoLoja;
  onOrderCompleted: (novoPedido?: Pedido) => void;
}

export default function PDVView({
  categorias,
  produtos,
  clientes,
  config,
  onOrderCompleted,
}: PDVViewProps) {
  // Navegação do PDV:
  // selectedCategoriaId: null -> Exibe o Portal Inicial de Categorias Ocultas
  // selectedCategoriaId: 'all' ou 'cat-id' -> Exibe apenas a tela dos produtos daquela categoria!
  const [selectedCategoriaId, setSelectedCategoriaId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Controle de Tela Separada de Checkout
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);

  // Carrinho
  const [cart, setCart] = useState<{ produto: Produto; quantidade: number }[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string>('');
  const [nomeClienteAvulso, setNomeClienteAvulso] = useState<string>('');
  const [desconto, setDesconto] = useState<number>(0);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('DINHEIRO');
  const [observacoes, setObservacoes] = useState<string>('');

  // Cupom Concluído
  const [pedidoFinalizado, setPedidoFinalizado] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Cliente selecionado
  const currentCliente = useMemo(() => {
    return clientes.find((c) => c.id === selectedClienteId);
  }, [clientes, selectedClienteId]);

  // Categoria ativa
  const activeCategoria = useMemo(() => {
    if (!selectedCategoriaId || selectedCategoriaId === 'all') return null;
    return categorias.find((c) => c.id === selectedCategoriaId);
  }, [categorias, selectedCategoriaId]);

  // Produtos filtrados
  const filteredProdutos = useMemo(() => {
    if (!selectedCategoriaId) return [];
    const safeProdutos = Array.isArray(produtos) ? produtos : [];
    const qLower = (searchQuery || '').toLowerCase();
    return safeProdutos.filter((prod) => {
      if (!prod) return false;
      const matchCat = selectedCategoriaId === 'all' || prod.categoriaId === selectedCategoriaId;
      const nomeLower = (prod.nome || '').toLowerCase();
      const descLower = (prod.descricao || '').toLowerCase();
      const matchSearch = nomeLower.includes(qLower) || descLower.includes(qLower);
      return matchCat && matchSearch;
    });
  }, [produtos, selectedCategoriaId, searchQuery]);

  // Totais do carrinho
  const totalItensCarrinho = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantidade, 0);
  }, [cart]);

  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.produto.precoVenda * item.quantidade, 0);
  }, [cart]);

  const totalLiquido = useMemo(() => {
    return Math.max(0, subtotal - (Number(desconto) || 0));
  }, [subtotal, desconto]);

  const custoTotalCarrinho = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.produto.custoTotal * item.quantidade, 0);
  }, [cart]);

  const lucroTotalCarrinho = useMemo(() => {
    return Math.max(0, totalLiquido - custoTotalCarrinho);
  }, [totalLiquido, custoTotalCarrinho]);

  // Limite do Crediário
  const crediarioDisponivel = useMemo(() => {
    if (!currentCliente) return 0;
    return Math.max(0, currentCliente.limiteCredito - currentCliente.saldoDevedor);
  }, [currentCliente]);

  const crediarioExcedido = useMemo(() => {
    if (formaPagamento !== 'CREDIARIO') return false;
    if (!currentCliente) return true;
    return currentCliente.saldoDevedor + totalLiquido > currentCliente.limiteCredito;
  }, [formaPagamento, currentCliente, totalLiquido]);

  // Adicionar ao carrinho
  const addToCart = (produto: Produto) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.produto.id === produto.id);
      if (existing) {
        return prev.map((item) =>
          item.produto.id === produto.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }
      return [...prev, { produto, quantidade: 1 }];
    });
  };

  const updateQuantity = (produtoId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.produto.id === produtoId) {
            const novaQtd = item.quantidade + delta;
            return novaQtd > 0 ? { ...item, quantidade: novaQtd } : null;
          }
          return item;
        })
        .filter(Boolean) as { produto: Produto; quantidade: number }[]
    );
  };

  const clearCart = () => {
    setCart([]);
    setDesconto(0);
    setObservacoes('');
    setErrorMessage('');
    setIsCheckoutOpen(false);
  };

  // Finalizar a venda
  const handleFinalizarVenda = async () => {
    if (cart.length === 0) return;
    setErrorMessage('');

    if (formaPagamento === 'CREDIARIO' && !selectedClienteId) {
      setErrorMessage('Por favor, selecione um cliente cadastrado para vender no crediário.');
      return;
    }

    if (crediarioExcedido) {
      setErrorMessage(
        `Limite de crédito insuficiente! Limite restante: R$ ${crediarioDisponivel.toFixed(2)}, mas a compra é de R$ ${totalLiquido.toFixed(2)}.`
      );
      return;
    }

    setLoading(true);

    try {
      const itens: ItemPedido[] = cart.map((item) => ({
        produtoId: item.produto.id,
        nomeProduto: item.produto.nome,
        quantidade: item.quantidade,
        precoUnitario: item.produto.precoVenda,
        subtotal: item.produto.precoVenda * item.quantidade,
        custoUnitario: item.produto.custoTotal,
      }));

      const body = {
        clienteId: selectedClienteId || undefined,
        nomeClienteAvulso: !selectedClienteId ? (nomeClienteAvulso || 'Cliente Balcão') : undefined,
        itens,
        totalBruto: subtotal,
        desconto: Number(desconto) || 0,
        totalLiquido,
        custoTotal: custoTotalCarrinho,
        lucroTotal: lucroTotalCarrinho,
        formaPagamento,
        observacoes,
      };

      const pedidoSalvo = await salvarPedidoLocalEOnline(body);

      setPedidoFinalizado(pedidoSalvo);
      clearCart();
      onOrderCompleted(pedidoSalvo);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro inesperado ao registrar venda');
    } finally {
      setLoading(false);
    }
  };

  // Compartilhar Comprovante no WhatsApp
  const handleShareWhatsApp = (pedido: Pedido) => {
    const nomeLoja = config?.nomeLoja || 'ERP & PDV MANU';
    let texto = `*🧾 COMPROVANTE DE PEDIDO #${pedido.codigo}*\n`;
    texto += `*${nomeLoja}*\n`;
    if (config?.telefone) texto += `Tel: ${config.telefone}\n`;
    texto += `Data: ${new Date(pedido.dataVenda).toLocaleString('pt-BR')}\n`;
    texto += `Cliente: ${currentCliente?.nome || pedido.nomeClienteAvulso || 'Cliente Balcão'}\n\n`;
    texto += `*ITENS:*\n`;
    pedido.itens.forEach((it) => {
      texto += `• ${it.quantidade}x ${it.nomeProduto} - R$ ${it.subtotal.toFixed(2)}\n`;
    });
    texto += `\n*Total:* R$ ${pedido.totalLiquido.toFixed(2)}\n`;
    texto += `Forma de Pagamento: ${pedido.formaPagamento}\n`;

    if (config?.chavePix && (pedido.formaPagamento === 'PIX' || pedido.formaPagamento === 'CREDIARIO')) {
      texto += `\n*PIX para pagamento:*\nChave: ${config.chavePix} (${config.tipoChavePix || 'Chave'})\nTitular: ${config.titularPix || nomeLoja}\n`;
    }

    if (pedido.formaPagamento === 'CREDIARIO' && currentCliente) {
      texto += `\n*Saldo Devedor Atual:* R$ ${(currentCliente.saldoDevedor + pedido.totalLiquido).toFixed(2)}\n`;
      texto += `Limite de Crédito: R$ ${currentCliente.limiteCredito.toFixed(2)}\n`;
    }

    if (config?.mensagemRodape) {
      texto += `\n${config.mensagemRodape}\n`;
    } else {
      texto += `\nObrigado pela preferência! 😊\n`;
    }

    const fone = currentCliente?.telefone ? currentCliente.telefone.replace(/\D/g, '') : '';
    const url = fone
      ? `https://wa.me/55${fone}?text=${encodeURIComponent(texto)}`
      : `https://wa.me/?text=${encodeURIComponent(texto)}`;

    window.open(url, '_blank');
  };

  // Helper para cores neon vibrantes por categoria
  const getCategoryTheme = (nome: string, index: number) => {
    const n = nome.toLowerCase();
    if (n.includes('bolo') || n.includes('torta')) {
      return {
        border: 'border-pink-500/60 hover:border-pink-400 shadow-[0_0_15px_rgba(255,42,133,0.25)]',
        iconBg: 'bg-pink-500/20 text-pink-400 border-pink-500/40',
        text: 'text-pink-400 group-hover:text-pink-300',
      };
    }
    if (n.includes('doce') || n.includes('brigadeiro')) {
      return {
        border: 'border-purple-500/60 hover:border-purple-400 shadow-[0_0_15px_rgba(176,38,255,0.25)]',
        iconBg: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
        text: 'text-purple-400 group-hover:text-purple-300',
      };
    }
    if (n.includes('salgado') || n.includes('lanche')) {
      return {
        border: 'border-amber-500/60 hover:border-amber-400 shadow-[0_0_15px_rgba(255,153,0,0.25)]',
        iconBg: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
        text: 'text-amber-400 group-hover:text-amber-300',
      };
    }
    if (n.includes('bebida') || n.includes('cafe')) {
      return {
        border: 'border-cyan-500/60 hover:border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.25)]',
        iconBg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
        text: 'text-cyan-400 group-hover:text-cyan-300',
      };
    }

    // Cores alternadas neon caso haja novas categorias
    const themes = [
      {
        border: 'border-emerald-500/60 hover:border-emerald-400 shadow-neon-green',
        iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
        text: 'text-emerald-400 group-hover:text-emerald-300',
      },
      {
        border: 'border-yellow-500/60 hover:border-yellow-400 shadow-neon-yellow',
        iconBg: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
        text: 'text-yellow-400 group-hover:text-yellow-300',
      },
    ];
    return themes[index % themes.length];
  };

  // ================= TELA 1: CHECKOUT DEDICADO (SEPARADO) =================
  if (isCheckoutOpen) {
    return (
      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Top Header Checkout */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
          <button
            onClick={() => setIsCheckoutOpen(false)}
            className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-emerald-400 p-2 -ml-2 rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>Voltar aos Produtos</span>
          </button>
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            Fechamento de Venda
          </span>
        </div>

        {/* Resumo dos Itens do Pedido */}
        <div className="bg-zinc-950 p-4 rounded-3xl border border-zinc-900 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Itens Escolhidos ({totalItensCarrinho})
            </h3>
            <button
              onClick={clearCart}
              className="text-[11px] text-rose-400 font-bold hover:underline"
            >
              Esvaziar
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
            {cart.map((item) => (
              <div
                key={item.produto.id}
                className="flex items-center justify-between p-2.5 bg-zinc-900/70 rounded-2xl border border-zinc-800/80"
              >
                <div className="flex-1 pr-2">
                  <p className="text-xs font-bold text-white line-clamp-1">{item.produto.nome}</p>
                  <p className="text-[11px] text-zinc-400">
                    {item.quantidade}x R$ {item.produto.precoVenda.toFixed(2)} ={' '}
                    <strong className="text-emerald-400">
                      R$ {(item.produto.precoVenda * item.quantidade).toFixed(2)}
                    </strong>
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuantity(item.produto.id, -1)}
                    className="w-7 h-7 rounded-xl bg-zinc-800 text-zinc-300 flex items-center justify-center border border-zinc-700 active:scale-95"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center text-xs font-black text-white">
                    {item.quantidade}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.produto.id, 1)}
                    className="w-7 h-7 rounded-xl bg-emerald-500 text-black flex items-center justify-center font-bold active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Seleção de Cliente & Validação de Limite */}
        <div className="bg-zinc-950 p-4 rounded-3xl border border-zinc-900 space-y-2.5">
          <label className="block text-xs font-bold text-zinc-300 flex items-center justify-between">
            <span>Cliente da Venda</span>
            {currentCliente && (
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-3 h-3" /> Selecionado
              </span>
            )}
          </label>
          <select
            value={selectedClienteId}
            onChange={(e) => setSelectedClienteId(e.target.value)}
            className="w-full text-xs py-3 px-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-white focus:outline-none focus:border-emerald-500 font-medium"
          >
            <option value="">Cliente Balcão (Avulso sem crediário)</option>
            {clientes.map((c) => {
              const disp = Math.max(0, c.limiteCredito - c.saldoDevedor);
              return (
                <option key={c.id} value={c.id}>
                  {c.nome} (Disp: R$ {disp.toFixed(2)} | Dívida: R$ {c.saldoDevedor.toFixed(2)})
                </option>
              );
            })}
          </select>

          {currentCliente && (
            <div className="bg-zinc-900/90 p-3 rounded-2xl border border-zinc-800 text-xs space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span>Limite Total:</span>
                <span className="text-white font-mono">R$ {currentCliente.limiteCredito.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>Dívida Atual:</span>
                <span className="font-mono">R$ {currentCliente.saldoDevedor.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-bold border-t border-zinc-800 pt-1">
                <span>Crédito Disponível:</span>
                <span className="font-mono">R$ {crediarioDisponivel.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Formas de Pagamento em Botões Grandes na Thumb Zone */}
        <div className="bg-zinc-950 p-4 rounded-3xl border border-zinc-900 space-y-2.5">
          <span className="block text-xs font-bold text-zinc-300">
            Forma de Pagamento
          </span>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setFormaPagamento('DINHEIRO')}
              className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1 text-xs font-bold transition-all ${
                formaPagamento === 'DINHEIRO'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(34,197,94,0.3)]'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <Banknote className="w-5 h-5" />
              <span>Dinheiro</span>
            </button>

            <button
              type="button"
              onClick={() => setFormaPagamento('PIX')}
              className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1 text-xs font-bold transition-all ${
                formaPagamento === 'PIX'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(34,197,94,0.3)]'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <QrCode className="w-5 h-5" />
              <span>Pix</span>
            </button>

            <button
              type="button"
              onClick={() => setFormaPagamento('CARTAO_CREDITO')}
              className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1 text-xs font-bold transition-all ${
                formaPagamento === 'CARTAO_CREDITO'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(34,197,94,0.3)]'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <CreditCard className="w-5 h-5" />
              <span>Cartão</span>
            </button>
          </div>

          {/* Botão de Destaque para Crediário */}
          <button
            type="button"
            onClick={() => setFormaPagamento('CREDIARIO')}
            className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-xs font-bold transition-all ${
              formaPagamento === 'CREDIARIO'
                ? 'bg-amber-500 text-black border-amber-400 font-black shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'bg-zinc-900 border-amber-500/30 text-amber-400 hover:bg-zinc-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              <div className="text-left">
                <span className="block">Venda no Crediário / Fiado</span>
                <span className="text-[10px] opacity-80 block">Acumula na conta do cliente</span>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-black/20">
              Limite Ativo
            </span>
          </button>

          {/* Alerta de Limite Excedido */}
          {crediarioExcedido && formaPagamento === 'CREDIARIO' && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-2 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                {selectedClienteId
                  ? `Limite de crédito excedido! Disponível: R$ ${crediarioDisponivel.toFixed(2)}.`
                  : 'Selecione um cliente para autorizar compra no crediário.'}
              </span>
            </div>
          )}
        </div>

        {/* Desconto & Total Final */}
        <div className="bg-zinc-950 p-4 rounded-3xl border border-zinc-900 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Desconto (R$):</span>
            <input
              type="number"
              min="0"
              step="0.5"
              value={desconto || ''}
              placeholder="0.00"
              onChange={(e) => setDesconto(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-24 text-right text-xs py-1.5 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
            />
          </div>

          <div className="pt-2 border-t border-zinc-900 flex items-center justify-between">
            <div>
              <span className="text-xs text-zinc-400 block">Total a Pagar</span>
              <span className="text-2xl font-black text-emerald-400 neon-text-glow font-mono">
                R$ {totalLiquido.toFixed(2)}
              </span>
            </div>
            {desconto > 0 && (
              <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                - R$ {desconto.toFixed(2)} desc.
              </span>
            )}
          </div>
        </div>

        {errorMessage && (
          <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl font-semibold">
            {errorMessage}
          </p>
        )}

        {/* Botão Gigante de Finalizar ao Alcance do Polegar */}
        <button
          disabled={cart.length === 0 || loading || (formaPagamento === 'CREDIARIO' && crediarioExcedido)}
          onClick={handleFinalizarVenda}
          className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg ${
            cart.length === 0 || loading || (formaPagamento === 'CREDIARIO' && crediarioExcedido)
              ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-700'
              : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(34,197,94,0.4)] active:scale-[0.98]'
          }`}
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>{loading ? 'Finalizando...' : 'Confirmar & Emitir Pedido'}</span>
        </button>
      </div>
    );
  }

  // ================= TELA 2: PORTAL INICIAL DE CATEGORIAS (OCULTAS) =================
  if (selectedCategoriaId === null) {
    return (
      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Banner de Boas-Vindas */}
        <div className="p-4 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black rounded-3xl border border-zinc-800/80 shadow-neon-subtle">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> PDV Caixa Rápido
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">1-Hand Touch</span>
          </div>
          <h2 className="text-lg font-black text-white mt-1">Toque na Categoria</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Ao selecionar uma categoria, a tela mostrará apenas os produtos correspondentes.
          </p>
        </div>

        {/* Grade de Cards Grandes de Categorias (Multi-Neon Vibrante) */}
        <div className="grid grid-cols-2 gap-3">
          {/* Card Ver Todos - Neon Cyan */}
          <button
            onClick={() => setSelectedCategoriaId('all')}
            className="p-5 bg-zinc-950 rounded-3xl border border-cyan-500/60 hover:border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.25)] transition-all text-left flex flex-col justify-between h-36 group active:scale-95"
          >
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 transition-all shadow-[0_0_10px_rgba(0,240,255,0.3)]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-black text-cyan-400 group-hover:text-cyan-300 transition-colors block">
                Ver Todos
              </span>
              <span className="text-[11px] text-zinc-400 font-mono block">
                {(produtos || []).length} produtos
              </span>
            </div>
          </button>

          {/* Cards das Categorias com Cores Neon Individuais */}
          {(categorias || []).map((cat, idx) => {
            const theme = getCategoryTheme(cat?.nome || '', idx);
            const qtd = (produtos || []).filter((p) => p && p.categoriaId === cat.id).length;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoriaId(cat.id)}
                className={`p-5 bg-zinc-950 rounded-3xl border ${theme.border} transition-all text-left flex flex-col justify-between h-36 group active:scale-95`}
              >
                <div className={`w-10 h-10 rounded-2xl border ${theme.iconBg} flex items-center justify-center transition-all`}>
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className={`text-sm font-black ${theme.text} line-clamp-1 block transition-colors`}>
                    {cat.nome}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono block">
                    {qtd} {qtd === 1 ? 'item' : 'itens'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* BARRA FLUTUANTE DE CARRINHO (SE HOUVER ITENS) */}
        {cart.length > 0 && (
          <div className="fixed bottom-16 left-4 right-4 z-40 max-w-md mx-auto">
            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="w-full py-3.5 px-5 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-2xl shadow-[0_0_20px_rgba(34,197,94,0.4)] flex items-center justify-between active:scale-98 transition-all"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                <span className="text-xs uppercase tracking-wider">
                  {totalItensCarrinho} {totalItensCarrinho === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-sm">
                <span>R$ {totalLiquido.toFixed(2)}</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ================= TELA 3: PRODUTOS DA CATEGORIA SELECIONADA =================
  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      {/* Topo com Botão Voltar às Categorias */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
        <button
          onClick={() => {
            setSelectedCategoriaId(null);
            setSearchQuery('');
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-emerald-400 p-2 -ml-2 rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400" />
          <span>Voltar às Categorias</span>
        </button>

        <span className="text-xs font-black text-emerald-400 uppercase tracking-wider font-mono">
          {activeCategoria ? activeCategoria.nome : 'Todos os Itens'}
        </span>
      </div>

      {/* Busca Rápida */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
        <input
          type="text"
          placeholder="Filtrar nesta categoria..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-2xl text-xs text-white focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Grid de Cards dos Produtos (Touch Friendly com 1 Mão) */}
      <div className="space-y-3 pb-20">
        {filteredProdutos.map((prod) => {
          const inCart = cart.find((c) => c.produto.id === prod.id);
          const isEstoqueBaixo = prod.estoqueAtual <= prod.estoqueMinimo;

          return (
            <div
              key={prod.id}
              className={`p-4 rounded-3xl bg-zinc-950 border transition-all ${
                inCart
                  ? 'border-emerald-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                  : 'border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                        prod.tipo === 'FABRICADO'
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {prod.tipo === 'FABRICADO' ? 'Produção Própria' : 'Revenda'}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold ${
                        isEstoqueBaixo ? 'text-amber-400' : 'text-zinc-500'
                      }`}
                    >
                      Estoque: {prod.estoqueAtual}
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-sm">{prod.nome}</h3>
                  {prod.descricao && (
                    <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">{prod.descricao}</p>
                  )}
                </div>

                {/* Preço Unitário */}
                <div className="text-right">
                  <span className="text-xs text-zinc-500 block">Preço</span>
                  <span className="text-base font-black text-emerald-400 font-mono">
                    R$ {prod.precoVenda.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Botão de Adição / Quantidade ao Alcance do Dedo */}
              <div className="mt-3 pt-2.5 border-t border-zinc-900 flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 font-mono">
                  {prod.tipo === 'FABRICADO' && prod.fichaTecnica?.length > 0
                    ? `Baixa ${prod.fichaTecnica.length} insumos por un.`
                    : 'Baixa direta'}
                </span>

                {inCart ? (
                  <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-2xl border border-emerald-500/40">
                    <button
                      onClick={() => updateQuantity(prod.id, -1)}
                      className="w-8 h-8 rounded-xl bg-zinc-800 text-white flex items-center justify-center font-bold active:scale-95"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-black text-emerald-400 px-2 font-mono">
                      {inCart.quantidade}
                    </span>
                    <button
                      onClick={() => updateQuantity(prod.id, 1)}
                      className="w-8 h-8 rounded-xl bg-emerald-500 text-black flex items-center justify-center font-bold active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => addToCart(prod)}
                    className="px-4 py-2 bg-zinc-900 hover:bg-emerald-500 hover:text-black text-emerald-400 rounded-xl text-xs font-bold transition-all border border-emerald-500/30 flex items-center gap-1.5 active:scale-95"
                  >
                    <Plus className="w-4 h-4" /> Adicionar
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredProdutos.length === 0 && (
          <div className="text-center py-12 text-zinc-500 text-xs">
            Nenhum produto cadastrado nesta categoria.
          </div>
        )}
      </div>

      {/* BARRA FLUTUANTE DE CARRINHO (THUMB ZONE) */}
      {cart.length > 0 && (
        <div className="fixed bottom-16 left-4 right-4 z-40 max-w-md mx-auto">
          <button
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full py-3.5 px-5 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-2xl shadow-[0_0_20px_rgba(34,197,94,0.4)] flex items-center justify-between active:scale-98 transition-all"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span className="text-xs uppercase tracking-wider">
                {totalItensCarrinho} {totalItensCarrinho === 1 ? 'item' : 'itens'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-sm">
              <span>Finalizar: R$ {totalLiquido.toFixed(2)}</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* ================= MODAL DO CUPOM PÓS-VENDA ================= */}
      {pedidoFinalizado && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="font-bold text-sm text-white">Venda Concluída!</h3>
              </div>
              <button
                onClick={() => setPedidoFinalizado(null)}
                className="w-7 h-7 rounded-full bg-zinc-900 text-zinc-400 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white text-black p-4 rounded-2xl font-mono text-xs space-y-2" id="printable-receipt">
              <div className="text-center pb-2 border-b border-dashed border-zinc-400 space-y-0.5">
                <p className="font-black text-sm uppercase tracking-wide">{config?.nomeLoja || 'ERP & PDV MANU'}</p>
                {config?.cnpjCpf && <p className="text-[10px] text-zinc-600">CNPJ/CPF: {config.cnpjCpf}</p>}
                {config?.telefone && <p className="text-[10px] text-zinc-600">Tel: {config.telefone}</p>}
                {config?.endereco && <p className="text-[9px] text-zinc-500 leading-tight">{config.endereco}</p>}
                <p className="text-[10px] text-zinc-600 pt-1">
                  Pedido #{pedidoFinalizado.codigo} • {new Date(pedidoFinalizado.dataVenda).toLocaleString('pt-BR')}
                </p>
              </div>

              <div className="space-y-1 py-1">
                {pedidoFinalizado.itens.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.quantidade}x {it.nomeProduto}</span>
                    <span>R$ {it.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-dashed border-zinc-400 space-y-0.5">
                <div className="flex justify-between font-bold text-sm">
                  <span>TOTAL:</span>
                  <span>R$ {pedidoFinalizado.totalLiquido.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-zinc-600">
                  <span>Pagamento:</span>
                  <span>{pedidoFinalizado.formaPagamento}</span>
                </div>
                {config?.chavePix && (pedidoFinalizado.formaPagamento === 'PIX' || pedidoFinalizado.formaPagamento === 'CREDIARIO') && (
                  <div className="pt-1 text-[10px] text-zinc-600 border-t border-dotted border-zinc-300">
                    <p className="font-bold">Pix: <span className="font-normal">{config.chavePix} ({config.tipoChavePix})</span></p>
                    <p className="truncate">Titular: {config.titularPix}</p>
                  </div>
                )}
              </div>

              {config?.mensagemRodape && (
                <div className="pt-2 border-t border-dashed border-zinc-300 text-center text-[10px] text-zinc-600 italic">
                  {config.mensagemRodape}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-zinc-900 border border-zinc-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Imprimir
              </button>
              <button
                onClick={() => handleShareWhatsApp(pedidoFinalizado)}
                className="flex-1 py-2.5 bg-emerald-500 text-black rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
              >
                <Share2 className="w-4 h-4" /> WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
