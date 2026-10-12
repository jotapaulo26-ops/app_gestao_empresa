'use client';

import React, { useState, useMemo } from 'react';
import { Pedido, Cliente, Produto, StatusProducao, ConfiguracaoLoja } from '@/types';
import {
  atualizarStatusProducaoLocalEOnline,
  salvarPedidoLocalEOnline,
  cancelarPedidoLocalEOnline,
} from '@/lib/dataService';
import {
  CalendarClock,
  Search,
  Plus,
  Clock,
  MapPin,
  Phone,
  User,
  Package,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Truck,
  Store,
  Calendar,
  X,
  Trash2,
  Sparkles,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface EncomendasViewProps {
  pedidos: Pedido[];
  clientes: Cliente[];
  produtos: Produto[];
  config?: ConfiguracaoLoja;
  onRefresh: () => void;
}

export default function EncomendasView({
  pedidos,
  clientes,
  produtos,
  config,
  onRefresh,
}: EncomendasViewProps) {
  // Filtros
  const [filtroData, setFiltroData] = useState<'hoje' | 'amanha' | 'semana' | 'todas'>('todas');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [search, setSearch] = useState('');

  // Modais
  const [novaModalOpen, setNovaModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal de Exclusão de Encomenda
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [encomendaParaExcluir, setEncomendaParaExcluir] = useState<Pedido | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const handleConfirmarExclusao = async () => {
    if (!encomendaParaExcluir) return;
    setExcluindo(true);
    try {
      await cancelarPedidoLocalEOnline(encomendaParaExcluir.id);
      setDeleteModalOpen(false);
      setEncomendaParaExcluir(null);
      onRefresh();
    } catch (err) {
      console.error('Erro ao excluir encomenda:', err);
    } finally {
      setExcluindo(false);
    }
  };

  // Form State para Nova Encomenda
  const [selectedClienteId, setSelectedClienteId] = useState<string>('');
  const [nomeClienteAvulso, setNomeClienteAvulso] = useState('');
  const [telefoneClienteAvulso, setTelefoneClienteAvulso] = useState('');
  const [dataEntrega, setDataEntrega] = useState(() => {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    return amanha.toISOString().split('T')[0];
  });
  const [horaEntrega, setHoraEntrega] = useState('14:00');
  const [tipoEntrega, setTipoEntrega] = useState<'RETIRADA' | 'ENTREGA'>('RETIRADA');
  const [enderecoEntrega, setEnderecoEntrega] = useState('');
  const [observacoesEntrega, setObservacoesEntrega] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<any>('PIX');

  // Itens selecionados no formulário de nova encomenda
  const [itensForm, setItensForm] = useState<{ produtoId: string; quantidade: number }[]>([]);

  // Filtra apenas pedidos que são Encomendas (ou que tenham dataEntrega definida)
  const encomendas = useMemo(() => {
    return pedidos.filter(
      (p) => p.status !== 'CANCELADO' && (p.isEncomenda || !!p.dataEntrega)
    );
  }, [pedidos]);

  // Auxiliares de Datas
  const hojeStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const amanhaStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);
  const seteDiasStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }, []);

  // Lista filtrada e ordenada cronologicamente por data e hora de entrega
  const encomendasFiltradas = useMemo(() => {
    return encomendas
      .filter((enc) => {
        const d = enc.dataEntrega || enc.dataVenda?.split('T')[0] || '';

        // Filtro de Data
        if (filtroData === 'hoje' && d !== hojeStr) return false;
        if (filtroData === 'amanha' && d !== amanhaStr) return false;
        if (filtroData === 'semana' && (d < hojeStr || d > seteDiasStr)) return false;

        // Filtro de Status
        const st = enc.statusProducao || 'A_FAZER';
        if (filtroStatus !== 'todos' && st !== filtroStatus) return false;

        // Busca por texto
        const term = search.toLowerCase().trim();
        if (!term) return true;

        const cli = clientes.find((c) => c.id === enc.clienteId);
        const nomeCli = (cli?.nome || enc.nomeClienteAvulso || '').toLowerCase();
        const obs = (enc.observacoesEntrega || enc.observacoes || '').toLowerCase();
        const itensNomes = enc.itens.map((i) => i.nomeProduto.toLowerCase()).join(' ');

        return nomeCli.includes(term) || obs.includes(term) || itensNomes.includes(term);
      })
      .sort((a, b) => {
        const dataA = `${a.dataEntrega || '9999-99-99'} ${a.horaEntrega || '00:00'}`;
        const dataB = `${b.dataEntrega || '9999-99-99'} ${b.horaEntrega || '00:00'}`;
        return dataA.localeCompare(dataB);
      });
  }, [encomendas, filtroData, filtroStatus, search, hojeStr, amanhaStr, seteDiasStr, clientes]);

  // Métricas de Encomendas
  const metricas = useMemo(() => {
    const hojeCount = encomendas.filter((e) => (e.dataEntrega || '') === hojeStr).length;
    const aFazerCount = encomendas.filter((e) => (e.statusProducao || 'A_FAZER') === 'A_FAZER').length;
    const emProducaoCount = encomendas.filter((e) => e.statusProducao === 'EM_PRODUCAO').length;
    const prontoCount = encomendas.filter((e) => e.statusProducao === 'PRONTO').length;

    return { hojeCount, aFazerCount, emProducaoCount, prontoCount, total: encomendas.length };
  }, [encomendas, hojeStr]);

  // Transição de Status em 1 Clique
  const handleAvancarStatus = async (pedido: Pedido) => {
    const atual: StatusProducao = pedido.statusProducao || 'A_FAZER';
    let proximo: StatusProducao = 'EM_PRODUCAO';

    if (atual === 'A_FAZER') proximo = 'EM_PRODUCAO';
    else if (atual === 'EM_PRODUCAO') proximo = 'PRONTO';
    else if (atual === 'PRONTO') proximo = 'ENTREGUE';
    else if (atual === 'ENTREGUE') proximo = 'A_FAZER';

    await atualizarStatusProducaoLocalEOnline(pedido.id, proximo);
    onRefresh();
  };

  // Gerador e Disparo de Mensagens WhatsApp
  const handleEnviarMensagemWhatsApp = (
    pedido: Pedido,
    tipoMsg: 'confirmacao' | 'lembrete' | 'pronto'
  ) => {
    const cli = clientes.find((c) => c.id === pedido.clienteId);
    const tel = cli?.telefone || pedido.telefoneClienteAvulso || '';
    const nomeCliente = cli?.nome || pedido.nomeClienteAvulso || 'Cliente';
    const nomeLoja = config?.nomeLoja || 'Nossa Loja';

    const dataFmt = pedido.dataEntrega
      ? pedido.dataEntrega.split('-').reverse().join('/')
      : 'Data combinada';
    const horaFmt = pedido.horaEntrega ? `às ${pedido.horaEntrega}` : '';

    const itensLista = pedido.itens
      .map((it) => `• ${it.quantidade}x ${it.nomeProduto}`)
      .join('\n');

    let texto = '';

    if (tipoMsg === 'confirmacao') {
      texto = `*🎉 Olá, ${nomeCliente}! Sua encomenda está confirmada!*\n\n`;
      texto += `*Loja:* ${nomeLoja}\n`;
      texto += `*📅 Data de Entrega/Retirada:* ${dataFmt} ${horaFmt}\n`;
      texto += `*📦 Tipo:* ${pedido.tipoEntrega === 'ENTREGA' ? 'Entrega no Endereço' : 'Retirada no Balcão'}\n`;
      if (pedido.tipoEntrega === 'ENTREGA' && (pedido.enderecoEntrega || cli?.endereco)) {
        texto += `*📍 Endereço:* ${pedido.enderecoEntrega || cli?.endereco}\n`;
      }
      texto += `\n*🛒 Itens da Encomenda:*\n${itensLista}\n`;
      if (pedido.observacoesEntrega) {
        texto += `\n*📝 Detalhes/Personalização:* ${pedido.observacoesEntrega}\n`;
      }
      texto += `\n*💰 Valor Total:* R$ ${pedido.totalLiquido.toFixed(2)}\n`;
      texto += `*Forma de Pagamento:* ${pedido.formaPagamento}\n\n`;
      texto += `Qualquer dúvida estamos à disposição! Muito obrigado! ❤️`;
    } else if (tipoMsg === 'lembrete') {
      texto = `*⏰ Olá, ${nomeCliente}! Passando para lembrar da sua encomenda hoje!*\n\n`;
      texto += `*📅 Horário Agendado:* ${horaFmt || 'Hoje'}\n`;
      texto += `*📦 Modo:* ${pedido.tipoEntrega === 'ENTREGA' ? 'Entrega no Endereço' : 'Retirada no Balcão'}\n`;
      texto += `\n*Itens:*\n${itensLista}\n\n`;
      texto += `Já estamos organizando tudo com muito carinho! Até breve. 👩‍🍳✨`;
    } else if (tipoMsg === 'pronto') {
      texto = `*✨ Oba, ${nomeCliente}! Sua encomenda está PRONTINHA!*\n\n`;
      texto += `*Itens:*\n${itensLista}\n\n`;
      if (pedido.tipoEntrega === 'ENTREGA') {
        texto += `🚗 O seu pedido já foi embalado e está saindo para entrega no seu endereço!\n`;
      } else {
        texto += `🛍️ Já pode vir retirar no nosso balcão quando desejar!\n`;
      }
      texto += `\nMuito obrigado pela preferência! Bom apetite! 🎂💖`;
    }

    const cleanTel = tel.replace(/\D/g, '');
    const url = cleanTel
      ? `https://api.whatsapp.com/send?phone=55${cleanTel}&text=${encodeURIComponent(texto)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;

    window.open(url, '_blank');
  };

  // Salvar Nova Encomenda
  const handleSalvarNovaEncomenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itensForm.length === 0) {
      setErrorMsg('Adicione pelo menos 1 produto à encomenda.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const itensPedido = itensForm.map((it) => {
        const prod = produtos.find((p) => p.id === it.produtoId);
        const preco = prod?.precoVenda || 0;
        return {
          produtoId: it.produtoId,
          nomeProduto: prod?.nome || 'Produto',
          quantidade: it.quantidade,
          precoUnitario: preco,
          subtotal: preco * it.quantidade,
          custoUnitario: prod?.custoTotal || 0,
        };
      });

      const totalBruto = itensPedido.reduce((acc, i) => acc + i.subtotal, 0);
      const custoTotal = itensPedido.reduce((acc, i) => acc + i.custoUnitario * i.quantidade, 0);

      const body = {
        clienteId: selectedClienteId || undefined,
        nomeClienteAvulso: !selectedClienteId ? (nomeClienteAvulso || 'Cliente Encomenda') : undefined,
        telefoneClienteAvulso,
        itens: itensPedido,
        totalBruto,
        desconto: 0,
        totalLiquido: totalBruto,
        custoTotal,
        lucroTotal: Math.max(0, totalBruto - custoTotal),
        formaPagamento,
        isEncomenda: true,
        dataEntrega,
        horaEntrega,
        tipoEntrega,
        enderecoEntrega,
        observacoesEntrega,
        statusProducao: 'A_FAZER' as StatusProducao,
      };

      await salvarPedidoLocalEOnline(body);
      setNovaModalOpen(false);
      setItensForm([]);
      setNomeClienteAvulso('');
      setTelefoneClienteAvulso('');
      setObservacoesEntrega('');
      setEnderecoEntrega('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao agendar encomenda');
    } finally {
      setLoading(false);
    }
  };

  // Itens helpers no modal de nova encomenda
  const handleAddItemNoForm = (produtoId: string) => {
    const existing = itensForm.find((i) => i.produtoId === produtoId);
    if (existing) {
      setItensForm((prev) =>
        prev.map((i) => (i.produtoId === produtoId ? { ...i, quantidade: i.quantidade + 1 } : i))
      );
    } else {
      setItensForm((prev) => [...prev, { produtoId, quantidade: 1 }]);
    }
  };

  const handleUpdateItemFormQtd = (produtoId: string, delta: number) => {
    setItensForm((prev) =>
      prev
        .map((i) => {
          if (i.produtoId === produtoId) {
            const novaQtd = i.quantidade + delta;
            return novaQtd > 0 ? { ...i, quantidade: novaQtd } : null;
          }
          return i;
        })
        .filter(Boolean) as any
    );
  };

  // Cores e Labels de Status de Produção
  const getStatusBadge = (status?: StatusProducao) => {
    switch (status) {
      case 'EM_PRODUCAO':
        return {
          label: 'Em Produção / Forno',
          bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-neon-amber',
          dot: 'bg-amber-400 animate-pulse',
        };
      case 'PRONTO':
        return {
          label: 'Pronto p/ Entrega',
          bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-neon-green',
          dot: 'bg-emerald-400',
        };
      case 'ENTREGUE':
        return {
          label: 'Entregue / Concluído',
          bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-neon-cyan',
          dot: 'bg-cyan-400',
        };
      case 'A_FAZER':
      default:
        return {
          label: 'A Fazer (Pendente)',
          bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-neon-pink',
          dot: 'bg-rose-400',
        };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* ================= CABEÇALHO DO MÓDULO ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-900 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-neon-amber">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-2">
              <span>Agenda de Encomendas & Produção</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {encomendas.length} ativas
              </span>
            </h1>
            <p className="text-xs text-zinc-400">
              Controle de entregas futuras, pipeline de forno/produção e notificações no WhatsApp
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setNovaModalOpen(true);
            setErrorMsg('');
          }}
          className="px-4 py-2.5 rounded-xl bg-amber-500 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-neon-amber hover:bg-amber-400 active:scale-98 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Encomenda</span>
        </button>
      </div>

      {/* ================= CARDS DE MÉTRICAS ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-950 border border-zinc-900 p-3.5 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
            Entregas de Hoje
          </span>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span className="text-xl font-black text-white">{metricas.hojeCount}</span>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-3.5 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
            A Fazer (Na Fila)
          </span>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-rose-400" />
            <span className="text-xl font-black text-rose-400">{metricas.aFazerCount}</span>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-3.5 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
            No Forno / Em Produção
          </span>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xl font-black text-amber-400">{metricas.emProducaoCount}</span>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-3.5 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
            Prontos p/ Retirada
          </span>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xl font-black text-emerald-400">{metricas.prontoCount}</span>
          </div>
        </div>
      </div>

      {/* ================= FILTROS E BUSCA ================= */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por cliente, produto encomendado ou observações..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Linha de Filtros de Período e Status */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Período */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setFiltroData('hoje')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filtroData === 'hoje'
                  ? 'bg-amber-500 text-black font-black shadow-neon-amber'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              📅 Hoje ({metricas.hojeCount})
            </button>
            <button
              onClick={() => setFiltroData('amanha')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filtroData === 'amanha'
                  ? 'bg-amber-500 text-black font-black shadow-neon-amber'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              Amanhã
            </button>
            <button
              onClick={() => setFiltroData('semana')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filtroData === 'semana'
                  ? 'bg-amber-500 text-black font-black shadow-neon-amber'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => setFiltroData('todas')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filtroData === 'todas'
                  ? 'bg-amber-500 text-black font-black shadow-neon-amber'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              Todas ({metricas.total})
            </button>
          </div>

          {/* Filtro de Status */}
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-300 font-bold focus:outline-none focus:border-amber-500"
          >
            <option value="todos">Todos os Status</option>
            <option value="A_FAZER">🟡 A Fazer</option>
            <option value="EM_PRODUCAO">🟠 No Forno / Em Produção</option>
            <option value="PRONTO">🟢 Pronto p/ Entrega</option>
            <option value="ENTREGUE">🔵 Entregue</option>
          </select>
        </div>
      </div>

      {/* ================= LISTA CRONOLÓGICA DE ENCOMENDAS ================= */}
      {encomendasFiltradas.length === 0 ? (
        <div className="text-center py-16 bg-zinc-950 border border-zinc-900 rounded-3xl space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 mx-auto">
            <CalendarClock className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-white">Nenhuma encomenda neste período</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {search || filtroData !== 'todas' || filtroStatus !== 'todos'
              ? 'Tente ajustar os filtros acima para ver outras encomendas agendadas.'
              : 'Agende a sua primeira encomenda para controlar prazos e enviar avisos automáticos no WhatsApp.'}
          </p>
          <button
            onClick={() => setNovaModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-black hover:bg-amber-400 transition-all inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Agendar Encomenda</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {encomendasFiltradas.map((enc) => {
            const cli = clientes.find((c) => c.id === enc.clienteId);
            const nomeCli = cli?.nome || enc.nomeClienteAvulso || 'Cliente';
            const telCli = cli?.telefone || enc.telefoneClienteAvulso || '';
            const statusConfig = getStatusBadge(enc.statusProducao);

            const isHoje = (enc.dataEntrega || '') === hojeStr;
            const dataFormatada = enc.dataEntrega
              ? enc.dataEntrega.split('-').reverse().join('/')
              : 'Sem data';

            return (
              <div
                key={enc.id}
                className={`bg-zinc-950 border rounded-3xl p-5 space-y-4 transition-all shadow-xl ${
                  isHoje
                    ? 'border-amber-500/50 shadow-neon-amber'
                    : 'border-zinc-900 hover:border-zinc-800'
                }`}
              >
                {/* Linha Superior: Data, Horário e Status de Produção */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold ${
                        isHoje
                          ? 'bg-amber-500 text-black border-amber-400'
                          : 'bg-zinc-900 text-white border-zinc-800'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{isHoje ? 'HOJE' : dataFormatada}</span>
                      {enc.horaEntrega && (
                        <span className="font-mono ml-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {enc.horaEntrega}
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-zinc-500 font-mono">#{enc.codigo}</span>
                  </div>

                  {/* Badge de Status Interativo (Clica para Avançar Status) */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAvancarStatus(enc)}
                      title="Clique para avançar o status de produção"
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all active:scale-95 ${statusConfig.bg}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
                      <span>{statusConfig.label}</span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    </button>
                  </div>
                </div>

                {/* Bloco de Dados do Cliente e Modo de Entrega */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-900/40 p-3.5 rounded-2xl border border-zinc-900">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-sm font-bold text-white">{nomeCli}</span>
                    </div>

                    {telCli && (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <Phone className="w-3 h-3 text-zinc-500" />
                        <span>{telCli}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                      {enc.tipoEntrega === 'ENTREGA' ? (
                        <>
                          <Truck className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="text-cyan-400">Entrega no Endereço</span>
                        </>
                      ) : (
                        <>
                          <Store className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Retirada no Balcão</span>
                        </>
                      )}
                    </div>

                    {(enc.enderecoEntrega || cli?.endereco) && enc.tipoEntrega === 'ENTREGA' && (
                      <p className="text-[11px] text-zinc-400 flex items-start gap-1">
                        <MapPin className="w-3 h-3 text-zinc-500 shrink-0 mt-0.5" />
                        <span>{enc.enderecoEntrega || cli?.endereco}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Itens Encomendados e Observações */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                    Produtos Encomendados:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {enc.itens.map((it, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs bg-zinc-900/60 px-3 py-1.5 rounded-xl border border-zinc-900 text-zinc-200"
                      >
                        <span>
                          <strong>{it.quantidade}x</strong> {it.nomeProduto}
                        </span>
                        <span className="font-mono text-zinc-400">R$ {it.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {enc.observacoesEntrega && (
                    <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-xs text-amber-300">
                      <strong>Observações / Personalização:</strong> {enc.observacoesEntrega}
                    </div>
                  )}
                </div>

                {/* Rodapé: Valor Total & Botões de Ação no WhatsApp */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-zinc-900">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Total da Encomenda</span>
                      <span className="text-base font-black text-emerald-400 font-mono">
                        R$ {enc.totalLiquido.toFixed(2)}
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400">
                      {enc.formaPagamento}
                    </span>
                  </div>

                  {/* 3 Botões Prontos de WhatsApp */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => handleEnviarMensagemWhatsApp(enc, 'confirmacao')}
                      title="Enviar comprovante e confirmação no WhatsApp"
                      className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-all"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Confirmar</span>
                    </button>

                    <button
                      onClick={() => handleEnviarMensagemWhatsApp(enc, 'lembrete')}
                      title="Enviar lembrete de entrega no WhatsApp"
                      className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-all"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Lembrete</span>
                    </button>

                    <button
                      onClick={() => handleEnviarMensagemWhatsApp(enc, 'pronto')}
                      title="Avisar que está pronto para retirada ou saindo para entrega"
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1 transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Avisar Pronto</span>
                    </button>

                    <button
                      onClick={() => {
                        setEncomendaParaExcluir(enc);
                        setDeleteModalOpen(true);
                      }}
                      title="Excluir ou Cancelar Encomenda"
                      className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL DE NOVA ENCOMENDA ================= */}
      {novaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-xl w-full p-5 sm:p-6 space-y-4 shadow-2xl my-8 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Agendar Nova Encomenda</h3>
              </div>
              <button
                onClick={() => setNovaModalOpen(false)}
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

            <form onSubmit={handleSalvarNovaEncomenda} className="space-y-4">
              {/* Cliente */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Cliente Cadastrado ou Nome:
                </label>
                <select
                  value={selectedClienteId}
                  onChange={(e) => {
                    setSelectedClienteId(e.target.value);
                    const cli = clientes.find((c) => c.id === e.target.value);
                    if (cli) {
                      setEnderecoEntrega(cli.endereco || '');
                      setTelefoneClienteAvulso(cli.telefone || '');
                    }
                  }}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">Cliente Avulso (Digitar abaixo)</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} {c.telefone ? `(${c.telefone})` : ''}
                    </option>
                  ))}
                </select>

                {!selectedClienteId && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Nome do Cliente"
                      value={nomeClienteAvulso}
                      onChange={(e) => setNomeClienteAvulso(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                    <input
                      type="text"
                      placeholder="WhatsApp (ex: 11999998888)"
                      value={telefoneClienteAvulso}
                      onChange={(e) => setTelefoneClienteAvulso(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}
              </div>

              {/* Data e Hora de Entrega */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Data da Entrega *
                  </label>
                  <input
                    type="date"
                    required
                    value={dataEntrega}
                    onChange={(e) => setDataEntrega(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Horário da Entrega
                  </label>
                  <input
                    type="time"
                    value={horaEntrega}
                    onChange={(e) => setHoraEntrega(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Modo de Entrega */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Tipo de Entrega:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoEntrega('RETIRADA')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      tipoEntrega === 'RETIRADA'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>Retirada no Balcão</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoEntrega('ENTREGA')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      tipoEntrega === 'ENTREGA'
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Entrega no Endereço</span>
                  </button>
                </div>

                {tipoEntrega === 'ENTREGA' && (
                  <input
                    type="text"
                    placeholder="Endereço Completo de Entrega (Rua, Número, Bairro)"
                    value={enderecoEntrega}
                    onChange={(e) => setEnderecoEntrega(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                )}
              </div>

              {/* Seleção de Produtos da Encomenda */}
              <div className="space-y-2 border border-zinc-900 bg-zinc-900/30 p-3 rounded-2xl">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Produtos da Encomenda:
                </label>

                {/* Seletor Rápido */}
                <div className="flex gap-2">
                  <select
                    id="select-produto-encomenda"
                    className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white"
                  >
                    {produtos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} - R$ {p.precoVenda.toFixed(2)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const sel = document.getElementById(
                        'select-produto-encomenda'
                      ) as HTMLSelectElement;
                      if (sel?.value) handleAddItemNoForm(sel.value);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 text-black font-bold text-xs"
                  >
                    + Adicionar
                  </button>
                </div>

                {/* Itens Adicionados */}
                {itensForm.length > 0 ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {itensForm.map((item) => {
                      const prod = produtos.find((p) => p.id === item.produtoId);
                      return (
                        <div
                          key={item.produtoId}
                          className="flex items-center justify-between text-xs bg-zinc-950 p-2 rounded-xl border border-zinc-850"
                        >
                          <span className="text-zinc-200 truncate pr-2">{prod?.nome}</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateItemFormQtd(item.produtoId, -1)}
                              className="w-6 h-6 rounded bg-zinc-900 text-zinc-300 font-bold"
                            >
                              -
                            </button>
                            <span className="font-mono font-bold text-white px-1">
                              {item.quantidade}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemFormQtd(item.produtoId, 1)}
                              className="w-6 h-6 rounded bg-zinc-900 text-zinc-300 font-bold"
                            >
                              +
                            </button>
                            <span className="font-mono text-emerald-400 w-16 text-right">
                              R$ {((prod?.precoVenda || 0) * item.quantidade).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-500 text-center py-2">
                    Nenhum produto adicionado ainda.
                  </p>
                )}
              </div>

              {/* Observações Especiais */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Observações / Personalização
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Topo 'Parabéns Manu', sem nozes, embalagem presente"
                  value={observacoesEntrega}
                  onChange={(e) => setObservacoesEntrega(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Forma de Pagamento */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Forma de Pagamento:
                </label>
                <select
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value as any)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="PIX">Pix</option>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                  <option value="CARTAO_DEBITO">Cartão de Débito</option>
                  <option value="CREDIARIO">Crediário / Fiado</option>
                </select>
              </div>

              {/* Botões do Rodapé */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setNovaModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider shadow-neon-amber disabled:opacity-50"
                >
                  {loading ? 'Agendando...' : 'Confirmar Agendamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL DE EXCLUSÃO DE ENCOMENDA ================= */}
      {deleteModalOpen && encomendaParaExcluir && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Excluir Encomenda</h3>
              </div>
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setEncomendaParaExcluir(null);
                }}
                className="w-8 h-8 rounded-full bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Tem certeza que deseja excluir a encomenda <strong className="text-white">#{encomendaParaExcluir.codigo}</strong>?
            </p>

            <div className="bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-900 space-y-2 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Cliente:</span>
                <span className="text-white font-bold">
                  {clientes.find((c) => c.id === encomendaParaExcluir.clienteId)?.nome ||
                    encomendaParaExcluir.nomeClienteAvulso ||
                    'Cliente Avulso'}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Valor Total:</span>
                <span className="text-emerald-400 font-bold font-mono">
                  R$ {encomendaParaExcluir.totalLiquido.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Data de Entrega:</span>
                <span className="text-zinc-200">
                  {encomendaParaExcluir.dataEntrega
                    ? encomendaParaExcluir.dataEntrega.split('-').reverse().join('/')
                    : 'Sem data'}
                </span>
              </div>
              <div className="text-zinc-400 pt-1 border-t border-zinc-800">
                <span className="block mb-1 font-bold text-zinc-500 text-[10px] uppercase">Itens da Encomenda:</span>
                <span className="text-zinc-300">
                  {encomendaParaExcluir.itens.map((i) => `${i.quantidade}x ${i.nomeProduto}`).join(', ')}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Os insumos e produtos serão restaurados ao estoque automaticamente.</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-900">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setEncomendaParaExcluir(null);
                }}
                disabled={excluindo}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExclusao}
                disabled={excluindo}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-neon-pink disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{excluindo ? 'Excluindo...' : 'Sim, Excluir Encomenda'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
