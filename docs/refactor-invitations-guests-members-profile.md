# Refactor: Invitations → Guests, Members, Profile

## 1. Auditoria — o que existe hoje

### Rotas (frontend)

```
/events/$eventId/invitations   -> UI de gestão de convites (stats, filtros, tabela, publicar/despublicar)
/events/$eventId/guests        -> UI de convidados + já tem convite (view, partilhar, responder, criar)
/events/$eventId/members       -> UI de membros da equipa (cards)
/profile                       -> UI de perfil (formulário nome/email)
```

### Auditoria do módulo `invitations` (frontend)

| Ficheiro | Responsabilidade | Destino |
| --- | --- | --- |
| `index.tsx` | página: stats + filtros + tabela | `guests/-components/invitation/` (tab **Convites**) |
| `-components/invitations-stats.tsx` | `InvitationStats` (total/respondidos/taxa) | `guests/-components/invitation/invitations-stats.tsx` |
| `-components/invitations-filters.tsx` | pesquisa por nome + filtro de resposta | `guests/-components/invitation/invitations-filters.tsx` |
| `-components/invitations-table.tsx` | tabela de convites | `guests/-components/invitation/invitations-table.tsx` |
| `-components/invitation-table-row.tsx` | publicar / despublicar / copiar link | `guests/-components/invitation/invitation-table-row.tsx` |
| `-constants/invitation.constants.ts` | opções do filtro de resposta | `guests/-constants/guest.constants.ts` |
| `-queries/invitation-queries.ts` | list/stats/publish/unpublish | `guests/-queries/invitation-queries.ts` |
| `-types/invitation.types.ts` | `InvitationItem` | `guests/-types/invitation.types.ts` |
| `-utils/invitation.utils.ts` | `buildInvitationLink` | `guests/-utils/invitation.utils.ts` (já existia, duplicado) |

### Relações de domínio

```
Event ──< GuestInvitation >── Guest >──< GuestCompanion
                │  (code/token público, qrCode, url, status, response)
                └──< InvitationGuest >── Guest

Event ──< EventMember >── User
```

- Um `GuestInvitation` é a unidade de publicação/QR/resposta.
- Vários convidados podem partilhar o mesmo convite (`InvitationGuest`).
- `EventMember` liga `User` a `Event` (papel + estado) — base dos **members**.

### Duplicação encontrada (backend)

| Operação | `invitations` router | `guests` router |
| --- | --- | --- |
| criar convite | `invitations.create` | `guests.createInvitation` |
| responder | `invitations.respond` | `guests.respondToInvitation` |
| ver convite | `invitations.list` | `guests.getInvitation` |

`buildInvitationLink` existia em dois `-utils`.

### Backend — router `invitations`

