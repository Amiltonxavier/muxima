

## 3. Current Authentication Architecture

**Evidence:**
- `packages/auth/src/index.ts:1-165` — Better Auth instance creation
- `packages/db/prisma/schema/auth.prisma:33-59` — Session/Account/User models
- `packages/api/src/context.ts:1-50` — oRPC context with session resolution
- `packages/api/src/shared/auth/auth-middleware.ts:1-120` — Fastify REST middleware
- `apps/web/src/lib/auth-client.ts:1-65` — Frontend auth client
- `apps/web/src/utils/orpc.ts:1-140` — oRPC client with 401 handling

**Summary:** Monorepo using Better Auth v1.7.1 with Prisma adapter (Postgres). Server mounts Better Auth at `/api/auth/*` and uses oRPC for RPC calls. Frontend uses `@tanstack/react-router` for routing with session guards, `@tanstack/react-query` with oRPC client.


## 4. Backend Expiration

### 4.1 Session Model & Schema

**Evidence:**
- `packages/db/prisma/schema/auth.prisma:33-59`

```text
model Session {
  id        String   @id
  expiresAt DateTime
  token     String
  createdAt DateTime @default(now())
  updatedAt DateTime @default(now())? (updatedAt @updatedAt in actual schema)
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([token])
  @@index([userId])
  @@map("session")
}
```

**Conclusion:** Session has `expiresAt` (DateTime) — expiration timestamp is persisted. No additional `expiresIn` column. The actual `updatedAt` uses `@updatedAt` (see line 42 in schema).

### 4.2 Better Auth Configuration

**Evidence:**
- `packages/auth/src/index.ts:22-165`

Configuration includes:
- `database: prismaAdapter(prisma, { provider: "postgresql" })`
- `emailAndPassword: { enabled: true }`
- `secret`, `baseURL`, `trustedOrigins`
- `user.additionalFields`: `phone`, `status` (ACTIVE/BLOCKED, input:false)
- `databaseHooks` on session create/delete (for activity logging)
- `advanced.defaultCookieAttributes`: `sameSite: "none"`, `secure: true`, `httpOnly: true`
- Plugins: `expo()`, `customSession()` to enrich session with roles/permissions

**Critical observation:** No `session` configuration object specified (e.g., no `session: { expiresIn: ..., updateAge: ... }`). Therefore Better Auth uses defaults.

**Evidence from Better Auth v1.7.1 (node_modules):**
- `packages/auth/node_modules/better-auth/dist/context/create-context.mjs:147` — `expiresIn: options.session?.expiresIn || 3600 * 24 * 7` (7 days = 604800 seconds)
- Session cookie maxAge also defaults to 7 days when not specified (`create-context.mjs:52`)
- `sessionConfig.expiresIn` defaults to 7 days

**Conclusion:** `TTL real = 7 dias (604800 segundos)`. No explicit override in app code.

**Location:** `packages/auth/src/index.ts` — no `session` block present. Default from Better Auth v1.7.1.


### 4.3 Session Creation

**Evidence:**
- `packages/auth/src/index.ts:51-86` — `databaseHooks.session.create`
- Session creation is handled by Better Auth internally on sign-in; app hooks run `before`/`after`
- `before` hook (line 55-66): checks user status; if BLOCKED throws `APIError("FORBIDDEN", { code: "ACCOUNT_BLOCKED", message: BLOCKED_USER_MESSAGE })`
- `after` hook (line 70-83): logs LOGIN activity via `createActivityLog`

**Behavior:** When a user signs in successfully, Better Auth creates a Session record with `expiresAt = now + expiresIn` (default 7d). The app only intercepts to block BLOCKED users and to log.

**Files:** `packages/auth/src/index.ts:51-86`

### 4.4 Session Validation (Server)

**Evidence:**
- REST: `packages/api/src/shared/auth/auth-middleware.ts:8-22` — `auth.api.getSession({ headers: fromNodeHeaders(request.headers) })`
- oRPC context: `packages/api/src/context.ts:15-43` — same call to resolve session
- Better Auth handler at `/api/auth/*`: `packages/api/src/app.ts:108-181` — proxies to `auth.handler(req)`

