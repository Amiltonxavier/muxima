# Catálogo de Erros da API — Muxima

> **Estado:** Normalizado. As secções 1–7 e o Anexo A são o **registo histórico da auditoria** (recolha do estado anterior, sem alterações) e foram mantidos intactos como base do trabalho.
> **Estado actual:** ver **[8. Estado após normalização](#8-estado-após-normalização)** e **[9. Riscos residuais](#9-riscos-residuais)**.
> **Ramo auditado:** `big-refactor` (working tree com 21 alterações não commitadas).
> **Objectivo:** servir de base à fase de normalização (padrão oficial de erros, códigos, estrutura, tradução PT-PT, eliminação de inconsistências).

A API do Muxima tem **três superfícies** de entrada HTTP:

| Superfície | Transporte | Implementação |
| ---------- | ---------- | ------------- |
| REST | `GET/POST/PATCH/DELETE /api/v1/...` | Fastify — rotas em `packages/api/src/modules/*/routes.ts` |
| oRPC | `/rpc/*` (namespace por domínio) | `packages/api/src/routers/*.ts` + `apps/server/src/index.ts` |
| Auth | `/api/auth/*` | Proxy Better Auth em `packages/api/src/app.ts` |

A **validação de input** vive em dois sítios diferentes consoante o transporte: REST usa maioritariamente `schema.parse()` manual + `validateEnum` silencioso; oRPC usa `.input(zodSchema)` obrigatório.

---

## 1. Padrão Global de Erros (verificação no código)

### 1.1 Handler global REST

- **Registo:** `fastify.setErrorHandler(errorHandler)` — `packages/api/src/app.ts:31`.
- **Implementação:** `packages/api/src/shared/errors/error-handler.ts:15-36`.
- **Envelope oficial REST:**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Utilizador não encontrado"
  }
}
```

- **Regras do handler** (`error-handler.ts`):
  - Todos os erros passam por `mapError` (`shared/errors/map-error.ts:47-91`);
  - Erros inesperados (status ≥ 500 e não `AppError`) → log completo do original (`error-handler.ts:23`); nunca vai para o cliente;
  - A resposta é sempre `reply.status(statusCode).send({ error: { code, message } })` (`error-handler.ts:30-35`).

### 1.2 Mapeamento `mapError` (`shared/errors/map-error.ts`)

| Erro de origem | Resultado | Status | Code | Mensagem (default) | Origem |
| -------------- | --------- | ------ | ---- | ------------------- | ------ |
| `AppError` (qualquer subclasse) | pass-through | original | original | original | `map-error.ts:48-49` |
| `ZodError` | `ValidationError` | 422 | `VALIDATION_ERROR` | `"Dados inválidos"` + `details: error.flatten()` (issues EN do Zod) | `map-error.ts:51` |
| Fastify erro 4xx (rate-limit, parsing body, media type) | `AppError` genérico | statusCode do Fastify | code do Fastify (ex.: `FST_ERR_RATE_LIMIT`) | `error.message` da biblioteca (EN); fallback `"Bad request"` | `map-error.ts:60-66` |
| Prisma `P2022` (schema/migration drift) | `InternalError` | 500 | `INTERNAL_SERVER_ERROR` | `"Não foi possível carregar os dados devido a um problema de configuração. Tente novamente ou contacte o administrador."` | `map-error.ts:15-16, 75` |
| Prisma `P2025` (registo não encontrado) | `NotFoundError` | 404 | `NOT_FOUND` | `"O registo solicitado não foi encontrado"` | `map-error.ts:18, 78` |
| Prisma `P2002` (unique constraint) | `ConflictError` | 409 | `CONFLICT` | `"Já existe um registo com estes dados"` | `map-error.ts:19, 81` |
| Prisma `P2003` (foreign key) | `BadRequestError` | 400 | `BAD_REQUEST` | `"Referência inválida a outro registo"` | `map-error.ts:20, 84` |
| Prisma código `P*` desconhecido | `InternalError` | 500 | `INTERNAL_SERVER_ERROR` | `"Internal server error"` | `map-error.ts:88` |
| Qualquer outro `Error` (incl. `throw new Error(...)` plain) | `InternalError` | 500 | `INTERNAL_SERVER_ERROR` | `"Internal server error"` (mensagem original **perdida** para o cliente) | `map-error.ts:90` |

> ⚠️ **Ponto crítico verificado:** qualquer `throw new Error("mensagem PT-PT")` no código (ex.: `requireEventAccess`) chega ao cliente como **500 `INTERNAL_SERVER_ERROR` "Internal server error" (EN)** — a mensagem útil é engolida.

A detecção de erros Prisma é por *shape* (não `instanceof`): `name === "PrismaClientKnownRequestError"` e `code` que começa por `P` — `map-error.ts:29-45`.

### 1.3 Classes de erro — `shared/errors/app-error.ts`

| Classe | Default message | Status | Code | Linha |
| ------ | --------------- | ------ | ---- | ----- |
| `AppError` (base) | — | — | — | `:3-10` |
| `BadRequestError` | `"Bad request"` (EN) | 400 | `BAD_REQUEST` | `:13` |
| `UnauthorizedError` | `"Unauthorized"` (EN) | 401 | `UNAUTHORIZED` | `:19` |
| `ForbiddenError` | `"Forbidden"` (EN) | 403 | `FORBIDDEN` | `:25` |
| `NotFoundError` | `"Not found"` (EN) | 404 | `NOT_FOUND` | `:31` |
| `ConflictError` | `"Conflict"` (EN) | 409 | `CONFLICT` | `:37` |
| `ValidationError` | `"Validation error"` (EN) | 422 | `VALIDATION_ERROR` | `:44` |
| `InternalError` | `"Internal server error"` (EN) | 500 | `INTERNAL_SERVER_ERROR` | `:51` |

Os **defaults são EN**; em quase todos os pontos do negócio as subclasses são instanciadas com mensagens PT-PT explícitas.

### 1.4 Mapper oRPC — `packages/api/src/index.ts`

- **Middleware `errorMapper`** (`index.ts:19-39`), usado por `publicProcedure`; `protectedProcedure` adiciona auth:
  - `ORPCError` já lançado → repassado (`index.ts:29`);
  - **AppError → `new ORPCError(code, { status, message, cause })`** (`index.ts:33-38`) — código e mensagem preservados, envelope de transporte da biblioteca;
  - `ZodError` → **422** com `message: "Dados inválidos"` — **`details` (flatten) são descartados** no oRPC (ao contrário do handler REST, que também não os envia — na prática os issues EN do Zod **nunca** chegam ao cliente);
  - Erro inesperado → `console.error("[rpc] Unhandled error:", error)` (`index.ts:32`) + `ORPCError` 500 `"Internal server error"`.
- **`requireAuth`** (`index.ts:44-50`): sem sessão → `ORPCError("UNAUTHORIZED")` (mensagem default EN da biblioteca).
- **`requireActiveUser`** (`index.ts:52-82`): sem user id ou utilizador não existente → `UNAUTHORIZED`; conta `status === "BLOCKED"` → `ORPCError("FORBIDDEN", { message: BLOCKED_USER_MESSAGE })` — **PT-PT**: `"A tua conta está bloqueada. Contacta o suporte para a desbloquear."` (`packages/auth/src/index.ts:12-13`).
- **Envelope de transporte oRPC:** gerado pela biblioteca `@orpc/server@1.15.0` a partir de `ORPCError` — em JSON: `{ defined, code, status, message, data }` (ver `ORPCError.toJSON()` em `@orpc/client`). **Não é** o mesmo envelope literal do REST, embora derive do mesmo `mapError`.
- **Interceptor `onError`** do servidor (`apps/server/src/index.ts:16-19` e `:29-32`): apenas `console.error(error)` — não altera a resposta.

### 1.5 Proxy Better Auth — `app.ts:46-81`

- Rota `GET|POST /api/auth/*` com rate-limit próprio `max: 20, timeWindow: "1 minute"` (`app.ts:49-53`);
- Repassa para `auth.handler(req)`; **as respostas de erro são 100% nativas do Better Auth** (EN, formato `{ error: { code, message, status } }` sem o envelope do projeto);
- **Catch-all** (`app.ts:68-79`): qualquer excepção do handler → log `"Authentication Error:"` e resposta fixa:

```json
{ "error": { "code": "UNAUTHORIZED", "message": "Sessão inválida" } }
```

- O comentário do código (linhas 71-73) explica que é **deliberado** devolver 401 para o frontend distinguir "sem sessão" de 500.
- Config Better Auth (`packages/auth/src/index.ts`): `emailAndPassword.enabled`, campo `status` (`ACTIVE|BLOCKED`, `input: false`); hook `session.create.before` bloqueia login de conta bloqueada com `APIError("FORBIDDEN", { message: BLOCKED_USER_MESSAGE, code: "ACCOUNT_BLOCKED" })` (`:58-66`) — **único uso do code `ACCOUNT_BLOCKED`** no projecto; activity logs `"Início de sessão"`/`"Fim de sessão"` em PT-PT (`:79, :92`); plugin `customSession` adiciona `roles`/`permissions` à sessão.

### 1.6 Outros pontos globais

- **Health check:** `GET /` → `"OK"` (sem envelope) — `app.ts:85`.
- **Rate limit global:** `@fastify/rate-limit` `max: 100, timeWindow: "1 minute"` em todas as rotas (`app.ts:24-27`). A mensagem é a default **EN** da biblioteca (ex.: `"Rate limit exceeded, retry in 1 minute"`), code `FST_ERR_RATE_LIMIT`, status 429, passada por `mapError` sem tradução.
- **404 sem match oRPC/OpenAPI:** `/rpc/*` e `/api-reference/*` sem procedure → `reply.status(404).send()` **sem corpo** (`apps/server/src/index.ts:55, :61`).
- **Middleware de sessão REST:** `authMiddleware` (`shared/auth/auth-middleware.ts:8-14`) **nunca responde erro** — falha na sessão → `request.session = null`; as rotas respondem 401 manualmente.
- **`context.ts`:** `createContext` chama `auth.api.getSession` **sem try/catch**; falha → propaga para o `errorMapper` oRPC → 500.
- **Worker de fundo:** `jobs/event-lifecycle.ts` — falhas são `console.error` internas (`:124, :130`); excepções de notificação engolidas (`catch {}`, `:117-119`). **Nunca chegam ao cliente.**
- **Validações partilhadas** (`shared/validation/`): PT-PT (ver inventário na secção 3).
- **Schemas Zod partilhados** (`shared/schemas/filters.ts`, `supplier-category-fields.ts`): **nenhuma mensagem custom** — issues EN do Zod (ver secção 3).
- **`validateEnum`** (`shared/utils/validate-enum.ts:12-19`): **não lança** — devolve `undefined` para valores inválidos (filtros inválidos em REST são silenciosamente ignorados, ao contrário do oRPC que rejeita com 422).
- **Não existe camada de i18n/l10n** — todas as mensagens são strings hardcoded.

### 1.7 Conclusão sobre padronização

1. **Existe um padrão parcial** — envelope `{ error: { code, message } }` definido no handler global REST e replicado semanticamente no oRPC via `mapError` (codes `BAD_REQUEST`/`UNAUTHORIZED`/`FORBIDDEN`/`NOT_FOUND`/`CONFLICT`/`VALIDATION_ERROR`/`INTERNAL_SERVER_ERROR`).
2. **Onde está implementado:** `shared/errors/error-handler.ts` + `shared/errors/map-error.ts` (REST) e `packages/api/src/index.ts` (oRPC).
3. **Estrutura oficial:** REST `{ error: { code, message } }`; oRPC envelope nativo da biblioteca com os mesmos `code`/`status`/`message`.
4. **Rotas que seguem o padrão:** todas as REST registadas em `registerRoutes` passam pelo handler global; **mas** muitas rotas REST respondem erros **manualmente** (401 `"Unauthorized"` inline, 404 via helpers locais) em vez de usar o handler.
5. **Rotas fora do padrão:** `/api/auth/*` (formato Better Auth nativo), 404 sem corpo em `/rpc/*` e `/api-reference/*`, e todos os pontos onde um `throw new Error(...)` plain vira 500 EN.
6. **Múltiplos formatos:** sim — REST envelope projecto, oRPC envelope biblioteca, Better Auth envelope próprio, 404 sem corpo.
7. **Mensagens em EN:** sim — `"Unauthorized"` (dezenas de blocos inline), defaults das classes, rate-limit, parsing Fastify, Zod issues, Better Auth, `ORPCError` sem message.
8. **Mensagens em PT-PT:** sim, dominantes nas regras de negócio (services/rules/schemas com message custom).
9. **Mensagens inconsistentes/duplicadas:** sim — ver secção `# 6. Inconsistências`.

---

## 2. Auditoria por Rota

Legenda:

- **Estrutura** nas tabelas refere a resposta JSON de erro tal como o cliente a recebe naquela camada:
  - `ENV` = envelope REST `{ error: { code, message } }`
  - `RPC` = envelope oRPC nativo `{ defined, code, status, message, data? }` (mesmos `code`/`message` do projecto)
  - `BA` = formato nativo Better Auth `{ error: { code, message, status } }`
  - `EMPTY` = corpo vazio
- **Origem** = `ficheiro:linha`. Para mensagens de bibliotecas (Zod/Prisma/Fastify/Better Auth/oRPC) indica-se explicitamente.
- **Idioma** = `EN` / `PT-PT` / `PT-BR` / `MIXED` / `UNKNOWN`.
- Erros comuns por herança (não repetidos em cada rota onde for óbvio): **REST 401 inline** `Unauthorized` (EN, manual) e **oRPC 401/403** via middleware (`index.ts`). Sempre que uma rota oRPC usa `protectedProcedure`, herda:
  - 401 `UNAUTHORIZED` sem sessão (EN default da biblioteca);
  - 403 `FORBIDDEN` + `"A tua conta está bloqueada. Contacta o suporte para a desbloquear."` (PT-PT) para conta bloqueada.
- Erros Prisma implícitos (P2025/P2002/P2003/P2022) aplicam-se a qualquer operação de escrita/leitura; apenas se documentam quando relevantes para a rota.

---

### 2.1 EVENTS — REST

**Módulo:** events · **Arquivo:** `packages/api/src/modules/events/routes.ts` · **Handler:** `EventService` (`modules/events/service.ts`) · **Schemas:** `modules/events/schemas.ts`

**GET `/api/v1/events`** (list) — `routes.ts:14` (`EventService.findByUserId`)

| Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| ------ | -------- | -------- | ------ | --------- | ------ |
| 401 | Sem sessão | `Unauthorized` | EN | ENV | `routes.ts:19` (manual) |
| 422 | Query inválida (pagination) | `Dados inválidos` + issues EN (details não enviados) | MIXED | ENV | `map-error.ts:51` |
| 429 | Rate limit global | `Rate limit exceeded, retry in ...` | EN | ENV | `@fastify/rate-limit` → `map-error.ts:63` |
| 404/409/400/500 | Prisma P2025/P2002/P2003/outros | mensagens PT-PT / `Internal server error` | PT-PT/EN | ENV | `map-error.ts:78-90` |

> Filtros de enum: valores inválidos são **silenciosamente ignorados** (`validateEnum`) — sem erro.

**GET `/api/v1/events/:eventId`** — `routes.ts:40`

| Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| ------ | -------- | -------- | ------ | --------- | ------ |
| 401 | Sem sessão | `Unauthorized` | EN | ENV | `routes.ts:45` (manual) |
| 422 | `eventId` não é UUID (`eventIdSchema.parse`) | `Dados inválidos` (issues EN `"Invalid uuid"` — não enviados) | MIXED | ENV | `schemas.ts:59-61` → `map-error.ts:51` |
| 404 | Evento não existe | `Evento não encontrado` | PT-PT | ENV | `service.ts:36` |
| 403 | User não é membro | `Não tem acesso a este evento` | PT-PT | ENV | `service.ts:39` |
| 404/500 | Race P2025 / Prisma inesperado | `O registo solicitado não foi encontrado` / `Internal server error` | PT-PT/EN | ENV | `map-error.ts:78, 90` |

**POST `/api/v1/events`** (create) — `routes.ts:53` → sucesso `201 { data }`

| Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| ------ | -------- | -------- | ------ | --------- | ------ |
| 401 | Sem sessão | `Unauthorized` | EN | ENV | `routes.ts:58` (manual) |
| 422 | `name` vazio | `Nome é obrigatório` | PT-PT | ENV | `schemas.ts:13` |
| 422 | `eventDate` no passado | `A data do evento não pode ser no passado` | PT-PT | ENV | `schemas.ts:16` |
| 422 | `type`/`capacity`/`budgetAmount` inválidos | issues EN do Zod default (`Invalid enum value...`, `Too small...`) | EN | ENV (message `Dados inválidos`) | Zod — `schemas.ts:14,19` |
| 400 | FK inválida (`eventMember.create`) | `Referência inválida a outro registo` | PT-PT | ENV | Prisma P2003 → `map-error.ts:84` |
| 500 | Outro erro Prisma | `Internal server error` | EN | ENV | `map-error.ts:90` |

**PATCH `/api/v1/events/:eventId`** — `routes.ts:66`

| Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| ------ | -------- | -------- | ------ | --------- | ------ |
| 401 | Sem sessão | `Unauthorized` | EN | ENV | `routes.ts:71` (manual) |
| 422 | UUID/body inválido | misto: `A data do evento não pode ser no passado` (PT) + issues EN | MIXED | ENV | `schemas.ts:35` |
| 404 | Evento não existe | `Evento não encontrado` | PT-PT | ENV | `service.ts:85` |
| 403 | Não OWNER/ADMIN | `Não tem permissão para editar este evento` | PT-PT | ENV | `service.ts:89` |
| 404 | Race P2025 no update | `O registo solicitado não foi encontrado` | PT-PT | ENV | `map-error.ts:78` |

**DELETE `/api/v1/events/:eventId`** — `routes.ts:80` → sucesso `204` (vazio)

| Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| ------ | -------- | -------- | ------ | --------- | ------ |
| 401 | Sem sessão | `Unauthorized` | EN | ENV | `routes.ts:85` (manual) |
| 422 | UUID inválido | `Dados inválidos` | MIXED | ENV | `schemas.ts:59-61` |
| 404 | Evento não existe | `Evento não encontrado` | PT-PT | ENV | `service.ts:100` |
| 403 | Não OWNER | `Apenas o proprietário pode eliminar o evento` | PT-PT | ENV | `service.ts:104` |
| 404 | Race P2025 no delete | `O registo solicitado não foi encontrado` | PT-PT | ENV | `map-error.ts:78` |

### 2.2 EVENTS — oRPC

**Arquivo:** `packages/api/src/routers/events.ts` (412 linhas) · todas `protectedProcedure` (herdam 401/403 do middleware — ver legenda). **Padrão dominante: `throw new Error("...PT...")` → 500 EN.**

| Procedure | Código | Condição | Mensagem actual / origem | Idioma | Estrutura |
| --------- | ------ | -------- | ------------------------- | ------ | --------- |
| `events.list` | 422 | input inválido (`eventListInput`) | `Dados inválidos` (issues EN não enviados) | MIXED | RPC |
| | 500 | Prisma inesperado | `Internal server error` | EN | RPC |
| `events.getById` | **500** | Evento não existe | `Internal server error` (original `"Evento não encontrado"` **perdido**) — `events.ts:112` | EN | RPC |
| | **500** | Não é membro | `Internal server error` (original `"Não tem permissão para aceder a este evento"` perdido) — `events.ts:120` | EN | RPC |
| `events.create` | 422 | horários obrigatórios | `O horário de início é obrigatório` / `O horário de fim é obrigatório` — `events.ts:21` | PT-PT | RPC |
| | 422 | formato HH:mm | `Formato de hora inválido. Use HH:mm.` — `events.ts:27` | PT-PT | RPC |
| | 422 | data no passado | `A data do evento não pode ser no passado` — `events.ts:152-156` | PT-PT | RPC |
| | 422 | outros campos (name/enum/capacity) | issues EN default Zod — `events.ts:139-176` | EN | RPC |
| | **500** | `endTime <= startTime` | `Internal server error` (original `"O horário de fim deve ser posterior ao horário de início"` perdido) — `events.ts:175-177` | EN | RPC |
| | 409/400 | Prisma P2002/P2003 | `Já existe um registo com estes dados`/`Referência inválida a outro registo` | PT-PT | RPC |
| `events.update` | 422 | data passado/hora inválida | `A data do evento não pode ser no passado` / `Formato de hora inválido. Use HH:mm.` — `events.ts:251-263` | PT-PT | RPC |
| | **500** | Evento não existe | `Internal server error` (original perdido) — `events.ts:295` | EN | RPC |
| | **500** | Não OWNER/ADMIN | `Internal server error` (original `"Não tem permissão para editar este evento"` perdido) — `events.ts:305` | EN | RPC |
| | **500** | fim ≤ início | `Internal server error` (original perdido) — `events.ts:319-321` | EN | RPC |
| `events.delete` | **500** | Evento não existe | `Internal server error` (original perdido) — `events.ts:381` | EN | RPC |
| | **500** | Não OWNER | `Internal server error` (original `"Apenas o proprietário pode eliminar o evento"` perdido) — `events.ts:390` | EN | RPC |

> `events.getById` engole falhas de `notifyEventMilestone` (`catch {}`, `events.ts:132-134`) — propositado (não vira erro).

### 2.3 GUESTS — REST

**Arquivo:** `packages/api/src/modules/guests/routes.ts` (169 linhas) · **Service:** `modules/guests/service.ts` · **Schemas:** `modules/guests/schemas.ts`

| Rota | Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| ---- | ------ | -------- | -------- | ------ | --------- | ------ |
| **GET `/api/v1/events/:eventId/guests`** (`routes.ts:22`, **sem** verificação de accesso) | 401 | Sem sessão | `Unauthorized` | EN | ENV | `routes.ts:27` |
| | 422 | query inválida | `Dados inválidos` | MIXED | ENV | `map-error.ts:51` |
| | 429/500 | rate limit / DB | `Rate limit exceeded...` / `Internal server error` | EN | ENV | biblioteca / `map-error.ts:90` |
| **POST `/api/v1/events/:eventId/guests`** (`routes.ts:47`, **sem** verificação; sucesso `201`) | 401 | Sem sessão | `Unauthorized` | EN | ENV | `routes.ts:52` |
| | 422 | `createGuestSchema` (name/email/type/...) | issues EN default Zod | EN | ENV | `schemas.ts:4-14` |
| | 400 | eventId FK inválida | `Referência inválida a outro registo` | PT-PT | ENV | Prisma P2003 |
| **PATCH `/api/v1/guests/:id`** (`routes.ts:59`) | 401 | Sem sessão | `Unauthorized` | EN | ENV | `routes.ts:64` |
| | 404 | Convidado não existe | `Convidado não encontrado` | PT-PT | ENV | `routes.ts:68-70` |
| | **500** | Sem permissão no evento | `Internal server error` (original `"Não tem permissão para aceder a este evento"` **perdido**) | EN | ENV | `event-access.ts:21` → `map-error.ts:90` |
| | 422 | body inválido | issues EN default Zod | EN | ENV | `schemas.ts:16` |
| **DELETE `/api/v1/guests/:id`** (`routes.ts:77`; sucesso `204`) | idem PATCH | — | `Unauthorized` / `Convidado não encontrado` / 500 acesso | EN/PT-PT/EN | ENV | `routes.ts:82,86-88` |
| **GET `/api/v1/events/:eventId/tables`** (`routes.ts:94`, **sem** verificação) | 401 | Sem sessão | `Unauthorized` | EN | ENV | `routes.ts:99` |
| **POST `/api/v1/events/:eventId/tables`** (`routes.ts:117`, **sem** verificação; `201`) | 401/422 | Sem sessão / schema | `Unauthorized` / issues EN Zod | EN | ENV | `routes.ts:122`, `schemas.ts:19-24` |
| **POST `/api/v1/tables/:tableId/guests`** (`routes.ts:129`; `201 { data: { success: true } }`) | 401 | Sem sessão | `Unauthorized` | EN | ENV | `routes.ts:134` |
| | 422 | `guestId` não UUID | `Dados inválidos` | MIXED | ENV | `schemas.ts:26` |
| | 404 | Convidado não existe | `Convidado não encontrado` | PT-PT | ENV | `routes.ts:139-141` |
| | **500** | Sem permissão | `Internal server error` (PT perdido) | EN | ENV | `event-access.ts:21` |
| | 404 | Mesa não existe | `Mesa não encontrada` | PT-PT | ENV | `service.ts:110` |
| | 403 | Mesa lotada | `Mesa lotada` | PT-PT | ENV | `service.ts:112` |
| | 409 | Convidado já na mesa (PK composta) | `Já existe um registo com estes dados` | PT-PT | ENV | Prisma P2002 → `map-error.ts:81` |
| | 400 | FK tableId | `Referência inválida a outro registo` | PT-PT | ENV | Prisma P2003 |
| **DELETE `/api/v1/tables/:tableId/guests/:guestId`** (`routes.ts:148`; `204`) | 401/404/**500**/404 | como acima | `Unauthorized` / `Convidado não encontrado` / `Internal server error` (acesso) / `O registo solicitado não foi encontrado` (P2025) | EN/PT-PT/EN/PT-PT | ENV | `routes.ts:154,161-163`, `event-access.ts:21` |

