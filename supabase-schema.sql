-- =========================================================================
-- ESQUEMA COMPLETO DO BANCO DE DADOS ERP & PDV MANU (POSTGRESQL / SUPABASE)
-- Execute este script no SQL Editor do seu projeto Supabase para criar as tabelas
-- =========================================================================

-- 1. Tabela de Lojas
CREATE TABLE IF NOT EXISTS public.lojas (
    id TEXT PRIMARY KEY,
    nome_loja TEXT NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Usuários (Multi-tenant)
CREATE TABLE IF NOT EXISTS public.usuarios (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha_hash TEXT NOT NULL,
    loja_id TEXT REFERENCES public.lojas(id) ON DELETE CASCADE,
    nome_loja TEXT NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Sessões
CREATE TABLE IF NOT EXISTS public.sessoes (
    token TEXT PRIMARY KEY,
    usuario_id TEXT REFERENCES public.usuarios(id) ON DELETE CASCADE,
    loja_id TEXT REFERENCES public.lojas(id) ON DELETE CASCADE,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Configurações da Loja & Pix
CREATE TABLE IF NOT EXISTS public.configuracao_loja (
    loja_id TEXT PRIMARY KEY REFERENCES public.lojas(id) ON DELETE CASCADE,
    nome_loja TEXT NOT NULL,
    cnpj_cpf TEXT,
    telefone TEXT,
    endereco TEXT,
    cidade TEXT,
    mensagem_rodape TEXT,
    chave_pix TEXT,
    tipo_chave_pix TEXT DEFAULT 'CELULAR',
    titular_pix TEXT,
    cidade_pix TEXT DEFAULT 'SAO PAULO',
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Categorias
CREATE TABLE IF NOT EXISTS public.categorias (
    id TEXT PRIMARY KEY,
    loja_id TEXT NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    icone TEXT,
    cor TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela de Insumos
CREATE TABLE IF NOT EXISTS public.insumos (
    id TEXT PRIMARY KEY,
    loja_id TEXT NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    unidade TEXT NOT NULL,
    custo_unitario NUMERIC(10, 2) DEFAULT 0,
    estoque_atual NUMERIC(10, 3) DEFAULT 0,
    estoque_minimo NUMERIC(10, 3) DEFAULT 0,
    fornecedor TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabela de Produtos
CREATE TABLE IF NOT EXISTS public.produtos (
    id TEXT PRIMARY KEY,
    loja_id TEXT NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    categoria_id TEXT REFERENCES public.categorias(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL DEFAULT 'REVENDA', -- 'FABRICADO' ou 'REVENDA'
    preco_venda NUMERIC(10, 2) DEFAULT 0,
    margem_lucro_pct NUMERIC(10, 2) DEFAULT 0,
    custo_insumos NUMERIC(10, 2) DEFAULT 0,
    custo_embalagem NUMERIC(10, 2) DEFAULT 0,
    custo_mao_de_obra NUMERIC(10, 2) DEFAULT 0,
    custo_total NUMERIC(10, 2) DEFAULT 0,
    estoque_atual NUMERIC(10, 3) DEFAULT 0,
    estoque_minimo NUMERIC(10, 3) DEFAULT 0,
    ficha_tecnica JSONB DEFAULT '[]'::jsonb,
    descricao TEXT,
    imagem_url TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabela de Clientes & Crediário
CREATE TABLE IF NOT EXISTS public.clientes (
    id TEXT PRIMARY KEY,
    loja_id TEXT NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL,
    cpf TEXT,
    endereco TEXT,
    limite_credito NUMERIC(10, 2) DEFAULT 250.00,
    saldo_devedor NUMERIC(10, 2) DEFAULT 0.00,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Tabela de Pedidos
CREATE TABLE IF NOT EXISTS public.pedidos (
    id TEXT PRIMARY KEY,
    loja_id TEXT NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
    codigo INT NOT NULL,
    cliente_id TEXT REFERENCES public.clientes(id) ON DELETE SET NULL,
    nome_cliente_avulso TEXT,
    itens JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_bruto NUMERIC(10, 2) DEFAULT 0,
    desconto NUMERIC(10, 2) DEFAULT 0,
    total_liquido NUMERIC(10, 2) DEFAULT 0,
    custo_total NUMERIC(10, 2) DEFAULT 0,
    lucro_total NUMERIC(10, 2) DEFAULT 0,
    forma_pagamento TEXT NOT NULL, -- 'DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO', 'CREDIARIO'
    status TEXT NOT NULL DEFAULT 'CONCLUIDO', -- 'CONCLUIDO', 'CANCELADO'
    data_venda TIMESTAMPTZ DEFAULT NOW(),
    observacoes TEXT
);

-- 10. Tabela de Pagamentos / Amortização de Crediário
CREATE TABLE IF NOT EXISTS public.pagamentos_crediario (
    id TEXT PRIMARY KEY,
    loja_id TEXT NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
    cliente_id TEXT NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    valor NUMERIC(10, 2) NOT NULL,
    forma_pagamento TEXT NOT NULL, -- 'DINHEIRO', 'PIX', 'CARTAO'
    data_pagamento TIMESTAMPTZ DEFAULT NOW(),
    observacao TEXT
);

-- Índices de Alta Performance para Multi-Tenancy
CREATE INDEX IF NOT EXISTS idx_categorias_loja ON public.categorias(loja_id);
CREATE INDEX IF NOT EXISTS idx_insumos_loja ON public.insumos(loja_id);
CREATE INDEX IF NOT EXISTS idx_produtos_loja ON public.produtos(loja_id);
CREATE INDEX IF NOT EXISTS idx_clientes_loja ON public.clientes(loja_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_loja ON public.pedidos(loja_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_loja ON public.pagamentos_crediario(loja_id);
