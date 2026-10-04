# Regras de Mutação de Eventos — Bloqueio Operacional (EVENT_LOCKED)

> **Objectivo:** definir quando um evento deixa de aceitar criação/edição/eliminação/publicação/partilha de
> dados, no frontend e no backend, a partir de uma única fonte de verdade.
>
> **Estado:** implementado (backend + frontend + testes).
> **Ramo:** `big-refactor`.

---

## 1. Fonte de verdade

A regra vive num módulo **puro** (sem Prisma, sem React), partilhado pelos dois lados:

| Camada | Ficheiro |
| --- | --- |
| Regra central | `packages/api/src/shared/events/event-lock.ts` |
| Composição de data+hora | `packages/api/src/shared/events/event-date.ts` (extraído de `modules/events/lifecycle.ts`, que re-exporta) |
| Guards de acesso | `packages/api/src/shared/auth/event-access.ts` |
| Espelho no browser | `apps/web/src/shared/hooks/use-event-lock.ts` (importa o mesmo módulo via `@muxima/api/shared/events/event-lock`) |

O frontend importa **exactamente o mesmo código** que o servidor, pelo que as duas superfícies não podem
divergir. Ainda assim, o frontend é apenas UX: **o backend re-valida cada mutação** — a checagem do browser
nunca é um mecanismo de segurança.

### API do módulo

```ts
EVENT_LOCK_WINDOW_DAYS = 5;

getEventLockReason(event, now?): "CANCELLED" | "EXPIRED" | "COMPLETED" | null;
isEventLocked(event, now?): boolean;
eventLockMessage(reason): string;          // feedback único em PT-PT
assertEventIsMutable(event, now?): void;    // lança 409 EVENT_LOCKED
```

`LockableEvent` = `{ status: string; eventDate: Date | null; startTime: string | null }`.

---

## 2. Quando é que um evento está bloqueado

Um evento está bloqueado quando **qualquer** destas condições se verifica:

| # | Condição | `lockReason` | Momento |
| --- | --- | --- | --- |
| 1 | `status === "CANCELLED"` | `CANCELLED` | Imediato, com ou sem data |
| 2 | `now > eventDateTime + 5 dias` | `EXPIRED` | Passado o período de wrap-up |
| 3 | `status === "COMPLETED"` **e** sem data utilizável | `COMPLETED` | Imediato (não é possível calcular a janela) |

`eventDateTime` = `composeStartAt({ eventDate, startTime })` — **precisão de minuto, não de dia de
calendário**: `eventDate` + `startTime` ("HH:mm"), ou meia-noite de `eventDate` quando não há hora.

### Regra dos 5 dias (decisão de produto)

- **Exactamente 5 dias** depois do fim do evento = **permitido** (limite exclusivo).
- **1 minuto depois** = bloqueado.
- `COMPLETED` **dentro** dos 5 dias **não** bloqueia: o worker de lifecycle conclui os eventos logo após o
  fim, e esses 5 dias são exactamente o período de envolvimento (*wrap-up*) em que as operações continuam
  disponíveis.
- `COMPLETED` **sem data utilizável** bloqueia de imediato — a janela não pode ser calculada.

```ts
// event-lock.ts
now.getTime() > startAt.getTime() + EVENT_LOCK_WINDOW_DAYS * 24 * 60 * 60 * 1000
```

### Exemplos

| `eventDate` + `startTime` | `status` | `now` | Resultado |
| --- | --- | --- | --- |
| 2026-06-10 18:00 | `CANCELLED` | qualquer | 🔒 `CANCELLED` |
| 2026-06-10 18:00 | `CONFIRMED` | 2026-06-11 18:00 (1 dia) | ✅ mutável |
| 2026-06-10 18:00 | `CONFIRMED` | 2026-06-14 18:00 (4 dias) | ✅ mutável |
| 2026-06-10 18:00 | `COMPLETED` | 2026-06-12 18:00 (2 dias) | ✅ mutável (wrap-up) |
| 2026-06-10 18:00 | `CONFIRMED` | 2026-06-15 18:00 (exactamente 5 dias) | ✅ mutável (limite exclusivo) |
| 2026-06-10 18:00 | `CONFIRMED` | 2026-06-15 18:01 (5 dias + 1 min) | 🔒 `EXPIRED` |
| *(sem data)* | `COMPLETED` | qualquer | 🔒 `COMPLETED` |
| *(sem data)* | `CONFIRMED` | qualquer | ✅ mutável (janela não aplicável) |