- `public.getByCode`, `public.respond` (convite público)
- `publish`, `unpublish` (sem validação de regras de publicação, sem batch)
- `getInvitationStats`, `list`, `respond`, `create`, `generateCode`
- Lógica de negócio escrita directamente no router (violando #25)
- `qrCode` e `url` existem no modelo `GuestInvitation` mas **nunca são preenchidos**
- Não existe `publishBatch`

### Lacunas identificadas

1. `qrCode`/`url` nunca gerados → sem QR em nenhum lado.
2. Sem publicação em lote.
3. `publish` não valida estado do convite nem a pertença ao evento.
4. Duplicação de endpoints entre `guests` e `invitations`.
5. `guests.respondToInvitation` **não verifica permissão do evento**.
6. Members: cards em vez de tabela, `index.tsx` com 385 linhas e lógica misturada.
7. Profile: página monolítica de 114 linhas, sem danger zone, sem bloqueio de conta.
8. `User` não tem qualquer campo de estado → impossível bloquear uma conta.

## 2. Plano de migração

### Backend

1. `modules/invitations/qr-code.ts` — geração de QR (SVG) a partir do token público.
2. `modules/invitations/service.ts` — regras de publicação + `publishInvitationsBatch`.
3. `routers/invitations.ts` — router fino, delega no service; novos `publishBatch` / `byGuest`.
4. `routers/guests.ts` — remover `createInvitation` e `respondToInvitation` (duplicados);
   corrigir `assignGuestToTable` / `removeGuestFromTable` (sem verificação de acesso).
5. `shared/types/entities.ts` — `qrCode`/`url` em `PublicInvitation`; novo tipo `BulkPublishResult`.
6. `users` — `status` (ACTIVE/BLOCKED), `blockAccount`, `unblockAccount`, revogação de sessões,
   guarda `requireActiveUser` no router, `databaseHooks.session.create.before` no better-auth.
7. Migration Prisma `add_user_status`.

### Frontend

1. `guests/-queries/invitation-queries.ts` — queries/mutations migradas (publicadas em `shared/queries`).
2. `guests/-components/invitation/*` — componentes de convite migrados + QR.
3. `guests/index.tsx` — tabs **Lista | Convites | Analytics** + seleção múltipla.
4. `guests/-components/guests-bulk-toolbar.tsx` — barra contextual de publicação em lote.
5. `invite/$code/-components/invitation-qr-code.tsx` — QR no convite público.
6. `invitations/index.tsx` — desativado com aviso de migração; fora da navegação.
7. `members/` — componentizado, `Table`, `member-details-dialog.tsx`.
8. `profile/` — componentizado, secções, danger zone, `block-account-dialog.tsx`.

## 3. Decisões arquiteturais

| Decisão | Motivo |
| --- | --- |
| QR Code em **SVG** persistido na coluna `qrCode` | ~1-2 KB, escalável, sem base64 gigante; `qrcode` gera SVG nativamente |
| QR gerado **na criação** e **garantido na publicação** | Sem regeneração por render; `qrCode` ausente é corrigido ao publicar |
| QR aponta para `${FRONTEND_URL}/invite/<code>` | O `code` já é o token público (índice único, sem PII) |
| API mantém o namespace `invitations` | Domínio: a unidade é o convite. A **UI** é que vive em `guests` |
| `publishBatch` faz **um** `findMany` + **um** `updateMany` | Sem N requests; validação por item feita em memória sobre o resultado do `findMany` |
| O `updateMany` é o **único** passo que pode falhar o publish | O `updateMany` é atómico: ou todos os válidos ficam públicos, ou nenhum. O backfill do QR é **best-effort** (ver bug 6) |
| `publishBatch` aceita `scope: "SELECTED" \| "ALL_UNPUBLISHED"` | "Publicar todos" resolve o conjunto **no backend**, sem depender do cliente ter todos os ids (e sem lutar com o limite de página) |
| `guests.list` inclui o convite mais recente sem `qrCode` | Permite a badge "Publicado/Privado" e o bulk publish por seleção sem um request extra por convidado; o SVG (~1,6 KB) fica só no detalhe |
| `User.status` em vez de `blocked` booleano | Extensível (`ACTIVE`/`BLOCKED`) e explícito |
| `databaseHooks.session.create.before` | O backend é a fonte de verdade: bloqueado nunca obtém nova sessão |
| Backfill **preguiçoso** do QR no primeiro read público | Convites publicados antes da feature ganham QR sem migração de dados; o custo só existe uma vez |

## 4. Módulo `invitations` (frontend) — desativado

`apps/web/src/routes/_private/events/$eventId/invitations/` é preservado, mas a página passou a
mostrar um aviso de migração. Nenhuma feature nova é adicionada lá; toda a gestão de convites
vive em `guests`. A entrada "Convites" da sidebar foi removida e a "Convidados" passa a ser o
único ponto de entrada.

## 5. O que foi entregue

### Backend

| Ficheiro | Alteração |
| --- | --- |
| `packages/api/src/modules/invitations/qr-code.ts` | **Novo.** `getPublicBaseUrl`, `buildInvitationUrl`, `generateInvitationQrCode`, `buildInvitationQrPayload` |
| `packages/api/src/modules/invitations/schemas.ts` | **Novo.** Schemas + `MAX_BULK_INVITATION_IDS = 200` |
| `packages/api/src/modules/invitations/service.ts` | QR na criação, backfill ao publicar, `publishInvitationsBatch` com veredicto por item, backfill no read público |
| `packages/api/src/routers/invitations.ts` | Routers finos, `byGuest`, `getStats`, `publishBatch` com `scope` |
| `packages/api/src/routers/guests.ts` | Removidos `createInvitation`/`respondToInvitation`/`getInvitation`; corrigida a autorização de `assignGuestToTable`/`removeGuestFromTable`; `list` passou a incluir o convite mais recente |
| `packages/api/src/shared/types/entities.ts` | `UserStatus`, `url`/`qrCode` em `PublicInvitation`, contratos de bulk |
| `packages/api/src/modules/users/*` | `blockAccount` transacional com revogação de sessões, `findByEmail`, `profileSelect` |
| `packages/api/src/routers/users.ts` | `getProfile` com `security` + `activity`, `blockAccount` com `confirm: z.literal(true)` |
| `packages/api/src/index.ts` | `requireActiveUser` — servidor recusa conta bloqueada mesmo com sessão válida |
| `packages/auth/src/index.ts` | `status` em `additionalFields` + `databaseHooks.session.create.before` |
| `packages/db/prisma/schema/auth.prisma` | `enum UserStatus`, `status`, `blockedAt`, `blockedReason` |
| `packages/db/prisma/migrations/20260929120000_add_user_status/` | **Nova.** Migration da coluna de estado |
| `packages/env/src/server.ts` | `FRONTEND_URL` opcional |
| `packages/api/vitest.config.ts` | `test.env` com placeholders — os módulos sob teste importam `@muxima/env/server`, que valida `process.env` no import |

### Frontend

| Ficheiro | Alteração |
| --- | --- |
| `guests/-queries/invitation-queries.ts` | **Novo.** Todas as queries/mutations de convite, incluindo `usePublishInvitationsBatch` |
| `guests/-components/invitation/invitation-qr-code.tsx` | **Novo.** Único ponto de render do SVG do QR |
| `guests/-components/invitation/invitation-link.tsx` | **Novo.** Link público + copy |
| `guests/-components/invitation/invitations-tab.tsx` | **Novo.** Aba "Convites" (migrada de `invitations`) |
| `guests/-components/invitation/invitations-bulk-toolbar.ts` | **Novo.** Toolbar contextual + `reportBulkPublishResult` |
| `guests/-components/guests-bulk-toolbar.tsx` | **Novo.** Toolbar de selección: criar convites em falta / publicar os pendentes |
| `guests/-hooks/use-visible-selection.ts` | **Novo.** Selecção limitada às linhas visíveis (prune ao mudar de página/filtro) |
| `guests/-hooks/use-guest-selection.ts` | **Novo.** Selecção múltipla que mapeia convidados → convites |
| `guests/-utils/guest.utils.ts` | `getGuestInvitation` |
| `guests/index.tsx` | Aba "Convites" + selecção + toolbar |
| `invite/$code/-components/invitation-qr-code.tsx` | **Novo.** QR na página pública |
| `members/*` | **Novo** `-queries`, `-hooks`, `-types`, `-utils` e 6 componentes; cards → tabela; `index.tsx` de 385 → 130 linhas |
| `profile/*` | **Novo** `-types` e 4 componentes; `index.tsx` de 114 → 96 linhas |
| `shared/components/sidebar.tsx` | Entrada "Convites" removida |
| `invitations/index.tsx` | Aviso de migração (rota preservada) |

## 6. Verificação

| Verificação | Resultado |
| --- | --- |
| `tsc --noEmit` (apps/web) | ✅ sem erros |
| `tsc --noEmit -p packages/api` | ✅ sem erros |
| `vite build` (apps/web) | ✅ 3,91 s |
| `vitest run` (packages/api) | ✅ 17 ficheiros, 298 testes |
| `biome check` (ficheiros tocados) | ✅ sem erros nem avisos |

### Bugs encontrados e corrigidos durante a refatoração

1. **`publishInvitationsBatch` rebentava com um id inválido.** `invitation?.guests.map(...)`
   não é null-safe: um id desconhecido (ou de outro evento) lançava `TypeError` em vez de
   devolver o veredicto `INVALID`. Coberto por teste.
2. **Convites publicados antes da feature ficavam sem QR.** O backfill só existia no fluxo de
   publicação, portanto um convite já publicado nunca ganhava QR. Agora é backfilled no primeiro
   read público.
3. **`QueryState` não é render-prop.** `guests-table` estava a usá-lo como função;
   corrigido para usar `guests` directamente.
4. **Convite publicado com QR null no detalhe.** `buildPublicInvitation` só fazia fallback do
   `url`; o `qrCode` era devolvido tal e qual.
5. **Convites de outros eventos eram aprovados no bulk** porque o `findMany` não filtrava por
   `eventId`; a validação por item agora barra-o com `INVALID`.
6. **Um `FAILED` falso no bulk publish.** O `updateMany` publicava os convites e só *depois*
   vinha o backfill do QR; se esse falhasse, o `catch` marcava **todos** como `FAILED` — mas
   estavam publicados na base de dados. Agora o `updateMany` é o único passo que pode produzir
   `FAILED`, e o QR é best-effort com aviso não-fatal em `errors` (o read público já faz o
   backfill). Coberto por dois testes.
7. **`RemoveMemberDialog` rebentava ao ser renderizado.** `getMemberName(member as MemberItem)`
   era avaliado mesmo com `member === null` (o `Dialog` fechado não evita a avaliação dos
   filhos), lançando `TypeError: Cannot read properties of null`. O cast estava a esconder
   precisely o bug.
8. **`getMemberStatus` mapeava `DECLINED` para `PENDING`.** `status === "ACTIVE" ? ... :
   "PENDING"` descartava o terceiro estado; a tabela mostrava "Pendente" a quem recusou.
9. **O proprietário podia ser reatribuído ou removido.** `member.role as AssignableMemberRole`
   colocava `OWNER` dentro de um `Select` cujas opções não o contêm, e o botão de remoção
   estava sempre activo. Agora `isOwnerRole` é um type guard: o papel aparece fixo e o botão
   de remoção fica desactivado com explicação.
10. **A selecção sobrevivia a mudanças de página/filtro.** `selectedIds` guardava ids de páginas
    anteriores, o que fazia `toggleAll`/`allSelected` compararem contagens diferentes e o
    contador mentir. `useVisibleSelection` faz prune sempre que o conjunto visível muda.
