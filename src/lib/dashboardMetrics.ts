import { Pedido, Produto, Cliente, Insumo } from '@/types';

export function calcularDashboardMetrics(
  pedidos: Pedido[] = [],
  produtos: Produto[] = [],
  clientes: Cliente[] = [],
  insumos: Insumo[] = []
) {
  const safePedidos = Array.isArray(pedidos) ? pedidos : [];
  const safeProdutos = Array.isArray(produtos) ? produtos : [];
  const safeClientes = Array.isArray(clientes) ? clientes : [];
  const safeInsumos = Array.isArray(insumos) ? insumos : [];

  const pedidosConcluidos = safePedidos.filter((p) => p && p.status === 'CONCLUIDO');

  const hoje = new Date().toISOString().slice(0, 10);
  const vendasHoje = pedidosConcluidos.filter((p) => p.dataVenda && p.dataVenda.slice(0, 10) === hoje);

  const totalHoje = Number(vendasHoje.reduce((acc, p) => acc + (Number(p.totalLiquido) || 0), 0).toFixed(2));
  const faturamentoGeral = Number(pedidosConcluidos.reduce((acc, p) => acc + (Number(p.totalLiquido) || 0), 0).toFixed(2));
  const lucroGeral = Number(pedidosConcluidos.reduce((acc, p) => acc + (Number(p.lucroTotal) || 0), 0).toFixed(2));

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

  const ultimos7Dias: { data: string; diaSemana: string; faturamento: number; pedidos: number }[] = [];
  const diasSemanaNomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dataIso = d.toISOString().slice(0, 10);
    const diaFormatado = `${d.getDate()}/${d.getMonth() + 1}`;
    const diaSemana = diasSemanaNomes[d.getDay()];

    const vendasDoDia = pedidosConcluidos.filter((p) => p.dataVenda && p.dataVenda.slice(0, 10) === dataIso);
    const fatDoDia = vendasDoDia.reduce((acc, p) => acc + (Number(p.totalLiquido) || 0), 0);

    ultimos7Dias.push({
      data: diaFormatado,
      diaSemana,
      faturamento: Number(fatDoDia.toFixed(2)),
      pedidos: vendasDoDia.length,
    });
  }

  const totalFormas: Record<string, number> = {
    PIX: 0,
    DINHEIRO: 0,
    CARTAO_CREDITO: 0,
    CARTAO_DEBITO: 0,
    CREDIARIO: 0,
  };

  for (const ped of pedidosConcluidos) {
    const forma = ped.formaPagamento || 'DINHEIRO';
    if (totalFormas[forma] !== undefined) {
      totalFormas[forma] += Number(ped.totalLiquido) || 0;
    } else {
      totalFormas[forma] = Number(ped.totalLiquido) || 0;
    }
  }

  const distribuicaoPagamento = Object.entries(totalFormas).map(([forma, valor]) => ({
    forma,
    valor: Number(valor.toFixed(2)),
    porcentagem: faturamentoGeral > 0 ? Number(((valor / faturamentoGeral) * 100).toFixed(1)) : 0,
  }));

  return {
    totalHoje,
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