### 2.4 GUESTS — oRPC

**Arquivo:** `packages/api/src/routers/guests.ts` (626 linhas) · todas `protectedProcedure` · **padrão dominante:** `requireEventAccess` (plain Error) → 500 EN em quase todas.

| Procedure | Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| --------- | ------ | -------- | -------- | ------ | --------- | ------ |
| `guests.list` | **500** | Não membro do evento | `Internal server error` (PT perdido) | EN | RPC | `guests.ts:38` → `event-access.ts:21` |
| | 422 | input inválido | `Dados inválidos` | MIXED | RPC | `map-error.ts:51` |
| `guests.getById` | **500** | Convidado não existe | `Internal server error` (original `"Convidado não encontrado"` perdido) | EN | RPC | `guests.ts:118` |
| | **500** | Não membro | `Internal server error` | EN | RPC | `guests.ts:121` |
| `guests.create` | **500** | Não membro | `Internal server error` | EN | RPC | `guests.ts:139` |
| | 422 | body inválido | issues EN default Zod | EN | RPC | `guests.ts:127-138` |
| `guests.update` | **500** | Não membro | `Internal server error` | EN | RPC | `guests.ts:219-221` |
| | 404 | Guest inexistente (P2025) | `O registo solicitado não foi encontrado` | PT-PT | RPC | `guests.ts:224` → `map-error.ts:78` |
| `guests.delete` | **500** | Não membro | `Internal server error` | EN | RPC | `guests.ts:287-289` |
| | 404 | P2025 | `O registo solicitado não foi encontrado` | PT-PT | RPC | `map-error.ts:78` |
| `guests.addCompanion` | **500** | Não membro | `Internal server error` | EN | RPC | `guests.ts:313-315` |
| | 404 | Guest inexistente | `Convidado não encontrado` | PT-PT | RPC | `guests.ts:334` |
| | 403 | Regra de acompanhantes falha | `Não é possível adicionar acompanhante a este convidado` | PT-PT | RPC | `guests.ts:343-344` |
| `guests.removeCompanion` | **500** | Não membro | `Internal server error` | EN | RPC | `guests.ts:365-367` |
| | 404 | P2025 | `O registo solicitado não foi encontrado` | PT-PT | RPC | `map-error.ts:78` |
| `guests.getTables` | **500**/422 | Acesso / input | `Internal server error` / `Dados inválidos` | EN/MIXED | RPC | `guests.ts:386` |
| `guests.createTable` | **500**/422 | Acesso / body EN | `Internal server error` / issues EN | EN | RPC | `guests.ts:433`, `guests.ts:422-430` |
| `guests.updateTable` | **500** | Não membro | `Internal server error` | EN | RPC | `guests.ts:463-465` |
| | 404 | Mesa inexistente (P2025) | `O registo solicitado não foi encontrado` | PT-PT | RPC | `map-error.ts:78` |
| `guests.deleteTable` | **500**/404 | Acesso / P2025 | `Internal server error` / `O registo solicitado não foi encontrado` | EN/PT-PT | RPC | `guests.ts:494-496` |
| `guests.assignGuestToTable` | 404 | Mesa/convidado não existe | `Mesa ou convidado não encontrado` | PT-PT | RPC | `guests.ts:527` |
| | 400 | Mesas/eventos diferentes | `A mesa e o convidado pertencem a eventos diferentes` | PT-PT | RPC | `guests.ts:530-532` |
| | **500** | Não membro | `Internal server error` | EN | RPC | `guests.ts:534` |
| | 400 | Já associado (check explícito) | `Convidado já está associado a esta mesa` | PT-PT | RPC | `guests.ts:545` |
| `guests.removeGuestFromTable` | 404 | Associação inexistente | `Associação não encontrada` | PT-PT | RPC | `guests.ts:567` |
| | **500** | Não membro | `Internal server error` | EN | RPC | `guests.ts:569-571` |
| `guests.updateCompanion` | **500**/404 | Acesso / P2025 | `Internal server error` / `O registo solicitado não foi encontrado` | EN/PT-PT | RPC | `guests.ts:595-597` |
| `guests.getGuestStats` | **500** | Não membro | `Internal server error` | EN | RPC | `guests.ts:617` |
| | **500** | Evento inexistente → `event.capacity` em null (TypeError) | `Internal server error` | EN | RPC | `analytics.ts:62-63` |
| `guests.getTableStats` | **500** | Acesso/evento inexistente | `Internal server error` | EN | RPC | `guests.ts:624` |

