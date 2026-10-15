# Limpeza e Seed: manter apenas amilton.seed@muxima.test com eventos de teste

**Data:** 2026-10-13  
**Utilizador preservado:** amilton.seed@muxima.test (usr_seed_01), senha inalterada, estado funcional

## Operação realizada

### 1) Limpeza completa da BD (respeitando FKs)
Executado `TRUNCATE` em cascata nas tabelas dependentes (activity_log, audit_log, notification, dedication_viewer, dedication, schedule, inventory_movement, inventory_item, checklist_item, table_guest, table, invitation_guest, guest_invitation, guest_companion, guest, food_plan_item, food_plan, supplier_installment, supplier_payment, supplier, task, event_invitation, budget, event_member, event) e removidos registos restantes de `session`, `account` e utilizadores distintos de `amilton.seed@muxima.test`.

### 2) Validação pós-limpeza
- Utilizadores: 1 (`amilton.seed@muxima.test`, id usr_seed_01, ACTIVE, emailVerified true, roleId presente)
- Eventos/membros/budgets/outros: 0

### 3) Criação de eventos para o utilizador seed
Criados 7 eventos com estados diferentes, todos como OWNER ACTIVE com budget inicial:

| Nome | Tipo | Estado | Data | Event ID |
|---|---|---|---|---|
| Casamento Silva | WEDDING | DRAFT | 2027-06-01 | ev_d1 |
| Noivado Costa | ENGAGEMENT | PLANNING | 2027-07-15 | ev_p1 |
| Aniversário 30 | BIRTHDAY | CONFIRMED | 2027-08-20 | ev_c1 |
| Formação Equipa | CORPORATE | ONGOING | 2027-09-05 | ev_o1 |
| Conferência Tech | CONFERENCE | COMPLETED | 2027-09-10 | ev_cmp1 |
| Festa Cancelada | PARTY | CANCELLED | 2027-10-01 | ev_can1 |
| Workshop React | WORKSHOP | DRAFT | 2027-11-01 | ev_d2 |

### 4) Ligação consistente
- `event_member` (OWNER, ACTIVE) criado para cada evento com `userId = usr_seed_01`
- `budget` criado para cada evento com `plannedAmount` definido
- Eventos distribuídos por: DRAFT(2), PLANNING(1), CONFIRMED(1), ONGOING(1), COMPLETED(1), CANCELLED(1)

## Validação final

```sql
-- user preserved
SELECT email, status, id, "roleId" FROM "user" WHERE email='amilton.seed@muxima.test';

-- counts
SELECT COUNT(DISTINCT e.id) AS events,
       COUNT(DISTINCT em.id) AS memberships,
       COUNT(DISTINCT b.id) AS budgets
FROM event e
JOIN event_member em ON em."eventId"=e.id AND em."userId"='usr_seed_01'
JOIN budget b ON b."eventId"=e.id
WHERE e."ownerId"='usr_seed_01';

-- distribution
SELECT e.status, COUNT(*) FROM event e WHERE e."ownerId"='usr_seed_01' GROUP BY e.status ORDER BY e.status;
```

Resultados:
- users: 1 (amilton.seed@muxima.test, ACTIVE)
- events: 7
- memberships: 7 (todas OWNER ACTIVE)
- budgets: 7
- distribuição por estado: DRAFT(2), PLANNING(1), CONFIRMED(1), ONGOING(1), COMPLETED(1), CANCELLED(1)

## Notas
- Senha não foi alterada
- Conta seed não foi eliminada
- Apenas utilizador seed mantido; restantes removidos
- Integridade FK preservada
