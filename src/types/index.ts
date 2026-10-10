export interface Categoria {
  id: string;
  nome: string;
  icone?: string;
  cor?: string;
}

export type UnidadeMedida = 'kg' | 'g' | 'l' | 'ml' | 'un';

export interface Insumo {
  id: string;
  nome: string;
  unidade: UnidadeMedida;
  custoUnitario: number; // Custo por unidade padrão (ex: por kg, por g, por litro, por un)
  estoqueAtual: number;
  estoqueMinimo: number;
  fornecedor?: string;
}

export interface ItemFichaTecnica {
  insumoId: string;
  quantidade: number; // quantidade utilizada na unidade de medida do insumo
}

export type TipoProduto = 'FABRICADO' | 'REVENDA';

export interface Produto {
  id: string;
  nome: string;
  categoriaId: string;
  tipo: TipoProduto;
  precoVenda: number;
  margemLucroPct: number; // % de margem programada
  custoInsumos: number;
  custoEmbalagem: number;
  custoMaoDeObra: number;
  custoTotal: number;
  estoqueAtual: number; // Para REVENDA: estoque do produto; Para FABRICADO: produtos prontos já preparados ou 0
  estoqueMinimo: number;
  fichaTecnica: ItemFichaTecnica[]; // Presente quando tipo == 'FABRICADO'
  imagemUrl?: string;
  descricao?: string;
}

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  cpf?: string;
  endereco?: string;
  limiteCredito: number;
  saldoDevedor: number;
  criadoEm: string;
}

export interface ItemPedido {
  produtoId: string;
  nomeProduto: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
  custoUnitario: number;
}

export type FormaPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO' | 'CREDIARIO';

export interface Pedido {
  id: string;
  codigo: number;
  clienteId?: string;
  nomeClienteAvulso?: string;
  itens: ItemPedido[];
  totalBruto: number;
  desconto: number;
  totalLiquido: number;
  custoTotal: number;
  lucroTotal: number;
  formaPagamento: FormaPagamento;
  status: 'CONCLUIDO' | 'CANCELADO';
  dataVenda: string; // ISO string
  observacoes?: string;
}

export interface PagamentoCrediario {
  id: string;
  clienteId: string;
  valor: number;
  dataPagamento: string;
  formaPagamento: 'DINHEIRO' | 'PIX' | 'CARTAO';
  observacao?: string;
}

export type TipoChavePix = 'CPF' | 'CNPJ' | 'CELULAR' | 'EMAIL' | 'ALEATORIA';

export interface ConfiguracaoLoja {
  nomeLoja: string;
  cnpjCpf?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  mensagemRodape?: string;
  chavePix: string;
  tipoChavePix: TipoChavePix;
  titularPix: string;
  cidadePix?: string;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  senhaHash: string;
  lojaId: string;
  nomeLoja: string;
  criadoEm: string;
}

export interface SessaoUsuario {
  token: string;
  usuarioId: string;
  lojaId: string;
  criadoEm: string;
}

export interface DadosLoja {
  id: string;
  nomeLoja: string;
  criadoEm: string;
  categorias: Categoria[];
  insumos: Insumo[];
  produtos: Produto[];
  clientes: Cliente[];
  pedidos: Pedido[];
  pagamentosCrediario: PagamentoCrediario[];
  configuracaoLoja: ConfiguracaoLoja;
}

export interface DatabaseSchema {
  usuarios: Usuario[];
  sessoes: SessaoUsuario[];
  lojas: Record<string, DadosLoja>;
}