> ⚠️ **Inconsistência REST vs oRPC (mesmo cenário):** "convidado já na mesa" → REST `409 CONFLICT` (P2002); oRPC `400 BAD_REQUEST "Convidado já está associado a esta mesa"`.

### 2.5 TASKS — REST

**Arquivo:** `packages/api/src/modules/tasks/routes.ts` (167 linhas) · **Service:** `modules/tasks/service.ts` · **Schemas:** `modules/tasks/schemas.ts` (sem messages custom — issues EN)

Rotas: `GET/POST /api/v1/events/:eventId/tasks`, `PATCH/DELETE /api/v1/tasks/:id`, `GET/POST /api/v1/events/:eventId/schedules`, `PATCH/DELETE /api/v1/schedules/:id`

| Rota | Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| ---- | ------ | -------- | -------- | ------ | --------- | ------ |
| Todas as 8 rotas | 401 | Sem sessão | `Unauthorized` | EN | ENV | `routes.ts:28-29, 54-55, 66-67, 84-85, 101-102, 125-126, 137-138, 155-156` |
| PATCH/DELETE task | 404 | Tarefa não existe | `Tarefa não encontrada` | PT-PT | ENV | `routes.ts:71-72, 89-90` |
| PATCH/DELETE schedule | 404 | Agendamento não existe | `Agendamento não encontrado` | PT-PT | ENV | `routes.ts:142-143, 160-161` |
| POST/PATCH (tasks e schedules) | 422 | Zod fail | `Dados inválidos` + issues EN | MIXED | ENV | `schemas.ts` → `map-error.ts:51` |
| Service update/delete | 404 | `TaskRepository.findById` null | `Tarefa não encontrada` | PT-PT | ENV | `service.ts:82, 91` |
| PATCH/DELETE tasks + schedules | **500** | `requireEventAccess` falha | `Internal server error` (PT perdido) | EN | ENV | `routes.ts:74,92,145,163` → `event-access.ts:21` |
| (implicit) | 400/404/409/500 | Prisma P2003/P2025/P2002/P2022 | mensagens PT-PT / EN | PT-PT/EN | ENV | `map-error.ts` |

> **Notas:** `GET list` e `POST create` (tasks e schedules) **não** verificam pertença ao evento; filtros inválidos silenciosamente ignorados (`validateEnum`).

### 2.6 TASKS — oRPC

**Arquivo:** `packages/api/src/routers/tasks.ts` (317 linhas) · procedures: `list, getById, create, update, delete, getSchedules, createSchedule, updateSchedule, deleteSchedule, getStats, getScheduleStats`

| Procedure | Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| --------- | ------ | -------- | -------- | ------ | --------- | ------ |
| `tasks.getById` | **500** | Tarefa não existe | `Internal server error` (original `"Tarefa não encontrada"` perdido) | EN | RPC | `tasks.ts:72` |
| `getById/delete/deleteSchedule/getStats/getScheduleStats` | **500** | `requireEventAccess` falha | `Internal server error` (PT perdido) | EN | RPC | `tasks.ts:75,178,294,307,314` → `event-access.ts:21` |
| Qualquer escrita sem find (`update`/`delete`/`updateSchedule`/`deleteSchedule`) | 404 | P2025 | `O registo solicitado não foi encontrado` | PT-PT | RPC | `tasks.ts:150,177,280,292` → `map-error.ts:78` |
| Todas | 422 | Zod input (issues EN) | `Dados inválidos` | MIXED | RPC | `errorMapper` |
| Todas | 400/409/500 | Prisma outros / erro | mensagens `mapError` | PT-PT/EN | RPC | `map-error.ts` |

> **Notas:** `create/update/getSchedules/createSchedule/updateSchedule` **sem** verificação de acesso ao evento; `update` depende de P2025 para 404 (mensagem genérica, diferente do `"Tarefa não encontrada"` da REST).

### 2.7 MEMBERS — REST

**Arquivo:** `packages/api/src/modules/members/routes.ts` (83 linhas) · **Service:** `modules/members/service.ts` (87 linhas)

Rotas: `GET/POST /api/v1/events/:eventId/members`, `PATCH /api/v1/members/:memberId/role`, `DELETE /api/v1/members/:memberId`

| Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| ------ | -------- | -------- | ------ | --------- | ------ |
| 401 | Sem sessão (4 rotas) | `Unauthorized` | EN | ENV | `routes.ts:17-18, 44-45, 63-64, 76-77` |
| 422 | Zod (`addMemberSchema`/`updateMemberRoleSchema`) | `Dados inválidos` + issues EN | MIXED | ENV | `routes.ts:48, 66` |
| 404 | Evento não existe | `Evento não encontrado` | PT-PT | ENV | `service.ts:17, 38, 59, 74` |
| 403 | Requester não é membro (`getMembers`) | `Não tem acesso a este evento` | PT-PT | ENV | `service.ts:41` |
| 403 | Requester não OWNER/ADMIN (`addMember`) | `Não tem permissão para adicionar membros` | PT-PT | ENV | `service.ts:21` |
| 409 | Membro já existe | `Utilizador já é membro deste evento` | PT-PT | ENV | `service.ts:26` |
| 404 | Membro não encontrado | `Membro não encontrado` | PT-PT | ENV | `service.ts:56, 71` |
| 403 | Requester não OWNER (`updateRole`) | `Apenas o proprietário pode alterar roles` | PT-PT | ENV | `service.ts:63` |
| 403 | Requester não OWNER/ADMIN (`removeMember`) | `Não tem permissão para remover membros` | PT-PT | ENV | `service.ts:78` |
| 403 | Alvo é OWNER | `Não é possível remover o proprietário` | PT-PT | ENV | `service.ts:82` |
| 400/409 | Prisma P2003 (email como userId) / P2002 | `Referência inválida a outro registo` / `Já existe um registo com estes dados` | PT-PT | ENV | `map-error.ts:84, 81` |

> ⚠️ **Bug provável detectado** (`service.ts:56,71`): `MemberRepository.findByEventAndUser("", memberId)` usa `eventId=""` + `userId=memberId` → quase sempre `undefined` → 404 `"Membro não encontrado"` mesmo quando o membro existe. Em `addMember`, `userId: email` passa o email como id de user → P2003 → 400.

### 2.8 MEMBERS — oRPC

**Arquivo:** `packages/api/src/routers/members.ts` (144 linhas) · procedures: `list, add, updateRole, remove`

| Procedure | Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| --------- | ------ | -------- | -------- | ------ | --------- | ------ |
| `members.list` | **500** | `requireEventAccess` | `Internal server error` | EN | RPC | `members.ts:18` |
| `members.add` | **500** | Email não existe | `Internal server error` (original `"Utilizador não encontrado com este email"` perdido) | EN | RPC | `members.ts:72` |
| | **500** | Já é membro | `Internal server error` (original `"Utilizador já é membro deste evento"` perdido) | EN | RPC | `members.ts:84` |
| `members.updateRole` | **500** | Membro não existe | `Internal server error` (original `"Membro não encontrado"` perdido) | EN | RPC | `members.ts:111` |
| | **500** | `requireEventAccess` | `Internal server error` | EN | RPC | `members.ts:113` |
| `members.remove` | **500** | Membro não existe / é OWNER | `Internal server error` (originais perdidos) | EN | RPC | `members.ts:130, 135` |
| | **500** | `requireEventAccess` | `Internal server error` | EN | RPC | `members.ts:132` |
| Todas | 404/409/400 | Prisma | PT-PT `mapError` | PT-PT | RPC | `map-error.ts` |

> **Nota:** oRPC `updateRole`/`remove` **sem verificação de role** (qualquer membro altera/remove qualquer membro) — contraste com REST (só OWNER/ADMIN).

### 2.9 NOTIFICATIONS — REST

**Arquivo:** `packages/api/src/modules/notifications/routes.ts` (86 linhas) · **Service:** `modules/notifications/service.ts` (51 linhas)

Rotas: `GET /api/v1/notifications`, `GET /api/v1/notifications/unread-count`, `PATCH /api/v1/notifications/:id/read`, `PATCH /api/v1/notifications/read-all`, `DELETE /api/v1/notifications/:id`, `DELETE /api/v1/notifications`

| Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| ------ | -------- | -------- | ------ | --------- | ------ |
| 401 | Sem sessão (6 rotas) | `Unauthorized` | EN | ENV | `routes.ts:15-16, 39-40, 49-50, 60-61, 70-71, 81-82` |
| 404 | `markAsRead`/`delete`: notificação não existe | `Notificação não encontrada` | PT-PT | ENV | `service.ts:26, 40` |
| 403 | `notification.userId !== userId` | `Não tem permissão para aceder a esta notificação` | PT-PT | ENV | `service.ts:28-29, 42-43` |

> **Notas:** `read-all` e `delete-all` não têm checks (seguros por scope `userId`). Sucessos: `unread-count` → `{ data: { count } }`, `read-all` → `{ data: { success: true } }`, deletes → `204`.

### 2.10 NOTIFICATIONS — oRPC

**Arquivo:** `packages/api/src/routers/notifications.ts` (116 linhas) · procedures: `list, getUnreadCount, markAsRead, markAllAsRead, delete, deleteAll`

