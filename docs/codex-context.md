# Contexto de Handoff para Codex

Atualizado em: 2026-05-09

Este arquivo registra o estado operacional recente do projeto `gestao-gti` para facilitar a continuidade em novas sessoes do Codex.

## Objetivo atual do projeto

O `gestao-gti` e um sistema interno de gestao de projetos no estilo Kanban/Trello, criado para organizar os projetos da GTI e, progressivamente, de outras secretarias e setores.

O foco atual e manter uma interface enxuta e pratica para:
- organizar projetos por secretaria, setor e pasta;
- controlar acesso por vinculo organizacional;
- gerenciar projetos, quadros, cards, checklist e descricoes;
- reduzir cliques excessivos e manter a visualizacao compacta;
- dar suporte ao uso real em producao via Docker/Portainer.

## Branch atual e repositorios

- Branch principal: `main`
- Remoto principal: `origin`
- Repositorio principal: `github.com:imagoel/gestao-de-projeto.git`
- Ultimo commit conhecido: `58773c1 fix(ui): contain scroll hints and checklist drag`

Ha tambem um repositorio espelho usado para teste/trabalho colaborativo:
- `https://github.com/atncelso/ClonedoCorno.git`

O repositorio principal continua sendo `imagoel/gestao-de-projeto`.

## Arquivos principais alterados recentemente

Front-end:
- `frontend/src/pages/projects-page.tsx`
- `frontend/src/pages/project-board-page.tsx`
- `frontend/src/features/cards/card-checklist-section.tsx`
- `frontend/src/features/cards/card-comments-section.tsx`
- `frontend/src/styles.css`
- `frontend/src/services/api.ts`
- `frontend/src/types/api.ts`

Back-end:
- `backend/prisma/schema.prisma`
- `backend/src/projects/*`
- `backend/src/cards/*`
- `backend/src/checklist/*`
- `backend/src/comments/*`
- `backend/src/users/*`
- `backend/src/organizations/*` ou modulos equivalentes criados para secretarias/setores

Documentacao:
- `README.md`
- `docs/permissoes_organizacao.md`
- `docs/codex-context.md`

## Decisoes ja tomadas

- `gestao-gti` e um projeto-produto da GTI, usado para gerenciar outros projetos internos.
- Perfis globais continuam simples: `ADMIN` e `MEMBER`.
- O refinamento de permissao acontece por secretaria, setor, pasta e papel no projeto.
- Pastas sao obrigatorias para projetos.
- Projetos devem estar associados a uma pasta.
- Secretarias e setores estruturam a visualizacao das pastas.
- Membros veem apenas pastas/projetos permitidos pelo vinculo de setor/secretaria.
- Admins da GTI devem ter controle administrativo, mas a visualizacao tambem esta sendo refinada para nao expor tudo sem necessidade.
- Papeis no projeto:
  - `MANAGER` aparece para o usuario como `Gestor`.
  - `MEMBER` aparece como `Membro`.
  - `VIEWER` aparece como `Visualizador`.
- Gestor do projeto deve poder administrar o projeto conforme regras definidas, incluindo mover projeto entre pastas quando permitido.
- Membro do projeto pode criar/editar cards.
- Visualizador apenas visualiza.
- Cards arquivados nao somem do banco; ficam recuperaveis.
- Checklist e numerado e pode ser referenciado por `@1`, `@2`, etc.
- Clicar em uma referencia de checklist deve rolar/destacar o item correspondente.
- Descricao do card passou a funcionar como historico/comentario descritivo editavel.
- Quando uma descricao for editada, deve aparecer indicacao de edicao e horario.
- Cards do quadro devem ser compactos.
- Colunas do Kanban devem ter scroll interno invisivel, mantendo a pagina principal mais estavel.
- Ao chegar ao fim da coluna e tentar rolar/arrastar mais, deve aparecer uma sombra sutil de limite.
- Linhas horizontais de projetos por pasta devem ter scroll horizontal invisivel.
- Ao usar o scroll do mouse sobre a linha horizontal de projetos, a intencao e mover apenas a linha, sem mover a pagina inteira.
- No checklist, o checkbox nao deve iniciar drag acidental. O arraste deve comecar a partir do numero/texto do item para a direita.

## Observacoes importantes

- O workspace ativo recomendado e:
  - `/home/imagoel/projetos/gestao-gti`
