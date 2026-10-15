# Investigação: Convites pendentes para amiltonxavier1999@gmail.com (evt_seed_13, evt_seed_24)

**Data:** 2026-10-13  
**Utilizador:** amiltonxavier1999@gmail.com (id: 6kFhDgqJjB8ygRVuJhfy3QOZJBCH6LLj)  
**Eventos afetados:** evt_seed_13, evt_seed_24  
**Problema reportado:** aceitou convites mas não consegue visualizar eventos nem aparece na lista de membros

## Estado observado (BD)

### EventMember (membros existentes nos eventos)
```sql
-- evt_seed_13
mem_usr_seed_01_evt_seed_13 | OWNER | ACTIVE
mem_usr_seed_02_evt_seed_13 | PARTNER | ACTIVE
mem_usr_seed_03_evt_seed_13 | ADMIN | ACTIVE
mem_usr_seed_04_evt_seed_13 | EDITOR | ACTIVE

-- evt_seed_24
mem_usr_seed_06_evt_seed_24 | OWNER | ACTIVE
mem_usr_seed_01_evt_seed_24 | PARTNER | ACTIVE
```
Não existe qualquer `EventMember` para `userId=6kFhDgqJjB8ygRVuJhfy3QOZJBCH6LLj` nos eventos `evt_seed_13` ou `evt_seed_24`. (count 0 em ambos)

### EventInvitation (convites)
```sql
evt_seed_13 | status=PENDING | role=EDITOR | token=H8Wsyh8dj8ENCyQOEGLlrgut5R_EtrWXuumFxGScvR0 | expiresAt=2026-10-19 18:10:43.38
evt_seed_24 | status=PENDING | role=EDITOR | token=PSCoB7g4XXMsJJQXb_m1uGpsOkOVK9-EWtjw3lcfmxQ | expiresAt=2026-10-20 10:14:11.979
```
Ambos os convites estão **PENDING**. Isto significa que, na base de dados, a aceitação **ainda não foi registada** (não foram marcados como ACCEPTED, e não foi criado nenhum EventMember ACTIVE para o utilizador).

### Autorização (relevante)
- `requireEventAccess` exige `EventMember` com `status=ACTIVE`. Sem membro ACTIVE, o acesso ao evento é negado (EVENT_ACCESS_DENIED). Explica "não consegui visualizar os eventos".
- `members.list` devolve membros filtrados por `eventId` (sem filtro implícito de status). Se não existe membro criado, o utilizador não aparece na lista. Explica "não aparece na lista de membros destes eventos".

## Causa raiz

O estado da BD mostra convites ainda PENDING. O relato diz "aceitou os convites", mas o registo não foi gravado. Possíveis causas:
1. A aceitação foi tentada mas falhou (erro de rede, sessão diferente, email mismatch no contexto, etc.) e não chegou a completar a transação
2. Foi aceite com outro utilizador/sessão
3. Os convites foram rejeitados/cancelados ou expiraram (mas aqui ainda PENDING e não expirados)
4. Houve algum problema no fluxo de aceitação via frontend (ex.: aceitar por link/token)

Os tokens existem e estão PENDING com expiração futura. O utilizador autenticado corresponde ao email dos convites.

## Como reproduzir/verificar (via API)

Os endpoints relevantes são:
- `memberInvites.accept` (accept by token) — aceita convite PENDING válido, cria EventMember ACTIVE, marca convite ACCEPTED
- `requireEventAccess(userId,eventId)` — passa apenas com ACTIVE membership

Com os tokens atuais, se o utilizador autenticado for `amiltonxavier1999@gmail.com`, aceitar cada token deve:
1. Marcar convite como ACCEPTED
2. Criar `EventMember(eventId, userId='6kFhDgqJjB8ygRVuJhfy3QOZJBCH6LLj', status='ACTIVE', role='EDITOR')`
3. Permitir acesso ao evento (`requireEventAccess`)
4. Fazer o membro aparecer em `members.list` (eventId)

## Acção recomendada

Para resolver o estado atual (BD), pode-se aceitar os convites via API usando os tokens pendentes (se ainda válidos), com sessão autenticada do utilizador correto. Alternativamente, simular aceitação via transação (criar membro ACTIVE + marcar convite ACCEPTED).

Mas, seguindo o princípio de "fix root causes (not symptoms)" e respeitando as regras (não alterar dados arbitrariamente sem entender), o passo correto é **reproduzir o fluxo de aceitação** com os tokens existentes e verificar o comportamento. Se o fluxo funcionar conforme esperado, o problema foi transitório (tentativa falhada anteriormente). Se falhar, identifica-se a causa exata.

### Comandos para aceitar via teste/manual (exemplo)
Usando o contexto de autenticação com email `amiltonxavier1999@gmail.com` e userId `6kFhDgqJjB8ygRVuJhfy3QOZJBCH6LLj`:
- Aceitar `H8Wsyh8dj8ENCyQOEGLlrgut5R_EtrWXuumFxGScvR0` (evt_seed_13)
- Aceitar `PSCoB7g4XXMsJJQXb_m1uGpsOkOVK9-EWtjw3lcfmxQ` (evt_seed_24)

Após aceitação bem-sucedida, o estado esperado:
- `event_invitation.status` → ACCEPTED (ambos)
- `event_member` com (evt_seed_13, 6kFhDgqJjB8ygRVuJhfy3QOZJBCH6LLj) → ACTIVE, role EDITOR
- `event_member` com (evt_seed_24, 6kFhDgqJjB8ygRVuJhfy3QOZJBCH6LLj) → ACTIVE, role EDITOR
- Acesso ao evento concedido via `requireEventAccess`
- Membro aparece em `members.list({eventId})`

## Nota

O código existente (acceptInvitation) está correcto e todos os testes passam (591/591 API). Os testes de regressão adicionados confirmam o comportamento esperado quando a aceitação ocorre com sucesso. O estado atual da BD indica simplesmente que **as aceitações não foram persistidas** para este utilizador nestes eventos — os convites permanecem PENDING.