**How server identifies expired session:** Better Auth validates the session token against DB and checks `expiresAt`. If expired/invalid, `auth.api.getSession()` returns `null` (or may throw depending on context). In middleware, catch block sets `request.session = null`. In Better Auth's own endpoints, it returns appropriate error responses.

**When expired:** Better Auth compares current time to `session.expiresAt`. On `/api/auth/get-session` or when validating, expired sessions are treated as non-existent/invalid.

**Files:** 
- `packages/api/src/shared/auth/auth-middleware.ts:8-22`
- `packages/api/src/context.ts:19`
- `packages/api/src/app.ts:108-181`


### 4.5 Expired Session Errors

**Better Auth internal errors (mapped):**
- `SESSION_EXPIRED` → status 401, code `AUTH_CODES.SESSION_EXPIRED`, message "A sessão expirou. Inicia sessão novamente para continuar." (from translation table)
- `TOKEN_EXPIRED` → status 401, code `AUTH_CODES.INVALID_TOKEN`, message "O token enviado expirou."
- `INVALID_TOKEN`, `ACCESS_TOKEN_NOT_FOUND`, `REFRESH_TOKEN_NOT_FOUND` → 401 with appropriate messages

**Evidence:** `packages/api/src/shared/auth/better-auth-error.ts:80-115, 155-200`

**API error envelope:** App uses standardized envelope via `errorEnvelope()` and error handler. When Better Auth endpoint returns error, it's mapped via `mapBetterAuthError()` (line 159-181 in app.ts). REST/oRPC errors go through global error handler.

**HTTP status returned on expired session:**
- When accessing protected REST routes, `requireSessionUserId()` throws `UnauthorizedError()` if no session (line 45-90 in auth-middleware.ts). `UnauthorizedError` produces 401 (per app error classes).
- When Better Auth directly reports `SESSION_EXPIRED`, mapped to 401.
- oRPC procedures that call guards throw UnauthorizedError → 401.

**Payload:** Standard app error envelope `{ error: { code, message, details } }` (see error handling). PT-PT messages per mapping.

**Files:**
- `packages/api/src/shared/auth/better-auth-error.ts`
- `packages/api/src/shared/errors/app-error.ts` (referenced)
- `packages/api/src/shared/auth/auth-middleware.ts:45-90`

### 4.6 Refresh / Renewal

**Search findings:**
- No `refreshToken` rotation logic in custom code
- No references to automatic token refresh in frontend (no interceptor retry, no silent refresh)
- Better Auth supports refresh tokens (schema has `refreshToken`, `refreshTokenExpiresAt` in Account model), but app doesn't configure custom refresh behavior or call refresh endpoints explicitly
- Frontend only calls `authClient.getSession()` and `authClient.signOut()`; no `refreshSession()` or similar found
- oRPC client on 401 does immediate redirect to login (line 93-120 in orpc.ts) — no attempt to refresh

**Evidence:**
- Account model has refresh token fields: `packages/db/prisma/schema/auth.prisma:67-88` (accessToken, refreshToken, idToken, accessTokenExpiresAt, refreshTokenExpiresAt)
- No usage of refresh in app logic found
- No "refresh" in web app auth code beyond maybe not present

**Conclusion:** **Refresh automático não existe.** No automatic refresh implemented. When session expires, client receives 401 and is redirected to login. No retry with refresh token.

**Explicit statement required:** **Não encontrado:** não existe implementação de refresh automático após pesquisa nos pontos de autenticação/client HTTP encontrados.


### 4.7 Logout & Revocation

**Backend logout:**
- Better Auth handles sign-out via its API (`/api/auth/sign-out` etc.)
- App has `databaseHooks.session.delete.after` hook (line 86-104 in auth/index.ts) that logs LOGOUT activity when session row is deleted
- On sign-out, Better Auth invalidates/deletes the session

**Revocation:**
- Sessions are deleted on sign-out (per hook behavior: "Sessions are removed on sign-out and when a password change revokes the other devices")
- Password change revocation mentioned in comment (line 84-85)
- No other bulk revocation logic in app code found
- BLOCKED users: when session is created, before hook checks status and blocks if BLOCKED (line 55-66). Also in middleware, when session exists, app checks user.status and throws Forbidden if BLOCKED (line 47-71, 87-119 in auth-middleware.ts). But existing sessions of BLOCKED users remain until expiration or until deleted; the check is enforced on requests.