| Procedure | Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| --------- | ------ | -------- | -------- | ------ | --------- | ------ |
| `markAsRead`/`delete` | 404 | P2025 (id inexistente) | `O registo solicitado não foi encontrado` | PT-PT | RPC | `notifications.ts:105, 113` → `map-error.ts:78` |
| Todas | 422 | Zod input | `Dados inválidos` | MIXED | RPC | `errorMapper` |

> ⚠️ **Inconsistência REST vs oRPC:** oRPC `markAsRead`/`delete` **não verificam propriedade** (`userId`) — ao contrário do REST (403). Qualquer utilizador autenticado pode marcar/eliminar notificação de outro por id.

### 2.11 INVENTORY — REST

**Arquivo:** `packages/api/src/modules/inventory/routes.ts` · **Service:** `modules/inventory/service.ts` · **Schemas:** `modules/inventory/schemas.ts`

Rotas: `GET/POST /api/v1/events/:eventId/inventory`, `GET /api/v1/events/:eventId/inventory/stats`, `PATCH/DELETE /api/v1/inventory/:id`, `GET/POST /api/v1/inventory/:inventoryItemId/movements`

| Rota | Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| ---- | ------ | -------- | -------- | ------ | --------- | ------ |
| Todas | 401 | Sem sessão | `Unauthorized` | EN | ENV | `routes.ts:26,52,64,78,101,123,149` |
| `GET list/stats` | **500** | `requireEventAccess` | `Internal server error` (PT perdido) | EN | ENV | `routes.ts:35, 55` |
| `PATCH/DELETE/movements` | 404 | Item não existe (`getEventIdForResource`) | `Item de inventário não encontrado` | PT-PT | ENV | `routes.ts:83,106,131,157` |
| `PATCH/DELETE/getHistory` | **500** | `requireEventAccess` | `Internal server error` | EN | ENV | `routes.ts:89,112,137` |
| `POST movements` | **500** | `requireEventAccess` | `Internal server error` | EN | ENV | `routes.ts:163` |
| Service (`create`/`update`/`delete`/`addMovement`/`getHistory`) | 404 | Item não existe | `Item de inventário não encontrado` | PT-PT | ENV | `service.ts:210, 323, 344, 360, 410` |
| `POST inventory` (create) | 403 | `currentQuantity > plannedQuantity` | `A quantidade actual não pode superar a quantidade planeada` | PT-PT | ENV | `service.ts:281-283` |
| `PATCH inventory/:id` | 403 | `plannedQuantity < currentQuantity` | `A quantidade planeada não pode ser inferior à quantidade actual` | PT-PT | ENV | `service.ts:329-331` |
| `POST movements` | 403 | Aumento excede planeado | `Não é possível adicionar ${quantity} unidades. Apenas ${remaining} unidades restam para completar a quantidade planeada.` | PT-PT | ENV | `service.ts:369-372` |
| `POST movements` | 403 | ADJUSTMENT > planeado | `A quantidade ajustada não pode superar a quantidade planeada` | PT-PT | ENV | `service.ts:379-382` |
| Todas | 422 | Zod input | `Dados inválidos` (mensagens PT custom existentes nos schemas **não chegam ao cliente** — só o message) | MIXED | ENV | `schemas.ts` → `map-error.ts:51` |

> ⚠️ **Inconsistência REST vs oRPC:** `POST /api/v1/events/:eventId/inventory` (create REST) **não chama `requireEventAccess`** enquanto o oRPC valida.

### 2.12 INVENTORY — oRPC

**Arquivo:** `packages/api/src/routers/inventory.ts` · procedures: `list, getById, getStats, create, update, delete, addMovement, getHistory`

- **500** em todas as procedures por `requireEventAccess` (PT perdido): `inventory.ts:22,49,56,63,81,95,109,132`.
- `getById`/`update`/`delete`/`addMovement`/`getHistory`: 404 via service (`Item de inventário não encontrado`, PT-PT — linhas acima).
- `create`/`update`/`addMovement`: 403 regras de quantidade (PT-PT — linhas acima).
- 422 Zod input (issues EN — não enviados).
- **Nota:** oRPC `update/delete/addMovement/getHistory` **não devolvem 404 antecipado** quando o resource não existe (`getEventIdForResource` null é ignorado); o 404 só vem depois no service — comportamento distinto do REST.

### 2.13 BUDGET — oRPC (sem REST)

**Arquivo:** `packages/api/src/routers/budget.ts` · procedures: `getByEventId, getLines, getSummary, updateTarget, getExpenseAnalytics, getStats`

| Procedure | Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| --------- | ------ | -------- | -------- | ------ | --------- | ------ |
| Todas | **500** | `requireEventAccess` | `Internal server error` (PT perdido) | EN | RPC | `budget.ts:34,56,77,129,149` → `event-access.ts:21` |
| `updateTarget` | **500** | Reserva > planeado | `Internal server error` (original `"A reserva não pode ultrapassar o valor planeado."` perdido) | EN | RPC | `budget.ts:97` |
| `updateTarget` | 422 | `moneyInput` (Zod) | `Dados inválidos`; issue custom PT `"Valor inválido"` + defaults EN (`nonnegative`) | MIXED | RPC | `budget.ts:21-24` |
| `getExpenseAnalytics` | **500** | Evento não existe | `Internal server error` (original `"Evento não encontrado"` perdido) | EN | RPC | `expense-analytics.ts:121` |
| `getLines` | 422 | `source` inválido | `Dados inválidos` | MIXED | RPC | `budget.ts` |
| Todas | 404/409/400/500 | Prisma | mensagens `mapError` | PT-PT/EN | RPC | `map-error.ts` |

### 2.14 USERS — REST

**Arquivo:** `packages/api/src/modules/users/routes.ts` (30 linhas) · **Service:** `modules/users/service.ts` (65 linhas)

**GET `/api/v1/users/profile`** — `routes.ts:4`

| Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| ------ | -------- | -------- | ------ | --------- | ------ |
| 401 | Sem sessão | `Unauthorized` | EN | ENV | `routes.ts:8-11` (manual) |
| 404 | Utilizador não existe | `Utilizador não encontrado` | PT-PT | ENV | `service.ts:21` |
| 500 | Outros/DB | `Internal server error` | EN | ENV | `map-error.ts:91` |

**PATCH `/api/v1/users/profile`** — `routes.ts:15` (body é cast cru, **sem validação Zod**)

| Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| ------ | -------- | -------- | ------ | --------- | ------ |
| 401 | Sem sessão | `Unauthorized` | EN | ENV | `routes.ts:20-21` |
| 400 | Email já usado por outro user | `Este email já está a ser utilizado` | PT-PT | ENV | `service.ts:34` |
| 409 | Corrida unique (P2002) | `Já existe um registo com estes dados` | PT-PT | ENV | Prisma → `map-error.ts:81` |
| 404 | Race P2025 | `O registo solicitado não foi encontrado` | PT-PT | ENV | `map-error.ts:78` |
| 422 | JSON inválido (parser) | mensagem EN do Fastify | EN | ENV | Fastify → `map-error.ts:55` |

### 2.15 USERS — oRPC

**Arquivo:** `packages/api/src/routers/users.ts` (291 linhas) · procedures: `getProfile, updateProfile, changePassword, blockAccount, getMembers, inviteMember, removeMember, updateMemberRole`

| Procedure | Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| --------- | ------ | -------- | -------- | ------ | --------- | ------ |
| Todas | 401/403 | Sem sessão / BLOCKED | `UNAUTHORIZED` (EN default) / `A tua conta está bloqueada. Contacta o suporte para a desbloquear.` (PT-PT) | EN/PT-PT | RPC | `index.ts` |
| `getProfile` | 404 | User inexistente | `Utilizador não encontrado` | PT-PT | RPC | `users.ts:43` |
| `updateProfile` | 422 | Zod input (name/email/phone) | `Dados inválidos` (issues EN) | MIXED | RPC | `users.ts` + `map-error.ts:51` |
| | 400 | Email já em uso | `Este email já está a ser utilizado` | PT-PT | RPC | `modules/users/service.ts:34` |
| `changePassword` | 422 | Zod PT-PT custom | `Palavra-passe atual é obrigatória` (`users.ts:126`), `Palavra-passe é obrigatória`, `Palavra-passe deve ter pelo menos 8 caracteres`, `...pelo menos uma letra maiúscula/minúscula`, `...pelo menos um número`, `Confirmação de palavra-passe é obrigatória`, `As palavras-passe não coincidem` | PT-PT | RPC | `users.ts` + `shared/validation/password.ts` |
| | 400 | Password atual incorrecta | `A palavra-passe atual está incorreta` (APIError do Better Auth traduzido) | PT-PT | RPC | `users.ts:168` |
| | 500 | Outros erros Better Auth | `Internal server error` | EN | RPC | `users.ts:170` |
| `blockAccount` | 422 | `confirm !== true` / `reason > 280` | `Dados inválidos` (issues EN) | MIXED | RPC | `users.ts` |
| | 404 | User inexistente | `Utilizador não encontrado` | PT-PT | RPC | `service.ts:39` |
| | 400 | Já bloqueada | `A conta já está bloqueada` | PT-PT | RPC | `service.ts:43` |
| `getMembers` | **500** | Não membro do evento | `Internal server error` (PT perdido) | EN | RPC | `event-access.ts:21` |
| `inviteMember` | 422 | Zod email/role | `Dados inválidos` | MIXED | RPC | `users.ts` |
| | **500** | Não membro do evento | `Internal server error` | EN | RPC | `event-access.ts:21` |
| | **500** | Já é membro | `Internal server error` (original `"Este utilizador já é membro do evento"` perdido) | EN | RPC | `users.ts:231` |
| `removeMember` | 404 | Membro inexistente | `Membro não encontrado` | PT-PT | RPC | `users.ts:255` |
| | **500** | Não membro do evento | `Internal server error` | EN | RPC | `event-access.ts:21` |
| | **500** | Remover OWNER | `Internal server error` (original `"Não é possível remover o proprietário"` perdido) | EN | RPC | `users.ts:258` |
| `updateMemberRole` | 404 | Membro inexistente | `Membro não encontrado` | PT-PT | RPC | `users.ts:278` |
| | **500** | Não membro do evento | `Internal server error` | EN | RPC | `event-access.ts:21` |
| | **500** | Sem role OWNER | `Internal server error` (original `"Não tem permissão suficiente para esta operação"` perdido) | EN | RPC | `event-access.ts:25` |

### 2.16 DASHBOARD — REST

**Arquivo:** `packages/api/src/modules/dashboard/routes.ts` (única rota)

**GET `/api/v1/events/:eventId/dashboard`** — `routes.ts:6`

| Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| ------ | -------- | -------- | ------ | --------- | ------ |
| 401 | Sem sessão | `Unauthorized` | EN | ENV | `routes.ts:9-11` |
| 500 | DB/agregação | `Internal server error` | EN | ENV | `map-error.ts:91` |

> ⚠️ **Gap grave:** **sem verificação de membro nem de existência do evento** — utilizadores sem acesso e eventos inexistentes devolvem **200 com `{ data: null }`** (`service.ts:15-16`). `:eventId` não é validado.

### 2.17 DASHBOARD — oRPC

**Arquivo:** `packages/api/src/routers/dashboard.ts` · procedures: `getGlobalStats, getGuestChart, getBudgetChart`

| Procedure | Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| --------- | ------ | -------- | -------- | ------ | --------- | ------ |
| `getGlobalStats` | 500 | DB/outros | `Internal server error` | EN | RPC | `dashboard.ts:8` |
| `getGuestChart`/`getBudgetChart` | 422 | Zod input | `Dados inválidos` | MIXED | RPC | `dashboard.ts:35,65` |
| | **500** | `requireEventAccess` | `Internal server error` (PT perdido) | EN | RPC | `event-access.ts:21` |

### 2.18 EXPORTS — REST

**Arquivo:** `packages/api/src/modules/exports/routes.ts` (181 linhas) · helpers locais: `notFound()` (`:79`), `assertMember()` (`:45-53`)

**GET `/api/v1/events/:eventId/exports/:module/:format`** — `routes.ts:84` (sucesso: ficheiro binário PDF/XLSX, não JSON)

| Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| ------ | -------- | -------- | ------ | --------- | ------ |
| 401 | Sem sessão | `Unauthorized` | EN | ENV | `routes.ts:89-91` (manual) |
| 404 | Módulo não permitido ou formato inválido | `Relatório não disponível` | PT-PT | ENV | `routes.ts:103` (helper `notFound`) |
| 404 | Não é membro activo do evento *(deliberado: esconde existência)* | `Evento não encontrado` | PT-PT | ENV | `routes.ts:53` (`throw NotFoundError`) |
| 404 | Evento não existe | `Evento não encontrado` | PT-PT | ENV | `routes.ts:107` (`loadEventInfo` null) |
| 404 | Par module/format sem relatório | `Relatório não disponível neste formato` | PT-PT | ENV | `routes.ts:112` (`getReportName` undefined) |
| 404 | Builder em falta em runtime (`ExportNotSupportedError`) | `Relatório não disponível neste formato` | PT-PT | ENV | `routes.ts:124` — erro interno EN (`export-service.ts:41-47`) nunca enviado |
| 429 | Rate limit global | `Rate limit exceeded, retry ...` | EN | ENV | `@fastify/rate-limit` |
| 500 | Erros dos builders/DB | `Internal server error` | EN | ENV | `map-error.ts:91` |

