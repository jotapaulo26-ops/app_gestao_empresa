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

  // 1. Grava no disco local do aparelho (IndexedDB)
  await salvarItemLocal('produtos', produtoFinal);

  // 2. Tenta gravar em background no servidor data/db.json apenas se houver rede, sem bloquear ou aguardar
  if (typeof window !== 'undefined' && navigator.onLine) {
    try {
      apiFetch('/api/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(produtoFinal),
      }).catch(() => {});
    } catch {}
  }

  return produtoFinal;
}

export async function produzirLoteLocalEOnline(produtoId: string, quantidadeLotes: number = 1): Promise<{ success: boolean; error?: string }> {
  try {
    const produtosLocais = await obterItensLocais<Produto>('produtos');
    const insumosLocais = await obterItensLocais<Insumo>('insumos');

    const prod = produtosLocais.find((p) => p.id === produtoId);
    if (!prod) {
      return { success: false, error: 'Produto não encontrado no aparelho.' };
    }

    if (prod.tipo !== 'FABRICADO' || !prod.fichaTecnica || prod.fichaTecnica.length === 0) {
      return { success: false, error: 'Apenas produtos com ficha técnica podem ter fornadas produzidas.' };
    }

    const numLotes = Math.max(0.0001, Number(quantidadeLotes) || 1);
    const rendimento = Math.max(0.0001, Number(prod.rendimentoReceita) || 1);

    // Validação de estoque dos insumos
    for (const ft of prod.fichaTecnica) {
      const insumo = insumosLocais.find((i) => i.id === ft.insumoId);
      if (insumo) {
        let fator = ft.fatorConversao ?? 1;
        if (!ft.fatorConversao && ft.unidadeUso) {
          if (insumo.unidade === 'kg' && ft.unidadeUso === 'g') fator = 0.001;
          else if (insumo.unidade === 'g' && ft.unidadeUso === 'kg') fator = 1000;
          else if (insumo.unidade === 'l' && ft.unidadeUso === 'ml') fator = 0.001;
          else if (insumo.unidade === 'ml' && ft.unidadeUso === 'l') fator = 1000;
        }
        const necessario = (ft.quantidade * fator) * numLotes;
        if (Number(insumo.estoqueAtual || 0) < necessario) {
          return {
            success: false,
            error: `Estoque insuficiente de "${insumo.nome}". Necessário: ${necessario} ${insumo.unidade}, disponível: ${insumo.estoqueAtual} ${insumo.unidade}.`,
          };
        }
      }
    }

    // Baixa de estoque nos insumos
    for (const ft of prod.fichaTecnica) {
      const insumo = insumosLocais.find((i) => i.id === ft.insumoId);
      if (insumo) {
        let fator = ft.fatorConversao ?? 1;
        if (!ft.fatorConversao && ft.unidadeUso) {
          if (insumo.unidade === 'kg' && ft.unidadeUso === 'g') fator = 0.001;
          else if (insumo.unidade === 'g' && ft.unidadeUso === 'kg') fator = 1000;
          else if (insumo.unidade === 'l' && ft.unidadeUso === 'ml') fator = 0.001;
          else if (insumo.unidade === 'ml' && ft.unidadeUso === 'l') fator = 1000;
        }
        const consumo = (ft.quantidade * fator) * numLotes;
        insumo.estoqueAtual = Number(Math.max(0, (Number(insumo.estoqueAtual) || 0) - consumo).toFixed(3));
        await salvarItemLocal('insumos', insumo);
      }
    }

    // Adiciona ao estoque do produto fabricado
    const totalUnidades = rendimento * numLotes;
    prod.estoqueAtual = Number(((Number(prod.estoqueAtual) || 0) + totalUnidades).toFixed(2));
    await salvarItemLocal('produtos', prod);

    // Opcional: replica ao servidor se online
    if (typeof window !== 'undefined' && navigator.onLine) {
      apiFetch('/api/produtos/produzir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produtoId, quantidadeLotes }),
      }).catch(() => {});
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao produzir lote' };
  }
}