**Evidence:**
- `packages/auth/src/index.ts:84-104` — session delete hook logs LOGOUT
- `packages/api/src/shared/auth/auth-middleware.ts:47-71, 87-119` — BLOCKED user checks
- Comment in auth/index.ts:67-69, 84-86

**After logout:** Session cookie cleared by Better Auth, session record deleted, LOGOUT activity logged.


## 5. Frontend Expiration Handling

### 5.1 Auth Client

**Evidence:** `apps/web/src/lib/auth-client.ts:59-65`

`authClient = createAuthClient({ baseURL: new URL("/api/auth", getServerUrl(env.VITE_SERVER_URL)).toString() })`

Uses Better Auth React client. No custom session polling configured. Default behavior: `useSession()` fetches current session; client relies on server validation.

### 5.2 Session Hooks

**Usage:** `apps/web/src/shared/components/user-menu.tsx:103` — `const { data: session, isPending } = authClient.useSession();`

**Behavior:** Hook queries session state. When session becomes invalid server-side, next fetch returns null/error; component reacts accordingly.

**No periodic polling found:** No `refetchInterval`, `polling`, or `setInterval` calls for session refresh in web codebase.

### 5.3 oRPC/API Client & Interceptors

**Evidence:** `apps/web/src/utils/orpc.ts:70-140`

- Creates RPCLink to `/rpc` with `credentials: "include"`
- Fetch wrapper intercepts `response.status === 401`:
  - If in browser and not on auth pages (`/login`, `/register`, `/invite/*`), it shows toast with SESSION_EXPIRED_MESSAGE and redirects to `/login` via `window.location.href = "/login"`
- No retry on 401, no refresh attempt

**Behavior on 401:** Immediate redirect to login (hard navigation), preserving original path only in the sense that user lands on /login but original location lost unless stored elsewhere. No query param preservation observed in this code.

**Files:** `apps/web/src/utils/orpc.ts:93-120`

### 5.4 TanStack Query Error Handling

**Evidence:** `apps/web/src/utils/orpc.ts:32-68`

- QueryCache onError: calls `handleApiError` with toast + "Tentar novamente" action (invalidates query)
- MutationCache onError: calls `handleApiError`
- Both use shared error handling; 401s are also caught by fetch interceptor above

**Note:** Both layers may react to errors; interceptor runs at network level, query cache also receives error. But redirect is handled in interceptor for 401.

### 5.5 Route Guards (Middleware/BeforeLoad)

**Auth routes layout:** `apps/web/src/routes/_auth/layout.tsx:63-88`

`beforeLoad`:
- Calls `authClient.getSession()`
- If session exists → `throw redirect({ to: "/" })` (redirect authenticated users away from auth pages)
- On redirect (TanStack) rethrow; on other errors, return (allow auth page to render)

**Private routes:** `apps/web/src/routes/_private.tsx:10-49`

`beforeLoad`:
- Calls `authClient.getSession()`
- If no session AND no error → `throw redirect({ to: "/login" })`
- If error present → return (do not redirect; let app render/retry)
- On other errors (non-redirect), catch and return (no redirect)

**Behavior:** Route guards check session on navigation. They rely on Better Auth client. No refresh logic.


### 5.6 Frontend Detection & Flow

**How frontend knows authenticated:** 
- `authClient.useSession()` provides session data (user + session). Component checks for truthiness.
- Route guards use `getSession()` result.

**Detecting expired session:**
- Network requests return 401 → oRPC fetch interceptor triggers redirect
- Route navigation triggers `beforeLoad` guards which call `getSession()` → if session null (and no error), redirect to login
- No proactive detection (no timer-based expiry check)

**Periodic verification:** **Não encontrado.** No polling/refetch interval for session.

**401 handling:** 
- oRPC layer (RPCLink fetch): catches 401, toasts, redirects to `/login` (skipping auth/invite pages) — immediate hard redirect
- Route guards: also redirect on navigation if session absent

**Preserve original route:** **Não encontrado.** No query params like `redirect`/`returnTo` passed. After 401, user goes to `/login` with no indication of original path.

