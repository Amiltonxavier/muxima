# RBAC — Modelo de acesso do Muxima

> Estado actual: **implementado**. Este documento é a referência única do modelo
> de autorização — vocabulário, matriz, camada de enforcement, gating de UI e o
> estado de cada finding da auditoria (`docs/rbac-audit.md`).

## 1. Princípios

1. **O backend é a autoridade.** Toda a autorização acontece em
   `packages/api/src/shared/auth/authorization.ts` (e nos guards de que este
   depende). O frontend **nunca** autoriza: só decide o que desenhar.
2. **Uma fonte de verdade.** As capacidades vivem em `packages/permissions/`
   (puro, zero dependências) e são persistidas em `Role` / `Permission` /
   `RolePermission`. Os guards leem o banco (`RolePermission`) por evento —
   nunca um mapa hardcoded em código.
3. **REST = oRPC.** Ambas as superfícies chamam as mesmas funções
   (`requireEventPermission`, `requireEventPermissionMutable`, …). Não existe
   uma "segunda política" para manter em sincronia.
4. **Falha fechada.** Resposta vazia durante o carregamento = "ainda não";
   recurso inexistente = 404 (nunca um `if` que salta o guard); sem
   permissão = 403 PT-PT; evento bloqueado = 409.

## 2. Vocabulário

- **Permissão**: chave tipada `resource.action` (ex.: `guests.create`).
  Catálogo completo em `packages/permissions/src/catalogue.ts` — 70 chaves.
- **Role**: uma de cinco — `OWNER`, `PARTNER`, `ADMIN`, `EDITOR`, `VIEWER`.
  Cada `EventMember` tem um `role` (enum legado) e um `roleId` FK para `Role`;
  a autorização lê a FK e cai para o enum se a BD não estiver semeada.
- **Matriz**: `packages/permissions/src/matrix.ts` define quem tem o quê e é o
  que o `seed` escreve em `RolePermission`.

### Decisões estruturais da matriz

- **Só o `OWNER`** tem `members.update-role` e `events.delete`. Quem altera
  quem é dono, ou apaga o evento, **é** o dono — é isto que torna a escalada
  de privilégio estruturalmente impossível e não apenas desencorajada.
- `PARTNER` e `ADMIN` são quase iguais na operação; ambos editam a definição
  do evento e gerem a equipa; nenhum transfere propriedade.
- `EDITOR` escreve dados operacionais e as suas próprias dedicatórias, mas não
  toca na definição do evento, na equipa nem nos exports.
- `VIEWER` é só-leitura, excepto o próprio perfil e notificações.

## 3. Matriz Role × Permissão

Gerada de `getSeedRolePermissions()` (o mesmo código que o seed escreve na BD).

<!-- gerado por scripts/gen-matrix.ts — não editar à mão -->

