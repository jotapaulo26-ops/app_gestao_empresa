# 🚀 ERP & PDV Manu - Dark Neon (Next.js 14 + Supabase + Vercel)

Sistema Web completo de Gestão Comercial, PDV Rápido, Ficha Técnica, Controle de Custos e Margem de Lucro, Crediário com Limite de Crédito, Notas Térmicas e Cobrança com Pix Oficial (Banco Central).

Projetado especialmente para **operação em smartphones com 1 mão (Thumb Zone)** e tema **Dark OLED puro (#000000) com iluminação Multi-Neon**.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend & Fullstack**: [Next.js 14](https://nextjs.org/) (App Router, React, TypeScript, Tailwind CSS)
- **Design & Ergonomia**: Dark Black OLED, Multi-Neon Glow, Thumb Zone Mobile First
- **Banco de Dados em Nuvem**: [Supabase](https://supabase.com/) (PostgreSQL Gratuito na Nuvem) com fallback para JSON local
- **Hospedagem & Deploy**: [Vercel](https://vercel.com/) (Deploy contínuo via GitHub)
- **Pix Oficial**: Gerador padrão Banco Central EMV BR Code (Pix Copia e Cola) com CRC16 CCITT

---

## 📦 Passo a Passo para Colocar em Produção na Nuvem (100% Grátis)

### 1️⃣ Criar o Banco de Dados no Supabase

1. Acesse [supabase.com](https://supabase.com/) e crie uma conta gratuita (pode entrar com o GitHub).
2. Clique em **"New Project"**, dê um nome (ex: `erp-pdv-manu`) e defina uma senha para o banco de dados.
3. Selecione a região mais próxima (ex: `South America (São Paulo)`).
4. No menu lateral esquerdo, clique no ícone **SQL Editor** (`>_`).
5. Clique em **"New query"**, abra o arquivo [`supabase-schema.sql`](./supabase-schema.sql) deste projeto, copie todo o conteúdo e cole lá.
6. Clique no botão **"Run"** (Executar). Pronto! Todas as 10 tabelas e índices estão criados na nuvem.
7. No menu lateral, vá em **Project Settings** ➔ **API** e copie:
   - **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`)
   - **anon / public key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - **service_role key** (`SUPABASE_SERVICE_ROLE_KEY`)

---

### 2️⃣ Subir o Código para o GitHub

1. Abra o terminal na pasta do projeto e execute:
   ```bash
   git init
   git add .
   git commit -m "feat: lancamento inicial ERP PDV Dark Neon multi-tenant"
   ```
2. Crie um novo repositório no seu [GitHub](https://github.com/new) (público ou privado).
3. Conecte e envie o código:
   ```bash
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
   git push -u origin main
   ```

---

### 3️⃣ Fazer o Deploy Gratuito na Vercel

1. Acesse [vercel.com](https://vercel.com/) e faça login com sua conta do GitHub.
2. Clique no botão **"Add New..."** ➔ **"Project"**.
3. Selecione o repositório que você acabou de subir no GitHub e clique em **"Import"**.
4. Na seção **Environment Variables** (Variáveis de Ambiente), adicione as 3 chaves do seu Supabase:
   - `NEXT_PUBLIC_SUPABASE_URL`: sua URL do Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: sua chave anon
   - `SUPABASE_SERVICE_ROLE_KEY`: sua chave service_role
5. Clique em **"Deploy"**.
6. Em cerca de 1 minuto, seu sistema estará online com link seguro `https://seu-projeto.vercel.app` disponível para qualquer pessoa acessar do celular ou computador!

---

## 📱 Funcionalidades do Sistema

- **Tela de Acesso**: Cadastro de novas lojas e Login com persistência de sessão.
- **Isolamento Multi-Loja**: Cada lojista gerencia exclusivamente seus produtos e crediários.
- **PDV Ágil com Categorias Ocultas**: Focado no fluxo rápido de vendas com 1 mão.
- **Crediário & Fatura Pix**: Controle de saldo devedor, amortização e emissão de fatura em PDF com Pix Copia e Cola.
- **Calculadora de Custos**: Margem de lucro programável com precificação inteligente e baixa de insumos.
- **Dashboard Analítico**: Faturamento dos últimos 7 dias, gráficos por forma de pagamento, produtos com baixo giro e ranking Top 5 clientes VIP.