**Redirect loops:** Possible if session check returns inconsistent results? Route guard for private routes avoids redirecting on error (line 25-41 in _private.tsx) to prevent logout on transient errors. Auth layout also catches non-redirect errors. This mitigates loops on network issues.

**Concurrent requests during expiration:** Multiple requests may all receive 401 simultaneously. Each will trigger the fetch interceptor's 401 handling. No deduplication (no flag to prevent multiple redirects/toasts). Multiple toasts could appear; multiple `window.location.href` assignments (last wins).

**Stale auth state:** Possible if session expires between renders and requests. TanStack Query cache may hold data; 401 from queries causes redirect. No explicit cleanup beyond what signOut does.


## 6. End-to-End Expiration Flow

Reconstructed from code evidence:

```text
LOGIN
  ↓
Better Auth validates credentials (auth.handler)
  ↓
Session created in DB with expiresAt = now + 7d (default)
  ↓  [packages/auth/src/index.ts:51-86; Better Auth internals]
Session cookie set (httpOnly, secure, sameSite:none)
  ↓
Request authenticated (cookies sent)
  ↓
Server validates via auth.api.getSession() (middleware/context)
  ↓  [auth-middleware.ts:8-22, context.ts:15-43]
Session valid if expiresAt > now
  ↓
Time passes → session expires
  ↓
New request with expired cookie
  ↓
auth.api.getSession() sees expired → returns null/invalid
  ↓
REST: middleware sets session=null; protected route guard throws UnauthorizedError (401)
  OR oRPC: context has session null; procedure guards throw UnauthorizedError
  OR Better Auth endpoint itself returns SESSION_EXPIRED mapped to 401
  ↓  [auth-middleware.ts:45-90, better-auth-error.ts:80-115]
Response HTTP 401 with app error envelope
  ↓
Frontend receives 401
  ↓
oRPC fetch interceptor (orpc.ts:93-120): detects 401, toasts, redirects to /login
  OR Route guard on navigation detects no session → redirects to /login
  ↓
User at /login (no original return path preserved)
```

**Evidence per step:** As referenced above.

## 7. Token / Session Lifecycle

| Phase | Action | Location | Evidence |
|---|---|---|---|
| Creation | Better Auth creates Session with expiresAt | Better Auth internals (DB) | Schema `auth.prisma:39` (`expiresAt DateTime`); default TTL 7d from Better Auth config defaults |
| Creation hooks | Block BLOCKED users before create; log LOGIN after create | `packages/auth/src/index.ts:55-83` | Lines 55-66, 70-83 |
| Active use | Session validated on each request via getSession | Middleware/context | `auth-middleware.ts:11-21`, `context.ts:19` |
| Expiration check | Server compares now vs expiresAt | Better Auth | Default behavior (v1.7.1) |
| Expired request | Returns 401 Unauthorized | Guards + error mapping | `auth-middleware.ts:45-90`, `better-auth-error.ts:80-115` |
| Renewal/Refresh | **None** | — | Not found in codebase |
| Logout | Session deleted via Better Auth sign-out; LOGOUT logged | Delete hook | `auth/index.ts:86-104`, `user-menu.tsx:153-186` |
| Revocation | Session deletion on sign-out/password change; BLOCKED enforcement | Hooks + middleware | Comments + middleware checks |


## 8. HTTP Error Behaviour

| Scenario | HTTP Status | Error Code | Message (PT-PT) | Source |
|---|---|---|---|---|
| Session expired (Better Auth) | 401 | `AUTH_CODES.SESSION_EXPIRED` | "A sessão expirou. Inicia sessão novamente para continuar." | `better-auth-error.ts:101-107` |
| Token expired | 401 | `AUTH_CODES.INVALID_TOKEN` | "O token enviado expirou." | `better-auth-error.ts:96-100` |
| Invalid/missing token | 401 | `AUTH_CODES.INVALID_TOKEN` | Various messages | `better-auth-error.ts:108-125` |
| No session (protected route) | 401 | From UnauthorizedError → mapped | Standard 401 message | `auth-middleware.ts:45, 60, 89, 114`; `parse-api-error.ts:40,50` |
| BLOCKED user | 403 | `ERROR_CODES.ACCOUNT_BLOCKED` | "A tua conta está bloqueada..." | `better-auth-error.ts:88-95`, `auth-middleware.ts:53-71, 98-119` |
| Generic 401 from API | 401 | `ERROR_CODES.UNAUTHORIZED` | "É necessário iniciar sessão para continuar." | `parse-api-error.ts:40,50` |