**GET `/api/v1/events/:eventId/dedications/:dedicationId/export/pdf`** — `routes.ts:135`

| Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| ------ | -------- | -------- | ------ | --------- | ------ |
| 401 | Sem sessão | `Unauthorized` | EN | ENV | `routes.ts:141-145` |
| 403 | Sem accesso ao evento | `Não tem acesso a este evento` | PT-PT | ENV | `modules/dedication/service.ts:54` |
| 404 | Dedicatória não encontrada / sem permissão de leitura | `Dedicatória não encontrada` | PT-PT | ENV | `modules/dedication/service.ts:80, 354` |
| 500 | Render PDF/outros | `Internal server error` | EN | ENV | `map-error.ts:91` |

### 2.19 EXPORTS — PÚBLICO (fora do hook de auth)

**Arquivo:** `packages/api/src/modules/invitations/public/routes-invitation-export.ts` (74 linhas) · helper local `notFound()` (`:22-24`) · **não passa** no `authMiddleware` (fora de `/api/v1/`); sem os `*Limiter` de memória (só o rate-limit global Fastify se aplica).

**GET `/api/public/invitations/:code/export/pdf`** — `routes.ts:24` (sucesso: PDF binário)

| Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| ------ | -------- | -------- | ------ | --------- | ------ |
| 404 | `lookup.result !== "AVAILABLE"` (indistinguível de propósito) | `Convite não encontrado` | PT-PT | ENV | `routes.ts:45-47` |
| 404 | `getPublicInvitation` lança | `Convite não encontrado` | PT-PT | ENV | `service.ts:407, 411, 827, 857, 877` |
| 403 | Convite de outro evento | `Convite não pertence a este evento` | PT-PT | ENV | `service.ts:885` |
| 429/500 | Rate limit global / outros | `Rate limit exceeded...` / `Internal server error` | EN | ENV | biblioteca / `map-error.ts:91` |

### 2.20 INVITATIONS — oRPC

**Arquivo:** `packages/api/src/routers/invitations.ts` (329 linhas) · **Service:** `modules/invitations/service.ts` (1018 linhas) · **Schemas:** `modules/invitations/schemas.ts` (sem messages custom — EN)

**Procedures públicas** (`publicProcedure`, sem auth):

| Procedure | Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| --------- | ------ | -------- | -------- | ------ | --------- | ------ |
| `public.getByCode` | **500** | Rate limit do limiter de memória (30/10min) | `Internal server error` (original `"Demasiadas tentativas. Tente novamente mais tarde."` **perdido**) | EN | RPC | `invitations.ts:52` → `rate-limit.ts:26` → `map-error.ts:90` |
| | 422 | code inválido/vazio/>40 | `Dados inválidos` (issues EN) | MIXED | RPC | `schemas.ts:6-10` |
| | — | `NOT_FOUND`/`EXPIRED`/`CANCELLED` | **sem erro** — devolve o objeto lookup `{ result: ... }` como sucesso | — | — | `service.ts:177,181,185` |
| `public.schedule` | **500** | Rate limit (30/10min) | `Internal server error` (PT perdido) | EN | RPC | `invitations.ts:66` |
| | 422 | code inválido | `Dados inválidos` | MIXED | RPC | `schemas.ts:6-10` |
| `public.respond` | **500** | Rate limit (10/10min) | `Internal server error` (PT perdido) | EN | RPC | `invitations.ts:80` |
| | 422 | code/response inválidos | `Dados inválidos` | MIXED | RPC | `schemas.ts:12` |
| | 404 | Convite inexistente ou não publicado | `Convite não encontrado` | PT-PT | RPC | `service.ts:407, 411` |
| | 400 | Convite cancelado | `Este convite foi cancelado pelo anfitrião.` | PT-PT | RPC | `service.ts:419` (map `RSVP_BLOCKED_MESSAGES`: `:314`) |
| | 400 | Convite expirado | `O prazo para responder a este convite já terminou.` | PT-PT | RPC | `service.ts:329` |
| | 400 | Evento não confirmado | `Este evento ainda não está confirmado — as respostas abrem em breve.` | PT-PT | RPC | `service.ts:330-331` |
| | 400 | Evento cancelado | `Este evento foi cancelado e já não aceita respostas.` | PT-PT | RPC | `service.ts:332` |
| | 400 | Evento concluído | `Este evento já aconteceu — obrigado pelo teu carinho.` | PT-PT | RPC | `service.ts:333` |
| | 400 | RSVP bloqueado sem reason mapeado | `Este convite já não está disponível para resposta.` | PT-PT | RPC | `service.ts:420-422` |
| | 400 | Capacidade esgotada (CONFIRM) | `A capacidade máxima do evento já foi atingida` | PT-PT | RPC | `service.ts:479` |
| | 404 | Race pós-resposta | `Convite não encontrado` | PT-PT | RPC | `invitations.ts:91` |

**Procedures protegidas** (todas herdam 401/403 do middleware):

| Procedure | Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| --------- | ------ | -------- | -------- | ------ | --------- | ------ |
| `create` | **500** | `requireEventAccess` | `Internal server error` (PT perdido) | EN | RPC | `invitations.ts:97` → `event-access.ts:21` |
| | 422 | `guestIds` vazio / eventId | `Dados inválidos` (issues EN) | MIXED | RPC | `invitations.ts:99-101` |
| | 400 | Guests de outro evento | `Um ou mais convidados não pertencem a este evento` | PT-PT | RPC | `service.ts:496` |
| | 400 | Código não gerado (5 tentativas) | `Não foi possível gerar um código de convite único` | PT-PT | RPC | `service.ts:528` |
| `generateCode` | **500**/422 | acesso / input | `Internal server error` / `Dados inválidos` | EN/MIXED | RPC | `invitations.ts:108,106` |
| `list` | **500**/422 | acesso / filtros | idem | EN/MIXED | RPC | `invitations.ts:115,118-129` |
| `byGuest` | **500** | acesso | `Internal server error` | EN | RPC | `invitations.ts:135` |
| | 404 | Guest sem convite no evento | `Convite não encontrado` | PT-PT | RPC | `invitations.ts:295` |
| `getById` | **500** | acesso | `Internal server error` | EN | RPC | `invitations.ts:144` |
| | 404 | Convite não existe | `Convite não encontrado` | PT-PT | RPC | `service.ts:877` |
| | 403 | Convite de outro evento | `Convite não pertence a este evento` | PT-PT | RPC | `service.ts:885` |
| `getStats`/`getInvitationStats` | **500** | acesso | `Internal server error` | EN | RPC | `invitations.ts:153,163` |
| `publish` | **500** | acesso | `Internal server error` | EN | RPC | `invitations.ts:169` |
| | 404 | Convite não existe | `Convite não encontrado` | PT-PT | RPC | `service.ts:827` |
| | 400 | Verdict `INVALID` | mensagem das validações (PT-PT) | PT-PT | RPC | `service.ts:839` |
| | 400 | `NOT_FOUND` | `Convite não encontrado` | PT-PT | RPC | `service.ts:584` |
| | 400 | `WRONG_EVENT` | `Convite não pertence a este evento` | PT-PT | RPC | `service.ts:587-589` |
| | 400 | `NO_GUESTS` | `Convite sem convidados associados` | PT-PT | RPC | `service.ts:591-593` |
| | 400 | `CANCELLED` | `Convite cancelado` | PT-PT | RPC | `service.ts:594-596` |
| | 400 | `EXPIRED` | `Convite expirado` | PT-PT | RPC | `service.ts:597-599` |
| | 400 | `GUEST_NOT_PUBLISHABLE` | `Nenhum convidado em estado compatível com publicação` | PT-PT | RPC | `service.ts:600-604` |
| | 404 | Verdict `FAILED` (falha updateMany) | `error.message` bruto ou `Convite não encontrado` | MIXED | RPC | `service.ts:844` |
| `publishBatch` | 422 | `> 200 ids`/enum scope | `Dados inválidos` | MIXED | RPC | `invitations.ts:184-188` |
| | 400 | scope SELECTED vazio | `Seleciona pelo menos um convite` | PT-PT | RPC | `invitations.ts:202` |
| | — | Falhas por item (não HTTP) | `status: "FAILED"`, `error.message` bruto ou `Não foi possível publicar o convite` | MIXED | corpo `BulkPublishResult.errors[]` | `service.ts:768-782` |
| | — | QR Code falhou após publicar | `Publicado, mas o QR Code não pôde ser gerado: ${error.message}` | MIXED | `errors[]` como aviso | `service.ts:787-804` |
| `unpublish` | 404/403 | não existe / outro evento | `Convite não encontrado` / `Convite não pertence a este evento` | PT-PT | RPC | `service.ts:857, 885` |
| `respond` (admin) | 404 | Convite não existe | `Convite não encontrado` | PT-PT | RPC | `invitations.ts:233` |
| | 404 | `input.eventId ≠` evento do convite | `Convite não encontrado` | PT-PT | RPC | `invitations.ts:239` |
| | 400/404/403 | mesmas regras RSVP (sem `publishRequired`) | tabela `public.respond` | PT-PT | RPC | `service.ts` |
| `rsvpEligibility` | **500** | acesso | `Internal server error` | EN | RPC | `invitations.ts:251` |
| | 404 | não existe / eventId não confere | `Convite não encontrado` | PT-PT | RPC | `invitations.ts:273` |

> **Conteúdo do lookup público** — `service.ts:149-178` (detalhe do fluxo público): `NOT_FOUND` (`:177`), `EXPIRED` (`:181`), `CANCELLED` (`:185`), `AVAILABLE` (`:209`).

### 2.21 DEDICATIONS — oRPC

**Arquivo:** `packages/api/src/routers/dedications.ts` · **Service:** `modules/dedication/service.ts` · **Schemas:** `modules/dedication/schemas.ts`

Erros comuns (herdados do service, em todas as procedures): 403 `Não tem acesso a este evento` (`service.ts:54` — `assertEventMembership`), 404 `Dedicatória não encontrada` (`service.ts:80`), 403 `Esta dedicatória é privada. Apenas o autor pode visualizar.` (`service.ts:89`), 403 `Não tem permissão para visualizar esta dedicatória` (`service.ts:102`).

| Procedure | Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| --------- | ------ | -------- | -------- | ------ | --------- | ------ |
| `list`/`getStats` | 403 | Sem membership | `Não tem acesso a este evento` | PT-PT | RPC | `service.ts:54` |
| | 422 | filtros Zod | `Dados inválidos` | MIXED | RPC | `dedications.ts:19-37` |
| `get` | 403/404 | como acima (privada/viewer) | idem | PT-PT | RPC | `service.ts:80,89,102` |
| `create` | 422 | título vazio/>120 | `O título é obrigatório` / `O título não pode exceder 120 caracteres` | PT-PT | RPC | `schemas.ts:37-41` |
| | 422 | tipo inválido | `Seleccione um tipo` | PT-PT | RPC | `schemas.ts:44` |
| | 422 | rich text inválido/ longo | `O conteúdo do editor tem um formato inválido` / `O conteúdo é demasiado longo para ser guardado` | PT-PT | RPC | `schemas.ts:19-28`, `rich-text.ts:174,189,226` |
| | 422 | `status`/`visibility`/viewers | issues EN default Zod | EN | RPC | `schemas.ts:45-48, 70-76` |
| | 400 | SHARED sem viewers | `Selecione pelo menos um membro para partilhar a dedicatória` | PT-PT | RPC | `service.ts:309` |
| | 403 | viewer de outro evento | `Um dos membros seleccionados não pertence a este evento` | PT-PT | RPC | `service.ts:170` |
| | 400 | viewer não ACTIVE | `Um dos membros seleccionados ainda não aceitou o convite` | PT-PT | RPC | `service.ts:175` |
| | 400 | viewer = autor | `O autor já tem acesso à própria dedicatória` | PT-PT | RPC | `service.ts:180` |
| | 404 | race (apagada) | `Dedicatória não encontrada` | PT-PT | RPC | `service.ts:354` |
| `update` | 403 | Não é autor | `Apenas o autor pode alterar esta dedicatória` | PT-PT | RPC | `service.ts:117` |
| | 400 | mudar `type` com status ≠ NOT_STARTED | `O tipo só pode ser alterado antes de começar a escrever` | PT-PT | RPC | `service.ts:130` |
| | 400 | conteúdo não sanitizável | `O conteúdo do editor tem um formato inválido` | PT-PT | RPC | `service.ts:145` |
| | 422 | payload vazio | `Nada para actualizar` | PT-PT | RPC | `schemas.ts:57-69` |
| `setVisibility` | 400 | locked/ shared sem viewers | `Selecione pelo menos um membro para partilhar a dedicatória` | PT-PT | RPC | `service.ts:462, 474` |
| `addViewer` | 409 | dedicatória locked | `Desbloqueie a dedicatória antes de seleccionar membros` | PT-PT | RPC | `service.ts:544` |
| | 400 | viewer não resolve | `Seleccione um membro do evento` | PT-PT | RPC | `service.ts:555` |
| | 409 | viewer já concedido | `Este membro já pode visualizar a dedicatória` | PT-PT | RPC | `service.ts:564` |
| | 422 | `eventMemberId` vazio | `Seleccione um membro do evento` | PT-PT | RPC | `schemas.ts:79-81` |
| `removeViewer` | 404 | grant não existe | `Membro autorizado não encontrado` | PT-PT | RPC | `service.ts:598` |
| `listViewers`/`remove`/`getHistory` | 403/404 | via `loadForWrite` | como `update` | PT-PT | RPC | `service.ts` |

