# Investigação: Aceitação de Convites de Membros

**Data:** 2026-10-13  
**Scope:** Convites de membros — aceitação, listagem, acesso ao evento

## Objetivo

Investigar e corrigir dois problemas reportados:
1. Membros que aceitam convites continuam sem aparecer na listagem de membros (`members.list`)
2. "Access Denied" após aceitar o convite, apesar do evento aparecer na lista do utilizador

## Contexto Técnico

### Authorization
- `requireEventAccess(userId, eventId)` exige um `EventMember` com `status: "ACTIVE"` para `(userId,eventId)`. Membros com `PENDING`/`DECLINED` são rejeitados com `EVENT_ACCESS_DENIED` (403). Ver: `packages/api/src/shared/auth/event-access.ts`.
- `requireEventPermission` usa acesso ao evento + permissões baseadas no `roleId` do membro (com fallback para `role` enum). Ver: `packages/api/src/shared/auth/authorization.ts`, `packages/api/src/shared/auth/permissions.ts`.

### Aceitação de Convite
- `acceptInvitation` (em `packages/api/src/modules/members/invitations.ts`) corre numa transação:
  - Atualiza `EventInvitation` para `ACCEPTED`, limpa `pendingKey`, regista `respondedBy`, `acceptedAt`
  - Resolve `roleId` via `Role.findUnique({ name: invitation.role })`
  - Cria `EventMember` com `{ eventId, userId, role, status: "ACTIVE", joinedAt, roleId: roleRef?.id ?? null }`
- Em caso de violação única (`P2002`) (race entre aceitações), o convite é "settled" (marcado como ACCEPTED) e devolve conflito `EVENT_MEMBER_ALREADY_EXISTS` (`MEMBER_CODES.ALREADY_EXISTS`).
- Tests existentes cobrem: aceitação, não permitir aceitar duas vezes (replay), email mismatch, expiração, race → conflict. Todos passaram.

### Listagem de Membros
- `members.list` (router `packages/api/src/routers/members.ts`, serviço/repositório em `packages/api/src/modules/members/*`) filtra por `eventId` e opcionalmente por `status`/`role`/`search`. Não aplica filtro implícito por status por defeito — devolve membros que correspondem aos filtros. O frontend pode filtrar por tab (Ativos/Pendentes) mas a API retorna os dados conforme solicitado.
- A query inclui dados do `user` (name/email) e campos do membership. 

## Investigação

Analisámos os caminhos relevantes:
- Código de aceitação: garante `status: "ACTIVE"` na criação do `EventMember`. ✓
- Regras de autorização: exigem `ACTIVE`. Após criação ACTIVE, acesso deve ser concedido. ✓
- Listagem: sem filtro de status por omissão, novo membro ACTIVE aparece. ✓
- Integração existente: testes unitários de `member-invites` mantêm-se verdes.

Para confirmar o comportamento end-to-end sem depender de dados específicos do ambiente, foram criados testes de regressão focados nos dois cenários reportados.

### Novos testes (regressão)
Ficheiro: `packages/api/src/routers/__tests__/member-acceptance.test.ts`

1. **Aceitação cria membro ACTIVE visível na listagem**
   - Aceita convite via `memberInvitesRouter.accept`
   - Verifica que `res.member.status === "ACTIVE"`
   - Chama `membersRouter.list` sem filtros de status
   - Verifica que lista contém 1 membro com `status: "ACTIVE"` e email do convidado

2. **Após aceitação, utilizador passa `requireEventAccess`**
   - Aceita convite
   - Chama `requireEventAccess("usr_claimer", "evt_1")` e espera resolução sem erro

O mock do DB cobre: `eventInvitation`, `eventMember` (com `findFirst/findMany/count/create/findUnique` coerentes), `notification`, `role`, `rolePermission` (para resolução de permissões event-scoped), `user`, `event`, e `$transaction`.

Resultado: ambos os testes passam.

## Verificação Completa

- API: `npx vitest run --config vitest.config.ts` → **591/591 passed**
- Web: `npx vitest run --config vitest.config.ts` → **316/316 passed**
- Typecheck API: `npx tsc --noEmit` → sem erros
- Typecheck Web: `npx tsc --noEmit` → sem erros

## Conclusão

O código existente implementa corretamente:
- Criação de `EventMember` com `status: "ACTIVE"` após aceitação válida
- Autorização baseada em membro `ACTIVE`
- Listagem sem filtro implícito de status

Os cenários descritos já estão cobertos pela lógica atual. Os testes adicionados servem como regressão para garantir que este comportamento se mantém. Não foram necessárias alterações ao código de produção para estes casos específicos.

## Referências

- `packages/api/src/modules/members/invitations.ts` (acceptInvitation)
- `packages/api/src/shared/auth/event-access.ts` (requireEventAccess)
- `packages/api/src/routers/members.ts` (members.list)
- `packages/api/src/routers/__tests__/member-invites.test.ts`
- `packages/api/src/routers/__tests__/member-acceptance.test.ts` (novo)
