# Auditoria RBAC — Muxima

> **Estado:** documento gerado por auditoria de código. **Nenhum código foi alterado.**
> **Data:** 2026-10-04 · **Ramo:** `big-refactor`
> **Âmbito:** autenticação, autorização, roles, permissions, ownership, event access, rotas, seeds, migrations, cache, testes e segurança.

---

## 1. Resumo Executivo

O Muxima **não tem RBAC tradicional** (sem tabelas `Role`/`Permission`, sem `UserRole`, sem `RolePermission`).
O sistema real é **RBAC por evento**, derivado de uma única fonte de verdade: a tabela `EventMember`
(campo `role` do enum `MemberRole` + campo `status` do enum `MemberStatus`).

O que a auditoria encontrou, em resumo:

- **Autenticação sólida** — Better Auth (email+senha, sessão por cookie `httpOnly`/`secure`/`sameSite=none`), bloqueio de contas `BLOCKED` no momento de criação de sessão **e** num middleware oRPC extra (`requireActiveUser`).
- **Autorização centralizada em dois guards** — `requireEventAccess` (membro `ACTIVE`) e `requireEventMutable` (membro `ACTIVE` + trava eventType `EVENT_LOCKED`), usados por **~145 de 165 endpoints**.
- **As duas falhas mais graves são de natureza diferente:**
  1. **Escalada de privilégio** nos procedures oRPC de gestão de equipa (`members.add/updateRole/remove`, `users.inviteMember/removeMember`): **não têm restrição de role**. Qualquer membro `ACTIVE` — incluindo `VIEWER` — pode promover-se a `ADMIN`. A variante REST equivalente **exige** `OWNER`/`ADMIN` (`MemberService`), ou seja, os dois caminhos têm severidades diferentes e o frontend usa o mais fraco.
  2. **IDOR** em `notifications.markAsRead` / `notifications.delete` (oRPC): não filtram por `userId`. A variante REST filtra correctamente.
- **As permissions existem mas estão quase todas decorativas** — `hasPermission()` é chamado em **exactamente 1 lugar** (`activity-logs.list`). 12 das 13 permissions nunca são verificadas.
- **O frontend não tem qualquer gating** por role/permission: sidebar, botões, dialogs e rotas são idênticos para todos os membros. A rota `/403` existe mas nunca é usada.
- **25 findings:** 1 CRÍTICO · 3 ALTO · 10 MÉDIO · 7 BAIXO · 4 INFO.
- **165 endpoints catalogados:** 121 procedures oRPC (117 `protected` + 4 `public`) e 44 rotas REST.
- **5 roles** (`OWNER`, `PARTNER`, `ADMIN`, `EDITOR`, `VIEWER`) e **13 permissions** (`resource.action`).

---

## 2. Objetivo da Auditoria

- Auditar o estado actual de autenticação, autorização, roles e permissions do Muxima.
- Catalogar rotas, roles, permissions, guards e verificações de autorização.
- Identificar e classificar problemas (CRÍTICO → INFO).
- Documentar recomendações futuras **sem as implementar**.

**Restrição cumprida:** a única alteração feita no repositório durante esta auditoria foi a criação deste
ficheiro (`docs/rbac-audit.md`). Verificado com `git status --porcelain` antes e depois da auditoria:
lista idêntica.

---

## 3. Metodologia

1. **Leitura directa** dos módulos de auth (`packages/auth/src`), guards (`packages/api/src/shared/auth`),
   contexto oRPC e middleware REST.
2. **Mapeamento automático de procedures:** script Python que, para cada ficheiro de `routers/`, localiza a
   definição `x: protectedProcedure | publicProcedure` e extrai os guards presentes entre essa definição e a
   seguinte (evitando falsos positivos por janela de linhas).
3. **Mapeamento de rotas REST:** grep de `app.get/post/patch/delete` + guards no mesmo ficheiro, com leitura
   manual dos services chamados (`MemberService`, `EventService`, `NotificationService`, `DedicationService`).
4. **Greps globais** por: `role|roles|ADMIN|OWNER|MANAGER|EDITOR|MEMBER|VIEWER`,
   `permission|hasPermission|requirePermission|authorize|can|ability`,
   `isAdmin|isOwner|isMember|hasRole|requireRole|forbidden|unauthorized`,
   `ownerId|userId|createdBy|eventId|eventMember`.
5. **Auditoria frontal:** rotas TanStack Router (`beforeLoad`), sidebar, botões, dialogs, queries/mutations.
6. **Auditoria de seeds, migrations e testes.**
7. **Classificação de findings** por severidade e tipo; recomendações escritas mas **não executadas**.

Ferramentas: `grep`, `rg`, `python3` (só leitura), `find`, `git status`.

---

## 4. Arquitetura Atual

```
Monorepo pnpm + turbo
├── apps/
│   ├── web/      TanStack Router (file routes) + TanStack Query + oRPC client + Better Auth client
│   └── server/   Fastify → plugin oRPC (/rpc/*) + REST (/api/v1/*) + Better Auth (/api/auth/*)
└── packages/
    ├── auth/     better-auth config + access.ts (vocabulário de roles/permissions)
    ├── api/      routers/ (oRPC) · modules/*/routes.ts (REST) · services · shared/auth (guards)
    ├── db/       Prisma schema + migrations + seed
    └── env/      variáveis de ambiente
```

Cadeia de autorização real:

```
Pedido
  │
  ├─ /api/auth/*        Better Auth (login/logout/get-session)
  ├─ /rpc/*             createContext() → auth.api.getSession() → protectedProcedure
  │                        ├─ requireAuth         (existe sessão?)
  │                        ├─ requireActiveUser   (user.status !== BLOCKED)
  │                        └─ requireEventAccess / requireEventMutable / hasPermission
  │
  └─ /api/v1/*          authMiddleware → request.session
                           ├─ requireSessionUserId / requireSessionUser
                           └─ requireEventAccess / requireEventMutable / service-level asserts
```

**Não existe:** tabela `Role`, tabela `Permission`, `UserRole`, `RolePermission`, `EventRole`,
`EventPermission`, middleware de autorização genérico, policy engine, CASL/Permify/OPA.

---

## 5. Authentication

| Aspecto | Estado actual |
| --- | --- |
| Biblioteca | Better Auth (`better-auth` + `@better-auth/expo` plugin) |
| Configuração | `packages/auth/src/index.ts` → `createAuth()` |
| Métodos | `emailAndPassword: { enabled: true }` — sem OAuth/providers externos |
| Cliente web | `authClient` (`useSession`, `getSession`, `signOut`) |
| Servidor | `auth.api.getSession({ headers })` em `packages/api/src/context.ts` e em `shared/auth/auth-middleware.ts` |
| Middleware Fastify | `authMiddleware` — popula `request.session`; em erro → `null` (nunca lança) |
| Guard de sessão (REST) | `requireSessionUserId(request)` / `requireSessionUser(request)` → `UnauthorizedError` (401) |
| Guard de sessão (oRPC) | `requireAuth` middleware → `UnauthorizedError` |
| Bloqueio de conta | `user.status` (`ACTIVE`/`BLOCKED`, `input: false`) + `databaseHooks.session.create.before` (403 `ACCOUNT_BLOCKED`) + `requireActiveUser` em cada `protectedProcedure` |
| Recuperação de sessão | `_private.tsx#beforeLoad` → `authClient.getSession()`; redirect para `/login` **apenas** quando `!session && !error` |
| Sessão expirada | Falha de sessão → sem redirect forçado; a app tenta refazer login no próximo `getSession` |
| Callbacks/plugins | `expo()`, `customSession()`; `databaseHooks.session.{create,delete}.after` → activity log (LOGIN/LOGOUT) |
| Cookies | `sameSite: "none"`, `secure: true`, `httpOnly: true` |
| Trusted origins | `CORS_ORIGIN`, `muxima://`, `exp://`, `http://localhost:8081` |

**Ficheiros participantes:** `packages/auth/src/index.ts`, `packages/auth/src/access.ts`,
`packages/api/src/context.ts`, `packages/api/src/index.ts`, `packages/api/src/shared/auth/auth-middleware.ts`,
`apps/web/src/routes/_private.tsx`, `apps/web/src/routes/_auth/layout.tsx`, `apps/web/src/utils/orpc.ts`.

**Dados disponíveis ao utilizador autenticado:** `user` (id, name, email, image, phone, status), `session`
(id, token, expiresAt, ipAddress, userAgent) e, via `customSession`, `user.roles[]` + `user.permissions[]`.

---

## 6. Session

### 6.1 Conteúdo da sessão

`GET /api/auth/get-session` devolve:

```jsonc
{
  "user": {
    "id": "...", "name": "...", "email": "...", "image": null,
    "phone": "...", "status": "ACTIVE",
    "roles": [ { "id": "OWNER", "name": "Proprietário", "permissions": [...] } ],
    "permissions": ["activity.read", "event.delete", ...]
  },
  "session": { "id": "...", "userId": "...", "token": "...", "expiresAt": "...", ... }
}
```

- **`roles`** = agregado de **todas** as memberships `ACTIVE` do utilizador, em **todos** os eventos
  (`getUserAccess` faz `eventMember.findMany({ userId, status: "ACTIVE" }, distinct: ["role"])`).
- **`permissions`** = união das permissions dessas roles, ordenada e deduplicada.
- **Não há scopes por evento na sessão** — a sessão diz "o utilizador é OWNER nalgum sítio", não "neste evento".
- **Não existe `cookieCache`** — `getUserAccess` corre **uma query à BD por cada leitura de sessão**.

### 6.2 Fonte de verdade

| Dado | Fonte de verdade | Onde é lido |
| --- | --- | --- |
| Utilizador | Better Auth `user` table | sessão, `users.getProfile`, REST `/users/profile` |
| Roles | `EventMember.role` (`ACTIVE`) | `getUserAccess` (`packages/auth/src/access.ts`) |
| Permissions | `ROLE_PERMISSIONS` (hardcoded em `access.ts`) | `getUserAccess`, `hasPermission` |
| Event membership | `EventMember` (`eventId`,`userId`,`status`) | `requireEventAccess` |
| Estado do evento | `Event.status/eventDate/startTime` | `assertEventIsMutableById` |

### 6.3 Cache / invalidação

- Queries TanStack: **`staleTime` não definido em lado nenhum** (default `0`) → refetch em mount/focus.
- **Logout não limpa o `queryClient`** (`user-menu.tsx`: `signOut → navigate("/")`).
- **Mudança de role não invalida nada** — não existe `queryClient.invalidateQueries` associado a alterações de
  membership (só `profile` é invalidado por `useUpdateProfile`).
- `MutationCache`/`QueryCache` em `utils/orpc.ts` só servem para feedback de erro em PT-PT.

---

## 7. Better Auth