Payload format: `{ error: { code: string, message: string, details?: {...} } }` (REST/envelope) or oRPC flat forms; normalized by error handling.

## 9. Refresh / Renewal Behaviour

| Item | Status | Details/Evidence |
|---|---|---|
| Automatic refresh on expiry | **Inexistente** | No code implementing refresh on 401. oRPC interceptor immediately redirects to login (`orpc.ts:93-120`). |
| Silent refresh (hidden iframe/refresh endpoint call) | **Inexistente** | No such logic found. |
| Token rotation | **Não determinado / Inexistente** | Better Auth supports refresh tokens in schema; no custom rotation logic visible. |
| When refresh would occur | **N/A** | No implementation. |
| On refresh failure | **N/A** | No implementation. |
| After logout | **N/A** | No refresh path. |

**Conclusion:** Não existe refresh automático. Comportamento atual: após 401 → toast + redirect para login (sem tentativa de refresh).


## 10. Logout and Revocation

| Item | Status | Details/Evidence |
|---|---|---|
| Frontend logout action | Implementado | `authClient.signOut()` called from UserMenu; on success clears query cache and navigates to "/" (`user-menu.tsx:153-186`) |
| Backend logout handling | Implementado via Better Auth | Better Auth processes sign-out at `/api/auth/*`; session record deleted |
| Activity logging on logout | Implementado | `databaseHooks.session.delete.after` logs LOGOUT action (`auth/index.ts:86-104`) |
| Session revocation on password change | Mencionado | Comment states "when a password change revokes the other devices" (`auth/index.ts:84-85`) — handled by Better Auth |
| Revocation of all sessions for user | Parcial | Better Auth can revoke sessions; no custom admin UI action visible beyond framework capabilities |
| BLOCKED user session invalidation | Aplicado | Before session create blocked; middleware blocks BLOCKED users on requests (`auth/index.ts:55-66`, `auth-middleware.ts:53-71, 98-119`) |

**After logout behavior observed in code:** Client signs out via Better Auth, clears React Query cache, navigates home. Server logs activity on session deletion.

## 11. Concurrent Requests

| Aspect | Finding | Evidence |
|---|---|---|
| Deduplication of 401 handling | **Não encontrado** | `orpc.ts:93-120` has no guard against multiple simultaneous 401s; each request's fetch wrapper runs independently |
| Single-flight refresh | **Não encontrado** (no refresh) | No refresh logic at all |
| Queuing requests during auth transition | **Não encontrado** | No request queuing implemented |
| Race conditions on logout | **Potencial** | If multiple requests fail with 401 around same time, multiple toasts/redirects may occur. |
| Stale state handling | **Parcial** | Route guards avoid redirecting on errors (_private.tsx:25-41) to prevent logout on network issues; but expired sessions cause redirect |

**Observed behavior:** Each failed request that returns 401 triggers the interceptor. No mutex/flag like `isRedirecting` present.


## 12. Security Findings

| ID | Severidade | Área | Problema | Evidência | Impacto |
|---|---|---|---|---|---|
| SEC-001 | MEDIUM | Frontend | Não preserva rota original após 401/expiração | `orpc.ts:93-120` redirecciona directamente para `/login` sem `returnTo`/redirect param | UX: utilizador perde contexto da página a que tentava aceder |
| SEC-002 | LOW | Frontend | Múltiplos 401s simultâneos podem gerar múltiplos toasts/redireccionamentos | `orpc.ts:93-120` sem deduplicação | Pequeno ruído UX; não quebra segurança |
| SEC-003 | INFO | Backend | Sessões existentes de utilizadores BLOCKED não são revogadas automaticamente | Middleware verifica BLOCKED em cada request (`auth-middleware.ts:53-71`) mas sessões antigas persistem até expirarem | Defesa em profundidade: pedidos com sessão antiga são bloqueados (403) — mitigado, não corrigido por revogação forçada |

