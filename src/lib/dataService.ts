import { Categoria, Insumo, Produto, Cliente, Pedido, ConfiguracaoLoja } from '@/types';
import {
  salvarItemLocal,
  removerItemLocal,
  salvarItensLocais,
  obterItensLocais,
} from './indexedDb';
import { apiFetch } from './api';

/**
 * SERVIÇO DE ARMAZENAMENTO 100% LOCAL (LOCAL-FIRST)
 * - Salva imediatamente no IndexedDB do disco local do navegador
 * - Salva simultaneamente no arquivo data/db.json do disco rígido local
 * - Zero chamadas de nuvem externa
 */

// =================== PRODUTOS ===================
export async function salvarProdutoLocalEOnline(payload: Partial<Produto>): Promise<Produto> {
  const produtoFinal: Produto = {
    id: payload.id || `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    nome: payload.nome || 'Produto sem nome',
    categoriaId: payload.categoriaId || 'cat-geral',
    tipo: payload.tipo || 'REVENDA',
    descricao: payload.descricao || '',
    precoVenda: Number(payload.precoVenda) || 0,
    custoTotal: Number(payload.custoTotal) || 0,
    custoInsumos: Number(payload.custoInsumos) || 0,
    custoUnitarioInsumos: Number(payload.custoUnitarioInsumos) || 0,
    custoEmbalagem: Number(payload.custoEmbalagem) || 0,
    custoMaoDeObra: Number(payload.custoMaoDeObra) || 0,
    custoGasEnergia: Number(payload.custoGasEnergia) || 0,
    rendimentoReceita: Math.max(0.0001, Number(payload.rendimentoReceita) || 1),
    margemLucroPct: Number(payload.margemLucroPct) || 0,
    estoqueAtual: Number(payload.estoqueAtual) || 0,
    estoqueMinimo: Number(payload.estoqueMinimo) || 0,
    fichaTecnica: payload.fichaTecnica || [],
    modoPreparo: payload.modoPreparo || '',
    tempoPreparo: payload.tempoPreparo || '',
    validadeConservacao: payload.validadeConservacao || '',
  };

  // 1. Grava no disco local (IndexedDB)
  await salvarItemLocal('produtos', produtoFinal);

  // 2. Grava no disco local (servidor data/db.json)
  try {
    const res = await apiFetch('/api/produtos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(produtoFinal),
    });

    if (res.ok) {
      const prodServidor = await res.json();
      await salvarItemLocal('produtos', prodServidor);
      return prodServidor;
    }
  } catch (err) {}

  return produtoFinal;
}

export async function produzirLoteLocalEOnline(produtoId: string, quantidadeLotes: number = 1): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await apiFetch('/api/produtos/produzir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produtoId, quantidadeLotes }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Erro ao produzir lote');
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao produzir lote' };
  }
}

export async function removerProdutoLocalEOnline(id: string): Promise<void> {
  await removerItemLocal('produtos', id);

  try {
    await apiFetch(`/api/produtos?id=${id}`, {
      method: 'DELETE',
    });
  } catch {}
}

export const excluirProdutoLocalEOnline = removerProdutoLocalEOnline;

// =================== CATEGORIAS ===================
export async function salvarCategoriaLocalEOnline(payload: Partial<Categoria>): Promise<Categoria> {
  const categoriaFinal: Categoria = {
    id: payload.id || `cat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    nome: payload.nome || 'Nova Categoria',
    icone: payload.icone,
    cor: payload.cor,
  };

  await salvarItemLocal('categorias', categoriaFinal);

  try {
    const res = await apiFetch('/api/categorias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categoriaFinal),
    });

    if (res.ok) {
      const catServidor = await res.json();
      await salvarItemLocal('categorias', catServidor);
      return catServidor;
    }
  } catch {}

  return categoriaFinal;
}

export async function removerCategoriaLocalEOnline(id: string, cascade: boolean = false): Promise<void> {
  await removerItemLocal('categorias', id);

  try {
    await apiFetch(`/api/categorias?id=${id}${cascade ? '&cascade=true' : ''}`, {
      method: 'DELETE',
    });
  } catch {}
}