### Mensagens (PT-PT, uma por motivo — nunca uma por módulo)

| Motivo | Mensagem |
| --- | --- |
| `CANCELLED` | Este evento foi cancelado e não permite alterações. |
| `COMPLETED` | Este evento foi concluído e não permite alterações. |
| `EXPIRED` | Este evento já ultrapassou o período permitido para alterações. |
| fallback | Este evento já não permite alterações. |

---

## 3. O que está bloqueado vs. o que continua permitido

### Bloqueado (mutations de **dados do evento**)

Guard: `requireEventMutable(userId, eventId, roles?)` (oRPC) e `assertEventIsMutableById(eventId)` / o
equivalente em REST — relêem **sempre** o evento da base de dados; nunca confiam no cliente.

- **Guests**: create/update/delete, add/remove companion, create/update/delete table, assign/remove guest
  from table, update companion.
- **Inventory**: create/update/delete, add movement.
- **Invitations**: create, publish, publishBatch, unpublish, respond.
- **Tasks**: create/update/delete, create/update/delete schedule.
- **Budget**: updateTarget.
- **Checklist**: create/update/delete, sync.
- **Food-plan**: setSupplier, updateNotes, add/update/delete item.
- **Dedications**: create/update, setVisibility, add/remove viewer, remove.
- **Members/Users**: addMember, updateRole, removeMember, inviteMember, removeMember, updateMemberRole.
- **Suppliers**: create, update, changeStatus, delete, add/delete payment, setInstallments,
  update/deleteInstallment.
- **REST** (`modules/guests|inventory|tasks/routes.ts`): todos os POST/PATCH/DELETE das respectivas
  superfícies.

### Permitido (excepções)

- **Editar o próprio evento** (os seus campos) e **alterar o seu estado** — manutenção do evento, não dados
  do evento. O `eventsRouter.update` continua com `requireEventAccess`.
- **Eliminar o evento** (operação de manutenção do próprio evento).
- **Qualquer leitura**: listagens, detalhe, stats, filtros, exportações — `requireEventAccess` mantém-se.

### Convenção aplicada

> Procedures de **leitura** mantêm `requireEventAccess`; **mutations de dados do evento** usam
> `requireEventMutable`. O código que não trata de dados do evento (edição/status/delete do evento,
> leituras) **não muda**.

### Envelope de erro

```
409 { "error": { "code": "EVENT_LOCKED", "message": "<mensagem PT-PT do motivo>" } }
```

- REST: `mapError`; oRPC: `errorMapper` (`packages/api/src/index.ts`).
- Código espelhado em `apps/web/src/shared/errors/codes.ts` (`EVENT_CODES.LOCKED`), com teste de espelho
  (`codes.test.ts`).
- Feedback automático no cliente: `apps/web/src/utils/orpc.ts` liga `MutationCache`/`QueryCache` ao
  `handleApiError`.

---

## 4. Limite de convidados por convite (`maxGuestsPerInvitation`)

### Regra

Cada convite tem um **número máximo de pessoas** (pessoa + acompanhantes). Default: **2**.

| Item | Valor |
| --- | --- |
| Campo | `Event.maxGuestsPerInvitation Int @default(2)` (`packages/db/prisma/schema/schema.prisma`) |
| Migração | `packages/db/prisma/migrations/20261003100000_add_max_guests_per_invitation/migration.sql` |
| Intervalo | mínimo 1, máximo 20 (zod no `eventsRouter.update`); UI oferece 1–10 |
| Módulo | `packages/api/src/modules/invitations/capacity.ts` |

### Funções

- `DEFAULT_MAX_GUESTS_PER_INVITATION = 2`
- `assertInvitationCapacity(count, max)` → **400 `INVITATION_CAPACITY_REACHED`** quando um convite
  (criação) ou um acompanhante (`addCompanion`) excederia o limite. Mensagem:
  `Este convite permite no máximo N pessoas.`
- `assertMaxGuestsPerInvitationIsRespected(max)` → **409** quando, ao **reduzir** o limite, convites
  existentes passariam a violá-lo. Nunca apaga dados: devolve `details.violations` para o utilizador
  decidir.
- `countGuestsPeople` / `countInvitationPeople` / `findInvitationsOverCapacity` — contagem de pessoas
  (convidado + acompanhantes).

### Validações