| Item | Detalhe |
| --- | --- |
| Instância | `packages/auth/src/index.ts` → `auth = createAuth()` |
| Adapter | `prismaAdapter(prisma, { provider: "postgresql" })` |
| Tabelas Better Auth | `user`, `session`, `account` (schema `auth.prisma` — ver §8) |
| Plugins | `expo()` (mobile), `customSession()` |
| `additionalFields` | `phone` (string, opcional), `status` (`ACTIVE`/`BLOCKED`, `input: false`) |
| Hooks | `databaseHooks.session.create.before` → bloqueia `BLOCKED`; `.after` → log LOGIN; `.delete.after` → log LOGOUT |
| Expiry | **não configurado** → default Better Auth (~30 dias, updateAge ~1 dia) |
| Rate limiting nativo | não configurado no Better Auth |
| Revogação | `UserService.changePassword` revoga as outras sessões; `UserService.blockAccount` revoga todas |

---

## 8. Database / Prisma

Ficheiros: `packages/db/prisma/schema/auth.prisma`, `packages/db/prisma/schema/schema.prisma`.

### 8.1 Modelos de auth

| Modelo | Campos relevantes | Relações | Uso |
| --- | --- | --- | --- |
| `User` | `id, name, email, image, phone, status(ACTIVE\|BLOCKED), emailVerified, createdAt` | `sessions`, `accounts`, `ownedEvents`, `memberships`, `notifications`, `activityLogs` | Better Auth + perfis |
| `Session` | `id, token, userId, expiresAt, ipAddress, userAgent` | `user` | Better Auth |
| `Account` | `id, userId, providerId, password, ...` | `user` | Better Auth (credenciais) |

### 8.2 Modelos de autorização

| Modelo | Existe? | Notas |
| --- | --- | --- |
| `Role` | ❌ | — |
| `Permission` | ❌ | — |
| `UserRole` | ❌ | — |
| `RolePermission` | ❌ | — |
| `EventMember` | ✅ | **é o sistema de roles** |
| `EventRole` / `EventPermission` | ❌ | — |
| `EventInvitation` | ✅ | convidar por email (ver §11.4) |
| `Event` | ✅ | `ownerId` → utilizador que criou |

### 8.3 `EventMember` (o modelo central)

```prisma
model EventMember {
  id        String       @id @default(cuid())
  eventId   String
  userId    String
  role      MemberRole   // OWNER | PARTNER | ADMIN | EDITOR | VIEWER
  status    MemberStatus // PENDING | ACTIVE | DECLINED   (default PENDING)
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
  event     Event        @relation(...)
  user      User         @relation(...)
  @@unique([eventId, userId])
}
```

- **Constraint efectiva:** `@@unique([eventId, userId])` — 1 membership por utilizador por evento.
- **Índices:** herdados do `@@unique`; não há índices extra para `(userId, status)` (nota de performance, não de segurança).
- **Enums:** `MemberRole` (5 valores), `MemberStatus` (3 valores).
- **Relações incompletas / duplicações:** nenhuma detetada. `EventInvitation` é **escrita mas nunca lida** (§11.4).

### 8.4 Modelos relacionados usados como alvo de autorização

`Guest`, `GuestInvitation` (código público `MUX-XXXX-XXXX`), `Table`, `TableGuest`, `Task`, `Schedule`,
`Supplier`, `InventoryItem`, `Budget`, `BudgetLine`, `FoodPlan`, `ChecklistItem`, `Dedication`,
`DedicationViewer`, `Notification`, `ActivityLog`, `AuditLog`.

Todos têm `eventId` (directo ou via relação) → base do guard `requireEventAccess`.

---

## 9. Users

- `UserService` (`packages/api/src/modules/users/service.ts`): `getProfile`, `updateProfile`,
  `changePassword`, `blockAccount`, `unblockAccount`, `getMembers`.
- **Auto-scoping correcto:** profile/password/block operam sempre sobre `context.session.user.id`.
- **`blockAccount`** exige `{ confirm: true, reason? }`, revoga sessões e escreve activity log.
- **`unblockAccount` existe no service mas não tem rota nem UI** → F-10.
- **`user.status` não é verificado nas rotas REST** (só no oRPC) → F-09.
- **`users.getMembers`** usa `requireEventAccess` ✔.

---

## 10. Roles

### 10.1 Inventário de roles

| Role | Origem | Database | Seed | Backend | Frontend | Utilização | Problemas |
| ---- | ------ | -------- | ---- | ------- | -------- | ---------- | --------- |
| `OWNER` | enum `MemberRole` + `ACCESS_ROLES` | ✅ `eventMember.role` | ✅ (1 por evento) | ✅ guards + `MemberService`/`EventService` | ❌ nunca usada | criar/editar(OWNER/ADMIN)/eliminar(OWNER) evento, alterar roles (OWNER) | sem gating no FE |
| `PARTNER` | idem | ✅ | ✅ | ⚠️ só em `access.ts` (permissions) | ❌ | nenhuma verificação específica | role sem qualquer enforcement próprio |
| `ADMIN` | idem | ✅ | ✅ | ✅ (`["OWNER","ADMIN"]` em update/delete evento, add/remove member REST) | ❌ | gestão de equipa e do evento | divergente entre REST e oRPC |
| `EDITOR` | idem | ✅ | ✅ | ⚠️ só em `access.ts` | ❌ | nenhuma verificação específica | idem |
| `VIEWER` | idem | ✅ | ✅ (2 `PENDING`) | ⚠️ só em `access.ts` | ❌ | nenhuma verificação específica | **pode promover-se via oRPC** (F-01) |

Roles **não existentes** no projecto (procuradas e ausentes): `MANAGER`, `MEMBER`.

### 10.2 Onde são definidas / validadas

- **Definição:** `packages/db/prisma/schema/auth.prisma` (enum `MemberRole`) e espelhado em
  `packages/auth/src/access.ts` (`ACCESS_ROLES`, `ROLE_PERMISSIONS`, `ROLE_NAMES`).
  `assertRoleNamesMatch` (test) protege contra divergência dos dois.
- **Validação de input:** zod `z.enum(["PARTNER","ADMIN","EDITOR","VIEWER"])` — **`OWNER` é inalcançável via API**
  (só é criado pelo serviço ao criar o evento). Boa prática: impede atribuição indevida de OWNER.
- **Validação de acesso:** `requireEventAccess(userId, eventId, allowedRoles?)` → código `EVENT_ROLE_REQUIRED`.
  **Só é usado por 1 procedure** (`users.updateMemberRole`, `["OWNER"]`).
- **Role atribuída:** `members.add`, `members.updateRole`, `users.inviteMember`, `users.updateMemberRole`,
  REST `POST/PATCH /members`.

---

## 11. Permissions

### 11.1 Inventário (13)

| # | Permission | Constante | Roles que a têm | Verificada onde? |
| - | ---------- | --------- | --------------- | ---------------- |
| 1 | `profile.read` | `PROFILE_READ` | OWNER, PARTNER, ADMIN, EDITOR, VIEWER | ❌ nunca |
| 2 | `profile.update` | `PROFILE_UPDATE` | todas | ❌ |
| 3 | `profile.password.change` | `PROFILE_PASSWORD_CHANGE` | OWNER, PARTNER, ADMIN, EDITOR | ❌ |
| 4 | `activity.read` | `ACTIVITY_READ` | todas | ❌ (o endpoint existe para todos) |
| 5 | `activity.read.all` | `ACTIVITY_READ_ALL` | OWNER, PARTNER, ADMIN | ✅ `routers/activity-logs.ts` |
| 6 | `event.read` | `EVENT_READ` | todas | ❌ |
| 7 | `event.create` | `EVENT_CREATE` | OWNER, PARTNER, ADMIN | ❌ (`events.create` não verifica nada) |
| 8 | `event.update` | `EVENT_UPDATE` | OWNER, PARTNER, ADMIN, EDITOR | ❌ (regra é role-check inline, não permission) |
| 9 | `event.delete` | `EVENT_DELETE` | OWNER, PARTNER, ADMIN | ❌ (regra: `role === "OWNER"` inline) |
| 10 | `guest.read` | `GUEST_READ` | todas | ❌ |
| 11 | `guest.create` | `GUEST_CREATE` | OWNER, PARTNER, ADMIN, EDITOR | ❌ |
| 12 | `guest.update` | `GUEST_UPDATE` | OWNER, PARTNER, ADMIN, EDITOR | ❌ |
| 13 | `guest.delete` | `GUEST_DELETE` | OWNER, PARTNER, ADMIN, EDITOR | ❌ |

**Origem:** única, `packages/auth/src/access.ts`. **Não existem na database** (não há tabela).
**Seed:** não aplica permissions (não há onde as gravar).
**Frontend:** apenas **exibidas** em `profile-roles-section.tsx`; nunca usadas para decidir nada.

> **Conclusão:** o sistema de permissions é **declarativo e maioritariamente decorativo**. O enforcement real
> acontece por **role-checks ad-hoc** e por **event membership** (F-06).

### 11.2 `hasPermission` no código

```
packages/api/src/routers/activity-logs.ts:38   ← única ocorrência em código de produção
```

### 11.3 Strings tipo `events.read` / `events.update`

Não existem. O vocabulário é `profile.*`, `activity.*`, `event.*`, `guest.*` (13 no total).

### 11.4 `EventInvitation` — feature incompleta

- Criado por `users.inviteMember` com `token: Math.random().toString(36)...` e `expiresAt` +7 dias.
- **Nunca é lido**: não existe endpoint de aceitação, nem UI, nem `findUnique` fora do `create`.
- O seed cria linhas (`eventInvitation.createMany`) que ninguém consome.
- O `token` usa `Math.random()` (entropia fraca) — inócuo enquanto não houver fluxo, mas é um risco latente (F-11).

---

## 12. User → Role → Permission

**Arquitetura real:**

```
User ──< EventMember(role: MemberRole, status: MemberStatus) >── Event
              │
              ├── getUserAccess()  ──► AccessRole[] ──► Permission[]   (sessão / perfil / activity-logs)
              └── requireEventAccess(userId, eventId, roles?)          (165 endpoints)
```

| Pergunta | Resposta |
| --- | --- |
| Um utilizador pode ter várias roles? | **Sim** — uma por evento (em eventos diferentes). No mesmo evento, só uma (`@@unique`). |
| Uma role pode ter várias permissions? | **Sim** — `ROLE_PERMISSIONS` mapeia cada role para N permissions. |
| Permissions atribuídas directamente ao utilizador? | **Não.** |
| Roles por evento? | **Sim** — é o único modelo. |
| Permissions específicas por evento? | **Não** — o vocabulário é global; o âmbito vem do membership. |
| Overrides? | **Não.** |
| Existe hierarquia de roles? | **Só implicitamente** nos `["OWNER","ADMIN"]` e `role === "OWNER"` hardcoded. |

