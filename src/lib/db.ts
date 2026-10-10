import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import {
  DatabaseSchema,
  DadosLoja,
  Usuario,
  SessaoUsuario,
  Categoria,
  Insumo,
  Produto,
  Cliente,
  Pedido,
  PagamentoCrediario,
  ConfiguracaoLoja,
} from '@/types';

// Em ambientes serverless (Vercel / AWS Lambda), o diretório /var/task é Read-Only.
// Usamos o diretório temporário do SO (os.tmpdir() -> /tmp) e cache em memória seguro.
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isServerless ? os.tmpdir() : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const INITIAL_SCHEMA: DatabaseSchema = {
  usuarios: [],
  sessoes: [],
  lojas: {},
};

let memoryDb: DatabaseSchema | null = null;

function ensureDb(): DatabaseSchema {
  if (memoryDb) {
    return memoryDb;
  }

  try {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch {}
    }

    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.lojas && Array.isArray(parsed.usuarios)) {
        memoryDb = parsed;
        return parsed;
      }
    }

    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_SCHEMA, null, 2), 'utf-8');
    } catch {}

    memoryDb = JSON.parse(JSON.stringify(INITIAL_SCHEMA));
    return memoryDb!;
  } catch {
    memoryDb = JSON.parse(JSON.stringify(INITIAL_SCHEMA));
    return memoryDb!;
  }
}

function saveDb(data: DatabaseSchema): void {
  memoryDb = data;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    // Se o sistema de arquivos bloquear, o memoryDb garante a persistência em tempo de execução
    console.warn('Ambiente com escrita protegida. Dados preservados na memória do servidor:', err);
  }
}

// =================== RESOLUÇÃO E GESTÃO DE LOJAS ===================

export function getLoja(lojaId?: string): DadosLoja {
  const db = ensureDb();

  // Se lojaId for fornecido e existir
  if (lojaId && db.lojas[lojaId]) {
    return db.lojas[lojaId];
  }

  // Fallback: primeira loja existente
  const firstId = Object.keys(db.lojas)[0];
  if (firstId && db.lojas[firstId]) {
    return db.lojas[firstId];
  }

  // Caso extremo: nenhuma loja ainda criada
  const fallbackId = 'loja-padrao';
  const novaLoja: DadosLoja = {
    id: fallbackId,
    nomeLoja: 'Minha Loja',
    criadoEm: new Date().toISOString(),
    categorias: [{ id: 'cat-geral', nome: 'Geral' }],
    insumos: [],
    produtos: [],
    clientes: [],
    pedidos: [],
    pagamentosCrediario: [],
    configuracaoLoja: {
      nomeLoja: 'Minha Loja',
      chavePix: '',
      tipoChavePix: 'CELULAR',
      titularPix: 'Proprietário',
      cidadePix: 'SAO PAULO',
      mensagemRodape: 'Agradecemos a sua preferência! Volte sempre.',
    },
  };
  db.lojas[fallbackId] = novaLoja;
  saveDb(db);
  return novaLoja;
}

// =================== AUTENTICAÇÃO E SESSÕES ===================

export function getLojaIdByToken(token: string): string | null {
  const db = ensureDb();
  const sessao = db.sessoes.find((s) => s.token === token);
  return sessao ? sessao.lojaId : null;
}

export function getUsuarioByToken(token: string): { usuario: Usuario; loja: DadosLoja } | null {
  const db = ensureDb();
  const sessao = db.sessoes.find((s) => s.token === token);
  if (!sessao) return null;

  const usuario = db.usuarios.find((u) => u.id === sessao.usuarioId);
  if (!usuario) return null;

  const loja = db.lojas[usuario.lojaId];
  if (!loja) return null;

  return { usuario, loja };
}

