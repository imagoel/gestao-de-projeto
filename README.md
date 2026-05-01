# Sistema de Gestao de Projetos GTI

Sistema interno de gestao de projetos da GTI, no estilo Kanban/Trello, criado para organizar demandas por projeto, responsaveis, prazos e andamento operacional da equipe.

## Visao geral

O projeto foi construido para atender um MVP enxuto de gestao interna, com foco em:

- autenticacao por e-mail e senha
- controle de acesso com perfis globais `ADMIN` e `MEMBER`
- organizacao por secretaria, setor e pasta
- projetos com board unico
- colunas fixas de Kanban
- cards com prioridade, responsavel, prazo opcional, checklist e historico
- comentarios e arquivamento de cards
- gestao basica de usuarios

No contexto da GTI, este repositorio representa um projeto-produto: ele e o sistema usado para acompanhar outros projetos internos da area.

## Stack

### Front-end

- React 18
- TypeScript
- Vite
- TanStack Query

### Back-end

- NestJS 10
- TypeScript
- Prisma 5
- PostgreSQL 16
- JWT

### Infra

- Docker Compose
- Nginx
- Portainer

## Estrutura do repositorio

```txt
/
  agents.md
  docker-compose.yml
  .env.example
  /docs
  /backend
    /prisma
    /src
  /frontend
    /src
```

## Regras principais do MVP

- 1 projeto = 1 board
- colunas padrao:
  - `A fazer`
  - `Em andamento`
  - `Concluido`
- `ADMIN` cria projetos e gerencia usuarios
- `MEMBER` acessa projetos por participacao direta ou por pasta liberada ao seu setor/secretaria
- acesso por setor/pasta sem participacao no projeto e somente leitura
- edicao de cards, checklist, comentarios e colunas exige participacao no projeto
- cards usam prioridade, responsavel principal, prazo opcional e checklist
- cards concluidos podem ser arquivados

## Organizacao e permissoes

O modelo atual organiza os projetos na seguinte arvore:

```txt
Secretaria
  Setor
    Pasta
      Projeto
```

Cada projeto pertence obrigatoriamente a uma pasta. A pasta pertence a um setor e possui uma regra de visibilidade:

- `SECTOR`: apenas usuarios vinculados ao mesmo setor visualizam a pasta e seus projetos.
- `SECRETARIAT`: usuarios vinculados a qualquer setor da mesma secretaria visualizam a pasta e seus projetos.

Perfis globais:

- `ADMIN`: visao global, gerencia usuarios, secretarias, setores, pastas e projetos.
- `MEMBER`: ve projetos em que participa, projetos que criou e projetos em pastas liberadas ao seu setor/secretaria.

Papeis dentro do projeto:

- `MANAGER`: edita projeto, gerencia membros e pode apagar o projeto.
- `MEMBER`: cria/edita cards, checklist, comentarios e movimentacoes no projeto.

Observacoes:

- `VIEWER` foi removido do modelo. A leitura sem edicao agora vem da visibilidade por pasta/setor.
- Usuario que enxerga um projeto somente por setor/pasta nao consegue editar cards nem comentar ate ser adicionado como membro do projeto.
- O owner do projeto e criado como `MANAGER`.

## Como rodar localmente

### 1. Preparar ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Ajuste os valores conforme o ambiente local.

### 2. Subir o banco com Docker

```bash
docker compose up -d postgres
```

### 3. Rodar a API em desenvolvimento

```bash
cd backend
npm install
npm run start:dev
```

API padrao:

- `http://localhost:3000/api/health`

### 4. Rodar o front em desenvolvimento

```bash
cd frontend
npm install
npm run dev
```

Front padrao:

- `http://localhost:5173/login`

## Como rodar com Docker Compose

Na raiz do projeto:

```bash
docker compose up -d --build
```

Servicos esperados:

- `gestao_projetos_db`
- `gestao_projetos_api`
- `gestao_projetos_web`

## Portas atuais

- Web: `18080`
- API: `13000`
- PostgreSQL: `35432`

Essas portas podem ser ajustadas pelas variaveis:

- `WEB_HOST_PORT`
- `API_HOST_PORT`
- `POSTGRES_HOST_PORT`

## Variaveis de ambiente relevantes

As principais variaveis ficam em `.env.example`:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `VITE_API_URL`
- `API_HOST_PORT`
- `WEB_HOST_PORT`
- `SEED_ADMIN_NAME`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`

Observacao importante:

- o Postgres aplica `POSTGRES_USER` e `POSTGRES_PASSWORD` na primeira inicializacao do volume
- se o volume ja existir, mudar essas credenciais no `.env` nao recria automaticamente o banco

## Acesso inicial

O acesso inicial de administrador e definido pelas variaveis:

- `SEED_ADMIN_NAME`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`

Em ambiente local, use os valores configurados no seu `.env`.

Ao executar o seed, tambem sao criadas as secretarias e setores iniciais usados pela GTI, incluindo `GTI / GTI`, `PREFEITO` e `SADS` com os setores informados no mapeamento inicial.

## Deploy / Portainer

O projeto foi preparado para deploy via Portainer com base no `docker-compose.yml`.

Fluxo esperado:

1. `postgres` sobe primeiro
2. `api` depende do banco saudavel
3. `web` depende da API saudavel
4. o frontend consome a API via `/api`

Para atualizar uma stack ja publicada:

- usar `Re-pull image and redeploy` no Portainer quando houver mudanca de codigo, assets, Dockerfile ou build

## Observacoes operacionais

- o sistema possui suporte a cards arquivados e restauracao no board
- o board foi refinado para usar drag-and-drop, checklist, comentarios/historico e cards compactos
- a tela de projetos agrupa por secretaria, setor e pasta
- a tela de usuarios permite vincular membros a secretarias/setores
- a documentacao operacional detalhada da GTI esta sendo consolidada de forma privada no Notion

## Documentacao complementar

- Escopo do produto: `docs/escopo_sistema_gestao_projetos.docx`
- Wireframes: `docs/wireframes_sistema_gestao_projetos.html`
- Permissoes e organizacao: `docs/permissoes_organizacao.md`
- Modelagem: `backend/prisma/schema.prisma`
- Infra principal: `docker-compose.yml`

## Repositorios relacionados

- principal: `git@github.com:imagoel/gestao-de-projeto.git`
