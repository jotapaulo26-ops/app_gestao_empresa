import { Pedido, Produto, Cliente, Insumo, PagamentoCrediario } from '@/types';

export function calcularDashboardMetrics(
  pedidos: Pedido[] = [],
  produtos: Produto[] = [],
  clientes: Cliente[] = [],
  insumos: Insumo[] = [],
  pagamentosCrediario: PagamentoCrediario[] = []
) {
  const safePedidos = Array.isArray(pedidos) ? pedidos : [];
  const safeProdutos = Array.isArray(produtos) ? produtos : [];
  const safeClientes = Array.isArray(clientes) ? clientes : [];
  const safeInsumos = Array.isArray(insumos) ? insumos : [];
  const safePagamentos = Array.isArray(pagamentosCrediario) ? pagamentosCrediario : [];

  const pedidosConcluidos = safePedidos.filter((p) => p && p.status === 'CONCLUIDO');

  const hoje = new Date().toISOString().slice(0, 10);
  const vendasHoje = pedidosConcluidos.filter((p) => p.dataVenda && p.dataVenda.slice(0, 10) === hoje);
  const pagamentosHoje = safePagamentos.filter((p) => p.dataPagamento && p.dataPagamento.slice(0, 10) === hoje);

  // Vendas à vista de hoje (excluindo o que foi vendido fiado no dia)
  const vendasAVistaHoje = vendasHoje
    .filter((p) => p.formaPagamento !== 'CREDIARIO')
    .reduce((acc, p) => acc + (Number(p.totalLiquido) || 0), 0);

  // Pagamentos de crediário recebidos hoje
  const totalRecebidoCrediarioHoje = Number(
    pagamentosHoje.reduce((acc, p) => acc + (Number(p.valor) || 0), 0).toFixed(2)
  );

  // Total Real de Entradas em Caixa Hoje (Vendas à vista + Pagamentos de Fiado)
  const totalHoje = Number((vendasAVistaHoje + totalRecebidoCrediarioHoje).toFixed(2));

  // Vendas totais faturadas hoje (inclui o fiado novo)
  const faturamentoHoje = Number(
    vendasHoje.reduce((acc, p) => acc + (Number(p.totalLiquido) || 0), 0).toFixed(2)
  );

  // Faturamento e lucro geral de produtos
  const faturamentoGeral = Number(pedidosConcluidos.reduce((acc, p) => acc + (Number(p.totalLiquido) || 0), 0).toFixed(2));
  const lucroGeral = Number(pedidosConcluidos.reduce((acc, p) => acc + (Number(p.lucroTotal) || 0), 0).toFixed(2));

  // Pagamentos de crediário históricos totais
  const totalRecebidoCrediarioGeral = Number(
    safePagamentos.reduce((acc, p) => acc + (Number(p.valor) || 0), 0).toFixed(2)
  );

  const totalCrediarioRealAcumulado = Number(
    safeClientes.reduce((acc, c) => acc + (Number(c.saldoDevedor) || 0), 0).toFixed(2)
  );
  const totalLimiteDisponivel = Number(
    safeClientes.reduce((acc, c) => acc + Math.max(0, (Number(c.limiteCredito) || 0) - (Number(c.saldoDevedor) || 0)), 0).toFixed(2)
  );

  const insumosBaixos = safeInsumos.filter((i) => i && Number(i.estoqueAtual || 0) <= Number(i.estoqueMinimo || 0));
  const produtosBaixos = safeProdutos.filter((p) => p && Number(p.estoqueAtual || 0) <= Number(p.estoqueMinimo || 0));

  const vendasPorProdutoMap: Record<
    string,
    { nome: string; quantidade: number; faturamento: number; estoqueAtual: number; custoTotal: number }
  > = {};

  for (const prod of safeProdutos) {
    if (!prod) continue;
    vendasPorProdutoMap[prod.id] = {
      nome: prod.nome || 'Produto',
      quantidade: 0,
      faturamento: 0,
      estoqueAtual: Number(prod.estoqueAtual) || 0,
      custoTotal: Number(prod.custoTotal) || 0,
    };
  }

  for (const pedido of pedidosConcluidos) {
    if (pedido.itens && Array.isArray(pedido.itens)) {
      for (const item of pedido.itens) {
        if (!item) continue;
        if (vendasPorProdutoMap[item.produtoId]) {
          vendasPorProdutoMap[item.produtoId].quantidade += Number(item.quantidade) || 0;
          vendasPorProdutoMap[item.produtoId].faturamento += Number(item.subtotal) || 0;
        } else {
          vendasPorProdutoMap[item.produtoId] = {
            nome: item.nomeProduto || 'Produto',
            quantidade: Number(item.quantidade) || 0,
            faturamento: Number(item.subtotal) || 0,
            estoqueAtual: 0,
            custoTotal: Number(item.custoUnitario) || 0,
          };
        }
      }
    }
  }

  const produtosArray = Object.values(vendasPorProdutoMap);

  const maisVendidos = [...produtosArray]
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5)
    .map((p) => ({
      ...p,
      faturamento: Number(p.faturamento.toFixed(2)),
    }));

  const produtosMenorSaida = [...produtosArray]
    .sort((a, b) => a.quantidade - b.quantidade)
    .slice(0, 5)
    .map((p) => ({
      ...p,
      capitalParado: Number(((p.estoqueAtual || 0) * (p.custoTotal || 0)).toFixed(2)),
    }));

  const gastosPorClienteMap: Record<
    string,
    { id: string; nome: string; totalGasto: number; qtdPedidos: number; saldoDevedor: number; limiteCredito: number }
  > = {};

  for (const cli of safeClientes) {
    if (!cli) continue;
    gastosPorClienteMap[cli.id] = {
      id: cli.id,
      nome: cli.nome || 'Cliente',
      totalGasto: 0,
      qtdPedidos: 0,
      saldoDevedor: Number(cli.saldoDevedor) || 0,
      limiteCredito: Number(cli.limiteCredito) || 0,
    };
  }

  for (const ped of pedidosConcluidos) {
    if (ped.clienteId && gastosPorClienteMap[ped.clienteId]) {
      gastosPorClienteMap[ped.clienteId].totalGasto += Number(ped.totalLiquido) || 0;
      gastosPorClienteMap[ped.clienteId].qtdPedidos += 1;
    }
  }

  const top5Clientes = Object.values(gastosPorClienteMap)
    .sort((a, b) => b.totalGasto - a.totalGasto)
    .slice(0, 5)
    .map((c) => ({
      ...c,
      totalGasto: Number(c.totalGasto.toFixed(2)),
      saldoDevedor: Number(c.saldoDevedor.toFixed(2)),
    }));

  const ultimos7Dias: {
    data: string;
    diaSemana: string;
    faturamento: number;
    pedidos: number;
    vendasAVista: number;
    crediarioRecebido: number;
  }[] = [];
  const diasSemanaNomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dataIso = d.toISOString().slice(0, 10);
    const diaFormatado = `${d.getDate()}/${d.getMonth() + 1}`;
    const diaSemana = diasSemanaNomes[d.getDay()];

    const vendasDoDia = pedidosConcluidos.filter((p) => p.dataVenda && p.dataVenda.slice(0, 10) === dataIso);
    const pagamentosDoDia = safePagamentos.filter((p) => p.dataPagamento && p.dataPagamento.slice(0, 10) === dataIso);

    const vendasAVista = vendasDoDia
      .filter((p) => p.formaPagamento !== 'CREDIARIO')
      .reduce((acc, p) => acc + (Number(p.totalLiquido) || 0), 0);
    const crediarioRecebido = pagamentosDoDia.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);

    const totalEntradasDia = Number((vendasAVista + crediarioRecebido).toFixed(2));

    ultimos7Dias.push({
      data: diaFormatado,
      diaSemana,
      faturamento: totalEntradasDia,
      pedidos: vendasDoDia.length,
      vendasAVista: Number(vendasAVista.toFixed(2)),
      crediarioRecebido: Number(crediarioRecebido.toFixed(2)),
    });
  }

  const totalFormas: Record<string, number> = {
    PIX: 0,
    DINHEIRO: 0,
    CARTAO_CREDITO: 0,
    CARTAO_DEBITO: 0,
    CREDIARIO: 0,
  };

  // Vendas faturadas
  for (const ped of pedidosConcluidos) {
    const forma = ped.formaPagamento || 'DINHEIRO';
    if (totalFormas[forma] !== undefined) {
      totalFormas[forma] += Number(ped.totalLiquido) || 0;
    } else {
      totalFormas[forma] = Number(ped.totalLiquido) || 0;
    }
  }

  // Contabiliza recebimentos de crediário nas formas reais em que o cliente pagou
  for (const pag of safePagamentos) {
    const forma = (pag.formaPagamento || 'PIX').toUpperCase();
    const val = Number(pag.valor) || 0;
    if (forma.includes('PIX')) {
      totalFormas['PIX'] = (totalFormas['PIX'] || 0) + val;
    } else if (forma.includes('DINHEIRO')) {
      totalFormas['DINHEIRO'] = (totalFormas['DINHEIRO'] || 0) + val;
    } else if (forma.includes('DEBITO') || forma.includes('DÉBITO')) {
      totalFormas['CARTAO_DEBITO'] = (totalFormas['CARTAO_DEBITO'] || 0) + val;
    } else if (forma.includes('CREDITO') || forma.includes('CRÉDITO') || forma.includes('CARTAO')) {
      totalFormas['CARTAO_CREDITO'] = (totalFormas['CARTAO_CREDITO'] || 0) + val;
    } else {
      totalFormas['PIX'] = (totalFormas['PIX'] || 0) + val;
    }
  }

  const totalEntradasGerais = Object.values(totalFormas).reduce((a, b) => a + b, 0);

  const distribuicaoPagamento = Object.entries(totalFormas).map(([forma, valor]) => ({
    forma,
    valor: Number(valor.toFixed(2)),
    porcentagem: totalEntradasGerais > 0 ? Number(((valor / totalEntradasGerais) * 100).toFixed(1)) : 0,
  }));

  return {
    totalHoje, // Entradas totais reais no caixa hoje (vendas à vista + recebimentos de fiado)
    faturamentoHoje,
    vendasAVistaHoje: Number(vendasAVistaHoje.toFixed(2)),
    totalRecebidoCrediarioHoje,
    totalRecebidoCrediarioGeral,
    quantidadeVendasHoje: vendasHoje.length,
    faturamentoGeral,
    lucroGeral,
    margemGeralPct: faturamentoGeral > 0 ? Number(((lucroGeral / faturamentoGeral) * 100).toFixed(1)) : 0,
    totalCrediarioRealAcumulado,
    totalLimiteDisponivel,
    insumosBaixos,
    produtosBaixos,
    maisVendidos,
    produtosMenorSaida,
    top5Clientes,
    ultimos7Dias,
    distribuicaoPagamento,
    totalClientes: safeClientes.length,
    totalProdutos: safeProdutos.length,
    totalInsumos: safeInsumos.length,
  };
}