| Permissão | Proprietário (`OWNER`) | Parceiro (`PARTNER`) | Administrador (`ADMIN`) | Editor (`EDITOR`) | Visualizador (`VIEWER`) |
| --- | :---: | :---: | :---: | :---: | :---: |
| `activity.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `activity.read.all` | ✅ | ✅ | ✅ | — | — |
| `budget.create` | ✅ | ✅ | ✅ | — | — |
| `budget.delete` | ✅ | ✅ | ✅ | — | — |
| `budget.export` | ✅ | ✅ | ✅ | — | — |
| `budget.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `budget.update` | ✅ | ✅ | ✅ | — | — |
| `checklist.create` | ✅ | ✅ | ✅ | ✅ | — |
| `checklist.delete` | ✅ | ✅ | ✅ | — | — |
| `checklist.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `checklist.update` | ✅ | ✅ | ✅ | ✅ | — |
| `dashboard.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `dedications.create` | ✅ | ✅ | ✅ | ✅ | — |
| `dedications.delete` | ✅ | ✅ | ✅ | ✅ | — |
| `dedications.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `dedications.share` | ✅ | ✅ | ✅ | ✅ | — |
| `dedications.update` | ✅ | ✅ | ✅ | ✅ | — |
| `events.create` | ✅ | — | — | — | — |
| `events.delete` | ✅ | — | — | — | — |
| `events.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `events.update` | ✅ | ✅ | ✅ | — | — |
| `exports.create` | ✅ | ✅ | ✅ | — | — |
| `food-plan.create` | ✅ | ✅ | ✅ | ✅ | — |
| `food-plan.delete` | ✅ | ✅ | ✅ | — | — |
| `food-plan.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `food-plan.update` | ✅ | ✅ | ✅ | ✅ | — |
| `guests.create` | ✅ | ✅ | ✅ | ✅ | — |
| `guests.delete` | ✅ | ✅ | ✅ | ✅ | — |
| `guests.export` | ✅ | ✅ | ✅ | — | — |
| `guests.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `guests.update` | ✅ | ✅ | ✅ | ✅ | — |
| `inventory.create` | ✅ | ✅ | ✅ | ✅ | — |
| `inventory.delete` | ✅ | ✅ | ✅ | — | — |
| `inventory.export` | ✅ | ✅ | ✅ | — | — |
| `inventory.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `inventory.update` | ✅ | ✅ | ✅ | ✅ | — |
| `invitations.create` | ✅ | ✅ | ✅ | ✅ | — |
| `invitations.delete` | ✅ | ✅ | ✅ | — | — |
| `invitations.publish` | ✅ | ✅ | ✅ | — | — |
| `invitations.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `invitations.respond` | ✅ | ✅ | ✅ | — | — |
| `invitations.update` | ✅ | ✅ | ✅ | ✅ | — |
| `members.add` | ✅ | ✅ | ✅ | — | — |
| `members.invite` | ✅ | ✅ | ✅ | — | — |
| `members.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `members.remove` | ✅ | ✅ | ✅ | — | — |
| `members.update-role` | ✅ | — | — | — | — |
| `notifications.delete` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `notifications.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `notifications.update` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `profile.password.change` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `profile.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `profile.update` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `schedule.create` | ✅ | ✅ | ✅ | ✅ | — |
| `schedule.delete` | ✅ | ✅ | ✅ | — | — |
| `schedule.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `schedule.update` | ✅ | ✅ | ✅ | ✅ | — |
| `suppliers.create` | ✅ | ✅ | ✅ | — | — |
| `suppliers.delete` | ✅ | ✅ | ✅ | — | — |
| `suppliers.export` | ✅ | ✅ | ✅ | — | — |
| `suppliers.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `suppliers.update` | ✅ | ✅ | ✅ | — | — |
| `tables.create` | ✅ | ✅ | ✅ | ✅ | — |
| `tables.delete` | ✅ | ✅ | ✅ | ✅ | — |
| `tables.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `tables.update` | ✅ | ✅ | ✅ | ✅ | — |
| `tasks.create` | ✅ | ✅ | ✅ | ✅ | — |
| `tasks.delete` | ✅ | ✅ | ✅ | — | — |
| `tasks.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `tasks.update` | ✅ | ✅ | ✅ | ✅ | — |
| **Total** | **70** | **67** | **67** | **43** | **21** |

Notas:

- `invitations.respond` responde **ao próprio** convite (o RSVP público tem o
  seu próprio fluxo por código em `/invite/$code`, sem sessão de evento).
- As permissões `profile.*` e `notifications.*` são self-scoped: actuam sempre
  nas linhas **do próprio** utilizador — o filtro de linha é a autorização.
- `events.create` não é usado como guard: qualquer conta ACTIVA pode criar o
  seu primeiro evento (decisão documentada em F-17); a role `OWNER` recebê-la
  existe para a matriz estar completa e para o futuro.

## 4. Camada de enforcement (backend)

Cadeia que todo o procedimento protegido percorre, por ordem:

1. **Autenticação** — sessão válida (`protectedProcedure` / `requireSessionUserId`).
2. **Estado da conta** — `user.status === ACTIVE` (`requireActiveUser` no oRPC
   e `requireSessionUserId` no REST — F-09).
3. **Acesso ao evento** — `EventMember` `ACTIVE` para (utilizador, evento).
   `PENDING`/`DECLINED` param aqui (`requireEventAccess`).
4. **Permissão** — `RolePermission` da role daquele evento
   (`requireEventPermission`).
5. **Regra de negócio** — `EVENT_LOCKED`, capacidade, autoria da linha
   (`requireEventPermissionMutable` / `requireEventIdForResource`).

Peças:

| Função | Papel |
| --- | --- |
| `requireEventPermission(user, event, perm)` | acesso + capacidade |
| `requireEventPermissionMutable(...)` | o anterior + `EVENT_LOCKED` |
| `requirePermission(permissions, perm)` | capacidades não-scoped a evento (actividade, perfil) |
| `requireEventIdForResource(entity, id)` | resolve o evento da linha ou 404 — elimina o `if (eventId)` (F-16) |
| `requireEventRole(...)` | membership + role literal (disponível; hoje a matriz cobre os casos) |
| `assertEventIsMutableById` | 409 `EVENT_LOCKED` |

Cobertura: **todos** os routers usam `requireEventPermission[Mutable]`,
`requirePermission` ou `requireEventIdForResource`; as rotas REST usam as
mesmas funções. `rest-authorization.test.ts` falha se um módulo REST voltar a
usar um guard sem permissão, e `permission-coverage.test.ts` falha se uma
chave do catálogo ficar sem detentor ou a matriz citar uma chave inexistente.

Superfícies sem guard de evento por desenho (e porquê):

- `notifications.*` — self-scoped (o `where` leva `userId`).
- `users.getProfile/updateProfile/changePassword` — self-scoped.
- `events.create` — ver F-17; `events.getMyAccess` — devolve vazio para
  não-membro em vez de erro, para a UI poder desenhar o estado "sem acesso".
- `dashboard.getGlobalStats` — agregado das minhas memberships `ACTIVE`.

## 5. Frontend — só UX

- `apps/web/src/shared/hooks/use-can.ts`
  - `useEventCan(eventId, ...perms)` — capacidades **num evento** (lê
    `events.getMyAccess`); é o hook a usar dentro de um evento.
  - `useCan(...perms)` — união da sessão, só para superfícies de conta.
  - `useEventCanAny` — "pelo menos uma".
  - Resposta desconhecida = "ainda não" → nenhum controlo aparece antes de
    tempo; `accessKeys.all` é invalidado quando a equipa/role muda (F-13).
- **Sem permissão = escondido; evento bloqueado = desactivado.** Duas
  perguntas distintas, duas respostas visíveis distintas (`useEventLock`
  continua a tratar do bloqueio).
- Sidebar filtra itens com `filterNavGroups` (`nav-permissions.ts`);
  `beforeLoad` da rota do evento redireciona para `/403` sem role;
  `user-menu.tsx` faz `queryClient.clear()` no logout (F-12);
  `export-menu` só mostra módulos exportáveis.

Módulos com gating: guests (+convites), tables, tasks, schedule, inventory,
suppliers, budget, checklist, food-plan, dedications, members, exports,
capacidade de convite, header do evento.

O backend rejeita exactamente as mesmas mutações — esconder um botão é
conveniência; mostrá-lo a quem não pode é um incómodo. **Nunca** ao contrário.

## 6. Persistência e migração

- Tabelas `Role`, `Permission` (`@unique key`, `@@unique([resource, action])`)
  e `RolePermission` (`@@unique([roleId, permissionId])`), mais
  `EventMember.roleId → Role?` — `packages/db/prisma/schema/schema.prisma`.
- Migração `20261005120000_add_rbac_tables`: cria as tabelas, faz back-fill
  das 5 roles e liga `event_member.roleId` existente.
- Seed idempotente (`packages/db/prisma/seed.ts`): upsert por chave natural,
  `rolePermission.deleteMany + createMany`.

## 7. Testes

| Ficheiro | O que prova |
| --- | --- |
| `shared/auth/__tests__/authorization-behavior.test.ts` | **escalada** (VIEWER/ADMIN/EDITOR/PENDING/estranho não alteram roles; OWNER sim; linha OWNER intocável), **IDOR** de notificações (404 e linha intacta), **event access** de `tasks.list`/`getSchedules` (403 cross-evento, VIEWER lê) |
| `shared/auth/__tests__/permission-coverage.test.ts` | matriz coerente: sem chaves órfãs, sem chaves fantasma, VIEWER só-leitura, `members.update-role` OWNER-only, write ⇒ read |
| `shared/auth/__tests__/rest-authorization.test.ts` | REST sem guards "só-membership" nem comparações de role à mão |
| `shared/auth/__tests__/resource-guard.test.ts` | `requireEventIdForResource` nunca devolve `null` (anti-`if`) |
| `routers/__tests__/event-lock.test.ts` | 409 `EVENT_LOCKED` fim-a-fim em todas as mutações |
| `apps/web/.../__tests__/guests-header.test.tsx` | gating de UI: sem `guests.create` o botão não desenha |
| `apps/web/.../nav-permissions.test.ts` | sidebar filtra por permissão |
| `apps/web/.../export-modules.test.ts` | export gating por módulo |

## 8. Reclassificação dos 25 findings da auditoria

| ID | Finding | Estado | Onde / porque |
| --- | --- | --- | --- |
| F-01 | Escalada em `members.updateRole` | **CORRIGIDO** | guard `MEMBER_UPDATE_ROLE` (OWNER-only na matriz) + linha OWNER protegida + teste de escalada |
| F-02 | Gestão de equipa oRPC vs REST | **CORRIGIDO** | ambos os caminhos usam os mesmos guards; paridade REST↔oRPC no `updateRole` |
| F-03 | IDOR em notificações | **CORRIGIDO** | `where` com `userId` em `markAsRead`/`delete` (oRPC = REST) + teste IDOR |
| F-04 | `tasks.list`/`getSchedules` sem acesso | **CORRIGIDO** | `requireEventPermission` com `TASK_READ`/`SCHEDULE_READ` + testes |
| F-05 | Membership sem `status: ACTIVE` | **CORRIGIDO** | `requireEventAccess` e queries de eventos filtram `ACTIVE` |
| F-06 | 12/13 permissions nunca verificadas | **CORRIGIDO** | 70 chaves, todas com detentor; enforcement em cada procedimento; cobertura testada |
| F-07 | Frontend sem gating | **CORRIGIDO** | `useEventCan`/`useCan` + sidebar + `/403` em todos os módulos (ver §5) |
| F-08 | `dashboard.getGlobalStats` por `ownerId` | **CORRIGIDO** | membership `ACTIVE` |
| F-09 | REST sem verificação `BLOCKED` | **CORRIGIDO** | `requireSessionUserId` verifica `status` no middleware REST |
| F-10 | `unblockAccount` sem endpoint | **PENDENTE** | sem decisão de produto: hoje só existe auto-bloqueio; o método continua morto e sem rota |
| F-11 | Token com `Math.random()` | **CORRIGIDO** | `randomBytes(32)` base64url em `users.inviteMember`; a tabela `EventInvitation` órfã mantém-se sem fluxo |
| F-12 | Logout sem `queryClient.clear()` | **CORRIGIDO** | `user-menu.tsx` |
| F-13 | Caches não invalidadas | **CORRIGIDO** | `accessKeys.all` + invalidação de membros/perfil nas mutações de role |
| F-14 | Autorização fragmentada em 3 camadas | **CORRIGIDO** | ponto único em `shared/auth/*`; testes estruturais impedem regressão |
| F-15 | `allowedRoles` usado 1× e sem teste | **NAO APLICAVEL** | a matriz de permissões substituiu-o nos procedures; `requireEventRole` mantém-se para papéis literais e está coberto pelos testes de escalada |
| F-16 | Guards `if (eventId)` | **CORRIGIDO** | `requireEventIdForResource` lança 404; teste `resource-guard` |
| F-17 | `events.create` sem permissão | **NAO APLICAVEL** | decisão: criação livre para qualquer conta ACTIVA, documentada em §3; `events.create` reservada ao OWNER na matriz |
| F-18 | Export público sem rate limit | **CORRIGIDO** | `publicInvitationExportLimiter` |
| F-19 | Rate limiters em memória | **PENDENTE** | aceite para instância única; migrar para Redis quando houver escala horizontal |
| F-20 | Cobertura de testes de autorização | **CORRIGIDO** | ver §7 (escalada, IDOR, event access, cobertura, guards estruturais) |
| F-21 | +2 queries por pedido | **PENDENTE** | custo aceite (~3 queries pequenas por pedido); `cookieCache` do Better Auth é a optimização prevista |
| F-22 | Sem tabelas `Role`/`Permission` | **CORRIGIDO** | §6 — vocabulário persistido e auditável por SQL |
| F-23 | Expiry de sessão aos defaults | **PENDENTE** | decisão de segurança/UX em aberto (`expiresIn`/`cookieCache`) |
| F-24 | Autorização dispersa em services | **CORRIGIDO** | services chamam os guards partilhados; proibido por teste |
| F-25 | RSVP público por código | **NAO APLICAVEL** | desenho aceitável e documentado: 40 bits + rate limit por IP; o código é credencial |

**Totais: 25 findings — 19 CORRIGIDO · 2 NAO APLICAVEL · 4 PENDENTE
(F-10, F-19, F-21, F-23 — nenhum é autorização).**

## 9. Verificação

```bash
pnpm check                              # biome, sem erros
pnpm run check-types                    # typecheck do monorepo
pnpm --filter @muxima/api test:run      # 502 testes backend
pnpm --filter web test:run              # 287 passam; 10 falhas pré-existentes
```

As 10 falhas do web (`helpers.test.ts` formatCurrencyCompact, `invite-book`,
`inventory-details-dialog`, `inventory-stats`) são pré-existentes à auditoria
e não estão relacionadas com RBAC — confirmadas com `git stash`.
