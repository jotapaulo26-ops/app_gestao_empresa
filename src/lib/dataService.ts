import { Categoria, Insumo, Produto, Cliente, Pedido, ConfiguracaoLoja } from '@/types';
import {
  salvarItemLocal,
  removerItemLocal,
  salvarItensLocais,
  obterItensLocais,
  enfileirarSincronizacao,
} from './indexedDb';
import { syncService } from './syncService';
import { apiFetch } from './api';

/**
 * SERVIÇO UNIFICADO LOCAL-FIRST RESILIENTE
 * - Grava imediatamente no IndexedDB do celular (latência zero e proteção offline)
 * - Se estiver online, envia imediatamente ao servidor para sincronização em tempo real
 * - Se estiver offline ou a conexão oscilar, enfileira de forma segura sem loop
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

  // 1. Grava no IndexedDB imediatamente
  await salvarItemLocal('produtos', produtoFinal);

  // 2. Se online, envia diretamente ao servidor
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  let synced = false;

  if (isOnline) {
    try {
      const res = await apiFetch('/api/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(produtoFinal),
      });

      if (res.ok) {
        const prodServidor = await res.json();
        await salvarItemLocal('produtos', prodServidor);
        synced = true;
      }
    } catch (err) {
      console.warn('Conexão instável ao salvar produto online, enfileirando:', err);
    }
  }

  // 3. Se offline ou falhou a rede, enfileira
  if (!synced) {
    await enfileirarSincronizacao({
      endpoint: '/api/produtos',
      method: 'POST',
      body: produtoFinal,
    });
    syncService.atualizarContadorPendentes();
  }

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
    return { success: false, error: err.message || 'Erro de conexão' };
  }
}

export async function removerProdutoLocalEOnline(id: string): Promise<void> {
  await removerItemLocal('produtos', id);

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  let synced = false;

  if (isOnline) {
    try {
      const res = await apiFetch(`/api/produtos?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok || res.status === 404) synced = true;
    } catch {}
  }

  if (!synced) {
    await enfileirarSincronizacao({
      endpoint: `/api/produtos?id=${id}`,
      method: 'DELETE',
    });
    syncService.atualizarContadorPendentes();
  }
}

// =================== CATEGORIAS ===================
export async function salvarCategoriaLocalEOnline(payload: Partial<Categoria>): Promise<Categoria> {
  const categoriaFinal: Categoria = {
    id: payload.id || `cat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    nome: payload.nome || 'Nova Categoria',
  };

  await salvarItemLocal('categorias', categoriaFinal);

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  let synced = false;

  if (isOnline) {
    try {
      const res = await apiFetch('/api/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoriaFinal),
      });

      if (res.ok) {
        const catServidor = await res.json();
        await salvarItemLocal('categorias', catServidor);
        synced = true;
      }
    } catch (err) {
      console.warn('Conexão instável ao salvar categoria online, enfileirando:', err);
    }
  }

  if (!synced) {
    await enfileirarSincronizacao({
      endpoint: '/api/categorias',
      method: 'POST',
      body: categoriaFinal,
    });
    syncService.atualizarContadorPendentes();
  }

  return categoriaFinal;
}

export async function removerCategoriaLocalEOnline(id: string, cascade: boolean = false): Promise<void> {
  await removerItemLocal('categorias', id);

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  let synced = false;

  if (isOnline) {
    try {
      const res = await apiFetch(`/api/categorias?id=${id}${cascade ? '&cascade=true' : ''}`, {
        method: 'DELETE',
      });
      if (res.ok || res.status === 404) synced = true;
    } catch {}
  }

  if (!synced) {
    await enfileirarSincronizacao({
      endpoint: `/api/categorias?id=${id}${cascade ? '&cascade=true' : ''}`,
      method: 'DELETE',
    });
    syncService.atualizarContadorPendentes();
  }
}

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

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  let synced = false;

  if (isOnline) {
    try {
      const res = await apiFetch('/api/insumos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(insumoFinal),
      });

      if (res.ok) {
        const insServidor = await res.json();
        await salvarItemLocal('insumos', insServidor);
        synced = true;
      }
    } catch (err) {
      console.warn('Conexão instável ao salvar insumo online, enfileirando:', err);
    }
  }

  if (!synced) {
    await enfileirarSincronizacao({
      endpoint: '/api/insumos',
      method: 'POST',
      body: insumoFinal,
    });
    syncService.atualizarContadorPendentes();
  }

  return insumoFinal;
}

export async function removerInsumoLocalEOnline(id: string): Promise<void> {
  await removerItemLocal('insumos', id);

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  let synced = false;

  if (isOnline) {
    try {
      const res = await apiFetch(`/api/insumos?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok || res.status === 404) synced = true;
    } catch {}
  }

  if (!synced) {
    await enfileirarSincronizacao({
      endpoint: `/api/insumos?id=${id}`,
      method: 'DELETE',
    });
    syncService.atualizarContadorPendentes();
  }
}

// =================== CLIENTES & CREDIÁRIO ===================
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

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  let synced = false;

  if (isOnline) {
    try {
      const res = await apiFetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clienteFinal),
      });

      if (res.ok) {
        const cliServidor = await res.json();
        await salvarItemLocal('clientes', cliServidor);
        synced = true;
      }
    } catch (err) {
      console.warn('Conexão instável ao salvar cliente online, enfileirando:', err);
    }
  }

  if (!synced) {
    await enfileirarSincronizacao({
      endpoint: '/api/clientes',
      method: 'POST',
      body: clienteFinal,
    });
    syncService.atualizarContadorPendentes();
  }

  return clienteFinal;
}

export async function removerClienteLocalEOnline(id: string): Promise<void> {
  await removerItemLocal('clientes', id);

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  let synced = false;

  if (isOnline) {
    try {
      const res = await apiFetch(`/api/clientes?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok || res.status === 404) synced = true;
    } catch {}
  }

  if (!synced) {
    await enfileirarSincronizacao({
      endpoint: `/api/clientes?id=${id}`,
      method: 'DELETE',
    });
    syncService.atualizarContadorPendentes();
  }
}

export async function amortizarCrediarioLocalEOnline(body: {
  clienteId: string;
  valor: number;
  formaPagamento: string;
  observacao?: string;
}): Promise<void> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  let synced = false;

  if (isOnline) {
    try {
      const res = await apiFetch('/api/crediario/amortizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) synced = true;
    } catch {}
  }

  if (!synced) {
    await enfileirarSincronizacao({
      endpoint: '/api/crediario/amortizar',
      method: 'POST',
      body,
    });
    syncService.atualizarContadorPendentes();
  }
}

// =================== PEDIDOS (VENDAS NO PDV) ===================
export async function salvarPedidoLocalEOnline(body: any): Promise<Pedido> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  // 1. Envio Direto Online (quando conectado)
  if (isOnline) {
    try {
      const res = await apiFetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const pedidoCriado: Pedido = await res.json();
        await salvarItemLocal('pedidos', pedidoCriado);

        // Se for crediário, atualiza o saldo do cliente no armazenamento local imediatamente
        if (pedidoCriado.formaPagamento === 'CREDIARIO' && pedidoCriado.clienteId) {
          try {
            const clientesLocais = await obterItensLocais<Cliente>('clientes');
            const cli = clientesLocais.find((c) => c.id === pedidoCriado.clienteId);
            if (cli) {
              cli.saldoDevedor = Number(((Number(cli.saldoDevedor) || 0) + pedidoCriado.totalLiquido).toFixed(2));
              await salvarItemLocal('clientes', cli);
            }
          } catch {}
        }

        return pedidoCriado;
      }
    } catch (netErr) {
      console.warn('Conexão instável, usando salvamento offline:', netErr);
    }
  }

  // 2. Modo Offline / Fallback de Rede
  const pedidoFinal: Pedido = {
    id: body.id || `ped-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    codigo: Math.floor(100 + Math.random() * 900),
    dataVenda: new Date().toISOString(),
    status: 'CONCLUIDO',
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

  // Atualiza saldo do cliente localmente
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

  // Grava no banco do celular na hora
  await salvarItemLocal('pedidos', pedidoFinal);

  // Enfileira para envio à nuvem com o MESMO ID para garantir idempotência
  await enfileirarSincronizacao({
    endpoint: '/api/pedidos',
    method: 'POST',
    body: { ...body, id: pedidoFinal.id, codigo: pedidoFinal.codigo, dataVenda: pedidoFinal.dataVenda },
  });

  syncService.atualizarContadorPendentes();

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

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  let synced = false;

  if (isOnline) {
    try {
      const res = await apiFetch(`/api/pedidos/${pedidoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusProducao }),
      });
      if (res.ok) synced = true;
    } catch {}
  }

  if (!synced) {
    await enfileirarSincronizacao({
      endpoint: `/api/pedidos/${pedidoId}`,
      method: 'PATCH',
      body: { statusProducao },
    });
    syncService.atualizarContadorPendentes();
  }
}

export async function cancelarPedidoLocalEOnline(id: string): Promise<void> {
  await removerItemLocal('pedidos', id);

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  let synced = false;

  if (isOnline) {
    try {
      const res = await apiFetch(`/api/pedidos/${id}`, {
        method: 'DELETE',
      });
      if (res.ok || res.status === 404) synced = true;
    } catch {}
  }

  if (!synced) {
    await enfileirarSincronizacao({
      endpoint: `/api/pedidos/${id}`,
      method: 'DELETE',
    });
    syncService.atualizarContadorPendentes();
  }
}

// =================== CONFIGURAÇÕES DA LOJA ===================
export async function salvarConfigLocalEOnline(config: ConfiguracaoLoja): Promise<ConfiguracaoLoja> {
  await salvarItemLocal('configuracoes', { id: 'loja-config', ...config });

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  let synced = false;

  if (isOnline) {
    try {
      const res = await apiFetch('/api/configuracoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) synced = true;
    } catch {}
  }

  if (!synced) {
    await enfileirarSincronizacao({
      endpoint: '/api/configuracoes',
      method: 'POST',
      body: config,
    });
    syncService.atualizarContadorPendentes();
  }

  return config;
}
