# Permissoes e organizacao

Este documento registra a decisao atual de organizacao e acesso do sistema `gestao-gti`.

## Objetivo

O sistema deixou de ser usado apenas por um setor pequeno e passa a suportar outras secretarias e setores. Para isso, a visibilidade dos projetos agora parte da estrutura organizacional, sem criar muitos perfis globais.

## Estrutura conceitual

```txt
Secretaria
  Setor
    Pasta
      Projeto
        Board
          Colunas
            Cards
```

Regras principais:

- Secretaria agrupa setores.
- Setor agrupa pastas e usuarios.
- Pasta agrupa projetos e controla visibilidade.
- Projeto pertence obrigatoriamente a uma pasta.
- Projeto continua tendo exatamente um board.

## Perfis globais

### ADMIN

- Ve todos os projetos, pastas, setores e secretarias.
- Gerencia usuarios.
- Gerencia secretarias, setores e pastas.
- Cria projetos em qualquer pasta.
- Pode editar e apagar projetos.

### MEMBER

- Pode ser vinculado a um ou mais setores.
- Ve projetos em que participa.
- Ve projetos que criou.
- Ve projetos em pastas liberadas para seus setores ou secretarias.
- Pode criar projeto em pasta que consegue acessar.
- So edita cards, checklist, comentarios e colunas quando tambem participa do projeto.

## Papeis dentro do projeto

### MANAGER

- Papel de gerente dentro do projeto.
- Pode editar informacoes do projeto.
- Pode gerenciar membros.
- Pode apagar o projeto.

### MEMBER

- Papel operacional dentro do projeto.
- Pode criar e editar cards.
- Pode comentar.
- Pode criar, editar, reordenar e apagar checklist.
- Pode movimentar cards e colunas conforme as regras do projeto.

## Decisao sobre VIEWER

O papel `VIEWER` foi removido.

A leitura sem permissao de edicao agora e controlada pela visibilidade da pasta:

- usuario vinculado ao setor pode visualizar pastas `SECTOR` daquele setor;
- usuario vinculado a qualquer setor da secretaria pode visualizar pastas `SECRETARIAT` daquela secretaria;
- visualizar por pasta/setor nao concede permissao de escrita no projeto.

Se o usuario precisa editar, ele deve ser adicionado ao projeto como `MEMBER` ou `MANAGER`.

## Visibilidade da pasta

### SECTOR

A pasta fica visivel apenas para:

- admins;
- usuarios vinculados ao mesmo setor da pasta;
- participantes diretos de projetos dentro da pasta, quando o projeto e retornado por participacao.

### SECRETARIAT

A pasta fica visivel para:

- admins;
- usuarios vinculados a qualquer setor da mesma secretaria da pasta;
- participantes diretos de projetos dentro da pasta.

## Fluxos principais

### Criacao de usuario

O admin informa:

- nome;
- e-mail;
- senha;
- perfil global (`ADMIN` ou `MEMBER`);
- avatar opcional;
- setores vinculados.

Os setores vinculados definem quais pastas e projetos o membro consegue visualizar por regra organizacional.

### Criacao de pasta

O admin informa:

- nome da pasta;
- setor;
- visibilidade (`SECTOR` ou `SECRETARIAT`).

Pastas com projetos nao podem ser apagadas.

### Criacao de projeto

Todo projeto exige:

- nome;
- pasta;
- owner.

O owner e incluido automaticamente como `MANAGER`.

Membros adicionais entram como `MEMBER` por padrao.

### Acesso a projeto

Um usuario pode abrir um projeto se:

- for admin;
- for owner;
- for membro do projeto;
- tiver acesso a pasta do projeto pelo setor/secretaria.

Um usuario so pode editar o projeto/cards se:

- for admin;
- for owner;
- for `MANAGER`;
- for `MEMBER` do projeto.

## Seed inicial

O seed cria o admin inicial e a estrutura organizacional basica:

- `GTI`
  - `GTI`
- `PREFEITO`
  - `ASCOM`
  - `ASSES`
  - `CGB`
  - `CGM`
  - `CGP`
  - `Conselhos Municipais`
  - `Gab V. Prefeito`
  - `PIM`
  - `RECEP`
- `SADS`
  - `AFIN`
  - `COMP`
  - `CONT`
  - `DEMAS`
  - `DIHAB`
  - `DPSAC`
  - `DPSB`
  - `DPSE`
  - `GEPAT`
  - `GETRAB`
  - `GEVIS`
  - `PBF`
  - `PUBLICO`
  - `SAS`
  - `SUDES`
  - `SUHAB`
- `SEAFI`
- `SEAMA`
- `SECAC`
- `SEMED`
- `SEMOP`
- `SESAU`

O admin inicial tambem e vinculado ao setor `GTI / GTI`.

## APIs afetadas

### Organizacao

- `GET /api/organization/secretariats`
- `POST /api/organization/secretariats`
- `PATCH /api/organization/secretariats/:id`
- `DELETE /api/organization/secretariats/:id`
- `POST /api/organization/sectors`
- `PATCH /api/organization/sectors/:id`
- `DELETE /api/organization/sectors/:id`

### Usuarios

`POST /api/users` e `PATCH /api/users/:id` aceitam:

```json
{
  "sectorIds": ["uuid-do-setor"]
}
```

### Pastas

`POST /api/folders` aceita:

```json
{
  "name": "Projetos ASCOM",
  "sectorId": "uuid-do-setor",
  "visibility": "SECTOR"
}
```

`GET /api/folders` retorna apenas pastas visiveis para o usuario autenticado.

### Projetos

`POST /api/projects` exige:

```json
{
  "name": "Novo projeto",
  "folderId": "uuid-da-pasta"
}
```

`PATCH /api/projects/:id` pode alterar `folderId`, desde que o usuario tenha acesso a pasta alvo.

## Migracao

A migration `20260430000100_add_organization_access`:

- cria `secretariats`, `sectors` e `user_sectors`;
- adiciona `visibility` e `sector_id` em `project_folders`;
- torna `projects.folder_id` obrigatorio;
- atribui pastas e projetos legados ao fallback `GTI / GTI`;
- remove `VIEWER` do enum `ProjectRole`, convertendo registros antigos para `MEMBER`.

## Pontos de atencao

- O acesso por pasta/setor e leitura, nao permissao de edicao.
- Para editar, o usuario precisa ser participante do projeto.
- Pastas sao obrigatorias para novos projetos.
- Setores e secretarias ainda podem evoluir conforme a estrutura real da prefeitura for sendo refinada.