export const excluirCategoriaLocalEOnline = removerCategoriaLocalEOnline;

// =================== INSUMOS ===================
export async function salvarInsumoLocalEOnline(payload: Partial<Insumo>): Promise<Insumo> {
  const insumoFinal: Insumo = {
    id: payload.id || `ins-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    nome: payload.nome || 'Insumo',
    unidade: payload.unidade || 'un',
    custoUnitario: Number(payload.custoUnitario) || 0,
    estoqueAtual: Number(payload.estoqueAtual) || 0,
    estoqueMinimo: Number(payload.estoqueMinimo) || 0,
    fornecedor: payload.fornecedor,
  };

  await salvarItemLocal('insumos', insumoFinal);

  try {
    const res = await apiFetch('/api/insumos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(insumoFinal),
    });

    if (res.ok) {
      const insServidor = await res.json();
      await salvarItemLocal('insumos', insServidor);
      return insServidor;
    }
  } catch {}

  return insumoFinal;
}

export async function removerInsumoLocalEOnline(id: string): Promise<void> {
  await removerItemLocal('insumos', id);

  try {
    await apiFetch(`/api/insumos?id=${id}`, {
      method: 'DELETE',
    });
  } catch {}
}

export const excluirInsumoLocalEOnline = removerInsumoLocalEOnline;

// =================== CLIENTES ===================
export async function salvarClienteLocalEOnline(payload: Partial<Cliente>): Promise<Cliente> {
  const clienteFinal: Cliente = {
    id: payload.id || `cli-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    nome: payload.nome || 'Cliente',
    telefone: payload.telefone || '',
    cpf: payload.cpf || '',
    endereco: payload.endereco,
    limiteCredito: Number(payload.limiteCredito) || 0,
    saldoDevedor: Number(payload.saldoDevedor) || 0,
    criadoEm: payload.criadoEm || new Date().toISOString(),
  };

  await salvarItemLocal('clientes', clienteFinal);

  try {
    const res = await apiFetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clienteFinal),
    });

    if (res.ok) {
      const cliServidor = await res.json();
      await salvarItemLocal('clientes', cliServidor);
      return cliServidor;
    }
  } catch {}

  return clienteFinal;
}

export async function removerClienteLocalEOnline(id: string): Promise<void> {
  await removerItemLocal('clientes', id);

  try {
    await apiFetch(`/api/clientes?id=${id}`, {
      method: 'DELETE',
    });
  } catch {}
}

export const excluirClienteLocalEOnline = removerClienteLocalEOnline;