---

## 13. Backend Authorization

### 13.1 Guards centralizados

| Guard | Ficheiro | O que verifica | Erro |
| --- | --- | --- | --- |
| `protectedProcedure` | `packages/api/src/index.ts` | sessão existe + `user.status !== BLOCKED` | 401 / 403 `ACCOUNT_BLOCKED` |
| `requireEventAccess(userId, eventId, roles?)` | `shared/auth/event-access.ts` | `EventMember.status === "ACTIVE"` (+ roles opcional) | 403 `EVENT_ACCESS_DENIED` / `EVENT_ROLE_REQUIRED` |
| `requireEventMutable(userId, eventId, roles?)` | idem | `requireEventAccess` + `assertEventIsMutableById` | + 409 `EVENT_LOCKED` |
| `assertEventIsMutable(event)` | `shared/events/event-lock.ts` | estado do evento (CANCELLED / >5 dias / COMPLETED s/ data) | 409 `EVENT_LOCKED` |
| `hasPermission(perms, perm)` | `packages/auth/src/access.ts` | membership role → permission | 403 `FORBIDDEN` |
| `requireSessionUserId` / `requireSessionUser` | `shared/auth/auth-middleware.ts` | sessão existe (REST) | 401 `UNAUTHORIZED` |
| `assertMember(userId, eventId)` (exports) | `modules/exports/routes.ts` | membership `ACTIVE` | **404** (não revela existência) |
| `assertEventMembership` (dedications) | `modules/dedication/service.ts` | membership `ACTIVE` | 403 |
| `loadForWrite` (dedications) | idem | membership + `dedication.ownerId === userId` | 403 `EDIT_DENIED` |
| Role checks inline | `routers/events.ts`, `modules/events/service.ts`, `modules/members/service.ts` | `["OWNER","ADMIN"]` / `role === "OWNER"` | 403 |

### 13.2 Inventário de Authorization (verificações fora dos guards)

| Local | Regra | Tipo |
| --- | --- | --- |
| `routers/events.ts` `getById` | `members.some(userId)` (sem filtro de status) | membership inline |
| `routers/events.ts` `list` | `where.members.some.userId` (sem filtro de status) | membership no query |
| `routers/events.ts` `update` | `["OWNER","ADMIN"].includes(member.role)` | role inline |
| `routers/events.ts` `delete` | `member.role === "OWNER"` | ownership/role inline |
| `modules/events/service.ts` | `isMember` / `["OWNER","ADMIN"]` / `role !== "OWNER"` | idem (REST) |
| `modules/members/service.ts` | `addMember`/`removeMember`: `["OWNER","ADMIN"]`; `updateRole`: `OWNER` | role em service (REST) |
| `routers/users.ts` `updateMemberRole` | `requireEventMutable(..., ["OWNER"])` | role via guard |
| `routers/activity-logs.ts` | `hasPermission(ACTIVITY_READ_ALL)` | permission ✔ |
| `routers/dashboard.ts` `getGlobalStats` | `where.event.ownerId = userId` | **ownership** |
| `routers/notifications.ts` | `userId` em list/getUnreadCount/markAllAsRead/deleteAll; **falta em markAsRead/delete** | self-scoping parcial |
| `routers/users.ts` profile/password/block | `context.session.user.id` | self-scoping ✔ |
| `modules/dedication/service.ts` | membership + `ownerId === userId` (escrita) | ownership ✔ |
| `modules/exports/routes.ts` | `assertMember` (404 por discrição) | membership ✔ |
| `modules/invitations/public/*` | código público + rate limiter por IP | capability link |
| `shared/auth/rate-limit.ts` | `publicInvitation*Limiter` (em memória) | abuso |

---

## 14. Routes / Procedures

### 14.1 oRPC — 121 procedures (117 protected + 4 public)

| Router | Protected | Public | Guard predominante |
| --- | ---: | ---: | --- |
| `activity-logs` | 1 | 0 | `hasPermission` |
| `budget` | 6 | 0 | 5×`requireEventAccess`, 1×`requireEventMutable` |
| `checklist` | 6 | 0 | 2×A, 4×M |
| `dashboard` | 3 | 0 | 2×A, 1×owner-scoped |
| `dedications` | 11 | 0 | 6×M (router) + 5×service-level |
| `events` | 5 | 0 | membership/role inline |
| `food-plan` | 7 | 0 | 2×A, 5×M |
| `guests` | 16 | 0 | 5×A, 11×M |
| `index` | 0 | 1 | `healthCheck` (sem auth, por design) |
| `inventory` | 8 | 0 | 4×A, 4×M |
| `invitations` | 12 | 3 | 7×A, 5×M; públicos rate-limited |
| `members` | 4 | 0 | 1×A, 3×M (**sem role check**) |
| `notifications` | 6 | 0 | self-scoping (2 sem) |
| `suppliers` | 13 | 0 | 4×A, 9×M |
| `tasks` | 11 | 0 | 4×A, 5×M, **2 sem guard** |
| `users` | 8 | 0 | 1×A, 3×M, 4 self-scoped |

**Procedures públicos (4):** `index.healthCheck`, `invitations.public.getByCode`,
`invitations.public.schedule`, `invitations.public.respond` — todos rate-limited por `code:IP`
(`shared/auth/rate-limit.ts`), exceto `healthCheck`.

### 14.2 Tabela completa de classificação (síntese por módulo)

| Módulo | Operação | Rota/Procedure | Auth | Role | Permission | Ownership | Event Access | Estado |
| ------ | -------- | -------------- | ---- | ---- | ---------- | --------- | ------------ | ------ |
| index | health | `healthCheck` | ❌ | — | — | — | — | **SEM AUTH** (ok) |
| activity-logs | list | `activityLogs.list` | ✅ | — | ✅ `activity.read.all` | — | — | **PROTEGIDA** |
| events | list | `events.list` | ✅ | — | — | filtro por membership | ⚠️ sem status | **PARCIALMENTE PROTEGIDA** |
| events | getById | `events.getById` | ✅ | — | — | membership inline | ⚠️ sem status | **PARCIALMENTE PROTEGIDA** |
| events | create | `events.create` | ✅ | ❌ | ❌ | cria OWNER | — | **SEM AUTHORIZATION** (ok por design) |
| events | update | `events.update` | ✅ | ✅ OWNER/ADMIN | — | membership | — | **PROTEGIDA** |
| events | delete | `events.delete` | ✅ | ✅ OWNER | ✅ ownership | membership | — | **PROTEGIDA** |
| events(REST) | GET/PATCH/DELETE | `/api/v1/events*` | ✅ | ✅ (service) | — | membership | — | **PROTEGIDA** |
| budget | read ×5 | `budget.get*` | ✅ | — | — | — | ✅ | **PROTEGIDA** |
| budget | updateTarget | `budget.updateTarget` | ✅ | — | — | — | ✅+lock | **PROTEGIDA** |
| checklist | list/getStats | `checklist.list/getStats` | ✅ | — | — | — | ✅ | **PROTEGIDA** |
| checklist | create/update/delete/sync | 4 procedures | ✅ | — | — | — | ✅+lock | **PROTEGIDA** |
| dashboard | getGlobalStats | `dashboard.getGlobalStats` | ✅ | — | — | ⚠️ por `ownerId` | — | **INCONSISTENTE** |
| dashboard | getGuestChart/getBudgetChart | 2 procedures | ✅ | — | — | — | ✅ | **PROTEGIDA** |
| dedications | list/getStats/get/getHistory/listViewers | 5 | ✅ | — | — | membership no service | ✅ | **PROTEGIDA** |
| dedications | create/update/setVisibility/addViewer/removeViewer/remove | 6 | ✅ | ✅ autor | — | `ownerId` | ✅+lock | **PROTEGIDA** |
| food-plan | get/getStats | 2 | ✅ | — | — | — | ✅ | **PROTEGIDA** |
| food-plan | 5 mutações | 5 | ✅ | — | — | — | ✅+lock | **PROTEGIDA** |
| guests | list/getById/getTables/getGuestStats/getTableStats | 5 | ✅ | — | — | — | ✅ | **PROTEGIDA** |
| guests | 11 mutações | 11 | ✅ | — | — | — | ✅+lock | **PROTEGIDA** |
| inventory | list/getById/getStats/getHistory | 4 | ✅ | — | — | — | ✅ | **PROTEGIDA** |
| inventory | create/update/delete/addMovement | 4 | ✅ | — | — | — | ✅+lock | **PROTEGIDA** |
| invitations | generateCode/list/byGuest/getById/getStats/getInvitationStats/rsvpEligibility | 7 | ✅ | — | — | — | ✅ | **PROTEGIDA** |
| invitations | create/publish/publishBatch/unpublish/respond | 5 | ✅ | — | — | — | ✅+lock | **PROTEGIDA** |
| invitations.public | getByCode/schedule/respond | 3 | ❌ (code) | — | — | capability | rate-limited | **PROTEGIDA** (por design) |
| members | list | `members.list` | ✅ | — | — | — | ✅ | **PROTEGIDA** |
| members | add/updateRole/remove | 3 | ✅ | ❌ **falta** | ❌ | — | ✅+lock | **INCONSISTENTE** (F-01/F-02) |
| notifications | list/getUnreadCount/markAllAsRead/deleteAll | 4 | ✅ | — | — | self ✅ | — | **PROTEGIDA** |
| notifications | markAsRead/delete | 2 | ✅ | — | — | ❌ **falta** | — | **SEM AUTHORIZATION** (F-03) |
| suppliers | getCategorySchema | 1 | ✅ | — | — | — | ❌ (estático) | **PROTEGIDA** (inócuo) |
| suppliers | list/getById/getStats | 3 | ✅ | — | — | — | ✅ | **PROTEGIDA** |
| suppliers | 9 mutações | 9 | ✅ | — | — | — | ✅+lock | **PROTEGIDA** |
| tasks | getById/getStats/getScheduleStats | 3 | ✅ | — | — | — | ✅ | **PROTEGIDA** |
| tasks | list/getSchedules | 2 | ✅ | — | — | — | ❌ **falta** | **SEM AUTHORIZATION** (F-04) |
| tasks | create/update/delete + 3 schedules | 6 | ✅ | — | — | — | ✅+lock ⚠️ `if(eventId)` | **PARCIALMENTE PROTEGIDA** |
| users | getProfile/updateProfile/changePassword/blockAccount | 4 | ✅ | — | — | self ✅ | — | **PROTEGIDA** |
| users | getMembers | 1 | ✅ | — | — | — | ✅ | **PROTEGIDA** |
| users | inviteMember/removeMember | 2 | ✅ | ❌ **falta** | ❌ | — | ✅+lock | **INCONSISTENTE** (F-02) |
| users | updateMemberRole | 1 | ✅ | ✅ OWNER | — | — | ✅+lock | **PROTEGIDA** |
| dashboard(REST) | GET | 1 | ✅ | — | — | — | ✅ | **PROTEGIDA** |
| exports(REST) | 2 GET | 2 | ✅ | — | — | — | ✅ (404) | **PROTEGIDA** |
| guests(REST) | 8 | 8 | ✅ | — | — | — | ✅/✅+lock | **PROTEGIDA** |
| inventory(REST) | 7 | 7 | ✅ | — | — | — | ✅/✅+lock | **PROTEGIDA** |
| members(REST) | 4 | 4 | ✅ | ✅ service | ❌ | — | ✅+lock | **PROTEGIDA** |
| notifications(REST) | 6 | 6 | ✅ | — | — | self ✅ | — | **PROTEGIDA** |
| tasks(REST) | 8 | 8 | ✅ | — | — | — | ✅/✅+lock | **PROTEGIDA** |
| users(REST) | 2 | 2 | ✅ | — | — | self ✅ | — | **PROTEGIDA** |
| invitations public(REST) | export pdf | 1 | ❌ (code) | — | — | capability | ⚠️ sem rate limit | **PARCIALMENTE PROTEGIDA** (F-18) |