- Em sessoes Windows/PowerShell, preferir comandos via WSL:

```bash
wsl -e bash -lc 'cd /home/imagoel/projetos/gestao-gti && <comando>'
```

- Historicamente, foi pedido para nao enviar `agents.md` nem a pasta `docs` ao GitHub, salvo pedido explicito em contrario.
- Este arquivo foi criado para continuidade de contexto. Antes de commitar `docs/codex-context.md`, confirmar se ele deve ou nao ir para o repositorio remoto.

## Problemas pendentes

- Validar visualmente se o scroll horizontal dos projetos nao move mais a pagina inteira quando a tela tambem tem scroll vertical.
- Confirmar se o listener nativo de wheel na linha horizontal ficou natural em mouse e touchpad.
- Confirmar se o handle de arrastar checklist esta confortavel e nao interfere mais no clique do checkbox.
- Validar se a sombra de limite inferior nas colunas do quadro esta perceptivel o suficiente.
- Revisar em producao as regras finais de:
  - admin;
  - gestor de projeto;
  - membro de projeto;
  - visualizador de projeto.
- Continuar refinando a tela de usuarios com:
  - busca;
  - filtros;
  - status ativo/inativo;
  - coluna de vinculos;
  - drawer lateral para editar acessos;
  - tela/modal para secretarias e setores.
- Avaliar se admins da GTI devem ver todos os setores da GTI por padrao e se membros devem ver somente setores vinculados.
- Continuar enriquecendo a base do Notion com sistemas, portas, dominios, servidores e procedimentos.

## Proximos passos recomendados

1. Rodar o front localmente e testar visualmente:
   - scroll horizontal das pastas;
   - scroll interno das colunas;
   - sombra no limite inferior;
   - drag do checklist;
   - clique no checkbox do checklist.

2. Testar regras de permissao com usuarios reais:
   - admin GTI;
   - membro comum;
   - gestor de projeto;
   - membro de projeto;
   - visualizador.

3. Refinar tela de usuarios:
   - trocar modal por drawer lateral para edicao de acessos;
   - adicionar busca, filtros e paginacao;
   - exibir vinculos de secretaria/setor.

4. Refinar tela de projetos:
   - garantir que pastas iniciem fechadas quando necessario;
   - manter hierarquia visual compacta;
   - validar se os projetos em linha horizontal estao fluidos.

5. Atualizar documentacao:
   - `README.md`;
   - `docs/permissoes_organizacao.md`;
   - Notion GTI Base de Conhecimento.

## Comandos importantes

Status e Git:

```bash
cd /home/imagoel/projetos/gestao-gti
git status -sb
git pull origin main
git log --oneline -10
```

Front-end:

```bash
cd /home/imagoel/projetos/gestao-gti/frontend
npm install
npm run dev
npm run build
```

Back-end:

```bash
cd /home/imagoel/projetos/gestao-gti/backend
npm install
npm run build
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

Docker Compose:

```bash
cd /home/imagoel/projetos/gestao-gti
docker compose config
docker compose up -d --build
docker compose logs -f api
docker compose logs -f web
```

Checagens uteis antes de commit:

```bash
cd /home/imagoel/projetos/gestao-gti
git diff --check
cd frontend && npm run build
cd ../backend && npm run build
```

## Ultimos commits relevantes

- `58773c1 fix(ui): contain scroll hints and checklist drag`
- `efa8785 fix(ui): strengthen scroll hint shadows`
- `35c179b fix(projects): improve folder row scrolling`
- `78a91b4 feat(cards): allow editing descriptions`
- `14a53fd feat(projects): refine folders and card references`
- `29053bf fix(access): adjust participant roles and permissions`
- `9e2e515 feat(cards): reference checklist items in descriptions`
- `ca88026 feat(ui): refine folder and checklist interactions`

## Nota para a proxima sessao

Comece conferindo:

```bash
cd /home/imagoel/projetos/gestao-gti
git status -sb
git log --oneline -5
```

Depois leia:
- `agents.md`
- `README.md`
- `docs/permissoes_organizacao.md`
- `docs/codex-context.md`
- `backend/prisma/schema.prisma`

Se a tarefa envolver interface, inspecione tambem:
- `frontend/src/pages/projects-page.tsx`
- `frontend/src/pages/project-board-page.tsx`
- `frontend/src/features/cards/card-checklist-section.tsx`
- `frontend/src/styles.css`
