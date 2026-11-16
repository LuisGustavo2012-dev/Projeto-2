# Controle Financeiro

Aplicação full stack de controle financeiro pessoal: cadastro e login, categorias, contas e cartões, lançamentos (com parcelamento), relatórios e previsão de faturas.

## Tecnologias

- Back-end: Node.js + Express
- Front-end: React (Vite) + React Router + Axios
- Banco de dados: PostgreSQL
- Segurança: bcrypt (senhas), JWT (autenticação), rate limiting no login, CORS restrito

## Como rodar

Pré-requisitos: Node.js e PostgreSQL instalados.

### 1. Banco de dados

Crie o banco `financas` e rode o schema:

```
psql -U postgres -c "CREATE DATABASE financas;"
psql -U postgres -d financas -f backend/database/schema.sql
```

### 2. Back-end

```
cd backend
npm install
copy .env.example .env
```

Abra o `.env` e preencha `DATABASE_URL` (com a sua senha do PostgreSQL) e `JWT_SECRET` (um texto longo e aleatório). Depois:

```
npm run seed
npm run dev
```

A API sobe em http://localhost:3000.

### 3. Front-end

Em outro terminal:

```
cd frontend
npm install
npm run dev
```

Abra http://localhost:5173.

## Usuários de teste (criados pelo seed)

| E-mail | Senha |
|---|---|
| ana@email.com | senha1234 |
| bruno@email.com | senha1234 |

Cada usuário tem 3 meses de lançamentos, incluindo uma compra parcelada.

## Variáveis de ambiente (backend/.env)

| Variável | Para que serve |
|---|---|
| PORT | Porta da API (padrão 3000) |
| DATABASE_URL | Conexão com o PostgreSQL |
| JWT_SECRET | Segredo usado para assinar o token |

O arquivo `.env` não vai para o Git; só o `.env.example`.

## Rotas da API

Todas, exceto cadastro e login, exigem o header `Authorization: Bearer <token>`.

| Rota | O que faz |
|---|---|
| POST /api/auth/cadastro | Cria usuário |
| POST /api/auth/login | Devolve token e dados do usuário |
| GET /api/auth/me | Dados do usuário logado |
| /api/categorias | CRUD de categorias |
| /api/fontes-destinos | CRUD de contas, rendas e cartões |
| /api/lancamentos | CRUD de lançamentos (filtros, paginação e totais no GET) |
| GET /api/relatorios/categorias | Total por categoria, % e comparação com o período anterior |
| GET /api/relatorios/fontes-destinos | Entradas por fonte, saídas por destino e saldo por conta |
| GET /api/relatorios/faturas?meses=3 | Previsão de faturas dos cartões, limite usado e disponível |

Erros seguem o padrão `{ "erro": "mensagem", "campos": { "campo": "mensagem" } }`.

## Decisões de projeto

- Dinheiro: os valores são divididos em centavos para não ter erro de arredondamento. Em 3x de R$ 100,00, ficam 33,34 + 33,33 + 33,33.
- Parcelamento: todas as parcelas são criadas dentro de uma transação, com um `grupo_parcelamento` em comum. Dá para excluir uma parcela ou todas (`?todasParcelas=true`).
- Faturas: cada parcela guarda a data da compra, e a fatura de cada uma é calculada pelo dia de fechamento do cartão.
- Isolamento de dados: toda consulta filtra pelo usuário logado. Registro de outro usuário responde 404.
- Unicidade: e-mail e CPF únicos garantidos pelo banco (erro 23505 vira 409).
- Senhas: guardadas com hash bcrypt, e `senha_hash` nunca vai em resposta da API.

## Estrutura

```
backend/
  database/    schema.sql e seed.js
  src/
    config/       conexão com o banco
    middlewares/  autenticação, validação, erros
    models/       acesso ao banco e regras de cálculo
    routes/       rotas da API
frontend/
  src/
    components/   telas e componentes
    contexts/     AuthContext
    services/     cliente HTTP e validações
```