**Contagens:** 165 endpoints · PROTEGIDA ≈ 152 · PARCIALMENTE PROTEGIDA ≈ 6 · SEM AUTHORIZATION ≈ 4 ·
INCONSISTENTE ≈ 2 (contagens sobrepostas por desenho: cada endpoint tem a classificação mais grave aplicável).

---

## 15. Services

| Service | Sensibilidade | Onde é feita a autorização |
| --- | --- | --- |
| `modules/events/service.ts` | create/update/delete | **no service** (`isMember`, `["OWNER","ADMIN"]`, `OWNER`) |
| `modules/members/service.ts` | add/updateRole/remove/getMembers | **no service** (REST) — estrito |
| `modules/users/service.ts` | profile/password/block | **no handler** (self-scoped) |
| `modules/invitations/service.ts` | create/publish/respond | guard no router + `assertEventIsMutable` + capacidade |
| `modules/dedication/service.ts` | CRUD + viewers | **no service** (`assertEventMembership`, `loadForWrite`) |
| `modules/exports/*` | export | **no handler** (`assertMember`, 404) |
| `modules/guests|inventory|tasks` (REST) | CRUD | **no router** (`requireEventAccess/Mutable`) |
| `modules/notifications/service.ts` | mark/delete | **no service** (`notification.userId !== userId` → 403) ✔ |
| routers (`guests`, `suppliers`, `budget`, `checklist`, `food-plan`, `inventory`, `tasks`, `members`, `invitations`) | CRUD | **no router** (`requireEventAccess`/`requireEventMutable`) |

**Resumo:** a autorização acontece em **3 locais** (router oRPC, rota REST, service) **sem uma regra única**.
Isso é a causa directa de F-01/F-02 (oRPC mais fraco que REST) e F-14.

---

## 16. Ownership

| Conceito | Estado |
| --- | --- |
| `Event.ownerId` | existe; `events.delete` (OWNER), `events.update` (OWNER/ADMIN), `dashboard.getGlobalStats` (owner-scoped) |
| `Dedication.ownerId` | **é a autorização de edição** — `loadForWrite` exige `ownerId === userId` |
| `Notification.userId` | self-scoping (REST ✅ / oRPC ⚠️ parcial) |
| `ActivityLog.userId` | self-scoping + `activity.read.all` |
| `createdBy` | não existe como coluna de autorização (há `completedBy`, `invitedBy`, `eventMemberId` em audit) |
| `userId === ...` inline | `events.getById/update/delete`, dedications, notifications |

**Ownership usado como substituto de RBAC?** **Parcialmente sim, em 2 sítios:**

1. `dashboard.getGlobalStats` — conta apenas eventos onde `ownerId = userId`, ignorando memberships → membros
   não-owner veem zeros (F-08).
2. `dedications` — edição determinada por autoria, não por role (justificável: conteúdo pessoal, mas mistura
   ownership com autorização de evento).

---

## 17. Event Access

Fluxo obrigatório para dados de evento:

```
Utilizador autenticado  →  requireEventAccess (membro ACTIVE)  →  [role?]  →  EVENT_LOCKED  →  regra de negócio
                                                            (permissions: só activity-logs)
```

### 17.1 Inventário de Event Access

| Mecanismo | Ficheiro | Critério | Usado por |
| --- | --- | --- | --- |
| `requireEventAccess` | `shared/auth/event-access.ts` | `EventMember{userId,eventId,status:ACTIVE}` | ~45 procedures + ~18 rotas REST |
| `requireEventMutable` | idem | idem + lock | ~60 procedures + ~22 rotas REST |
| membership inline (`members.some`) | `routers/events.ts` | sem filtro de status | `events.getById/update/delete/list` |
| membership no service | `modules/events/service.ts`, `modules/members/service.ts` | sem filtro de status | REST events/members |
| membership no service (dedications) | `modules/dedication/service.ts` | `status: ACTIVE` | 5 leituras + escritas |
| `assertMember` (404) | `modules/exports/routes.ts` | `status: ACTIVE` | 2 exports |
| membership no query | `events.list` (`where.members.some.userId`) | sem filtro de status | listagem |
| capability code | `invitations.public.*` | código `MUX-XXXX-XXXX` | RSVP público |
| ownership | `dashboard.getGlobalStats` | `event.ownerId` | dashboard global |

### 17.2 Inconsistências de event access

- **`status` do membership:** `requireEventAccess` e `dedications` exigem `ACTIVE`;
  `events.list/getById` e os services REST **não filtram status** → um convite `PENDING` ou `DECLINED`
  ainda lê os detalhes do evento (F-05).
- **Guard condicional:** `tasks.update`, `tasks.delete`, `tasks.deleteSchedule`, `inventory.getHistory`
  usam `if (eventId) await requireEventMutable(...)` — se o recurso não existe, o guard é saltado
  (falha fechada ao nível da BD, mas frágil) (F-16).
- **`tasks.list` / `tasks.getSchedules`** não têm nenhum acesso ao evento verificado (F-04).
- Módulos cobertos: Events ✔ · Guests ✔ · Invitations ✔ · Tables ✔ · Inventory ✔ · Budget ✔ · Suppliers ✔ ·
  Tasks ⚠️ · Schedule ⚠️ · Food Plan ✔ · Checklist ✔ · Dedications ✔ · Notifications ⚠️ · Exports ✔ ·
  Members ⚠️ (sem role).

---

## 18. Frontend Authorization

**Resultado global: o frontend não implementa autorização — apenas autenticação.**

- Greps por `hasPermission`, `requirePermission`, `isOwner`, `isAdmin`, `hasRole`, `user.role`,
  `session.user.role` → **zero resultados de decisão**. As únicas ocorrências de `permissions` são de
  **exibição** (`profile-roles-section.tsx`).
- `session.roles` / `session.permissions` **nunca são lidos** — a sessão só é usada para
  `name`, `email`, `image`, iniciais.
- `useProfile()` (que devolve roles/permissions) é usado **apenas** em `routes/_private/profile/index.tsx`.
- **Nenhum componente** esconde ou desactiva botões por role.

**Estado por tipo de elemento:**

| Elemento | Gating | Nota |
| --- | --- | --- |
| routes | ❌ | só autenticação |
| loaders/`beforeLoad` | ⚠️ | só sessão |
| sidebar | ❌ | todos os itens para todos |
| botões | ❌ | só `useEventLock` (trava operacional) |
| dialogs | ❌ | idem |
| forms/mutations | ❌ | erro 403 vindo do backend → toast |
| menus/dropdowns | ❌ | — |

---

## 19. Route Protection

| Rota | Auth | Permission | Event Access | Proteção | Problema |
| ---- | ---- | ---------- | ------------ | -------- | -------- |
| `/login`, `/register`, `/recover` (`_auth`) | redirect se sessão existe | — | — | **PROTEGIDA** | — |
| `_private.tsx` (pai de tudo) | `beforeLoad` → `getSession()` | ❌ | ❌ | **PROTEGIDA (auth)** | qualquer membro/visitante autenticado acede a tudo |
| `/` (dashboard) | herdada | ❌ | ❌ (o backend filtra) | **PARCIAL** | — |
| `/events` | herdada | ❌ | filtro no backend | **PARCIAL** | — |
| `/events/$eventId` | herdada | ❌ | ⚠️ no backend | **PARCIAL** | sem `status` no backend (F-05) |
| `/events/$eventId/{guests,tables,budget,suppliers,tasks,schedule,food-plan,checklist,inventory,dedications,members,notifications}` | herdada | ❌ | ❌ | **SEM AUTHORIZATION** | URL aberta directamente mostra tudo |
| `/profile` | herdada | ❌ | — | **PARCIAL** | — |
| `/403` | herdada | ❌ | — | **ÓRFÃ** | existe, mas **nada redireciona para ela** (grep `"/403"` = 0) |
| `/invite/$code` (público) | pública | — | capability code | **PROTEGIDA** | por design |

**Conclusão:** abrir qualquer URL directamente funciona para **qualquer utilizador autenticado**; o backend é a
única barreira (e, nos casos de F-01…F-04, nem isso).

---

## 20. Sidebar / Navigation

Ficheiro: `apps/web/src/shared/components/sidebar.tsx` (~24 entradas `to=`).

| Grupo | Itens | Condição de visibilidade | Disabled |
| --- | --- | --- | --- |
| Raiz | Dashboard (`/`), Eventos (`/events`), Perfil | nenhuma | não |
| "" (evento) | Visão geral | nenhuma | não |
| Planeamento | Orçamento, Fornecedores, Tarefas, Cronograma, Alimentação, Checklist | nenhuma | não |
| Convidados | Lista de convidados, Mesas | nenhuma | não |
| Memoráveis | Dedicatórias & Votos | nenhuma | não |
| Logística | Inventário | nenhuma | não |
| Equipa | Membros | nenhuma | não |
| Sistema | Notificações, Configurações | nenhuma | não |

- Único uso de `session` na sidebar: mostrar nome/email/iniciais (linhas 261–271).
- **Zero `hidden` condicional, zero `disabled` condicional** por role/permission.
- Todos os destinos continuam acessíveis directamente por URL — **a sidebar não é (nem pretende ser) mecanismo
  de segurança**, mas também não há qualquer outro mecanismo no cliente.

---

## 21. Actions / Buttons

Ações sensíveis auditadas e o seu estado real:

| Ação | Local típico | Proteção frontend | Proteção backend | Estado |
| --- | --- | --- | --- | --- |
| Create/Update/Delete event | `events-header` | `useEventLock` | role OWNER/ADMIN/OWNER (inline) | ✅ backend |
| Add/Remove/Change role member | `members-header`, `members-table` | `useEventLock` | oRPC: **só lock** / REST: roles | ⚠️ **F-01/F-02** |
| Invite member | `members-header` | `useEventLock` | oRPC: **só lock** | ⚠️ **F-02** |
| Create/Edit/Delete guest, table, companion | guests/tables | `useEventLock` | `requireEventMutable` | ✅ |
| Publish/Unpublish invitation | invitations tab | `useEventLock` | `requireEventMutable` | ✅ |
| Create/Edit/Delete task, schedule, inventory, supplier, food, checklist | vários | `useEventLock` | `requireEventMutable` | ✅ |
| Edit budget target | `budget-header` | `useEventLock` | `requireEventMutable` | ✅ |
| Export PDF/CSV | `use-export-download` | `useEventLock` | `assertMember` (404) | ✅ |
| Mark/delete notification | notification list | — | oRPC: **sem userId** | ⚠️ **F-03** |
| Read own activity / alheia | profile | — | `hasPermission` ✔ | ✅ |

**Padrão observado:** a única "proteção" visível no cliente é `useEventLock` (bloqueio operacional do evento),
que **não é autorização** — é uma regra de negócio.

---

## 22. Dialogs / Mutations

Todos os dialogs de mutação foram inventariados (27 ficheiros com desactivação por `useEventLock`):

| Dialog | Backend | Feedback de erro | Estado |
| --- | --- | --- | --- |
| `share-invitation-dialog` | `requireEventMutable` | `handleApiError` (PT-PT) | ✅ |
| `companion-manager-dialog` | `requireEventMutable` + capacidade | idem | ✅ |
| `supplier-details-dialog` | `requireEventMutable` | idem | ✅ |
| `member-details-dialog` | oRPC `members.remove` (sem role) | idem | ⚠️ F-02 |
| `dedication-visibility-dialog` | `requireEventMutable` | idem | ✅ |
| `guests-bulk-toolbar`, `invitations-bulk-toolbar` | `requireEventMutable` | idem | ✅ |
| dialogs de tasks/suppliers/food/checklist/inventory | `requireEventMutable` | idem | ✅ |

**Feedback de erro global:** `utils/orpc.ts` liga `MutationCache` e `QueryCache` a `handleApiError` →
qualquer 401/403/404/409/500 do backend produz toast em PT-PT. **Bom:** o cliente nunca confia no si próprio;
**ruim:** é a *única* camada que o utilizador percebe, porque no cliente não há gating.

---

## 23. Error Handling

| Código | HTTP | Classe | Origem | Mensagem |
| --- | --- | --- | --- | --- |
| `UNAUTHORIZED` | 401 | `UnauthorizedError` | `requireAuth`, `requireSessionUserId` | PT-PT |
| `FORBIDDEN` | 403 | `ForbiddenError` | genérico | PT-PT |
| `ACCOUNT_BLOCKED` | 403 | `ForbiddenError` | `requireActiveUser`, Better Auth hook | PT-PT |
| `EVENT_ACCESS_DENIED` | 403 | `ForbiddenError` | `requireEventAccess` | PT-PT |
| `EVENT_ROLE_REQUIRED` | 403 | `ForbiddenError` | `requireEventAccess(allowedRoles)` | PT-PT |
| `EVENT_LOCKED` | 409 | `ConflictError` | `assertEventIsMutable` | PT-PT |
| `INVITATION_CAPACITY_REACHED` | 400 | `BadRequestError` | capacidade | PT-PT |
| `NOT_FOUND`/`*_NOT_FOUND` | 404 | `NotFoundError` | serviços/exports | PT-PT |

- **Estrutura única:** `mapError()` (REST) e `errorMapper` (oRPC) produzem o mesmo envelope
  `{ code, status, message, details }`.
- **Consistência:** boa, com 3 excepções:
  - `ForbiddenError` **sem** `code` em `routers/events.ts` (update) e `modules/events/service.ts` (update/delete)
    → o cliente recebe `FORBIDDEN` genérico em vez de um código semântico.
  - `activity-logs` `ForbiddenError` também sem `code`.
  - Frontend tem catálogo em `apps/web/src/shared/errors/codes.ts` espelhado do backend (test `codes.test.ts`).
- **Idioma:** PT-PT em todo o lado ✔.
- **Não foram encontrados `throw new Error()` soltos** em caminhos de autorização.

---

## 24. Seeds

Ficheiro: `packages/db/prisma/seed.ts` (2722 linhas).

| Aspecto | Estado |
| --- | --- |
| Users | seed de contas fixas (email/senha) |
| Roles | 1 `OWNER` + 1 `PARTNER` + 1 `ADMIN` + 1 `EDITOR` por evento; `VIEWER` em `PENDING` |
| Permissions | **não seedadas** (não existe tabela) |
| Event members | `deleteMany({})` antes de criar → **idempotente (mas destrutivo)** |
| Event invitations | `eventInvitation.deleteMany` + `createMany` → **linhas órfãs, nunca lidas** |
| Duplicações | nenhuma (unique `eventId_userId`) |
| Roles sem permissions | todas as roles têm mapeamento em `ROLE_PERMISSIONS` |
| Users sem roles | possível por design (`getUserAccess` devolve vazio) |
| `PENDING` memberships | 2 no seed — correcto (não dão acesso) |
| Consistência | seed usa `MemberRole` do Prisma; `access.ts` espelha os nomes manualmente (há teste anti-drift) |

---

## 25. Migrations

`packages/db/prisma/migrations/` — 11 migrações:

| Migração | Relevância RBAC |
| --- | --- |
| `0_init` | cria `User`, `Session`, `Account`, `Event`, `EventMember`, enums `MemberRole`/`MemberStatus` |
| `20260929120000_add_user_status` | adiciona `user.status` (ACTIVE/BLOCKED) → bloqueio de conta |
| `20260930090000_add_activity_log` | activity log (alvo de `activity.read.all`) |
| `20260925192518_add_dedication` | `Dedication`/`DedicationViewer` (ownership próprio) |
| restantes (inventory, suppliers, checklist, food-plan, event status, doc attachment, maxGuests) | **sem impacto em RBAC** |

**Não existe nenhuma migração legada de RBAC** (nunca houve tabelas `Role`/`Permission`) →
**não há implementação antiga ou incompleta a limpar**. Apenas `0_init` contém `role`/`MemberRole`.

---

## 26. Cache / Session State

| Pergunta | Resposta |
| --- | --- |
| `staleTime` definido? | **Não** (default `0`) em todo o projecto |
| Session cacheada? | Sim, no `QueryClient` (chaves `userKeys.profile()`, etc.) |
| Invalidação no logout? | **Não** — `signOut → navigate("/")` sem `queryClient.clear()` (F-12) |
| Invalidação no login? | Não explícita (o redirect + staleTime 0 refaz os fetches) |
| Invalidação em mudança de role? | **Não** (F-13) |
| Invalidação em mudança de permission? | **Não** (não existe nenhuma mudança de permission) |
| Permissões reactivas no cliente? | **Não** — nada as lê |

**Risco:** num browser partilhado, os dados do utilizador anterior podem aparecer brevemente ao seguinte
(refetches acontecem, mas os dados antigos são servidos primeiro). Como não há decisões de autorização no
cliente, o impacto é de **privacidade visual**, não de segurança de dados.

---

## 27. Tests

### 27.1 Existentes (relacionados com auth/authz)

| Ficheiro | Cobre |
| --- | --- |
| `shared/activity/__tests__/access.test.ts` | mapeamento role → permission (19 asserções), `assertRoleNamesMatch` |
| `routers/__tests__/activity-logs.test.ts` | 403 sem `activity.read.all` |
| `routers/__tests__/event-lock.test.ts` | `EVENT_LOCKED` em mutations |
| `routers/__tests__/users.test.ts` | service de utilizadores (com mocks de guard) |
| `routers/__tests__/invitation-guest-rules.test.ts` | capacidade/convites (mock de guard) |
| `shared/events/event-lock.test.ts` | regra dos 5 dias |
| `modules/dedication/service.test.ts` | 403 de membership em dedications |
| `shared/errors/{error-handler,map-error}.test.ts` | envelope de erros |
| `shared/auth/better-auth-error.test.ts` | mapeamento de erros Better Auth |
| `apps/web/**/__tests__` (30 ficheiros) | componentes/hooks (nenhum de autorização) |
| `apps/web/e2e/auth.spec.ts` | 4 testes: render do login, validação, redirect com sessão, redirect sem sessão |

### 27.2 Cenários **ausentes**

- ❌ `requireEventAccess` devolve 403 para não-membro.
- ❌ `requireEventAccess(..., ["OWNER"])` devolve `EVENT_ROLE_REQUIRED`.
- ❌ Escalada de privilégio via `members.updateRole` (F-01).
- ❌ IDOR de notifications (F-03).
- ❌ `tasks.list` sem membership (F-04).
- ❌ Coerência REST vs oRPC para gestão de equipa.
- ❌ `user.status = BLOCKED` nas rotas REST (F-09).
- ❌ Frontend: qualquer teste de gating (não existe gating).
- ❌ E2E de um utilizador não-membro a abrir a URL de outro evento.

**Risco:** cobertura de autorização **muito baixa** — as regras mais valiosas (guards) só têm testes negativos
indirectos (mocks).

---

## 28. Security Audit

| # | Vector analisado | Resultado |
| --- | --- | --- |
| 1 | Alterar a própria role | ⚠️ **possível** via `members.updateRole` (oRPC) |
| 2 | Atribuir role superior a outro | ⚠️ **possível** (mesmo endpoint) |
| 3 | Atribuir permissions sem autorização | ❌ não (permissions não são atribuíveis) |
| 4 | Enviar `role` pelo cliente | ✅ validado por `z.enum(["PARTNER","ADMIN","EDITOR","VIEWER"])` — OWNER impossível |
| 5 | Enviar `permissions` pelo cliente | ❌ não existem em input |
| 6 | Alterar `userId` | ❌ sempre de `context.session.user.id` |
| 7 | Alterar `eventId` | ⚠️ em `tasks.list/getSchedules` não é verificado |
| 8 | Aceder a outro evento | ⚠️ F-04 (tasks) e F-05 (events lê sem status) |
| 9 | Executar endpoints directamente | ⚠️ F-01/F-02/F-03 — sim, contornando o frontend |
| 10 | Contornar proteção do frontend | ✅ trivial (não há proteção) — mas o backend cobre a maior parte |
| 11 | Brute force no RSVP público | ✅ rate limit por IP+code (memória) + código de 40 bits |
| 12 | Export público sem rate limit | ⚠️ F-18 |
| 13 | Conta bloqueada com sessão viva | ⚠️ F-09 (REST) |
| 14 | Reverter bloqueio | ❌ F-10 (sem endpoint) |
| 15 | Força bruta no login | ⚠️ Better Auth sem rate limit configurado (fora do âmbito central, registado) |