### 2.22 SUPPLIERS — oRPC (sem REST)

**Arquivo:** `packages/api/src/routers/suppliers.ts` (940 linhas) · **Regras financeiras:** `shared/finance/supplier-rules.ts` (ValidationError PT-PT) · **Schemas dinâmicos:** `shared/schemas/supplier-category-fields.ts`

procedures: `getCategorySchema, list, getById, create, update, changeStatus, delete, addPayment, deletePayment, setInstallments, updateInstallment, deleteInstallment, getStats`

| Procedure | Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| --------- | ------ | -------- | -------- | ------ | --------- | ------ |
| Todas (excepto `getCategorySchema`) | **500** | `requireEventAccess` | `Internal server error` (PT perdido) | EN | RPC | `suppliers.ts` → `event-access.ts:21` |
| `getById`/`update`/`changeStatus`/`addPayment`/`setInstallments` | 404 | Fornecedor não existe | `Fornecedor não encontrado` | PT-PT | RPC | `suppliers.ts:465, 633, 640, 714, 721, 771, 839` |
| `delete` | 404 | P2025 (sem check prévio) | `O registo solicitado não foi encontrado` | PT-PT | RPC | `suppliers.ts:745` → `map-error.ts:78` |
| `deletePayment` | 404 | Pagamento não existe | `Pagamento não encontrado` | PT-PT | RPC | `suppliers.ts:811` |
| `updateInstallment`/`deleteInstallment` | 404 | Parcela não existe/outro supplier | `Parcela não encontrada` | PT-PT | RPC | `suppliers.ts:351, 358` |
| `create`/`update` | 422 | NIF inválido | `NIF inválido.` | PT-PT | RPC | `suppliers.ts:196-199` |
| | 422 | IBAN estrutural | `IBAN inválido.` | PT-PT | RPC | `suppliers.ts:202-207` |
| | 422 | IBAN mod-97 | `O IBAN não passa na verificação de dígitos.` | PT-PT | RPC | `suppliers.ts:209-211` |
| | 422 | telefone não angolano | `Telefone inválido.` | PT-PT | RPC | `suppliers.ts:215-219` |
| | 422 | `moneyInput` (preço) | `Montante inválido` (refine PT) + defaults EN (`nonnegative`) | MIXED | RPC | `suppliers.ts:106-109` |
| | **500** | campos da categoria inválidos | `Internal server error` (original MIXED `"Campos inválidos para a categoria X: <issues EN>"` perdido) | MIXED (perdido) | RPC | `supplier-category-fields.ts:272-277` |
| `update` | 422 | preço negativo | `O preço não pode ser negativo.` | PT-PT | RPC | `suppliers.ts:648` |
| `changeStatus` | 422 | COMPLETED → anterior | `Um fornecedor concluído não pode voltar a estados anteriores.` | PT-PT | RPC | `supplier-rules.ts:128` |
| `addPayment` | 422 | montante ≤ 0 | `O montante pago tem de ser maior que zero` (sem ponto final) | PT-PT | RPC | `suppliers.ts:758-761` |
| | 422 | fornecedor não CONFIRMED | `Só é possível registar pagamentos num fornecedor confirmado.` | PT-PT | RPC | `supplier-rules.ts:27` |
| | 422 | sem montante acordado | `Defina primeiro o montante acordado do fornecedor.` | PT-PT | RPC | `supplier-rules.ts:36, 97` |
| | 422 | pagamentos > acordado | `A soma dos pagamentos excede o montante acordado. Em falta: X.` | PT-PT | RPC | `supplier-rules.ts:57` |
| `setInstallments` | 422 | status ≠ NEGOTIATING/CONFIRMED | `As parcelas só podem ser geridas num fornecedor em negociação ou confirmado.` | PT-PT | RPC | `supplier-rules.ts:73` |
| | 422 | parcela ≤ 0 | `A parcela ${index+1} tem de ter um montante maior que zero.` | PT-PT | RPC | `supplier-rules.ts:90` |
| | 422 | soma > acordado | `A soma das parcelas (X) excede o montante acordado (Y).` | PT-PT | RPC | `supplier-rules.ts:104` |
| Todas | 409/400 | Prisma P2002/P2003 | `Já existe um registo com estes dados` / `Referência inválida a outro registo` | PT-PT | RPC | `map-error.ts` |

> **Nota de auditoria:** `assertStatusTransition` (`supplier-rules.ts:122-132`) só lança quando `current === "COMPLETED"`; regressões de `CONFIRMED` → estados anteriores não são bloqueadas (sem erro).

### 2.23 FOOD-PLAN — oRPC (sem REST)

**Arquivo:** `packages/api/src/routers/food-plan.ts` (258 linhas) · procedures: `get, setSupplier, updateNotes, addItem, updateItem, deleteItem, getStats`

| Procedure | Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| --------- | ------ | -------- | -------- | ------ | --------- | ------ |
| Todas | **500** | `requireEventAccess` | `Internal server error` (PT perdido) | EN | RPC | `food-plan.ts` → `event-access.ts:21` |
| `setSupplier` | 422 | supplierId inexistente/outro evento | `Fornecedor inválido para este evento.` | PT-PT | RPC | `food-plan.ts:109` |
| | 422 | plano já com fornecedor | `Este plano de alimentação já tem um fornecedor associado. Só é possível contratar um fornecedor uma única vez.` | PT-PT | RPC | `food-plan.ts:117` |
| `addItem` | 422 | `quantity` ≤ 0 ou > 1.000.000 / enum | `Dados inválidos` (issues EN — `z.coerce.number().positive().max(1_000_000)` sem custom messages) | MIXED | RPC | `food-plan.ts:36, 44-51` |
| `updateItem`/`deleteItem` | 422 | item inexistente/outro evento | `Item do plano de alimentação inválido.` | PT-PT | RPC | `food-plan.ts:205, 238` |

### 2.24 CHECKLIST — oRPC (sem REST)

**Arquivo:** `packages/api/src/routers/checklist.ts` (354 linhas) · procedures: `list, create, update, delete, sync, getStats` · `modules/checklist/rules.ts` é puro (sem throws)

| Procedure | Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| --------- | ------ | -------- | -------- | ------ | --------- | ------ |
| Todas | **500** | `requireEventAccess` | `Internal server error` (PT perdido) | EN | RPC | `checklist.ts` → `event-access.ts:21` |
| `create` | 422 | supplierId e inventoryItemId em simultâneo | `Um item de checklist pode estar associado a um fornecedor ou a um item de inventário, não a ambos.` | PT-PT | RPC | `checklist.ts:217` |
| | 422 | supplier inválido | `Fornecedor inválido para este evento.` | PT-PT | RPC | `checklist.ts:229` |
| | 422 | inventoryItem inválido | `Item de inventário inválido para este evento.` | PT-PT | RPC | `checklist.ts:238` |
| `update` | 422 | item inexistente/outro evento | `Item de checklist inválido.` | PT-PT | RPC | `checklist.ts:295` |
| | 422 | alterar status de autoManaged | `O estado deste item é gerado automaticamente a partir do fornecedor ou do inventário.` | PT-PT | RPC | `checklist.ts:301` |
| `delete` | 404 | P2025 (sem check prévio) | `O registo solicitado não foi encontrado` | PT-PT | RPC | `checklist.ts:336` → `map-error.ts:78` |
| `list` | 422 | status fora do enum | `Dados inválidos` (issues EN) | MIXED | RPC | `checklist.ts:163-164` |

### 2.25 ACTIVITY-LOGS — oRPC

**Arquivo:** `packages/api/src/routers/activity-logs.ts` (89 linhas) · procedure: `activityLogs.list`

| Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| ------ | -------- | -------- | ------ | --------- | ------ |
| 403 | `input.userId` ≠ caller sem `ACTIVITY_READ_ALL` | `Não tem permissão para consultar a atividade de outro utilizador` | PT-PT | RPC | `activity-logs.ts:39-40` |
| 422 | Zod input (`from`/`to`) | `Dados inválidos` | MIXED | RPC | `errorMapper` |

### 2.26 AUTH / APP-LEVEL

**Arquivo:** `packages/api/src/app.ts` · **Bootstrap:** `apps/server/src/index.ts`

| Rota | Código | Condição | Mensagem | Idioma | Estrutura | Origem |
| ---- | ------ | -------- | -------- | ------ | --------- | ------ |
| `GET|POST /api/auth/*` | variável | respostas nativas do Better Auth (sign-in/sign-up/forgot, etc.) | EN da biblioteca (`"Invalid email or password"`, `"User already exists"`, ...) | EN | `BA` `{ error: { code, message, status } }` | `better-auth` → `app.ts:46-81` |
| | 401 | excepção não tratada no proxy | `Sessão inválida` | PT-PT | ENV | `app.ts:74-78` |
| | 429 | rate limit próprio (20/min) | `Rate limit exceeded, retry ...` | EN | ENV | `@fastify/rate-limit` (`app.ts:49-53`) |
| Sign-in de conta bloqueada | 403 | hook `session.create.before` | `A tua conta está bloqueada. Contacta o suporte para a desbloquear.` (code `ACCOUNT_BLOCKED`) | PT-PT | `BA` | `packages/auth/src/index.ts:58-66` |
| `GET /` | — | health | `"OK"` (sem envelope) | — | texto | `app.ts:85` |
| `/rpc/*` sem match | 404 | sem procedure | corpo **vazio** | — | EMPTY | `apps/server/src/index.ts:55` |
| `/api-reference/*` sem match | 404 | sem procedure | corpo **vazio** | — | EMPTY | `apps/server/src/index.ts:61` |
| Todas as rotas | 429 | rate limit global (100/min) | `Rate limit exceeded, retry ...` | EN | ENV | `@fastify/rate-limit` (`app.ts:24-27`) |

---

## 3. Inventário de Mensagens Partilhadas (infra/validação)

### 3.1 Validações partilhadas — todas PT-PT

| Mensagem | Idioma | Origem |
| -------- | ------ | ------ |
| `Formato de hora inválido. Use HH:mm.` | PT-PT | `shared/validation/angola.ts:43` |
| `País não suportado (${country}). Use um IBAN de Angola ou Portugal.` | PT-PT | `shared/validation/identifiers.ts:38` |
| `O IBAN de ${country} deve ter ${expectedLength} caracteres.` | PT-PT | `shared/validation/identifiers.ts:41` |
| `Formato de IBAN inválido.` | PT-PT | `shared/validation/identifiers.ts:44` |
| `Use um número de Angola: +244 9XX XXX XXX (9 dígitos após +244).` | PT-PT | `shared/validation/identifiers.ts:86` |
| `NIF inválido. Use 9 dígitos ou o formato completo (14 caracteres).` | PT-PT | `shared/validation/identifiers.ts:110` |
| `Palavra-passe é obrigatória` | PT-PT | `shared/validation/password.ts:21` |
| `Palavra-passe deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres` (8) | PT-PT | `shared/validation/password.ts:23-24` |
| `Palavra-passe deve conter pelo menos uma letra maiúscula` | PT-PT | `shared/validation/password.ts:26` |
| `Palavra-passe deve conter pelo menos uma letra minúscula` | PT-PT | `shared/validation/password.ts:27` |
| `Palavra-passe deve conter pelo menos um número` | PT-PT | `shared/validation/password.ts:28` |
| `Confirmação de palavra-passe é obrigatória` | PT-PT | `shared/validation/password.ts:33` |
| `As palavras-passe não coincidem` (`PASSWORD_MISMATCH_MESSAGE`) | PT-PT | `shared/validation/password.ts:36` |

### 3.2 Finance (`shared/finance/supplier-rules.ts`) — PT-PT, `ValidationError` (422)

| Mensagem | Origem |
| -------- | ------ |
| `Só é possível registar pagamentos num fornecedor confirmado.` | `supplier-rules.ts:18-19` |
| `Defina primeiro o montante acordado do fornecedor.` | `supplier-rules.ts:25-26` **e `:77-78` (duplicada)** |
| `O montante pago tem de ser maior que zero.` | `supplier-rules.ts:33-34` |
| `A soma dos pagamentos excede o montante acordado. Em falta: ${...}.` | `supplier-rules.ts:39-43` |
| `As parcelas só podem ser geridas num fornecedor em negociação ou confirmado.` | `supplier-rules.ts:51-52` |
| `A parcela ${index + 1} tem de ter um montante maior que zero.` | `supplier-rules.ts:63-66` |
| `A soma das parcelas (${...}) excede o montante acordado (${...}).` | `supplier-rules.ts:103-105` |
| `Um fornecedor concluído não pode voltar a estados anteriores.` | `supplier-rules.ts:127-129` |

