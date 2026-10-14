export interface Categoria {
  id: string;
  nome: string;
  icone?: string;
  cor?: string;
}

export type UnidadeMedida =
  | 'kg'
  | 'g'
  | 'l'
  | 'ml'
  | 'un'
  | 'dz'
  | 'cx'
  | 'pct'
  | 'fd'
  | 'crt'
  | 'lt'
  | 'pt'
  | 'gf'
  | 'br'
  | 'cp'
  | 'bdj';

export interface Insumo {
  id: string;
  nome: string;
  unidade: UnidadeMedida;
  unidadesPorEmbalagem?: number; // Qtd de unidades individuais contidas na embalagem (ex: 12 na dúzia, 24 na caixa)
  custoUnitario: number; // Custo por unidade padrão ou embalagem cadastrada
  estoqueAtual: number;
  estoqueMinimo: number;
  fornecedor?: string;
}

export interface ItemFichaTecnica {
  insumoId: string;
  quantidade: number; // quantidade utilizada na unidade de uso selecionada
  unidadeUso?: string; // ex: 'g', 'kg', 'ml', 'l', 'un'
  fatorConversao?: number; // ex: 0.001 para converter g em kg
}

export type TipoProduto = 'FABRICADO' | 'REVENDA';

export interface Produto {
  id: string;
  nome: string;
  categoriaId: string;
  tipo: TipoProduto;
  precoVenda: number;
  margemLucroPct: number; // % de margem programada
  custoInsumos: number; // Custo dos insumos da receita inteira
  custoUnitarioInsumos?: number; // Custo dos insumos dividido pelo rendimento
  custoEmbalagem: number; // Custo de embalagem por unidade
  custoMaoDeObra: number; // Custo de mão de obra do lote
  custoGasEnergia?: number; // Custo de gás/energia do lote
  rendimentoReceita?: number; // Quantas unidades a receita inteira rende (ex: 30 brigadeiros)
  custoTotal: number; // Custo final de 1 unidade pronta
  estoqueAtual: number; // Para REVENDA: estoque do produto; Para FABRICADO: produtos prontos já preparados ou 0
  estoqueMinimo: number;
  fichaTecnica: ItemFichaTecnica[]; // Presente quando tipo == 'FABRICADO'
  imagemUrl?: string;
  descricao?: string;
  modoPreparo?: string; // Instruções / Passo a passo da receita
  tempoPreparo?: string; // Ex: "45 min", "1h 30m"
  validadeConservacao?: string; // Ex: "5 dias refrigerado"
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

export type StatusProducao = 'A_FAZER' | 'EM_PRODUCAO' | 'PRONTO' | 'ENTREGUE';

export interface Pedido {
  id: string;
  codigo: number;
  clienteId?: string;
  nomeClienteAvulso?: string;
  telefoneClienteAvulso?: string;
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
  // Campos de Encomenda & Agenda de Produção
  isEncomenda?: boolean;
  dataEntrega?: string; // "YYYY-MM-DD" ou ISO
  horaEntrega?: string; // "15:00"
  tipoEntrega?: 'RETIRADA' | 'ENTREGA';
  enderecoEntrega?: string;
  observacoesEntrega?: string;
  statusProducao?: StatusProducao;
}

export type FormaPagamentoCrediario = 'DINHEIRO' | 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'CARTAO';

export interface PagamentoCrediario {
  id: string;
  clienteId: string;
  valor: number;
  dataPagamento: string;
  formaPagamento: FormaPagamentoCrediario;
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
  configGas?: ConfiguracaoGas;
  tarifaKwh?: number;
  maquinasEletricas?: MaquinaEletrica[];
}

export interface MaquinaEletrica {
  id: string;
  nome: string;
  potenciaWatts: number;
  tempoUsoPadraoMinutos?: number;
  horasUsoDiario?: number;
  voltagem?: number;
  amperagem?: number;
  icone?: string;
  observacoes?: string;
}

export interface ConfiguracaoGas {
  nome: string;
  pesoKg: number;
  preco: number;
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