---

## 29. Privilege Escalation

**Cenário principal (F-01):**

```
Utilizador U é membro ACTIVE com role VIEWER no evento E
        │
        ▼
POST /rpc/members/updateRole  { memberId: <id de U>, role: "ADMIN" }
        │  guarded apenas por requireEventMutable  (membro ACTIVE + evento não bloqueado)
        ▼
U passa a ADMIN → pode agora: adicionar/remover membros, editar o evento, apagar convidados…
```

**Variante REST:** `PATCH /api/v1/members/:memberId/role` → `MemberService.updateRole` exige `OWNER` →
**bloqueado**. Ou seja, a proteção **existe** mas está **não activa no caminho usado pelo frontend**
(`member-queries.ts` → `orpc.members.*`).

**Escalada máxima possível:** `ADMIN` (`OWNER` está protegido pelo `z.enum` e por checks).

**Outros vectores de escalada:**

| Vector | Vector de escalada | Severidade |
| --- | --- | --- |
| `members.add` sem role check | convidar qualquer pessoa como `ADMIN` | ALTO |
| `members.remove` sem role check | remover qualquer membro (excepto OWNER) | ALTO |
| `users.inviteMember` sem role check | convidar como `ADMIN` | ALTO |
| `users.removeMember` sem role check | remover qualquer membro (excepto OWNER) | ALTO |
| `members.updateRole` sem role check | auto-promoção a `ADMIN` | **CRÍTICO** |
| `users.updateMemberRole` | ✅ restrito a `OWNER` | OK |
| Criar evento | qualquer autenticado pode criar (sem `event.create`) | BAIXO |

---

## 30. Inventário de Rotas

### 30.1 oRPC — 121 procedures

- **117 `protectedProcedure`** (sessão + conta activa) e **4 `publicProcedure`**
  (`healthCheck`, `invitations.public.getByCode/schedule/respond`).
- Por router: activity-logs 1 · budget 6 · checklist 6 · dashboard 3 · dedications 11 · events 5 ·
  food-plan 7 · guests 16 · index 1 · inventory 8 · invitations 12+3 · members 4 · notifications 6 ·
  suppliers 13 · tasks 11 · users 8.
- Protegidos por event access: **~108**; self-scoped: **~7**; inline/owner: **5**; sem guarda de evento: **~4**.

### 30.2 REST — 44 rotas (`/api/v1`)

| Módulo | Rotas |
| --- | --- |
| dashboard | 1 |
| events | 5 |
| exports | 2 |
| guests + tables | 8 |
| inventory (+ movements) | 7 |
| members | 4 |
| notifications | 6 |
| tasks (+ schedules) | 8 |
| users (profile) | 2 |
| invitations public (export pdf) | 1 |
| **Total** | **44** |

Todas usam `requireSessionUserId` (401) e, para dados de evento, `requireEventAccess`/`requireEventMutable`
ou asserts de service.

### 30.3 Outros

- Better Auth: `/api/auth/*` (login, logout, get-session, register, …).
- Públicos REST: `/api/public/invitations/:code/export/pdf`.
- Frontend: **195 ficheiros de rota**, 2 guards `beforeLoad` (`_private`, `_auth`).

---

## 31. Inventário de Roles

| Role | Enum Prisma | `ACCESS_ROLES` | Nome PT | Permissions | Seed | Enforcement |
| --- | --- | --- | --- | --- | --- | --- |
| `OWNER` | ✅ | ✅ | Proprietário | 13 (todas) | ✅ | ✅ inline + service |
| `PARTNER` | ✅ | ✅ | Parceiro | 12 | ✅ | ❌ nenhum próprio |
| `ADMIN` | ✅ | ✅ | Administrador | 12 | ✅ | ✅ em update/delete evento e members REST |
| `EDITOR` | ✅ | ✅ | Editor | 8 | ✅ | ❌ nenhum próprio |
| `VIEWER` | ✅ | ✅ | Visualizador | 6 | ✅ (PENDING) | ❌ nenhum próprio |

Roles ausentes no projecto: `MANAGER`, `MEMBER`, `SUPER_ADMIN`, `GUEST`.

---

## 32. Inventário de Permissions

**13 permissions** (ver tabela completa em §11.1), definidas em `packages/auth/src/access.ts`,
**1 verificada**, **12 decorativas**, **0 na database**, **0 no frontend**.

Grupos: `profile.*` (3), `activity.*` (2), `event.*` (4), `guest.*` (4).

---

## 33. Matriz de Cobertura

| Área | Existe | Backend | Frontend | Consistente | Problemas |
| -------------- | ------ | -------- | --------- | ----------- | --------- |
| Authentication | ✅ | ✅ | ✅ | ✅ | — |
| Session | ✅ | ✅ | ⚠️ não usada p/ authz | ✅ | cache não limpa no logout |
| Roles | ✅ | ⚠️ | ❌ | ❌ | oRPC ≠ REST (F-01/F-02) |
| Permissions | ✅ | ⚠️ (1/13) | ❌ (só display) | ❌ | F-06 |
| Event Access | ✅ | ⚠️ | ❌ | ⚠️ | F-04, F-05 |
| Ownership | ✅ | ⚠️ | ❌ | ⚠️ | F-03, F-08 |
| Routes | ✅ | ✅ ~97% | ⚠️ só auth | ⚠️ | F-07 |
| Mutations | ✅ | ✅ ~95% | ⚠️ só lock | ⚠️ | F-01/F-02/F-03 |
| Sidebar | ✅ | — | ❌ | ❌ | sem gating (F-07) |
| Actions | ✅ | ⚠️ | ⚠️ | ❌ | F-07 |
| Seeds | ✅ | ✅ | — | ✅ | convites órfãos (F-11) |
| Tests | ✅ | ⚠️ baixa | ❌ | ❌ | F-20 |

---

## 34. Findings

> Cada finding tem: **ID · Título · Severidade · Tipo · Ficheiro · Localização · Descrição · Comportamento
> actual · Risco · Impacto · Recomendação**.

### F-01 — Escalada de privilégio em `members.updateRole`

- **Severidade:** CRÍTICO · **Tipo:** AUTHORIZATION / SECURITY
- **Ficheiro:** `packages/api/src/routers/members.ts` · `updateRole` (~linha 118)
- **Descrição:** o procedure carrega o membro, chama `requireEventMutable(userId, memberId.eventId)` e escreve
  `role` directamente. Não há `allowedRoles`, nem checagem de quem pede.
- **Comportamento actual:** qualquer membro `ACTIVE` (incl. `VIEWER`) de um evento pode alterar a role de
  qualquer membro do mesmo evento, **incluindo a própria**, para `PARTNER|ADMIN|EDITOR|VIEWER`.
- **Risco:** escalada total dentro do evento (`VIEWER → ADMIN`), remoção de administradores, bypass de toda a
  autorização de evento.
- **Impacto:** comprometimento da equipa do evento; com `ADMIN`, acesso de escrita a todos os módulos.
- **Recomendação:** alinhar com `MemberService.updateRole` (exigir `OWNER`) passando
  `requireEventMutable(..., ["OWNER"])`; adicionar teste de regressão.

### F-02 — Gestão de equipa sem restrição de role (oRPC vs REST)

- **Severidade:** ALTO · **Tipo:** AUTHORIZATION / RBAC
- **Ficheiro:** `packages/api/src/routers/members.ts` (`add`, `remove`) e `packages/api/src/routers/users.ts`
  (`inviteMember`, `removeMember`)
- **Localização:** handlers a partir de ~linha 74 (members) e ~linha 226/271 (users)
- **Descrição:** usam apenas `requireEventMutable`, ao passo que a variante REST
  (`modules/members/service.ts`) exige `OWNER/ADMIN` para `addMember`/`removeMember` e `OWNER` para `updateRole`.
- **Comportamento actual:** qualquer membro pode adicionar/remover membros e convidar pessoas com role
  `ADMIN`; o frontend (`member-queries.ts`) usa exactamente este caminho.
- **Risco:** encher a equipa com contas controladas, remover administradores, bypass do processo REST.
- **Impacto:** perda de controlo da composição da equipa.
- **Recomendação:** aplicar as mesmas restrições de role do `MemberService` no oRPC (idealmente num guard
  único `requireEventRole(...)`), e testar ambos os caminhos.

### F-03 — IDOR em `notifications.markAsRead` / `notifications.delete`

- **Severidade:** ALTO · **Tipo:** RESOURCE_ACCESS / SECURITY
- **Ficheiro:** `packages/api/src/routers/notifications.ts` (~linhas 70 e 92)
- **Descrição:** `db.notification.update/delete({ where: { id } })` **sem** filtro `userId`.
  A variante REST (`NotificationService.markAsRead/delete`) verifica `notification.userId !== userId`.
- **Comportamento actual:** qualquer autenticado pode marcar/ler/apagar notificações de qualquer utilizador
  conhecendo/participando o `id` (cuidado: os ids vêm em respostas de `list` só do próprio, mas o endpoint
  aceita qualquer id).
- **Risco:** manipulação de dados alheios, perda de informação, possível oracle de existência de ids.
- **Impacto:** médio-alto (privacidade + integridade).
- **Recomendação:** adicionar `userId: context.session.user.id` ao `where`, como já faz o REST.

### F-04 — `tasks.list` e `tasks.getSchedules` sem event access

- **Severidade:** ALTO · **Tipo:** RESOURCE_ACCESS / BACKEND
- **Ficheiro:** `packages/api/src/routers/tasks.ts` (linhas 20 e 200)
- **Descrição:** filtram apenas por `eventId` do input, sem `requireEventAccess`.
- **Comportamento actual:** qualquer utilizador autenticado pode ler tarefas e cronograma de **qualquer**
  evento, bastando saber/aleatorizar o `eventId` (cuidado: ids são CUIDs, mas enumeráveis por outros vazamentos).
- **Risco:** fuga de informação (nomes, datas, pessoas, prioridades) de eventos alheios.
- **Impacto:** alto (leitura transversal).
- **Recomendação:** adicionar `await requireEventAccess(context.session.user.id, input.eventId)`.

### F-05 — Membership sem filtro de `status` em `events`

- **Severidade:** MÉDIO · **Tipo:** AUTHORIZATION / INCONSISTENTE
- **Ficheiro:** `packages/api/src/routers/events.ts` (`list`, `getById`), `modules/events/service.ts`,
  `modules/members/service.ts`
- **Descrição:** verificam `members.some(userId)` sem exigir `status: "ACTIVE"`, enquanto
  `requireEventAccess` e `DedicationService` exigem `ACTIVE`.
- **Comportamento actual:** membros `PENDING` (convite por aceitar) ou `DECLINED` continuam a conseguir ler
  detalhes do evento e listá-lo.
