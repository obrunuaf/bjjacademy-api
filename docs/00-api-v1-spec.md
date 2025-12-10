# BJJAcademy API v1 – Especificação (rascunho inicial)

> Este documento descreve a **API v1** do ecossistema **BJJAcademy / BJJAcademy Codex**.
> É um rascunho inicial para ser refinado com base nos documentos de escopo em `docs/escopo/`.

---

## 1. Visão geral

A BJJAcademy API v1 é a camada backend que centraliza:

- Autenticação e perfis de usuários (aluno, instrutor, professor, admin/staff).
- Domínio de academias, matrículas, turmas, aulas, presenças, faixas e graduações.
- Regras de negócio essenciais que hoje estão descritas em `docs/escopo/`.

### Objetivos principais

- Servir como backend único para:
  - **PWA / painel web** (BJJAcademy Codex).
  - **App mobile** (futuro).
  - Outras integrações futuras (ex.: scoreboard, painéis administrativos).
- Concentrar as regras de negócio em um só lugar (API), deixando:
  - Frontend = UI + UX.
  - API = regras + orquestração.
  - Banco (Supabase/Postgres) = persistência de dados.

---

## 2. Convenções gerais

### 2.1. Base URL e versão

- Base URL (exemplo):
  - Desenvolvimento: `https://api-dev.bjjacademy.com/v1`
  - Produção: `https://api.bjjacademy.com/v1`
- Todas as rotas descritas abaixo assumem o prefixo `/v1`.

### 2.2. Formato de dados

- **JSON** em requisição e resposta.
- `Content-Type: application/json; charset=utf-8`.

### 2.3. Autenticação

- Autenticação via **JWT Bearer** em headers:
  - `Authorization: Bearer <token>`
- Endpoints públicos (ex.: registro, login, esqueci a senha) NÃO exigem token.
- Demais endpoints exigem token e, em vários casos, checagem de papel (role).

### 2.4. Papéis (roles) e controle de acesso

Papéis esperados (detalhes em `docs/escopo/01-contexto-produto-e-personas.md`):

- `ALUNO`
- `INSTRUTOR`
- `PROFESSOR`
- `ADMIN` / `STAFF` (nome exato a definir conforme docs/escopo)

Controle de acesso:

- Alguns endpoints são **abertos** (registro, login).
- Alguns são restritos a **qualquer usuário autenticado**.
- Outros exigem nível específico (ex.: só professor/admin).

---

## 3. Recursos e endpoints

A seguir, os recursos principais e seus endpoints planejados para a v1.

> ⚠ Campos exatos de request/response ainda serão refinados com base em
> `docs/escopo/02-dominios-de-negocio-bjj.md` e `docs/escopo/08-modelo-de-dados-conceitual.md`.

---

### 3.1. Autenticação & Conta (Auth)

**Objetivo:** controlar registro, login e ciclo de vida de acesso do usuário.

#### 3.1.1. POST /auth/register

- **Descrição:** Registro de novo usuário (aluno por padrão), possivelmente vinculado a uma academia via código de convite.
- **Acesso:** Público.
- **Fluxo:** cria usuário + matrícula inicial (detalhes conforme docs/escopo).

#### 3.1.2. POST /auth/login

- **Descrição:** Login com email/senha.
- **Acesso:** Público.
- **Resposta:** retorna JWT + dados básicos do usuário (incluindo papel principal e academia associada).

#### 3.1.3. GET /auth/me

- **Descrição:** Retorna dados do usuário autenticado.
- **Acesso:** Autenticado (qualquer papel).

#### 3.1.4. POST /auth/refresh (opcional v1)

- **Descrição:** Atualiza token de acesso a partir de um refresh token (se adotado na v1).
- **Acesso:** Autenticado.

#### 3.1.5. POST /auth/forgot-password

- **Descrição:** Inicia fluxo de “esqueci a senha” (envio de email com código/URL).
- **Acesso:** Público.