`shared/finance/supplier-money.ts` e `money.ts`: **não lançam** — lógica pura.

### 3.3 Schemas Zod partilhados — EN default (biblioteca)

- `shared/schemas/filters.ts` (233 linhas): **nenhuma** mensagem custom (`paginationInput`, `*FilterSchema`). Issues EN: `"Too small: expected >= 1, received 0"`, `"Invalid input: expected number, received string"`, `"Invalid enum value. Expected 'DRAFT' | ..."`, etc.
- `shared/schemas/supplier-category-fields.ts` (556 linhas): **nenhuma** mensagem custom (verificado por grep). `.strictObject()` → `"Unrecognized key(s) in object"`; `.positive()` → `"Too small..."`; `.coerce.date()` → `"Invalid date"` — todas EN do Zod.
- **`parseSupplierCategoryFields`** (`supplier-category-fields.ts:269-277`): lança **`Error` plain** com mensagem **MIXED**:
  `Campos inválidos para a categoria ${category}: ${parsed.error.issues.map(i => i.message).join("; ")}`
  → `mapError` → **500 `"Internal server error"`** (mensagem útil perdida).

### 3.4 Mensagens de bibliotecas que chegam ao cliente

| Origem | Exemplos | Idioma |
| ------ | -------- | ------ |
| `@fastify/rate-limit` (429) | `Rate limit exceeded, retry in 1 minute` (code `FST_ERR_RATE_LIMIT`) | EN |
| Fastify parser (400) | `Unexpected token ... in JSON`, `FST_ERR_CTP_*` | EN |
| Zod (422 issues) | `Required`, `Invalid input: expected string, received number`, `Too small...`, `Invalid enum value...`, `Invalid uuid`, `Invalid date`, `Unrecognized key(s)...` | EN |
| Better Auth | `Invalid email or password`, `User already exists`, `Account banned`/`ACCOUNT_BLOCKED` (message custom PT-PT) | EN (msg default) / PT-PT (custom) |
| `@orpc/server` | `ORPCError` sem `message` → default EN para o código (ex.: `UNAUTHORIZED`) | EN |
| Export libs | `ExportNotSupportedError` — `Export "X" is not available in Y` (EN, log only; remapeado para 404 PT) | EN (interno) |

---

## 4. Auditoria de Língua — Síntese

| Classificação | Ocorrências principais |
| ------------- | ---------------------- |
| **PT-PT** | Todas as mensagens de negócio dos services/rules/schemas com `message` custom (events, guests, tasks, members, notifications, inventory, users, invitations, dedications, suppliers, food-plan, checklist, activity-logs) + validações partilhadas + `mapError` PT + `BLOCKED_USER_MESSAGE` + `"Sessão inválida"`. |
| **EN** | ① `"Unauthorized"` manuscrito em ~45 blocos inline nas rotas REST; ② defaults das classes `app-error.ts` (`"Bad request"`, `"Unauthorized"`, `"Forbidden"`, `"Not found"`, `"Conflict"`, `"Validation error"`, `"Internal server error"`); ③ `"Internal server error"` resultante de qualquer `Error` plain; ④ mensagens de biblioteca (rate-limit, Fastify parse, Zod issues, Better Auth, ORPCError). |
| **PT-BR** | **0** — não foram encontradas mensagens com ortografia PT-BR (as variantes `Selecione`/`actual` são formas da ortografia pós-1990, ainda PT-PT, mas inconsistentes entre si). |
| **MIXED** | ① 422 `"Dados inválidos"` (message PT) + `details`/issues do Zod (EN) — oRPC; ② `parseSupplierCategoryFields` (prefixo PT + issues EN); ③ `publishBatch` (frases PT + `error.message` cru); ④ QR warning (`Publicado, mas o QR Code não pôde ser gerado: ${error.message}`); ⑤ `moneyInput` (refine PT + `nonnegative` EN); ⑥ `publish` com `FAILED` (raw DB/EN + fallback PT). |

**Casos específicos identificados:**

- Mensagens EN que chegam ao frontend hoje: `Unauthorized` (401 REST), `Internal server error` (500 de `Error` plain), `Rate limit exceeded...` (429), parsing Fastify (400), Better Auth (sign-in/up), OrpcError defaults;
- Mensagens parcialmente traduzidas: 422 `Dados inválidos` + issues EN; `moneyInput`; `parseSupplierCategoryFields`;
- Mensagens duplicadas com textos diferentes: `"O montante pago tem de ser maior que zero"` (sem ponto, `suppliers.ts:758-761`) vs `"...maior que zero."` (com ponto, `supplier-rules.ts:33-34`);
- Mensagens semanticamente iguais com códigos diferentes: "convidado já na mesa" → REST `409` vs oRPC `400`; "utilizador já é membro" → REST `409` vs oRPC `500`; "remover proprietário" → REST `403` vs oRPC `500`; "não é membro" → exports `404` (deliberado) vs dashboard REST `200 null` vs oRPC `500`.

---

## 5. Localização exata (índice de ficheiros auditados)

| Ficheiro | Notas |
| -------- | ----- |
| `packages/api/src/app.ts` | proxy auth, health, rate-limit global, registo do error handler |
| `packages/api/src/index.ts` | `errorMapper`, `requireAuth`, `requireActiveUser` (oRPC) |
| `packages/api/src/context.ts` | `createContext` (sem try/catch na sessão) |
| `packages/api/src/routes.ts` | registo das rotas REST |
| `packages/api/src/routers/*.ts` (16 ficheiros) | procedures oRPC por domínio |
| `packages/api/src/modules/{events,guests,tasks,members,notifications,inventory,users,dashboard,exports}/routes.ts` | rotas REST |
| `packages/api/src/modules/{events,guests,tasks,members,notifications,inventory,users,dashboard}/service.ts` | regras de negócio e `AppError`s |
| `packages/api/src/modules/budget/*` | analytics/breakdown/repository (usados pelo router) |
| `packages/api/src/modules/dedication/*` | service/repository/schemas/rich-text |
| `packages/api/src/modules/invitations/**` | service/schemas/public/qr-code |
| `packages/api/src/modules/invitations/public/routes-invitation-export.ts` | rota pública PDF |
| `packages/api/src/modules/exports/routes.ts` | rotas de exportação |
| `packages/api/src/exports/**` | orquestração/registry/reports (erros internos) |
| `packages/api/src/shared/errors/*` | classes + handler + `mapError` |
| `packages/api/src/shared/auth/*` | middleware de sessão, `requireEventAccess`, `rate-limit` |
| `packages/api/src/shared/validation/*` | angola, identifiers, password |
| `packages/api/src/shared/schemas/*` | filters, pagination, supplier-category-fields |
| `packages/api/src/shared/finance/*` | supplier-rules (ValidationError), money |
| `packages/api/src/shared/utils/*` | `validateEnum` (silencioso), helpers |
| `packages/api/src/shared/activity/activity-context.ts` | sem mensagens de erro |
| `packages/api/src/jobs/event-lifecycle.ts` | worker (erros internos, nunca ao cliente) |
| `packages/api/src/modules/events/{lifecycle,proximity-notifier}.ts` | worker/notificações PT-PT (dados, não erros) |
| `packages/auth/src/index.ts` | Better Auth config, `BLOCKED_USER_MESSAGE`, APIError |
| `packages/auth/src/access.ts` | permissões (sem throws) |
| `apps/server/src/index.ts` | handlers oRPC/OpenAPI, `onError`, 404 vazios |

---

## 6. Inconsistências Encontradas

### 6.1 Estruturas de erro diferentes

1. **REST** → `{ error: { code, message } }` (projecto, `error-handler.ts:30-35`).
2. **oRPC** → envelope nativo `@orpc/server` — `{ defined, code, status, message, data? }` (formato da biblioteca, embora derive do mesmo `mapError`).
3. **Better Auth** → `{ error: { code, message, status, statusCode? } }` (formato da biblioteca).
4. **404 sem match** em `/rpc/*` e `/api-reference/*` → **corpo vazio** (`apps/server/src/index.ts:55, :61`).
5. **Sucessos variados**: `{ data }`, `{ data, meta }`, `{ data: { success: true } }`, `201`, `204` (vazio), binário PDF/XLSX, `"OK"` no health check.

### 6.2 Códigos diferentes para o mesmo cenário

| Cenário | REST | oRPC |
| ------- | ---- | ---- |
| Convidado já associado à mesa | `409 CONFLICT` (P2002) | `400 BAD_REQUEST "Convidado já está associado a esta mesa"` |
| Utilizador já é membro do evento | `409 CONFLICT` (`service.ts:26`) | `500` (`members.ts:84`) |
| Remover o proprietário | `403 FORBIDDEN` | `500` (`members.ts:135`, `users.ts:258`) |
| Recurso não encontrado | 404 com mensagem específica | 404 genérica P2025 `"O registo solicitado não foi encontrado"` (ou **500** quando é `throw new Error`) |
| "Não é membro do evento" | exports `404 Evento não encontrado` (deliberado); dashboard `200 { data: null }`; outros 403 | `500 "Internal server error"` |
| Capacidade máxima do evento | — (invitations) `400 BAD_REQUEST` | — |

### 6.3 Mensagens em EN (que chegam ao frontend)

- `"Unauthorized"` — block inline repetido **43 vezes** nas rotas REST (`modules/*/routes.ts`): events (5×), guests (8×), tasks (8×), members (4×), notifications (6×), inventory (7×), users (2×), dashboard (1×), exports (2×);
- `"Internal server error"` — default `InternalError` + resultado de **qualquer** `Error` plain (incl. falhas de autorização e regras de negócio PT-PT);
- Rate-limit `"Rate limit exceeded, retry ..."` — biblioteca;
- Parsing JSON Fastify — biblioteca;
- Better Auth sign-in/sign-up — biblioteca;
- `ORPCError("UNAUTHORIZED"/"FORBIDDEN")` sem message — default EN da biblioteca;
- Zod default issues — biblioteca (só oRPC `details`; REST esconde).

### 6.4 Mensagens PT-PT perdidas (viram 500 EN)

- `requireEventAccess` — `"Não tem permissão para aceder a este evento"` / `"Não tem permissão suficiente para esta operação"` (`event-access.ts:21,25`) → **500** em **26 chamadas** (todas as procedures oRPC de guests/tasks/members/inventory/budget/invitations/suppliers/food-plan/checklist/dashboard/users + rotas REST com acesso);
- `rate-limit.ts:26` — `"Demasiadas tentativas. Tente novamente mais tarde."` → **500 em vez de 429**;
- oRPC routers e serviços — **23 `throw new Error(...)`** com mensagens PT-PT → 500 (`events.ts:112,120,175,295,305,319,381,390`, `guests.ts:118`, `tasks.ts:72`, `members.ts:72,84,111,130,135`, `users.ts:231,258`, `budget.ts:97`, `expense-analytics.ts:121`, `event-access.ts:21,25`, `rate-limit.ts:26`, `supplier-category-fields.ts:273`);
- `supplier-category-fields.ts:272-277` — validação de campos de categoria → **500 em vez de 422**.

### 6.5 Mensagens duplicadas / inconsistentes

- `"Defina primeiro o montante acordado do fornecedor."` em `supplier-rules.ts:25-26` e `:77-78`;
- `"O montante pago tem de ser maior que zero"` (sem ponto) vs `"O montante pago tem de ser maior que zero."` (com ponto);
- `"Evento não encontrado"` (REST/service) vs `"Internal server error"` (oRPC plain Error) — mesmo cenário;
- `"Convidado não encontrado"` vs `"O registo solicitado não foi encontrado"` (P2025) vs `"Mesa ou convidado não encontrado"` — todos "não encontrado" com textos diferentes;
- `"Selecione"` vs `"Seleccione"` (dedications: `service.ts:309,462,474` usam `Selecione`; `service.ts:555` e `schemas.ts:80` usam `Seleccione`; `schemas.ts:44` `"Seleccione um tipo"`);
- `"Mesa não encontrada"` (`service.ts:110`) vs `"Mesa ou convidado não encontrado"` (`guests.ts:527`);
- `"Não tem acesso a este evento"` vs `"Não tem permissão para aceder a este evento"` vs `"Não tem permissão suficiente para esta operação"` — três frases para negação de acesso;
- `"Tarefa não encontrada"` vs `"Item de checklist inválido."` vs `"Item do plano de alimentação inválido."` — padrões de "não encontrado" não uniformes;
- `"Convite não encontrado"` aparece em ~10 locais distintos (`service.ts:407,411,827,857,877`, `invitations.ts:91,233,239,273,295`).

### 6.6 Erros sem tratamento / herdados de bibliotecas