- **Backend**: `invitations.createInvitation` lê o evento (status, data, hora, limite), aplica
  `assertEventIsMutable` **e** `assertInvitationCapacity`; `guests.addCompanion` conta as pessoas do
  convite (ou a *party* do convidado) e valida contra o limite.
- **Frontend**: `companion-manager-dialog` desactiva a acção quando
  `1 + companions.length >= maxPeople`; a *redução* do limite é validada pela UI no
  `invitation-capacity-setting` (feedback 409 vindo do servidor).

### Configuração na página de Guests

`guests/-components/invitation-capacity-setting.tsx` (`InvitationCapacitySetting`,
`data-testid="invitation-capacity-setting"`), montado em `guests/index.tsx` após `GuestsHeader`.
Select 1–10, usa `useUpdateEvent`. **Não é desactivado pelo lock** — é manutenção do evento.

---

## 5. Frontend

| Peça | Ficheiro |
| --- | --- |
| Hook | `apps/web/src/shared/hooks/use-event-lock.ts` → `{ eventId, isEventLocked, lockReason, lockMessage, isLoading }` |
| Banner global | `apps/web/src/shared/components/event-lock-banner.tsx` (`event-lock-banner`), montado em `routes/_private.tsx` junto ao `EventCountdownBanner` |
| Configuração do limite | `guests/-components/invitation-capacity-setting.tsx` |

O hook lê o cache partilhado `eventKeys.detail(id) = ["events","detail",id]` (já populado pelo layout do
evento) e avalia a regra com `getEventLockReason`. Fora de uma rota de evento devolve o estado mutável.

Componentes desactivam acções com feedback PT-PT quando bloqueado:

```tsx
const { isEventLocked, lockMessage } = useEventLock();
<Button disabled={isEventLocked} title={lockMessage ?? undefined}>…</Button>
```

Superfícies cobertas: guests-header, guests-bulk-toolbar, guests-table-row, invitation-table-row
(publicar/copiar), invitations-tab, invitations-bulk-toolbar, share-invitation-dialog,
companion-manager-dialog, invitation-capacity-setting, tables, dedications (+table), inventory
(header/rows), tasks, food-plan, checklist, schedule (header/list), suppliers (header/row/details),
budget-header, members (header/table/details).

Nos testes isolados de componentes, o hook é substituído por um *stub* no estado mutável (o comportamento
do lock é coberto pelo teste dedicado do hook).

---

## 6. Testes

| Ficheiro | Cobre |
| --- | --- |
| `packages/api/src/shared/events/event-lock.test.ts` | Regra pura: motivos, janela de 5 dias, limite exclusivo, mensagens |
| `packages/api/src/routers/__tests__/event-lock.test.ts` | Guards `requireEventMutable` nos routers (mutations bloqueadas, leituras/edição do evento ok) |
| `packages/api/src/modules/invitations/capacity.test.ts` | Capacidade por convite e guarda de redução do limite |
| `apps/web/src/shared/hooks/__tests__/use-event-lock.test.tsx` | Espelho no browser: CANCELLED, 1d, 4d, COMPLETED 2d, exactamente 5d, 5d+1min, sem data, fora de rota |
| `apps/web/.../guests/-components/__tests__/guests-header.test.tsx` | Acções desactivadas com `title` PT-PT e clique inerte |
| `apps/web/src/shared/errors/__tests__/codes.test.ts` | Espelho dos códigos `EVENT_LOCKED` / `INVITATION_CAPACITY_REACHED` API ↔ web |

Resultado: **468 testes API** a passar (32 ficheiros); web — apenas falhas **pré-existentes** no ramo
(não relacionadas com este bloco de trabalho).

---

## 7. Checklist de auditoria

- [x] Módulo puro único, importado pelos dois lados.
- [x] `requireEventMutable` em todas as mutations de dados do evento (oRPC + REST + services).
- [x] Excepções: editar o evento, alterar o estado, eliminar o evento, leituras.
- [x] Backend relê o evento da DB em cada mutação (nunca confia no cliente).
- [x] Códigos `EVENT_LOCKED` e `INVITATION_CAPACITY_REACHED` espelhados API ↔ web com teste.
- [x] Banner global + desactivação das acções com feedback PT-PT.
- [x] `maxGuestsPerInvitation` default 2, migração aplicada, configuração na página de Guests.
- [x] Redução do limite valida convites existentes sem apagar dados.
- [x] Testes backend + frontend.