#### 3.1.6. POST /auth/reset-password

- **Descrição:** Finaliza redefinição de senha usando token/código enviado ao usuário.
- **Acesso:** Público, mas vinculado a token de reset válido.

---

### 3.2. Usuários & Perfis

**Objetivo:** manter dados de usuários (alunos e staff) e permitir atualização de perfil.

#### 3.2.1. GET /users/me

- **Descrição:** Retorna perfil completo do usuário autenticado (dados pessoais + vínculos principais).
- **Acesso:** Autenticado.

#### 3.2.2. PATCH /users/me

- **Descrição:** Atualiza campos de perfil do próprio usuário (telefone, data de nascimento, gênero, etc.).
- **Acesso:** Autenticado.

#### 3.2.3. GET /users

- **Descrição:** Lista de usuários da academia atual (para quem tem permissão, ex.: staff/professor).
- **Acesso:** Autenticado, com papel adequado (ex.: INSTRUTOR, PROFESSOR, ADMIN).
- **Filtros:** papel, status, busca por nome/email.

#### 3.2.4. GET /users/:id

- **Descrição:** Detalhes de um usuário específico (aluno/staff) dentro da mesma academia.
- **Acesso:** Autenticado com permissão adequada.

#### 3.2.5. PATCH /users/:id/roles

- **Descrição:** Atualiza papéis de um usuário (ex.: promover de aluno para instrutor).
- **Acesso:** Restrito a ADMIN/PROFESSOR (detalhar conforme docs/escopo).

---

### 3.3. Academias & Matrículas

**Objetivo:** gerenciar academias, código de convite e vínculo de usuários via matrículas.

#### 3.3.1. GET /academias

- **Descrição:** Lista academias disponíveis (para contexto de multi-tenant, se aplicável).
- **Acesso:** STAFF (dependendo da estratégia multi-academia) ou apenas ADMIN global.

#### 3.3.2. GET /academias/:id

- **Descrição:** Detalhes de uma academia específica.
- **Acesso:** STAFF da academia ou ADMIN.

#### 3.3.3. GET /academias/:id/matriculas

- **Descrição:** Lista de matrículas de alunos de uma academia.
- **Acesso:** STAFF/PROFESSOR da academia.

#### 3.3.4. POST /academias/:id/matriculas

- **Descrição:** Cria nova matrícula para um usuário (ex.: staff adicionando aluno).
- **Acesso:** STAFF/PROFESSOR/ADMIN.

#### 3.3.5. GET /matriculas/:id

- **Descrição:** Detalhes de uma matrícula específica (inclui aluno, academia, status, número de matrícula).
- **Acesso:** STAFF/PROFESSOR da mesma academia ou o próprio aluno vinculado.

> Em algumas implementações, a matrícula do aluno pode ser tratada também via `/alunos/:id/matriculas`.  
> Este ponto será refinado a partir de `docs/escopo`.

---

### 3.4. Turmas & Aulas

**Objetivo:** organizar turmas, horários e aulas agendadas.

#### 3.4.1. GET /turmas

- **Descrição:** Lista turmas da academia do usuário autenticado.
- **Acesso:** STAFF/PROFESSOR; alunos podem ver turmas às quais estão vinculados.

#### 3.4.2. GET /turmas/:id

- **Descrição:** Detalhes de uma turma específica (horário, professor, alunos).
- **Acesso:** STAFF/PROFESSOR; aluno matriculado pode visualizar.

#### 3.4.3. POST /turmas

- **Descrição:** Cria nova turma (nome, faixa alvo, horário, professor responsável etc.).
- **Acesso:** STAFF/ADMIN.

#### 3.4.4. PATCH /turmas/:id

- **Descrição:** Atualiza informações da turma.
- **Acesso:** STAFF/ADMIN.

#### 3.4.5. GET /turmas/:id/aulas