// =================== CREDIÁRIO / AMORTIZAÇÃO ===================
export async function amortizarCrediarioLocalEOnline(body: {
  clienteId: string;
  valor: number;
  formaPagamento: string;
  observacoes?: string;
  observacao?: string;
}): Promise<void> {
  try {
    const clientesLocais = await obterItensLocais<Cliente>('clientes');
    const cli = clientesLocais.find((c) => c.id === body.clienteId);
    if (cli) {
      cli.saldoDevedor = Math.max(0, Number(((Number(cli.saldoDevedor) || 0) - Number(body.valor)).toFixed(2)));
      await salvarItemLocal('clientes', cli);
    }
  } catch (err) {
    console.warn('Erro ao atualizar saldo do cliente localmente:', err);
  }

  try {
    await apiFetch('/api/crediario/amortizar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {}
}

export const salvarAmortizacaoLocalEOnline = amortizarCrediarioLocalEOnline;

// =================== PEDIDOS / VENDAS / ENCOMENDAS ===================
export async function salvarPedidoLocalEOnline(body: any): Promise<Pedido> {
  const agora = new Date().toISOString();
  const pedidoFinal: Pedido = {
    id: body.id || `ped-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    codigo: body.codigo || Math.floor(100 + Math.random() * 900),
    dataVenda: body.dataVenda || agora,
    status: body.status || 'CONCLUIDO',
    clienteId: body.clienteId,
    nomeClienteAvulso: body.nomeClienteAvulso,
    itens: body.itens || [],
    totalBruto: Number(body.totalBruto) || 0,
    desconto: Number(body.desconto) || 0,
    totalLiquido: Number(body.totalLiquido) || 0,
    custoTotal: Number(body.custoTotal) || 0,
    lucroTotal: Number(body.lucroTotal) || 0,
    formaPagamento: body.formaPagamento || 'DINHEIRO',
    observacoes: body.observacoes || '',
    telefoneClienteAvulso: body.telefoneClienteAvulso || '',
    isEncomenda: !!body.isEncomenda,
    dataEntrega: body.dataEntrega || '',
    horaEntrega: body.horaEntrega || '',
    tipoEntrega: body.tipoEntrega || 'RETIRADA',
    enderecoEntrega: body.enderecoEntrega || '',
    observacoesEntrega: body.observacoesEntrega || '',
    statusProducao: body.statusProducao || (body.isEncomenda ? 'A_FAZER' : undefined),
  };

  // 1. Atualiza estoque no banco do celular
  try {
    const produtosLocais = await obterItensLocais<Produto>('produtos');
    for (const item of pedidoFinal.itens) {
      const prod = produtosLocais.find((p) => p.id === item.produtoId);
      if (prod) {
        prod.estoqueAtual = Math.max(0, (Number(prod.estoqueAtual) || 0) - item.quantidade);
        await salvarItemLocal('produtos', prod);
      }
    }
  } catch (err) {
    console.warn('Erro ao atualizar estoque local:', err);
  }

  // 2. Se for crediário, atualiza saldo devedor do cliente localmente
  if (pedidoFinal.formaPagamento === 'CREDIARIO' && pedidoFinal.clienteId) {
    try {
      const clientesLocais = await obterItensLocais<Cliente>('clientes');
      const cli = clientesLocais.find((c) => c.id === pedidoFinal.clienteId);
      if (cli) {
        cli.saldoDevedor = Number(((Number(cli.saldoDevedor) || 0) + pedidoFinal.totalLiquido).toFixed(2));
        await salvarItemLocal('clientes', cli);
      }
    } catch {}
  }

  // 3. Grava no banco do celular na hora
  await salvarItemLocal('pedidos', pedidoFinal);

  // 4. Grava no disco rígido local do servidor
  try {
    const res = await apiFetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, id: pedidoFinal.id, codigo: pedidoFinal.codigo, dataVenda: pedidoFinal.dataVenda }),
    });

    if (res.ok) {
      const pedServidor = await res.json();
      await salvarItemLocal('pedidos', pedServidor);
      return pedServidor;
    }
  } catch {}

  return pedidoFinal;
}

export async function atualizarStatusProducaoLocalEOnline(
  pedidoId: string,
  statusProducao: 'A_FAZER' | 'EM_PRODUCAO' | 'PRONTO' | 'ENTREGUE'
): Promise<void> {
  try {
    const pedidosLocais = await obterItensLocais<Pedido>('pedidos');
    const p = pedidosLocais.find((item) => item.id === pedidoId);
    if (p) {
      p.statusProducao = statusProducao;
      await salvarItemLocal('pedidos', p);
    }
  } catch (err) {
    console.warn('Erro ao atualizar status do pedido no IndexedDB:', err);
  }

  try {
    await apiFetch(`/api/pedidos/${pedidoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statusProducao }),
    });
  } catch {}
}

export async function cancelarPedidoLocalEOnline(id: string): Promise<void> {
  await removerItemLocal('pedidos', id);

  try {
    await apiFetch(`/api/pedidos/${id}`, {
      method: 'DELETE',
    });
  } catch {}
}

// =================== CONFIGURAÇÕES DA LOJA ===================
export async function salvarConfigLocalEOnline(config: ConfiguracaoLoja): Promise<ConfiguracaoLoja> {
  await salvarItemLocal('configuracoes', { id: 'loja-config', ...config });

  try {
    const res = await apiFetch('/api/configuracoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });

    if (res.ok) {
      const cfgServidor = await res.json();
      await salvarItemLocal('configuracoes', { id: 'loja-config', ...cfgServidor });
      return cfgServidor;
    }
  } catch {}

  return config;
}