export function cadastrarUsuario(params: {
  nome: string;
  nomeLoja: string;
  email: string;
  senhaHash: string;
}): { success: boolean; usuario?: Usuario; token?: string; loja?: DadosLoja; error?: string } {
  const db = ensureDb();
  const emailNorm = params.email.trim().toLowerCase();

  const jaExiste = db.usuarios.some((u) => u.email.toLowerCase() === emailNorm);
  if (jaExiste) {
    return { success: false, error: 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.' };
  }

  const lojaId = `loja-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const usuarioId = `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Cria a loja 100% limpa e personalizada com categoria Geral padrão
  const catPadrao: Categoria = { id: `cat-geral-${Date.now()}`, nome: 'Geral' };
  const novaLoja: DadosLoja = {
    id: lojaId,
    nomeLoja: params.nomeLoja.trim(),
    criadoEm: new Date().toISOString(),
    categorias: [catPadrao],
    insumos: [],
    produtos: [],
    clientes: [],
    pedidos: [],
    pagamentosCrediario: [],
    configuracaoLoja: {
      nomeLoja: params.nomeLoja.trim(),
      chavePix: '',
      tipoChavePix: 'CELULAR',
      titularPix: params.nome.trim(),
      cidadePix: 'SAO PAULO',
      mensagemRodape: 'Agradecemos a sua preferência! Volte sempre.',
    },
  };

  const novoUsuario: Usuario = {
    id: usuarioId,
    nome: params.nome.trim(),
    email: emailNorm,
    senhaHash: params.senhaHash,
    lojaId,
    nomeLoja: params.nomeLoja.trim(),
    criadoEm: new Date().toISOString(),
  };

  const token = crypto.randomBytes(32).toString('hex');
  const novaSessao: SessaoUsuario = {
    token,
    usuarioId,
    lojaId,
    criadoEm: new Date().toISOString(),
  };

  db.lojas[lojaId] = novaLoja;
  db.usuarios.push(novoUsuario);
  db.sessoes.push(novaSessao);

  saveDb(db);

  return {
    success: true,
    usuario: novoUsuario,
    token,
    loja: novaLoja,
  };
}

export function autenticarUsuario(params: {
  email: string;
  senhaHash: string;
}): { success: boolean; usuario?: Usuario; token?: string; loja?: DadosLoja; error?: string } {
  const db = ensureDb();
  const emailNorm = params.email.trim().toLowerCase();

  const usuario = db.usuarios.find(
    (u) => u.email.toLowerCase() === emailNorm && u.senhaHash === params.senhaHash
  );

  if (!usuario) {
    return { success: false, error: 'E-mail ou senha incorretos.' };
  }

  let loja = db.lojas[usuario.lojaId];
  if (!loja) {
    // Garante que a loja exista
    loja = getLoja(usuario.lojaId);
  }

  const token = crypto.randomBytes(32).toString('hex');
  const novaSessao: SessaoUsuario = {
    token,
    usuarioId: usuario.id,
    lojaId: usuario.lojaId,
    criadoEm: new Date().toISOString(),
  };

  db.sessoes.push(novaSessao);
  saveDb(db);

  return {
    success: true,
    usuario,
    token,
    loja,
  };
}

export function encerrarSessao(token: string): boolean {
  const db = ensureDb();
  const index = db.sessoes.findIndex((s) => s.token === token);
  if (index >= 0) {
    db.sessoes.splice(index, 1);
    saveDb(db);
    return true;
  }
  return false;
}

// =================== CALCULADORA DE CUSTOS ===================

export function calculateRecipeCost(
  insumosList: Insumo[],
  fichaTecnica: { insumoId: string; quantidade: number }[],
  custoEmbalagem: number = 0,
  custoMaoDeObra: number = 0
): { custoInsumos: number; custoTotal: number } {
  let custoInsumos = 0;
  for (const item of fichaTecnica) {
    const insumo = insumosList.find((i) => i.id === item.insumoId);
    if (insumo) {
      custoInsumos += insumo.custoUnitario * item.quantidade;
    }
  }
  const custoTotal = Number((custoInsumos + custoEmbalagem + custoMaoDeObra).toFixed(2));
  return { custoInsumos: Number(custoInsumos.toFixed(2)), custoTotal };
}

// =================== CATEGORIAS ===================

export function getCategorias(lojaId?: string): Categoria[] {
  const loja = getLoja(lojaId);
  return loja.categorias;
}

export function saveCategoria(categoria: Categoria, lojaId?: string): Categoria {
  const db = ensureDb();
  const loja = getLoja(lojaId);
  const index = loja.categorias.findIndex((c) => c.id === categoria.id);

  if (index >= 0) {
    loja.categorias[index] = categoria;
  } else {
    if (!categoria.id) categoria.id = `cat-${Date.now()}`;
    loja.categorias.push(categoria);
  }

  db.lojas[loja.id] = loja;
  saveDb(db);
  return categoria;
}

export function deleteCategoria(
  id: string,
  cascade: boolean = false,
  lojaId?: string
): { success: boolean; error?: string; deletedProductsCount?: number } {
  const db = ensureDb();
  const loja = getLoja(lojaId);
  const produtosNaCategoria = loja.produtos.filter((p) => p.categoriaId === id);

  if (produtosNaCategoria.length > 0 && !cascade) {
    return {
      success: false,
      error: `Existem ${produtosNaCategoria.length} produto(s) cadastrado(s) nesta categoria.`,
      deletedProductsCount: produtosNaCategoria.length,
    };
  }

  let deletedProductsCount = 0;
  if (cascade && produtosNaCategoria.length > 0) {
    deletedProductsCount = produtosNaCategoria.length;
    loja.produtos = loja.produtos.filter((p) => p.categoriaId !== id);
  }

  loja.categorias = loja.categorias.filter((c) => c.id !== id);
  db.lojas[loja.id] = loja;
  saveDb(db);
  return { success: true, deletedProductsCount };
}

// =================== CONFIGURAÇÕES DA LOJA & PIX ===================

export function getConfiguracaoLoja(lojaId?: string): ConfiguracaoLoja {
  const loja = getLoja(lojaId);
  return loja.configuracaoLoja;
}

export function saveConfiguracaoLoja(config: Partial<ConfiguracaoLoja>, lojaId?: string): ConfiguracaoLoja {
  const db = ensureDb();
  const loja = getLoja(lojaId);
  loja.configuracaoLoja = {
    ...loja.configuracaoLoja,
    ...config,
  };
  if (config.nomeLoja) {
    loja.nomeLoja = config.nomeLoja;
  }
  db.lojas[loja.id] = loja;
  saveDb(db);
  return loja.configuracaoLoja;
}

// =================== INSUMOS ===================

export function getInsumos(lojaId?: string): Insumo[] {
  const loja = getLoja(lojaId);
  return loja.insumos;
}

export function saveInsumo(insumo: Insumo, lojaId?: string): Insumo {
  const db = ensureDb();
  const loja = getLoja(lojaId);
  const index = loja.insumos.findIndex((i) => i.id === insumo.id);

  if (index >= 0) {
    loja.insumos[index] = insumo;
  } else {
    if (!insumo.id) insumo.id = `ins-${Date.now()}`;
    loja.insumos.push(insumo);
  }

  // Recalcular custos dos produtos que utilizam este insumo
  for (let i = 0; i < loja.produtos.length; i++) {
    const prod = loja.produtos[i];
    if (prod.tipo === 'FABRICADO' && prod.fichaTecnica?.some((f) => f.insumoId === insumo.id)) {
      const { custoInsumos, custoTotal } = calculateRecipeCost(
        loja.insumos,
        prod.fichaTecnica,
        prod.custoEmbalagem,
        prod.custoMaoDeObra
      );
      prod.custoInsumos = custoInsumos;
      prod.custoTotal = custoTotal;
      prod.precoVenda = Number((custoTotal * (1 + prod.margemLucroPct / 100)).toFixed(2));
    }
  }

  db.lojas[loja.id] = loja;
  saveDb(db);
  return insumo;
}

export function deleteInsumo(id: string, lojaId?: string): { success: boolean; error?: string } {
  const db = ensureDb();
  const loja = getLoja(lojaId);
  const emUso = loja.produtos.some((p) => p.fichaTecnica?.some((f) => f.insumoId === id));
  if (emUso) {
    return {
      success: false,
      error: 'Este insumo está sendo utilizado na ficha técnica de um ou mais produtos.',
    };
  }
  loja.insumos = loja.insumos.filter((i) => i.id !== id);
  db.lojas[loja.id] = loja;
  saveDb(db);
  return { success: true };
}

// =================== PRODUTOS ===================

export function getProdutos(lojaId?: string): Produto[] {
  const loja = getLoja(lojaId);
  return loja.produtos;
}

export function saveProduto(produto: Produto, lojaId?: string): Produto {
  const db = ensureDb();
  const loja = getLoja(lojaId);

  if (!produto.categoriaId) {
    if (!loja.categorias || loja.categorias.length === 0) {
      loja.categorias = [{ id: `cat-geral-${Date.now()}`, nome: 'Geral' }];
    }
    produto.categoriaId = loja.categorias[0].id;
  }

  if (produto.tipo === 'FABRICADO' && produto.fichaTecnica && produto.fichaTecnica.length > 0) {
    const { custoInsumos, custoTotal } = calculateRecipeCost(
      loja.insumos,
      produto.fichaTecnica,
      produto.custoEmbalagem || 0,
      produto.custoMaoDeObra || 0
    );
    produto.custoInsumos = custoInsumos;
    produto.custoTotal = custoTotal;
    if (!produto.precoVenda || produto.precoVenda === 0) {
      produto.precoVenda = Number((custoTotal * (1 + (produto.margemLucroPct || 0) / 100)).toFixed(2));
    }
  } else {
    // Produto de Revenda ou sem ficha técnica (preço direto)
    produto.custoTotal = produto.custoTotal || produto.custoInsumos || 0;
  }

  const index = loja.produtos.findIndex((p) => p.id === produto.id);
  if (index >= 0) {
    loja.produtos[index] = produto;
  } else {
    if (!produto.id) produto.id = `prod-${Date.now()}`;
    loja.produtos.push(produto);
  }

  db.lojas[loja.id] = loja;
  saveDb(db);
  return produto;
}

export function deleteProduto(id: string, lojaId?: string): { success: boolean; error?: string } {
  const db = ensureDb();
  const loja = getLoja(lojaId);
  loja.produtos = loja.produtos.filter((p) => p.id !== id);
  db.lojas[loja.id] = loja;
  saveDb(db);
  return { success: true };
}

// =================== CLIENTES & CREDIARIO ===================

export function getClientes(lojaId?: string): Cliente[] {
  const loja = getLoja(lojaId);
  return loja.clientes;
}

export function saveCliente(cliente: Cliente, lojaId?: string): Cliente {
  const db = ensureDb();
  const loja = getLoja(lojaId);
  const index = loja.clientes.findIndex((c) => c.id === cliente.id);

  if (index >= 0) {
    loja.clientes[index] = { ...loja.clientes[index], ...cliente };
  } else {
    if (!cliente.id) cliente.id = `cli-${Date.now()}`;
    cliente.saldoDevedor = cliente.saldoDevedor || 0;
    cliente.criadoEm = cliente.criadoEm || new Date().toISOString();
    loja.clientes.push(cliente);
  }

  db.lojas[loja.id] = loja;
  saveDb(db);
  return cliente;
}

export function deleteCliente(id: string, lojaId?: string): { success: boolean; error?: string } {
  const db = ensureDb();
  const loja = getLoja(lojaId);
  const cliente = loja.clientes.find((c) => c.id === id);

  if (cliente && cliente.saldoDevedor > 0) {
    return {
      success: false,
      error: `Não é possível excluir o cliente pois existe um saldo devedor em aberto de R$ ${cliente.saldoDevedor.toFixed(2)}.`,
    };
  }

  loja.clientes = loja.clientes.filter((c) => c.id !== id);
  db.lojas[loja.id] = loja;
  saveDb(db);
  return { success: true };
}

export function amortizarCrediario(
  clienteId: string,
  valor: number,
  formaPagamento: 'DINHEIRO' | 'PIX' | 'CARTAO',
  observacao?: string,
  lojaId?: string
): { success: boolean; cliente?: Cliente; pagamento?: PagamentoCrediario; error?: string } {
  const db = ensureDb();
  const loja = getLoja(lojaId);
  const cliente = loja.clientes.find((c) => c.id === clienteId);

  if (!cliente) return { success: false, error: 'Cliente não encontrado.' };
  if (valor <= 0) return { success: false, error: 'Valor de pagamento deve ser positivo.' };
  if (valor > cliente.saldoDevedor) {
    return {
      success: false,
      error: `Valor informado (R$ ${valor.toFixed(2)}) é maior que a dívida atual (R$ ${cliente.saldoDevedor.toFixed(2)}).`,
    };
  }

  cliente.saldoDevedor = Number(Math.max(0, cliente.saldoDevedor - valor).toFixed(2));

  const novoPagamento: PagamentoCrediario = {
    id: `pag-${Date.now()}`,
    clienteId,
    valor,
    formaPagamento,
    dataPagamento: new Date().toISOString(),
    observacao: observacao || 'Amortização de saldo no crediário',
  };

  loja.pagamentosCrediario.push(novoPagamento);
  db.lojas[loja.id] = loja;
  saveDb(db);
  return { success: true, cliente, pagamento: novoPagamento };
}

export function getPagamentosCrediario(clienteId?: string, lojaId?: string): PagamentoCrediario[] {
  const loja = getLoja(lojaId);
  if (clienteId) {
    return loja.pagamentosCrediario.filter((p) => p.clienteId === clienteId);
  }
  return loja.pagamentosCrediario;
}

// =================== PEDIDOS & BAIXA AUTOMÁTICA DE ESTOQUE ===================

export function getPedidos(lojaId?: string): Pedido[] {
  const loja = getLoja(lojaId);
  return [...loja.pedidos].sort(
    (a, b) => new Date(b.dataVenda).getTime() - new Date(a.dataVenda).getTime()
  );
}

export function createPedido(
  novoPedidoData: Omit<Pedido, 'id' | 'codigo' | 'status' | 'dataVenda'>,
  lojaId?: string
): { success: boolean; pedido?: Pedido; error?: string } {
  const db = ensureDb();
  const loja = getLoja(lojaId);

  // Validação do Crediário
  if (novoPedidoData.formaPagamento === 'CREDIARIO') {
    if (!novoPedidoData.clienteId) {
      return { success: false, error: 'Para compras no crediário, selecione um cliente cadastrado.' };
    }
    const cliente = loja.clientes.find((c) => c.id === novoPedidoData.clienteId);
    if (!cliente) {
      return { success: false, error: 'Cliente não encontrado para a venda no crediário.' };
    }
    const novoSaldo = cliente.saldoDevedor + novoPedidoData.totalLiquido;
    if (novoSaldo > cliente.limiteCredito) {
      return {
        success: false,
        error: `Limite de crédito excedido! Limite: R$ ${cliente.limiteCredito.toFixed(2)}, Devedor atual: R$ ${cliente.saldoDevedor.toFixed(2)}. Com esta compra de R$ ${novoPedidoData.totalLiquido.toFixed(2)}, atingiria R$ ${novoSaldo.toFixed(2)}.`,
      };
    }
    cliente.saldoDevedor = Number(novoSaldo.toFixed(2));
  }

  // Baixa automática de estoque
  for (const item of novoPedidoData.itens) {
    const prod = loja.produtos.find((p) => p.id === item.produtoId);
    if (!prod) continue;

    if (prod.tipo === 'FABRICADO') {
      if (prod.fichaTecnica && prod.fichaTecnica.length > 0) {
        for (const ft of prod.fichaTecnica) {
          const insumo = loja.insumos.find((i) => i.id === ft.insumoId);
          if (insumo) {
            const consumoTotal = ft.quantidade * item.quantidade;
            insumo.estoqueAtual = Number(Math.max(0, insumo.estoqueAtual - consumoTotal).toFixed(3));
          }
        }
      }
      if (prod.estoqueAtual > 0) {
        prod.estoqueAtual = Math.max(0, prod.estoqueAtual - item.quantidade);
      }
    } else {
      prod.estoqueAtual = Math.max(0, prod.estoqueAtual - item.quantidade);
    }
  }

  const proximoCodigo =
    loja.pedidos.length > 0 ? Math.max(...loja.pedidos.map((p) => p.codigo || 0)) + 1 : 101;

  const pedidoCompleto: Pedido = {
    ...novoPedidoData,
    id: `ped-${Date.now()}`,
    codigo: proximoCodigo,
    status: 'CONCLUIDO',
    dataVenda: new Date().toISOString(),
  };

  loja.pedidos.unshift(pedidoCompleto);
  db.lojas[loja.id] = loja;
  saveDb(db);
  return { success: true, pedido: pedidoCompleto };
}

export function cancelPedido(id: string, lojaId?: string): { success: boolean; error?: string } {
  const db = ensureDb();
  const loja = getLoja(lojaId);
  const pedido = loja.pedidos.find((p) => p.id === id);

  if (!pedido) return { success: false, error: 'Pedido não encontrado.' };
  if (pedido.status === 'CANCELADO') return { success: false, error: 'Este pedido já está cancelado.' };

  // Estorno do crediário
  if (pedido.formaPagamento === 'CREDIARIO' && pedido.clienteId) {
    const cliente = loja.clientes.find((c) => c.id === pedido.clienteId);
    if (cliente) {
      cliente.saldoDevedor = Number(Math.max(0, cliente.saldoDevedor - pedido.totalLiquido).toFixed(2));
    }
  }

  // Estorno do estoque
  for (const item of pedido.itens) {
    const prod = loja.produtos.find((p) => p.id === item.produtoId);
    if (!prod) continue;

    if (prod.tipo === 'FABRICADO' && prod.fichaTecnica) {
      for (const ft of prod.fichaTecnica) {
        const insumo = loja.insumos.find((i) => i.id === ft.insumoId);
        if (insumo) {
          const reposicao = ft.quantidade * item.quantidade;
          insumo.estoqueAtual = Number((insumo.estoqueAtual + reposicao).toFixed(3));
        }
      }
      if (prod.estoqueAtual !== undefined) {
        prod.estoqueAtual += item.quantidade;
      }
    } else {
      prod.estoqueAtual += item.quantidade;
    }
  }

  pedido.status = 'CANCELADO';
  db.lojas[loja.id] = loja;
  saveDb(db);
  return { success: true };
}

// =================== DASHBOARD & ESTATÍSTICAS ===================

export function getDashboardMetrics(lojaId?: string) {
  const loja = getLoja(lojaId);
  const pedidosConcluidos = loja.pedidos.filter((p) => p.status === 'CONCLUIDO');

  const hoje = new Date().toISOString().slice(0, 10);
  const vendasHoje = pedidosConcluidos.filter((p) => p.dataVenda.slice(0, 10) === hoje);

  const totalHoje = vendasHoje.reduce((acc, p) => acc + p.totalLiquido, 0);
  const faturamentoGeral = pedidosConcluidos.reduce((acc, p) => acc + p.totalLiquido, 0);
  const lucroGeral = pedidosConcluidos.reduce((acc, p) => acc + p.lucroTotal, 0);

  const totalCrediarioRealAcumulado = Number(
    loja.clientes.reduce((acc, c) => acc + (c.saldoDevedor || 0), 0).toFixed(2)
  );
  const totalLimiteDisponivel = loja.clientes.reduce(
    (acc, c) => acc + Math.max(0, c.limiteCredito - (c.saldoDevedor || 0)),
    0
  );

  const insumosBaixos = loja.insumos.filter((i) => i.estoqueAtual <= i.estoqueMinimo);
  const produtosBaixos = loja.produtos.filter((p) => p.estoqueAtual <= p.estoqueMinimo);

  const vendasPorProdutoMap: Record<
    string,
    { nome: string; quantidade: number; faturamento: number; estoqueAtual: number; custoTotal: number }
  > = {};

  for (const prod of loja.produtos) {
    vendasPorProdutoMap[prod.id] = {
      nome: prod.nome,
      quantidade: 0,
      faturamento: 0,
      estoqueAtual: prod.estoqueAtual,
      custoTotal: prod.custoTotal,
    };
  }

  for (const pedido of pedidosConcluidos) {
    for (const item of pedido.itens) {
      if (vendasPorProdutoMap[item.produtoId]) {
        vendasPorProdutoMap[item.produtoId].quantidade += item.quantidade;
        vendasPorProdutoMap[item.produtoId].faturamento += item.subtotal;
      }
    }
  }

  const produtosArray = Object.values(vendasPorProdutoMap);

  const maisVendidos = [...produtosArray]
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5);

  const produtosMenorSaida = [...produtosArray]
    .sort((a, b) => a.quantidade - b.quantidade)
    .slice(0, 5)
    .map((p) => ({
      ...p,
      capitalParado: Number((p.estoqueAtual * p.custoTotal).toFixed(2)),
    }));

  const gastosPorClienteMap: Record<
    string,
    { id: string; nome: string; totalGasto: number; qtdPedidos: number; saldoDevedor: number; limiteCredito: number }
  > = {};

  for (const cli of loja.clientes) {
    gastosPorClienteMap[cli.id] = {
      id: cli.id,
      nome: cli.nome,
      totalGasto: 0,
      qtdPedidos: 0,
      saldoDevedor: cli.saldoDevedor || 0,
      limiteCredito: cli.limiteCredito || 0,
    };
  }

  for (const ped of pedidosConcluidos) {
    if (ped.clienteId && gastosPorClienteMap[ped.clienteId]) {
      gastosPorClienteMap[ped.clienteId].totalGasto += ped.totalLiquido;
      gastosPorClienteMap[ped.clienteId].qtdPedidos += 1;
    }
  }

  const top5Clientes = Object.values(gastosPorClienteMap)
    .sort((a, b) => b.totalGasto - a.totalGasto)
    .slice(0, 5);

  const ultimos7Dias: { data: string; diaSemana: string; faturamento: number; pedidos: number }[] = [];
  const diasSemanaNomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dataIso = d.toISOString().slice(0, 10);
    const diaFormatado = `${d.getDate()}/${d.getMonth() + 1}`;
    const diaSemana = diasSemanaNomes[d.getDay()];

    const vendasDoDia = pedidosConcluidos.filter((p) => p.dataVenda.slice(0, 10) === dataIso);
    const fatDoDia = vendasDoDia.reduce((acc, p) => acc + p.totalLiquido, 0);

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
    if (totalFormas[ped.formaPagamento] !== undefined) {
      totalFormas[ped.formaPagamento] += ped.totalLiquido;
    } else {
      totalFormas[ped.formaPagamento] = ped.totalLiquido;
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
    totalClientes: loja.clientes.length,
    totalProdutos: loja.produtos.length,
    totalInsumos: loja.insumos.length,
  };
}