- **Risco:** acesso de leitura a utilizadores que ainda não aceitaram (ou recusaram) o convite.
- **Impacto:** médio.
- **Recomendação:** substituir os checks inline por `requireEventAccess`.

### F-06 — 12 de 13 permissions nunca são verificadas

- **Severidade:** MÉDIO · **Tipo:** RBAC / DOCUMENTATION
- **Ficheiro:** `packages/auth/src/access.ts` + `packages/api/src/routers/activity-logs.ts:38`
- **Descrição:** `hasPermission()` é chamado numa única ocorrência. As restantes permissions existem apenas
  para compor a sessão e serem mostradas no perfil.
- **Comportamento actual:** o utilizador vê "event.delete: só OWNER/PARTNER/ADMIN" no perfil, mas o enforcement
  real é outro (checks de role inline), e não existe para EDITOR/VIEWER em vários módulos.
- **Risco:** falsa sensação de controlo; regras duplicadas e divergentes entre si; dificuldade de evolução.
- **Impacto:** médio (manutenibilidade + coerência).
- **Recomendação:** decidir entre (a) usar permissions como única fonte de decisão, ou (b) removê-las da
  sessão/perfil para não induzir em erro.

### F-07 — Frontend sem qualquer gating por role/permission

- **Severidade:** MÉDIO · **Tipo:** FRONTEND
- **Ficheiro:** `apps/web/src/shared/components/sidebar.tsx`, todas as routes em `apps/web/src/routes/**`
- **Descrição:** zero decisões com base em roles/permissions; `/403` existe mas nunca é alvo de redirect.
- **Comportamento actual:** um `VIEWER` vê e tenta todas as ações; só falha (ou não) no backend.
- **Risco:** UX enganosa, exposição de acções indisponíveis, ausência de defesa em profundidade.
- **Impacto:** médio (não é falha de segurança em si, mas amplifica F-01/F-02 porque a UI não dissuade).
- **Recomendação:** consumir `session.permissions`/`roles` num hook `useCan()`, esconder/desactivar acções e
  redirecionar para `/403` quando aplicável.

### F-08 — `dashboard.getGlobalStats` filtra por `ownerId` (ownership a substituir membership)

- **Severidade:** MÉDIO · **Tipo:** OWNERSHIP / BACKEND
- **Ficheiro:** `packages/api/src/routers/dashboard.ts` (linhas 10–36)
- **Descrição:** todos os 6 counts usam `event: { ownerId: userId }`.
- **Comportamento actual:** membros `PARTNER`/`ADMIN` de eventos de outros vêem sempre zeros no dashboard
  global; apenas o criador vê números.
- **Risco:** inconsistência funcional (não é fuga de dados — é sub-grant).
- **Impacto:** médio (percepção de bug).
- **Recomendação:** passar a `event: { members: { some: { userId, status: "ACTIVE" } } }`.

### F-09 — Rotas REST não verificam `user.status === BLOCKED`

- **Severidade:** MÉDIO · **Tipo:** SECURITY / AUTHENTICATION
- **Ficheiro:** `packages/api/src/shared/auth/auth-middleware.ts` vs `packages/api/src/index.ts`
  (`requireActiveUser`)
- **Descrição:** o oRPC verifica `BLOCKED` em cada `protectedProcedure`; o REST só lê a sessão.
- **Comportamento actual:** se uma conta for bloqueada **sem** revogar sessões (ex.: bloqueio feito
  directamente na BD, já que não há endpoint), a sessão viva continua a usar `/api/v1/*` sem restrições.
- **Risco:** contorno do bloqueio de conta.
- **Impacto:** médio.
- **Recomendação:** fazer `requireSessionUserId` verificar `user.status` (ou reaproveitar `requireActiveUser`).

### F-10 — `unblockAccount` sem endpoint

- **Severidade:** MÉDIO · **Tipo:** AUTHENTICATION / BACKEND
- **Ficheiro:** `packages/api/src/modules/users/service.ts:68`
- **Descrição:** o método existe, mas não é exposto por nenhuma rota/UI.
- **Comportamento actual:** o bloqueio é definitivo pela aplicação; só SQL directo resolve.
- **Risco:** operacional (bloqueio acidental sem reversão).
- **Impacto:** médio operacional.
- **Recomendação:** criar endpoint administrativo (protegido) ou remover o método morto.

### F-11 — `EventInvitation` órfã + `token` com `Math.random()`

- **Severidade:** MÉDIO · **Tipo:** DATABASE / SECURITY
- **Ficheiro:** `packages/api/src/routers/users.ts:250`; `packages/db/prisma/seed.ts:1506`
- **Descrição:** linhas criadas/seedadas mas nunca lidas; token de baixa entropia.
- **Comportamento actual:** dados mortos e um padrão inseguro pronto a ser activado.
- **Risco:** quando o fluxo for implementado, convites manipuláveis se o padrão for copiado.
- **Impacto:** médio futuro.
- **Recomendação:** usar `randomBytes`, e implementar o fluxo de aceitação (ou remover a tabela).

### F-12 — Logout não limpa o `queryClient`

- **Severidade:** MÉDIO · **Tipo:** FRONTEND / SECURITY
- **Ficheiro:** `apps/web/src/shared/components/user-menu.tsx:153`
- **Descrição:** `signOut → navigate("/")` sem `queryClient.clear()`.
- **Comportamento actual:** dados do utilizador anterior (convidados, membros, notificações) podem aparecer
  brevemente na sessão seguinte no mesmo tab.
- **Risco:** exposição visual de dados em browser partilhado.
- **Impacto:** médio (privacidade).
- **Recomendação:** `queryClient.clear()` antes do navigate.

### F-13 — Alterações de role/permission não invalidam caches

- **Severidade:** MÉDIO · **Tipo:** FRONTEND / CACHE
- **Ficheiro:** `apps/web/src/routes/_private/profile/-queries/user-queries.ts`, `member-queries.ts`
- **Descrição:** não existe invalidação associada a mudanças de membership/role.
- **Comportamento actual:** como não há decisões no cliente, o efeito é cosmético hoje; torna-se real assim
  que existir `useCan()`.
- **Risco:** UI desactualizada após promoção/demissão.
- **Impacto:** médio futuro.
- **Recomendação:** invalidar `userKeys.profile()` e a sessão em `onSuccess` de `members.updateRole`.

### F-14 — Autorização fragmentada em 3 camadas com severidades divergentes

- **Severidade:** MÉDIO · **Tipo:** AUTHORIZATION / DOCUMENTATION
- **Ficheiro:** `routers/*` vs `modules/*/routes.ts` vs `modules/*/service.ts`
- **Descrição:** a mesma operação pode ter restrições diferentes consoante o caminho (ver F-01/F-02).
- **Risco:** correcções aplicadas num caminho esquecidas no outro; regressões silenciosas.
- **Impacto:** médio-alto de manutenibilidade.
- **Recomendação:** mover toda a autorização para uma camada única (services ou guards partilhados) e fazer
  os routers serem apenas adaptadores.

### F-15 — `allowedRoles` usado por 1 único procedure

- **Severidade:** BAIXO · **Tipo:** RBAC / TESTING
- **Ficheiro:** `packages/api/src/shared/auth/event-access.ts:12`, uso em `users.updateMemberRole`
- **Descrição:** o parâmetro existe mas só é usado uma vez; `EVENT_ROLE_REQUIRED` não tem teste.
- **Impacto:** baixo (mas é o mecanismo que deveria resolver F-01).
- **Recomendação:** testar o caminho e generalizar o seu uso.

### F-16 — Guards condicionais `if (eventId)` após lookup

- **Severidade:** BAIXO · **Tipo:** BACKEND
- **Ficheiro:** `routers/tasks.ts` (`update`, `delete`, `deleteSchedule`), `routers/inventory.ts`
  (`getHistory`)
- **Descrição:** o guard só corre se o recurso existir; caso contrário segue para o `delete/update` da BD.
- **Comportamento actual:** falha fechada (o Prisma lança `P2025`), mas o fluxo depende do comportamento da BD.
- **Risco:** baixo; fragilidade se alguém trocar `delete` por `deleteMany`/upsert.
- **Recomendação:** lançar `NotFoundError` explicitamente quando `eventId === null`.

### F-17 — `events.create` sem qualquer role/permission

- **Severidade:** BAIXO · **Tipo:** RBAC
- **Ficheiro:** `packages/api/src/routers/events.ts:148`
- **Descrição:** qualquer autenticado cria eventos; a permission `event.create` existe e não é usada.
- **Risco:** spam de eventos (sem rate limit de criação).
- **Impacto:** baixo.
- **Recomendação:** decidir se criação é livre (documentar) ou se exige permission.

### F-18 — Export público de PDF sem rate limit

- **Severidade:** BAIXO · **Tipo:** SECURITY
- **Ficheiro:** `packages/api/src/modules/invitations/public/routes-invitation-export.ts:28`
- **Descrição:** os 3 procedures públicos do oRPC usam limiters; esta rota REST pública não.
- **Risco:** abuso de geração de PDF; tentativas de adivinhação de código sem limite (entropia de 40 bits
  torna isto difícil, mas não é impossível a longo prazo).
- **Recomendação:** aplicar o mesmo `publicInvitationCodeLimiter`.

### F-19 — Rate limiters em memória

- **Severidade:** BAIXO · **Tipo:** SECURITY / INFRA
- **Ficheiro:** `packages/api/src/shared/auth/rate-limit.ts`
- **Descrição:** `createMemoryRateLimiter` — reinicia a contagem com o processo e não partilha estado entre
  instâncias.
- **Risco:** contorno em multi-instância ou após restart.
- **Recomendação:** Redis/store partilhado quando houver mais que uma instância.

### F-20 — Cobertura de testes de autorização muito baixa

- **Severidade:** BAIXO · **Tipo:** TESTING
- **Ficheiro:** `packages/api/src/**/__tests__/*`, `apps/web/e2e/auth.spec.ts`
- **Descrição:** ver §27.2 — nenhum teste negativo de guards, nenhum de escalada, nenhum de IDOR.
- **Risco:** regressões não detectadas exactamente nas regras mais críticas.
- **Recomendação:** testes de 403/409 para `requireEventAccess`/`requireEventMutable` e para F-01…F-04.

### F-21 — Custo por pedido: +2 queries de autorização

- **Severidade:** BAIXO · **Tipo:** BACKEND / PERFORMANCE
- **Ficheiro:** `packages/auth/src/index.ts` (`customSession`), `packages/api/src/index.ts`
  (`requireActiveUser`)
- **Descrição:** cada leitura de sessão faz `getUserAccess` (1 query) e cada `protectedProcedure` faz
  `db.user.findUnique` para `status` (1 query), além do `requireEventAccess` (1 query).
- **Risco:** latência em endpoints quentes.
- **Recomendação:** `cookieCache` do Better Auth para roles/permissions e cache curto de `status`.