export async function removerProdutoLocalEOnline(id: string): Promise<void> {
  await removerItemLocal('produtos', id);

  if (typeof window !== 'undefined' && navigator.onLine) {
    try {
      apiFetch(`/api/produtos?id=${id}`, { method: 'DELETE' }).catch(() => {});
    } catch {}
  }
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

  if (typeof window !== 'undefined' && navigator.onLine) {
    try {
      apiFetch('/api/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoriaFinal),
      }).catch(() => {});
    } catch {}
  }

  return categoriaFinal;
}

export async function removerCategoriaLocalEOnline(id: string, cascade: boolean = false): Promise<void> {
  await removerItemLocal('categorias', id);

  if (typeof window !== 'undefined' && navigator.onLine) {
    try {
      apiFetch(`/api/categorias?id=${id}${cascade ? '&cascade=true' : ''}`, {
        method: 'DELETE',
      }).catch(() => {});
    } catch {}
  }
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

  if (typeof window !== 'undefined' && navigator.onLine) {
    try {
      apiFetch('/api/insumos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(insumoFinal),
      }).catch(() => {});
    } catch {}
  }

  return insumoFinal;
}

export async function removerInsumoLocalEOnline(id: string): Promise<void> {
  await removerItemLocal('insumos', id);

  if (typeof window !== 'undefined' && navigator.onLine) {
    try {
      apiFetch(`/api/insumos?id=${id}`, {
        method: 'DELETE',
      }).catch(() => {});
    } catch {}
  }
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

  if (typeof window !== 'undefined' && navigator.onLine) {
    try {
      apiFetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clienteFinal),
      }).catch(() => {});
    } catch {}
  }

  return clienteFinal;
}

export async function removerClienteLocalEOnline(id: string): Promise<void> {
  await removerItemLocal('clientes', id);

  if (typeof window !== 'undefined' && navigator.onLine) {
    try {
      apiFetch(`/api/clientes?id=${id}`, {
        method: 'DELETE',
      }).catch(() => {});
    } catch {}
  }
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

  if (typeof window !== 'undefined' && navigator.onLine) {
    try {
      apiFetch('/api/crediario/amortizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(() => {});
    } catch {}
  }
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

  // 4. Se houver conexão, replica no servidor em background sem travar a interface
  if (typeof window !== 'undefined' && navigator.onLine) {
    try {
      apiFetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, id: pedidoFinal.id, codigo: pedidoFinal.codigo, dataVenda: pedidoFinal.dataVenda }),
      }).catch(() => {});
    } catch {}
  }

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

  if (typeof window !== 'undefined' && navigator.onLine) {
    try {
      apiFetch(`/api/pedidos/${pedidoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusProducao }),
      }).catch(() => {});
    } catch {}
  }
}

export async function cancelarPedidoLocalEOnline(id: string): Promise<void> {
  await removerItemLocal('pedidos', id);

  if (typeof window !== 'undefined' && navigator.onLine) {
    try {
      apiFetch(`/api/pedidos/${id}`, {
        method: 'DELETE',
      }).catch(() => {});
    } catch {}
  }
}

// =================== CONFIGURAÇÕES DA LOJA ===================
export async function salvarConfigLocalEOnline(config: ConfiguracaoLoja): Promise<ConfiguracaoLoja> {
  // 1. Salva imediatamente no localStorage (0ms)
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('erp_loja_config', JSON.stringify(config));
    } catch {}
  }

  // 2. Salva no IndexedDB do navegador
  await salvarItemLocal('configuracoes', { id: 'loja-config', ...config });

  // 3. Se houver conexão, replica no servidor
  if (typeof window !== 'undefined' && navigator.onLine) {
    try {
      apiFetch('/api/configuracoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
        body: JSON.stringify(config),
      }).catch(() => {});
    } catch {}
  }

  return config;
}