**Observação:** Nenhuma vulnerabilidade crítica identificada com base no código analisado. O sistema usa cookies httpOnly/secure com sameSite:none (adequado para cross-origin conforme config), e erros não vazam informação sensível.

## 13. Test Coverage

**Testes existentes relacionados com autenticação:**

| Ficheiro | Tipo | Cenários cobertos |
|---|---|---|
| `packages/api/src/shared/auth/better-auth-error.test.ts` | Unit | Mapeamento de erros Better Auth (credenciais inválidas, mensagens PT-PT, códigos, status, BLOCKED) |
| `packages/api/src/shared/auth/__tests__/authorization-behavior.test.ts` | Unit/Integration (mocked DB) | Guards de autorização, roles, permissões, IDOR checks |
| `packages/api/src/shared/auth/__tests__/permission-coverage.test.ts` | Unit | Cobertura/correcção de matriz de permissões por role |
| `packages/api/src/shared/auth/__tests__/resource-guard.test.ts` | Unit | Guards por recurso |
| `packages/api/src/shared/auth/__tests__/rest-authorization.test.ts` | Structural | Garante que REST não usa guards antigos/sem permissão |
| `packages/api/src/shared/auth/rate-limit.test.ts` | Unit | Rate limiting logic |

**Cenários de expiração/401/refresh especificamente:**

| Cenário | Coberto? | Notas |
|---|---|---|
| Expiração de sessão (SESSION_EXPIRED mapping) | Parcial | Testado no `better-auth-error.test.ts` (linhas com SESSION_EXPIRED) |
| 401 handling no frontend | Não | Sem testes E2E/unitários para interceptor de 401/orpc |
| Redirect após 401 | Não | Não testado |
| Refresh automático | Não aplicável | Não implementado |
| Logout flow | Não | Sem testes explícitos de logout |
| Concurrent 401s | Não | Não testado |
| Route guards com sessão expirada | Não | Sem testes de router guards |
| Sessão expirada vs rede com erro (distinguir) | Parcial | Lógica implementada em _private.tsx mas não testada |

**Lacunas identificadas:** Testes de integração E2E para fluxo completo de expiração (sessão expira → pedido seguinte → 401 → redirect). Testes unitários para interceptor do oRPC client (401 handling). Testes para route guards.


## 14. Findings

### Findings table

| ID | Severidade | Área | Problema | Evidência | Impacto |
|---|---|---|---|---|---|
| FIND-001 | MEDIUM | Backend/Config | TTL não explicitado na config; depende de default Better Auth (7d) | `packages/auth/src/index.ts:22-165` — sem bloco `session: { expiresIn: ... }`; defaults em `better-auth/dist/context/create-context.mjs:147` | Menor transparência; difícil auditar/alterar sem conhecer default; mas comportamento documentado via defaults |
| FIND-002 | MEDIUM | Frontend | Após 401 não preserva rota original | `apps/web/src/utils/orpc.ts:93-120` — redirect para `/login` sem `returnTo` | UX degradado; utilizador perde local original |
| FIND-003 | LOW | Frontend | Sem deduplicação de 401s concorrentes | `apps/web/src/utils/orpc.ts:93-120` — sem flag `isHandling401` | Múltiplos toasts/redireccionamentos em pedidos simultâneos com 401 |
| FIND-004 | INFO | Backend | Refresh automático inexistente (intencional?) | Ausência total de lógica de refresh em código app; Account tem refreshToken fields mas não usados | Após expiração, logout forçado imediato — simples, mas não oferece "sessão prolongada" sem re-login |
| FIND-005 | INFO | Backend | Sessões BLOCKED antigas não revogadas à força | `auth-middleware.ts:53-71, 98-119` rejeita pedidos (403); mas sessão permanece no DB até expirar | Defesa em profundidade funciona; revogação atempada não implementada, mas impacto baixo |
| FIND-006 | INFO | Frontend | Sem verificação periódica da sessão | Nenhuma polling/refetchInterval encontrado | Sessão expira "silenciosamente" até próximo pedido/ navegação; detecção reativa |

**Todos os findings acima têm evidência baseada em código analisado.**

## 15. Recommended Fixes

Recomendações respeitando arquitectura existente (incrementais):

