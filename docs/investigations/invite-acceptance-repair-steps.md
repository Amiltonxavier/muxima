# Plano de reparação: aceitar convites pendentes (evt_seed_13, evt_seed_24)

**Data:** 2026-10-13  
**Utilizador:** amiltonxavier1999@gmail.com (6kFhDgqJjB8ygRVuJhfy3QOZJBCH6LLj)

## Situação
Convites PENDING existem para este email nos eventos evt_seed_13 e evt_seed_24. Não existe EventMember ACTIVE para este utilizador nesses eventos. Aceitar via fluxo normal (link/token + sessão autenticada) deve resolver.

## Passo 1: Verificar sessão/autenticação
Confirmar que está autenticado como `amiltonxavier1999@gmail.com` na app web.

## Passo 2: Aceitar via API/endpoint `accept` por token

Os tokens:
- evt_seed_13: H8Wsyh8dj8ENCyQOEGLlrgut5R_EtrWXuumFxGScvR0
- evt_seed_24: PSCoB7g4XXMsJJQXb_m1uGpsOkOVK9-EWtjw3lcfmxQ

Endpoint (orpc): `memberInvites.accept` com input `{ token }`. Requer sessão autenticada com email correspondente ao convite.

## Passo 3: Verificar resultado

Após aceitação:
```sql
-- Convites devem ficar ACCEPTED
SELECT status FROM event_invitation WHERE token IN ('H8Wsyh8dj8ENCyQOEGLlrgut5R_EtrWXuumFxGScvR0','PSCoB7g4XXMsJJQXb_m1uGpsOkOVK9-EWtjw3lcfmxQ');

-- Devem existir membros ACTIVE
SELECT \"eventId\", status, role FROM event_member WHERE \"userId\"='6kFhDgqJjB8ygRVuJhfy3QOZJBCH6LLj' AND \"eventId\" IN ('evt_seed_13','evt_seed_24');
```

Esperado: ambos ACCEPTED + ambos membros ACTIVE (role EDITOR).

## Passo 4: Testar acesso/listagem

- Aceder a `/events/evt_seed_13` e `/events/evt_seed_24` — não deve dar "Access Denied"
- Verificar lista de membros em cada evento — `amiltonxavier1999@gmail.com` deve aparecer como EDITOR/ACTIVE

## Observação
Se por alguma razão não conseguir aceitar via UI, podemos simular aceitação via script usando a lógica de `acceptInvitation` (respeitando transação, roleId, etc.). Mas preferível usar o fluxo real para não contornar validações.

## Estado pós-investigação
- Código correcto: todos os testes passam (API 591/591, Web 316/316)
- Root cause identificado: estado BD (convites PENDING, sem membro ACTIVE) — não é bug no código, é o estado dos convites não consumidos
