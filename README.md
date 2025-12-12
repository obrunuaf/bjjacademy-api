# BJJAcademy API v1

Backend NestJS para autenticar, gerir check-ins/dashboards e operar academias BJJAcademy/Codex. Prefixo global `/v1`, Swagger em `/v1/docs`.

## Requisitos
- Node.js 18+ e npm
- Banco PostgreSQL (Supabase recomendado)

## Instalacao e ambiente
```bash
npm install
cp .env.example .env
```
Preencha:
- `DATABASE_URL=postgresql://...` (string do Supabase/Postgres; use `?sslmode=require` no Supabase)
- `JWT_SECRET=chave-super-forte` (obrigatorio, nao commitar)
- Opcionais: `JWT_EXPIRES_IN=1h`, `PORT=3000`, `QR_TTL_MINUTES=5`
- Timezone/SSL:
  - `APP_TIMEZONE=America/Sao_Paulo` (usado para calcular janela de "hoje" em UTC)
  - `PG_SSL=true` (default true para Supabase)
  - `PG_SSL_REJECT_UNAUTHORIZED=false` (DEV/POC evita erro de self-signed)
  - `SUPABASE_CA_CERT_PATH=` (usado apenas se futuramente habilitar verify-full em prod)

## Banco de dados (Supabase/Postgres)
Aplicar os scripts na ordem:
1) `sql/001-init-schema.sql`
2) `sql/003-seed-faixas-e-regras-base.sql`
3) `sql/002-seed-demo-completa.sql`

No Supabase: abra SQL Editor, cole cada arquivo e execute na ordem acima. Em Postgres local: `psql "$DATABASE_URL" -f sql/001-init-schema.sql` (repita para os demais).

## Dashboard e regras de graduacao
- `GET /v1/dashboard/aluno` depende de `regras_graduacao` para a `faixa_atual_slug` do usuario na academia do token.
- `metaAulas`: usa `meta_aulas_no_grau` se > 0; se vazio/0, usa `aulas_minimas` se > 0; se ainda sem valor, cai para `DEFAULT_META_AULAS = 60`.
- `progressoPercentual`: se `metaAulas <= 0` retorna `0`; senao `floor(aulasNoGrauAtual * 100 / metaAulas)` limitado a `100`.
- Seeds `sql/003-seed-faixas-e-regras-base.sql` e `sql/002-seed-demo-completa.sql` agora trazem metas > 0 (inclusive faixa preta). A tabela tem CHECK para impedir zeros; para "desativar" uma regra use `NULL` nos campos e deixe o fallback assumir.

## Rodar a API
```bash
npm run start:dev
```
Swagger: `http://localhost:3000/v1/docs`

## Como autenticar no Swagger
- Abra `http://localhost:3000/v1/docs` e clique em **Authorize** (esquema `JWT`).
- Chame `POST /v1/auth/login`, copie **apenas** o valor de `accessToken` (sem prefixar `Bearer`).
- No modal Authorize, cole somente o token; o esquema bearer monta `Authorization: Bearer <token>`.
- O Swagger so envia o header para rotas anotadas com `@ApiBearerAuth('JWT')` (todas as privadas usam `@ApiAuth()` para isso).
- Rode `GET /v1/auth/me` (ou outras rotas) e valide o 200.
- O Swagger agora mantem o token entre refreshes (`persistAuthorization: true`).
- Exemplo rapido (token tambem funciona no Swagger):
  ```bash
  # login
  ACCESS_TOKEN=$(curl -s -X POST http://localhost:3000/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"aluno.seed@example.com","senha":"SenhaAluno123"}' \
    | jq -r .accessToken)

  # perfil autenticado
  curl http://localhost:3000/v1/auth/me -H "Authorization: Bearer $ACCESS_TOKEN"
  ```

## Multi-tenant
Todas as consultas devem ser filtradas pelo `academiaId` presente no JWT. Os dashboards ja aplicam esse filtro em matriculas, aulas, presencas e regras de graduacao.