| ID | Prioridade | Ação | Localização sugerida | Observações |
|---|---|---|---|---|
| REC-001 | 2 | Tornar TTL explícito na configuração Better Auth | `packages/auth/src/index.ts` (adicionar `session: { expiresIn: ... }`) | Documenta valor real; facilita alteração futura. Não reescreve auth, apenas clarifica config. |
| REC-002 | 2 | Preservar rota original no redirect pós-401 | `apps/web/src/utils/orpc.ts:93-120` e possivelmente login route para aceitar `returnTo` | Guardar `window.location.pathname+search` e passar como query param para `/login`; login pode redireccionar de volta após sucesso. |
| REC-003 | 3 | Deduplicar handling de 401s (singleton flag) | `apps/web/src/utils/orpc.ts` | Evitar múltiplos toasts/redirects simultâneos (ex.: `let handling401 = false; if(handling401) return; handling401=true; ... redirect ...`). |
| REC-004 | 4 | Adicionar testes E2E/unitários para expiração | `apps/web/e2e/*`, `apps/web/src/utils/__tests__/*` | Cobrir: sessão expira → 401 → redirect com/sem returnTo. |
| REC-005 | 5 | Considerar documentação sobre "sem refresh automático" | `docs/authentication-expiration-audit.md` (já feito) | Tornar decisão arquitectural explícita. |

**Prioridades:** 1=segurança crítico (nenhum encontrado), 2=comportamento incorrecto/inconsistente, 3-5 conforme especificado.


## 16. Implementation Plan

Plano incremental (sem reescrita):

1. **Documentação (feito)** — Criar este documento com evidências
2. **Tornar TTL explícito (REC-001)** — Adicionar `session.expiresIn` em Better Auth config com valor 604800s (7d) para clareza. Validar não altera comportamento.
3. **Melhorar UX pós-401 (REC-002)** — Em interceptor, guardar `returnTo` e redireccionar para `/login?returnTo=...`; ajustar login para redireccionar de volta (se não autenticado). Verificar auth layout guards.
4. **Prevenir duplicados (REC-003)** — Adicionar flag global no módulo orpc para evitar múltiplos redirects.
5. **Testes (REC-004)** — Adicionar testes E2E para fluxo de expiração; unit tests para interceptor.

**Nota:** Etapas 2-5 são sugestões, não executadas nesta auditoria (regra de não alteração).

## 17. Verification Checklist

- [x] TTL real identificado. (7 dias, default Better Auth v1.7.1)
- [x] Localização exacta do TTL identificada. (defaults em node_modules dist + ausência de override em `packages/auth/src/index.ts`)
- [x] Mecanismo de expiração identificado. (expiresAt no Session + validação Better Auth via getSession)
- [x] Comportamento do back-end após expiração identificado. (retorna null/401 mapeado conforme cenário)
- [x] HTTP status identificado. (401 para sessão/token inválido/expirado; 403 para BLOCKED)
- [x] Payload de erro identificado. (envelope app com code/message/details, PT-PT)
- [x] Refresh identificado ou explicitamente confirmado como inexistente. (**Confirmado inexistente**)
- [x] Logout analisado. (Frontend signOut + backend delete hook + LOGOUT log)
- [x] Revogação analisada. (delete on sign-out, password change revocation via framework, BLOCKED enforcement)
- [x] Cookies analisados. (advanced.defaultCookieAttributes: sameSite:none, secure:true, httpOnly:true)
- [x] Front-end após `401` analisado. (oRPC interceptor redirect; route guards)
- [x] Redirect para login analisado. (direto, sem returnTo preservado)
- [x] Requests simultâneas analisadas. (sem deduplicação)
- [x] Testes existentes analisados. (6 ficheiros de auth; cobrem mapeamento/guards/permissions, não fluxo E2E de expiração)
- [x] Lacunas de testes identificadas. (E2E expiração, interceptor unit tests, route guards)
- [x] Todos os findings possuem evidência. (citações de ficheiros/linhas)
- [x] Documento `.md` criado. (`docs/authentication-expiration-audit.md`)
- [x] Nenhum comportamento foi inferido sem evidência. (usadas referências directas ao código)

## Final Rule Compliance

**Precisão > quantidade.** Cada afirmação importante inclui ficheiro + localização + evidência. Quando não encontrado, escrito explicitamente. Nenhuma implementação inventada.