- **Descrição:** Lista aulas (ocorrências) associadas à turma.
- **Acesso:** STAFF/PROFESSOR; alunos matriculados podem ver.

#### 3.4.6. POST /turmas/:id/aulas

- **Descrição:** Agenda nova aula para a turma (data, hora, tipo de treino).
- **Acesso:** STAFF/PROFESSOR.

#### 3.4.7. GET /aulas/hoje

- **Descrição:** Lista aulas do dia para a academia/usuário atual (para check-in rápido).
- **Acesso:** Autenticado.

#### 3.4.8. GET /aulas/:id

- **Descrição:** Detalhes de uma aula específica.
- **Acesso:** STAFF/PROFESSOR; alunos matriculados podem ver.

---

### 3.5. Presenças

**Objetivo:** registrar e consultar presenças em aulas.

#### 3.5.1. GET /aulas/:id/presencas

- **Descrição:** Lista presenças de uma aula (quem compareceu, quem faltou).
- **Acesso:** STAFF/PROFESSOR da turma.

#### 3.5.2. POST /aulas/:id/presencas

- **Descrição:** Registra ou atualiza presenças para uma aula (ex.: marca alunos presentes).
- **Acesso:** STAFF/PROFESSOR.

#### 3.5.3. GET /alunos/:id/presencas

- **Descrição:** Histórico de presenças do aluno (resumo geral ou filtrado por período).
- **Acesso:** STAFF/PROFESSOR da mesma academia; o próprio aluno pode ver o próprio histórico.

#### 3.5.4. GET /presencas

- **Descrição:** Consulta geral de presenças (com filtros por data, turma, aluno).
- **Acesso:** STAFF/PROFESSOR/ADMIN.

---

### 3.6. Faixas & Graduações

**Objetivo:** registrar faixas, graus e histórico de evolução do aluno.

#### 3.6.1. GET /faixas

- **Descrição:** Lista de faixas configuradas no sistema (adulto/infantil, cores, regras).
- **Acesso:** Autenticado (todas as roles).

#### 3.6.2. GET /alunos/:id/graduacoes

- **Descrição:** Histórico de graduações (faixa/ grau / data / professor que graduou).
- **Acesso:** STAFF/PROFESSOR da mesma academia; o próprio aluno pode ver o próprio histórico.

#### 3.6.3. POST /graduacoes

- **Descrição:** Registra nova graduação (alteração de faixa ou grau) para um aluno.
- **Acesso:** Professor/Instrutor com permissão.

#### 3.6.4. PATCH /graduacoes/:id

- **Descrição:** Ajusta dados de uma graduação já registrada (ex.: correção de data ou observação).
- **Acesso:** STAFF/PROFESSOR/ADMIN.

---

## 4. Padrões de resposta e erros (a definir)

- **200 OK** – sucesso em GET/PATCH.
- **201 Created** – criação bem-sucedida em POST.
- **400 Bad Request** – validação de campos.
- **401 Unauthorized** – falta de token ou token inválido.
- **403 Forbidden** – sem permissão (role/academia não autorizada).
- **404 Not Found** – recurso não encontrado (ou não pertence à academia do usuário).
- **422 Unprocessable Entity** – erros de regra de negócio específicas (opcional).
- **500 Internal Server Error** – erro inesperado.

Formato de erro padrão será detalhado após revisão com base nas necessidades do frontend.

---

## 5. Pontos pendentes para refinamento

Os seguintes itens devem ser refinados com base na documentação funcional (`docs/escopo`) e nas decisões de arquitetura:

- Estrutura exata dos DTOs de request/response para cada endpoint.
- Regras de negócio específicas por papel (ALUNO x INSTRUTOR x PROFESSOR x ADMIN) em cada rota.
- Estratégia final de autenticação (incluir ou não refresh token na v1).
- Nomes finais dos papéis/roles conforme o projeto já utiliza.
- Quais endpoints entram de fato na **v1** e quais ficam para versões futuras.