## Multi-role (seed)
- Tokens agora carregam `role` (papel principal) **e** `roles` (todos os papeis do usuario na academia do token). Prioridade do papel principal: `TI` > `ADMIN` > `PROFESSOR` > `INSTRUTOR` > `ALUNO`.
- Nos seeds, instrutor/professor/admin/ti tambem tem papel **ALUNO** na mesma academia, entao endpoints `@Roles('ALUNO')` aceitam esses tokens.
- Swagger: basta autorizar normalmente; o token ja leva `roles`.

Exemplo com o professor seed acessando rota de aluno (`/v1/checkin/disponiveis`):
```bash
PROF_TOKEN=$(curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"professor.seed@example.com","senha":"SenhaProfessor123"}' | jq -r .accessToken)

curl http://localhost:3000/v1/checkin/disponiveis \
  -H "Authorization: Bearer $PROF_TOKEN"
```

## Timezone e "hoje"
- O backend calcula a janela de "hoje" com base em `APP_TIMEZONE` (padrao `America/Sao_Paulo`) usando SQL (`date_trunc`), gerando [startUtc, endUtc) para filtrar `aulas.data_inicio` (timestamptz).
- Endpoints que usam "hoje": `GET /v1/aulas/hoje` e contadores do `GET /v1/dashboard/staff`.
- Futuro multi-tenant: substituir por `academias.timezone` (TODO).

## SSL com Supabase (DEV vs PROD)
- DEV/POC: defina `PG_SSL=true` e `PG_SSL_REJECT_UNAUTHORIZED=false` para evitar o erro `self-signed certificate in certificate chain` no Supabase. Para conexoes locais (`localhost`) o SSL e desabilitado por padrao.
- Producao (TODO): usar verify-full com o CA do Supabase (`PG_SSL=true`, `PG_SSL_REJECT_UNAUTHORIZED=true` e `SUPABASE_CA_CERT_PATH` apontando para o certificado baixado no dashboard). A leitura do CA e configuracao de `ssl.ca` sera implementada no passo 3B.

## Teste rapido (curl)
```bash
# Login
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"aluno.seed@example.com","senha":"SenhaAluno123"}'

# Perfil autenticado
ACCESS_TOKEN="<copie-do-login>"
curl http://localhost:3000/v1/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Dashboard do aluno (real, filtra academiaId do token)
curl http://localhost:3000/v1/dashboard/aluno \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Detalhe do aluno (ALUNO so pode o proprio id; staff consulta alunos da mesma academia)
ALUNO_ID="<id-do-aluno-ou-do-proprio-usuario>"
curl http://localhost:3000/v1/alunos/$ALUNO_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Evolucao do aluno (graduacoes + progresso de presencas)
curl http://localhost:3000/v1/alunos/$ALUNO_ID/evolucao \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Turmas da academia (todos os roles)
curl http://localhost:3000/v1/turmas \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Aulas do dia (staff INSTRUTOR/PROFESSOR/ADMIN/TI)
curl http://localhost:3000/v1/aulas/hoje \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Dashboard staff (usa janela de hoje no timezone configurado)
curl http://localhost:3000/v1/dashboard/staff \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```
Exemplo de resposta com os seeds (sem aulas futuras depois de 2025-11):
```json
{
  "proximaAulaId": null,
  "proximaAulaHorario": null,
  "proximaAulaTurma": null,
  "aulasNoGrauAtual": 20,
  "metaAulas": 60,
  "progressoPercentual": 33,
  "statusMatricula": "ATIVA"
}
```
Dashboard staff (mesmo cenario, data fora do calendario das seeds):
```json
{
  "alunosAtivos": 5,
  "aulasHoje": 0,
  "presencasHoje": 0,
  "faltasHoje": 0
}
```

## Check-in & Presencas (MVP real)
- Endpoints protegidos com `@ApiAuth()` no Swagger (`/v1/docs`); clique em **Authorize** e cole somente o `accessToken` do login.
- Usa `APP_TIMEZONE` para a janela de "hoje" ([startUtc, endUtc)) e `QR_TTL_MINUTES` (default `5`) para o vencimento do QR.
- ALUNO so enxerga a propria presenca; STAFF acessa apenas a academia do token.