- `createContext` sem try/catch na sessão (falha → 500);
- `guests.getGuestStats` acede `event.capacity` sem verificar `event` null → TypeError → 500 (`analytics.ts:62-63`);
- REST dashboard devolve `200 { data: null }` para evento inexistente/sem acesso (sem 403/404);
- `read-all`/`delete-all` (REST notifications) sem verificação de ownership nos itens (scope por userId — aceitável, mas inconsistente com `markAsRead`); oRPC `markAsRead`/`delete` **sem verificação de ownership**;
- Rotas REST `GET/POST guests`, `GET/POST tables`, `GET/POST tasks/schedules` sem `requireEventAccess`;
- `MemberService.addMember` passa email como `userId` (P2003 → 400); `updateRole`/`removeMember` usam `findByEventAndUser("", memberId)` → 404 permanente provável;
- `suppliers.delete`/`checklist.delete`/`tasks.delete` sem check prévio → P2025 → mensagem genérica;
- Erros 4xx do Fastify (`FST_ERR_*`) não mapeados/traduzidos;
- **Não há tratamento específico para uploads** (não existem rotas de upload) — apenas parser genérico;
- **Não há camada i18n** — tudo hardcoded.

### 6.7 Resumo dos incumprimentos ao "padrão global"

- **43 blocos 401 EN manuscritos** em vez do handler global;
- 2 helpers `notFound()` locais duplicados (`exports/routes.ts:79`, `routes-invitation-export.ts:22`) em vez de uso consistente do handler;
- `requireEventAccess` deveria produzir 403/404 mas produz **500**;
- Rate limiter de memória deveria produzir 429 mas produz **500**;
- Validação de campos da categoria deveria produzir 422 mas produz **500**;
- `parsePagination`/`validateEnum` silenciam inputs inválidos em REST enquanto o oRPC rejeita com 422 (comportamento divergente por transporte);
- Schemas Zod misturam mensagens PT custom e EN default no mesmo schema (`events/schemas.ts`, `dedications/schemas.ts`).

---

## 7. Resumo Executivo

| Categoria | Quantidade |
| --------: | ---------: |
| Total de rotas auditadas | **167** (46 REST + 121 oRPC) |
| Rotas com erros documentados | **167** (todas têm, pelo menos, caminhos de erro de autenticação/validação) |
| Mensagens EN (distintas, que chegam ao cliente) | **12** |
| Mensagens PT-PT (distintas) | **≈ 129** |
| Mensagens PT-BR | **0** |
| Mensagens MIXED | **≈ 6** |
| Estruturas diferentes encontradas | **5** (REST, oRPC, Better Auth, 404 vazio, sucessos variados) |
| Rotas fora do padrão `{ error }` | **3** (`/api/auth/*`, `/rpc/*` sem match, `/api-reference/*` sem match) + **43 blocos 401 manuscritos** e **23 `throw new Error` plain + 26 chamadas `requireEventAccess`** que viram 500 |
| Erros gerados por bibliotecas (canais) | **6** (Zod, Prisma, Fastify/rate-limit, Better Auth, @orpc/server, export libs) |

> **Metodologia de contagem:** "Mensagens" = strings de erro distintas identificadas no código (duplicatas semânticas contadas uma vez; variantes de pontuação contadas separadamente). "Rotas fora do padrão" = rotas cujo envelope de erro difere de `{ error: { code, message } }`.

---

## 8. Estado após normalização

A fase de normalização foi aplicada a **todas** as superfícies (REST, oRPC, Better
Auth, downloads e formulários), não apenas às rotas auditadas nas secções 2.x.

### 8.1 Contrato único

| Superfície | Envelope | Notas |
| ---------- | -------- | ----- |
| REST | `{ "error": { "code", "message", "details"? } }` | `error-handler.ts` + `setNotFoundHandler`; `details` só com `issues` de validação. |
| oRPC | `{ code, status, message, data? }` | `data` é o `details`; envelope nativo do ORPCError, preservado para não partir o cliente. |
| Better Auth | `{ "error": { "code", "message" } }` | Adaptado no proxy de `app.ts` por `better-auth-error.ts`; headers e status preservados. |
| Procedures OpenAPI sem match | `{ "error": { code, message } }` | `rpcNotFound` em `apps/server/src/index.ts`. |
| Downloads (`fetch` binário) | idem REST | `use-export-download.ts` reconstrói o mesmo `ApiErrorInfo`. |

### 8.2 Código estável por camada

- Fonte de verdade: `packages/api/src/shared/errors/codes.ts`.
- Códigos genéricos: `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`,
  `CONFLICT`, `VALIDATION_ERROR`, `RATE_LIMIT_EXCEEDED`, `INTERNAL_SERVER_ERROR`.
- Códigos de domínio por módulo: `EVENT_*`, `GUEST_*`, `MEMBER_*`, `TASK_*`,
  `NOTIFICATION_*`, `INVENTORY_*`, `INVITATION_*`, `DEDICATION_*`, `SUPPLIER_*`,
  `FOOD_PLAN_*`, `CHECKLIST_*`, `USER_*`, `AUTH_*`.
- As subclasses de `AppError` mantêm sempre um código por omissão, pelo que um
  `throw new ForbiddenError("…")` sem código explícito continua a ser
  determinístico (`FORBIDDEN`).
- Regras de negócio quantitativas que devolviam 403 passaram a 422 com código
  próprio: `INVENTORY_QUANTITY_RULE_VIOLATED`, `DEDICATION_VIEWER_NOT_IN_EVENT`,
  `DEDICATION_LOCKED`.

### 8.3 Tradução PT-PT no boundary

- Zod `4.4.3`: os `issue.code` são traduzidos (`invalid_type`, `too_small`,
  `unrecognized_keys`, …) e as mensagens passam a PT-PT; issues de campos
  aparecem em `details.issues` com o caminho do campo.
- Fastify 4xx: `FST_ERR_*` são traduzidos para o código público equivalente e
  nunca expõem a mensagem original da biblioteca.
- Prisma: mantido o mapeamento por *shape* (`P2002` → `CONFLICT`, `P2025` →
  `NOT_FOUND`, `P2003` → `BAD_REQUEST`, `P2022` → 500 genérico); códigos `P*`
  desconhecidos dão 500 com mensagem PT-PT genérica.
- Better Auth: tabela de tradução dos erros de autenticação (`INVALID_EMAIL_OR_PASSWORD`,
  `EMAIL_NOT_VERIFIED`, `SESSION_EXPIRED`, `TOO_MANY_REQUESTS`, …) para
  `AUTH_INVALID_CREDENTIALS`, `AUTH_EMAIL_NOT_VERIFIED`, etc.
- Mensagens técnicas de bibliotecas deixou de chegar ao cliente; um `Error`
  desconhecido produz sempre `INTERNAL_SERVER_ERROR` com mensagem PT-PT fixa.

### 8.4 Onde `throw new Error(...)` deixou de ser perdido

Todos os pontos citados em 6.4 foram substituídos por `AppError`:

- `requireEventAccess` e `requireEventMember` lançam `NotFoundError`/
  `EventAccessError` com `EVENT_NOT_FOUND` em vez de `Error` simples;
- export (`exports/routes.ts`) e convite público
  (`routes-invitation-export.ts`) lançam `AppError` em vez de montar
  401/404 manuscritos;
- dashboard devolve 404 em vez de `200` com `null`.

### 8.5 Frontend centralizado

- `apps/web/src/shared/errors/` — `codes.ts` (espelho do backend), `parse-api-error.ts`,
  `handle-api-error.ts` e o barrel `index.ts`.
- `parseApiError` normaliza oRPC, envelope REST, `APIError` do Better Auth,
  `ZodError` de cliente e valores desconhecidos num único `ApiErrorInfo`
  (`code`, `message`, `status`, `details`).
- `handleApiError` é o **único** ponto que transforma uma falha em feedback:
  toast PT-PT, ou issues ligado aos campos do formulário via
  `applyApiValidationErrors` (TanStack Form `setFieldMeta` + `errorMap.onSubmit`).
- `apps/web/src/utils/orpc.ts` liga `QueryCache` e `MutationCache` a este
  handler, pelo que as 32 mutations com `onError` duplicado deixaram de ter
  tratamento próprio.
- Páginas de auth (login, registo, reset de palavra-passe) e downloads de
  exportação usam o mesmo handler; as mensagens de validação de cliente já eram
  PT-PT e mantêm-se.

### 8.6 Cobertura de testes

| Ficheiro | Cobertura |
| -------- | --------- |
| `packages/api/src/__tests__/app.test.ts` | 401, 404, 422 com `details.issues`, masking de 500. |
| `packages/api/src/shared/auth/better-auth-error.test.ts` | Tradução de erros Better Auth e preservação de status/headers. |
| `packages/api/src/shared/utils/validate-enum.test.ts` | Query filters inválidos → 422 com campo. |
| `packages/api/src/shared/errors/map-error.test.ts` | Fastify 4xx, Zod v4 e Prisma. |
| `packages/api/src/modules/dedication/service.test.ts` | Códigos de domínio (`DEDICATION_VIEWER_NOT_IN_EVENT`, `DEDICATION_LOCKED`, …). |
| `apps/web/src/shared/errors/__tests__/parse-api-error.test.ts` | 5 transports + nunca vazar texto cru. |
| `apps/web/src/shared/errors/__tests__/handle-api-error.test.ts` | Toast, fallback e mapeamento para campos. |
| `apps/web/src/shared/errors/__tests__/codes.test.ts` | O espelho de códigos não diverge do backend. |

Estado: `packages/api` 29 ficheiros / 416 testes aprovados; `apps/web`
`src/shared/errors` 3 ficheiros / 20 testes aprovados.

## 9. Riscos residuais

| # | Risco | Impacto | Situação |
| - | ----- | ------- | -------- |
| 1 | Issues do Zod em schemas com mensagens EN escritas à mão | Mensagem EN em 422 | Baixo — schemas auditados; valida-se sempre a PT-PT ao adicionar um schema |
| 2 | `oRPCError` nativo não usa a chave `error` | Clientes REST não podem reutilizar o envelope | Aceito — o cliente oRPC é o único consumidor de `/rpc/*` |
| 3 | Códigos novos podem divergir do espelho do frontend | `code` desconhecido (a mensagem continua correcta) | Mitigado pelo teste de sincronização `codes.test.ts` |
| 4 | Rotas de oRPC sem `output`/docs por validar | 404 do envelope pode não estar coberto por testes de integração | Baixo — `rpcNotFound` está registado em `apps/server` |
| 5 | `apps/web` tem testes pré-existentes a falhar (`invite-book`, `inventory-stats`, `inventory-details-dialog`, `helpers`) | Ruído na regressão | Pré-existente e sem relação com o sistema de erros (confirmado contra `HEAD`) |

---

## Anexo A — Como detectar/verificar um erro num novo endpoint

> Regras vigentes após a normalização. O texto original da auditoria manteve-se
> abaixo, com o comportamento antigo descrito entre parênteses.

1. A rota REST cai no `errorHandler` global — basta `throw` um `AppError` (ou
   deixar Zod/Prisma propagar) para obter o envelope PT-PT.
2. **Nunca** `throw new Error("texto")`: o cliente recebe `500` com mensagem
   genérica (antes: `500 "Internal server error"`) e o texto original é perdido.
3. Para autorização use `ForbiddenError`/`NotFoundError` — `requireEventAccess`
   já lança `AppError` por si.
4. Em oRPC, `AppError` vira `ORPCError` com o mesmo `code`/`status`/`message`
   e `details` em `data`; `ZodError` dá 422 `"Os dados enviados são inválidos."`
   (antes: `"Dados inválidos"` em EN) com `details.issues`.
5. Mensagens: PT-PT em regras de negócio; não confiar em defaults EN das classes
   nem em issues do Zod — ambos são traduzidos em `map-error.ts`.
6. Ao inventar um código, acrescente-o a `packages/api/src/shared/errors/codes.ts`
   **e** a `apps/web/src/shared/errors/codes.ts` (o teste `codes.test.ts` falha
   se uma lista divergir).

### Anexo A (original da auditoria, anterior à normalização)

1. A rota REST vai cair no `errorHandler` global — basta `throw` um `AppError` (ou deixar Zod/Prisma propagar) para obter envelope PT-PT correcto.
2. **Nunca** `throw new Error("texto")`: vira `500 Internal server error` e perde a mensagem.
3. Para autorização use `ForbiddenError`/`NotFoundError` (nunca `requireEventAccess` sem wrapper).
4. Em oRPC, `AppError` vira `ORPCError` com o mesmo `code`/`status`/`message`; `ZodError` dá 422 `"Dados inválidos"`.
5. Mensagens: PT-PT em regras de negócio; não confiar em defaults EN das classes nem em issues do Zod.

---

*Secções 1–7 e Anexo A (original): auditoria do código no ramo `big-refactor`,
recolhida sem alterações de código. Secções 8–9 e Anexo A (vigente): resultado
da fase de normalização — padrão oficial, códigos estáveis, estrutura única,
tradução PT-PT no boundary e eliminação de fugas de informação.*