import { Categoria, Insumo, Produto, Cliente, Pedido, ConfiguracaoLoja } from '@/types';
import {
  salvarItemLocal,
  removerItemLocal,
  salvarItensLocais,
  enfileirarSincronizacao,
} from './indexedDb';
import { syncService } from './syncService';
import { apiFetch } from './api';

/**
 * SERVIÇO UNIFICADO LOCAL-FIRST
 * Grava imediatamente no IndexedDB do celular (latência zero)
 * e agenda a sincronização com a nuvem de forma resiliente.
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
    custoEmbalagem: Number(payload.custoEmbalagem) || 0,
    custoMaoDeObra: Number(payload.custoMaoDeObra) || 0,
    margemLucroPct: Number(payload.margemLucroPct) || 0,
    estoqueAtual: Number(payload.estoqueAtual) || 0,
    estoqueMinimo: Number(payload.estoqueMinimo) || 0,
    fichaTecnica: payload.fichaTecnica || [],
  };

  // 1. Grava no IndexedDB imediatamente
  await salvarItemLocal('produtos', produtoFinal);

  // 2. Enfileira sincronização para a nuvem
  await enfileirarSincronizacao({
    endpoint: '/api/produtos',
    method: 'POST',
    body: produtoFinal,
  });

  // 3. Dispara sincronização em segundo plano
  syncService.processarFila();

  return produtoFinal;
}

export async function removerProdutoLocalEOnline(id: string): Promise<void> {
  await removerItemLocal('produtos', id);
  await enfileirarSincronizacao({
    endpoint: `/api/produtos?id=${id}`,
    method: 'DELETE',
  });
  syncService.processarFila();
}

// =================== CATEGORIAS ===================
export async function salvarCategoriaLocalEOnline(payload: Partial<Categoria>): Promise<Categoria> {
  const categoriaFinal: Categoria = {
    id: payload.id || `cat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    nome: payload.nome || 'Nova Categoria',
  };

  await salvarItemLocal('categorias', categoriaFinal);
  await enfileirarSincronizacao({
    endpoint: '/api/categorias',
    method: 'POST',
    body: categoriaFinal,
  });
  syncService.processarFila();

  return categoriaFinal;
}

export async function removerCategoriaLocalEOnline(id: string, cascade: boolean = false): Promise<void> {
  await removerItemLocal('categorias', id);
  await enfileirarSincronizacao({
    endpoint: `/api/categorias?id=${id}${cascade ? '&cascade=true' : ''}`,
    method: 'DELETE',
  });
  syncService.processarFila();
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
  await enfileirarSincronizacao({
    endpoint: '/api/insumos',
    method: 'POST',
    body: insumoFinal,
  });
  syncService.processarFila();

  return insumoFinal;
}

export async function removerInsumoLocalEOnline(id: string): Promise<void> {
  await removerItemLocal('insumos', id);
  await enfileirarSincronizacao({
    endpoint: `/api/insumos?id=${id}`,
    method: 'DELETE',
  });
  syncService.processarFila();
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
  await enfileirarSincronizacao({
    endpoint: '/api/clientes',
    method: 'POST',
    body: clienteFinal,
  });
  syncService.processarFila();

  return clienteFinal;
}

export async function removerClienteLocalEOnline(id: string): Promise<void> {
  await removerItemLocal('clientes', id);
  await enfileirarSincronizacao({
    endpoint: `/api/clientes?id=${id}`,
    method: 'DELETE',
  });
  syncService.processarFila();
}

export async function amortizarCrediarioLocalEOnline(body: {
  clienteId: string;
  valor: number;
  formaPagamento: string;
  observacao?: string;
}): Promise<void> {
  await enfileirarSincronizacao({
    endpoint: '/api/crediario/amortizar',
    method: 'POST',
    body,
  });
  syncService.processarFila();
}

// =================== PEDIDOS (VENDAS NO PDV) ===================
export async function salvarPedidoLocalEOnline(body: any): Promise<Pedido> {
  const pedidoFinal: Pedido = {
    id: `ped-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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
  };

  // 1. Grava no banco do celular na hora
  await salvarItemLocal('pedidos', pedidoFinal);

  // 2. Enfileira para envio à nuvem
  await enfileirarSincronizacao({
    endpoint: '/api/pedidos',
    method: 'POST',
    body,
  });

  // 3. Dispara background sync
  syncService.processarFila();

  return pedidoFinal;
}

export async function cancelarPedidoLocalEOnline(id: string): Promise<void> {
  await removerItemLocal('pedidos', id);
  await enfileirarSincronizacao({
    endpoint: `/api/pedidos/${id}`,
    method: 'DELETE',
  });
  syncService.processarFila();
}

// =================== CONFIGURAÇÕES DA LOJA ===================
export async function salvarConfigLocalEOnline(config: ConfiguracaoLoja): Promise<ConfiguracaoLoja> {
  await salvarItemLocal('configuracoes', { id: 'loja-config', ...config });
  await enfileirarSincronizacao({
    endpoint: '/api/configuracoes',
    method: 'POST',
    body: config,
  });
  syncService.processarFila();

  return config;
}