Fluxo rapido (curl):
```bash
# logins
ALUNO_TOKEN=$(curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"aluno.seed@example.com","senha":"SenhaAluno123"}' | jq -r .accessToken)
STAFF_TOKEN=$(curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"instrutor.seed@example.com","senha":"SenhaInstrutor123"}' | jq -r .accessToken)

# aulas disponiveis hoje para check-in do aluno
curl http://localhost:3000/v1/checkin/disponiveis \
  -H "Authorization: Bearer $ALUNO_TOKEN"

# gerar QR de uma aula (staff) e extrair token
AULA_ID="<copie uma aula de /checkin/disponiveis ou /aulas/hoje>"
QR=$(curl -s http://localhost:3000/v1/aulas/$AULA_ID/qrcode \
  -H "Authorization: Bearer $STAFF_TOKEN")
QR_TOKEN=$(echo "$QR" | jq -r .qrToken)

# check-in via QR (ALUNO) -> status PRESENTE
curl -X POST http://localhost:3000/v1/checkin \
  -H "Authorization: Bearer $ALUNO_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"aulaId\":\"$AULA_ID\",\"tipo\":\"QR\",\"qrToken\":\"$QR_TOKEN\"}"

# check-in manual (ALUNO) -> status PENDENTE
curl -X POST http://localhost:3000/v1/checkin \
  -H "Authorization: Bearer $ALUNO_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"aulaId\":\"$AULA_ID\",\"tipo\":\"MANUAL\"}"

# pendencias do dia (STAFF)
curl http://localhost:3000/v1/presencas/pendencias \
  -H "Authorization: Bearer $STAFF_TOKEN"

# aprovar/ajustar presenca (STAFF)
PRESENCA_ID="<id retornado em pendencias>"
curl -X PATCH http://localhost:3000/v1/presencas/$PRESENCA_ID/status \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"PRESENTE"}'

# historico do aluno (ALUNO so o proprio; STAFF mesma academia)
ALUNO_ID="<id do aluno>"
curl "http://localhost:3000/v1/alunos/$ALUNO_ID/historico-presencas?from=2025-01-01" \
  -H "Authorization: Bearer $ALUNO_TOKEN"
```

## Seed personas (Academia Seed BJJ)
- ALUNO: `aluno.seed@example.com` / `SenhaAluno123`
- INSTRUTOR: `instrutor.seed@example.com` / `SenhaInstrutor123`
- PROFESSOR: `professor.seed@example.com` / `SenhaProfessor123`
- ADMIN: `admin.seed@example.com` / `SenhaAdmin123`
- TI: `ti.seed@example.com` / `SenhaTi123`
- Se alterar `JWT_SECRET`, todos os tokens antigos (emitidos antes da troca) deixam de funcionar.

## Estado atual da API
- **Real (Postgres):** `POST /v1/auth/login`, `GET /v1/auth/me`, `GET /v1/auth/convite/:codigo`, `POST /v1/auth/register`, `GET /v1/dashboard/aluno`, `GET /v1/dashboard/staff`, `GET /v1/alunos`, `GET /v1/alunos/:id`, `GET /v1/alunos/:id/evolucao`, `GET /v1/alunos/:id/historico-presencas`, `GET /v1/turmas`, `GET /v1/aulas/hoje`, `GET /v1/aulas/:id/qrcode`, `GET /v1/checkin/disponiveis`, `POST /v1/checkin`, `GET /v1/presencas/pendencias`, `PATCH /v1/presencas/:id/status`.
- **Stub/mock (retorno provisorio):** `GET /v1/config/*`, `POST /v1/invites`, `POST /v1/graduacoes`, `POST /v1/auth/refresh`, `POST /v1/auth/forgot-password`, `POST /v1/auth/reset-password`.
- Prefixo global `/v1`; Swagger em `/v1/docs`.