### F-22 — Sem tabelas `Role`/`Permission` (INFO)

- **Severidade:** INFO · **Tipo:** DATABASE / DOCUMENTATION
- **Descrição:** vocabulário totalmente em código (`packages/auth/src/access.ts`). Facilita a manutenção,
  impede auditoria via SQL e torna a sessão a única superfície de exposição.

### F-23 — Expiry de sessão aos defaults do Better Auth (INFO)

- **Severidade:** INFO · **Tipo:** AUTHENTICATION
- **Descrição:** sem `session.expiresIn`/`updateAge` configurados (~30 dias) e sem `cookieCache`.

### F-24 — Autorização correcta mas dispersa em services (INFO)

- **Severidade:** INFO · **Tipo:** AUTHORIZATION
- **Descrição:** `DedicationService`, `MemberService`, `NotificationService`, `EventService` fazem as suas
  próprias verificações — todas correctas, mas fora do ponto único.

### F-25 — RSVP público por capability code (INFO)

- **Severidade:** INFO · **Tipo:** RESOURCE_ACCESS
- **Descrição:** `MUX-XXXX-XXXX` de `randomBytes` (40 bits, sem caracteres ambíguos) + rate limit por IP.
  Desenho aceitável para link partilhável; documentar que o code é credencial.

**Totais: 25 findings — 1 CRÍTICO · 3 ALTO · 10 MÉDIO · 7 BAIXO · 4 INFO.**

---

## 35. Gaps

| Gap | Severidade associada |
| --- | --- |
| Nenhuma camada única de autorização | F-14 |
| Nenhum gating de UI por permissão | F-07 |
| Permissions não operacionalizadas | F-06 |
| Gestão de equipa sem roles no oRPC | F-01, F-02 |
| Self-scoping incompleto em notifications | F-03 |
| Event access incompleto em tasks/events | F-04, F-05 |
| Estado de conta (`BLOCKED`) não propagado ao REST | F-09, F-10 |
| Feature de convites de equipa inacabada | F-11 |
| Cache de sessão/autorização não gerido | F-12, F-13 |
| Quase inexistência de testes de autorização | F-20 |
| Rota `/403` órfã | F-07 |
| Sem telemetria de tentativas de autorização negadas (só activity log de sessão) | INFO |

---

## 36. Recomendações Futuras

> **NÃO IMPLEMENTADAS** — apenas propostas.

| # | Problema | Impacto | Recomendação | Prioridade |
| --- | --- | --- | --- | --- |
| R1 | F-01 auto-promoção de role | compromete o evento | exigir `OWNER` em `members.updateRole` (igual ao REST) + teste | **P0** |
| R2 | F-02 gestão de equipa livre | equipa comprometida | exigir `OWNER/ADMIN` em `members.add/remove`, `users.inviteMember/removeMember` | **P0** |
| R3 | F-03 IDOR notifications | dados alheios | filtrar por `userId` no `where` | **P0** |
| R4 | F-04 tasks sem access | fuga de dados | `requireEventAccess` em `list` e `getSchedules` | **P0** |
| R5 | F-05 membership sem status | acesso indevido | usar `requireEventAccess` em vez de `members.some` | **P1** |
| R6 | F-09 BLOCKED no REST | bloqueio contornável | verificar `status` em `requireSessionUserId` | **P1** |
| R7 | F-14 fragmentação | regressões | camada única de autorização (services ou guards), routers como adaptadores | **P1** |
| R8 | F-06 permissions decorativas | falsa sensação | usar `hasPermission` como decisão única **ou** removê-las da sessão | **P1** |
| R9 | F-07 sem gating no FE | UX + defesa em profundidade | hook `useCan()` + esconder/desactivar + redirect `/403` | **P1** |
| R10 | F-08 dashboard owner-scoped | números errados | filiar por membership | **P2** |
| R11 | F-12/F-13 cache | dados do utilizador anterior | `queryClient.clear()` no logout; invalidar profile em mudanças de role | **P2** |
| R12 | F-10 sem unblock | operação bloqueada | endpoint administrativo ou remover método morto | **P2** |
| R13 | F-11 convites órfãos | feature inacabada | implementar fluxo com `randomBytes` ou remover tabela | **P2** |
| R14 | F-20 sem testes de authz | regressões | suíte de guards (403/409/role) + 1 e2e negativo | **P1** |
| R15 | F-16 guard condicional | fragilidade | `NotFoundError` explícito | **P3** |
| R16 | F-18/F-19 rate limiting | abuso | limiters no export público e em store partilhado | **P3** |
| R17 | F-21 custo | latência | `cookieCache` + cache de `status` | **P3** |
| R18 | F-17 criação livre | spam | decidir e documentar | **P3** |

---

## 37. Arquitetura RBAC Recomendada

> **RECOMENDAÇÃO FUTURA — NÃO IMPLEMENTADA**

### 37.1 Modelo de dados alvo

```
User
 └─< UserRole >─ Role ─< RolePermission >─ Permission
                     (globais, opcionais — administração da plataforma)

User ─< EventMember(role, status) > Event          (mantém-se: é o núcleo correcto)
              │
              └─ resolver para Permission[] por evento
```

Curto prazo (sem migrations): manter `EventMember.role` como fonte, mas **tornar `ROLE_PERMISSIONS` a única
decisão** e derivar dela todas as verificações.

### 37.2 Cadeia de decisão alvo

```
Authentication
      ↓
Authorization        (sessão válida + conta ACTIVE)
      ↓
Resource Access      (requireEventAccess — membership ACTIVE do evento)
      ↓
Ownership            (quando aplicável: autoria, notificação própria)
      ↓
Permission           (hasPermission(role → permission) em TODAS as mutações)
      ↓
Business Rules       (EVENT_LOCKED, capacidade, regras de domínio)
```

### 37.3 Guards alvo

```ts
requireAuth            // sessão
requireActiveUser      // status da conta (REST + oRPC)
requireEventAccess     // membership ACTIVE
requireEventRole(...)  // roles mínimas por operação
requirePermission(...) // permission declarativa
assertEventIsMutable   // regra operacional (já existe)
```

---

## 38. Plano Futuro de Implementação

> **NÃO EXECUTADO**

1. **Normalizar permissions** — definir o conjunto final (`event.*`, `member.*`, `guest.*`, `task.*`,
   `supplier.*`, `budget.*`, `invitation.*`, `export.*`) e mapear cada role.
2. **Normalizar roles** — documentar a matriz role × operação e eliminar os `["OWNER","ADMIN"]` inline.
3. **Centralizar autorização** — único ponto de decisão (recomendação: `modules/*/service.ts` + guards),
   routers como adaptadores finos.
4. **Proteger o backend** — corrigir F-01…F-05 e F-09; adicionar `requireEventAccess`/`requireEventRole`
   a tudo o que falha.
5. **Proteger procedures** — política: *nenhum procedure novo sem guard declarado* (lint/regra de review).
6. **Proteger routes frontend** — `beforeLoad` que valida acesso ao evento e redireciona para `/403`.
7. **Proteger sidebar** — esconder itens sem a permission correspondente (mantendo URL directa bloqueada
   pelo backend).
8. **Proteger actions** — hook `useCan(permission, eventId)` para disabled/hidden nos 27 componentes já
   mapeados.
9. **Integrar event access** — unificar o critério `status: "ACTIVE"` em todos os pontos (F-05).
10. **Integrar business rules** — manter `EVENT_LOCKED`/capacidade separados de autorização (já separados
    hoje — manter).
11. **Atualizar seed** — semear dados coerentes com a matriz final; remover `eventInvitation` órfão.
12. **Criar testes** — suíte de guards (positivo/negativo), 1 e2e de utilizador não-membro, testes de
    anti-escalada.
13. **Documentar** — esta auditoria + matriz role × permissão no repositório, com checklist de review.

---

## 39. Ficheiros Auditados

**Auth / sessão**
- `packages/auth/src/index.ts`, `packages/auth/src/access.ts`
- `packages/api/src/index.ts`, `packages/api/src/context.ts`
- `packages/api/src/shared/auth/auth-middleware.ts`, `event-access.ts`, `rate-limit.ts`, `auth.ts`
- `packages/api/src/shared/events/event-lock.ts`, `event-date.ts`

**oRPC (routers)** — todos: `activity-logs`, `budget`, `checklist`, `dashboard`, `dedications`, `events`,
`food-plan`, `guests`, `index`, `inventory`, `invitations`, `members`, `notifications`, `suppliers`, `tasks`,
`users`.

**REST (modules)** — `dashboard`, `events`, `exports`, `guests`, `inventory`, `members`, `notifications`,
`tasks`, `users`, `invitations/public`, `dedication`, `invitations`, `suppliers`, `budget`, `checklist`,
`food-plan` (services e routes).

**Erros** — `shared/errors/app-error.ts`, `codes.ts`, `map-error.ts`, `error-handler.ts`.

**Database** — `packages/db/prisma/schema/auth.prisma`, `schema.prisma`, `seed.ts`,
`packages/db/prisma/migrations/**` (11).

**Frontend**
- `apps/web/src/routes/_private.tsx`, `routes/_auth/layout.tsx`, `routes/__root.tsx`
- `apps/web/src/shared/components/sidebar.tsx`, `user-menu.tsx`, `topbar.tsx`
- `apps/web/src/utils/orpc.ts`, `main.tsx`
- `apps/web/src/shared/queries/*`, `routes/**/-queries/*`
- `apps/web/src/shared/errors/*`, `routes/_private/403/index.tsx`
- 27 componentes com desactivação por `useEventLock`
- `apps/web/e2e/auth.spec.ts`, `auth.setup.ts`, `protected.noauth.ts`

**Testes** — 32 ficheiros `*.test.ts` em `packages/api`, 30 em `apps/web`, 3 e2e.

**Infra** — `apps/server/src/index.ts`, `pnpm-workspace.yaml`.

---

## 40. Conclusão

A auditoria está **concluída** segundo o critério pedido: todas as áreas analisadas, **165 rotas**
catalogadas (121 oRPC + 44 REST), **5 roles** catalogadas, **13 permissions** catalogadas, todas as
verificações de autorização identificadas, frontend e backend auditados, ownership e event access auditados,
segurança e privilege escalation analisados, seeds, migrations e testes analisados, gaps classificados,
**25 findings** documentados, recomendações escritas (nenhuma executada) e ficheiros listados.

**Estado do código:** ❌ **nenhum código foi alterado.** Verificado com `git status --porcelain` antes e
depois da auditoria — listas idênticas. A única criação é este documento.

**Próximo passo sugerido (não executado):** corrigir os 4 findings de prioridade **P0** (F-01, F-02, F-03,
F-04), que são correcções pontuais de uma a três linhas cada, com teste de regressão correspondente.
