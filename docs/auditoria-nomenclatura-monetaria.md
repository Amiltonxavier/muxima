# Auditoria de Nomenclatura Monetária — Onde o dinheiro é tratado por “Valor/Valores”

**Data:** 2026-10-15
**Âmbito:** todos os pontos do monorepo Muxima onde um montante de dinheiro é
armazenado, calculado, transportado ou apresentado — e com que **palavra**
(`Valor`, `Valores`, `Montante`, `Preço`, `Custo`, `Orçamento`) é nomeado.
**Pergunta que responde:** *“onde no sistema o dinheiro é tratado por
Valor ou Valores?”*

**Níveis de conclusão:** VERIFICADO · PARCIAL · NÃO VERIFICADO

---

## 1. Resumo executivo

1. **O armazenamento e a aritmética nunca usam “Valor/Valores”.** As colunas do
   Postgres, os tipos Prisma e os DTOs da API usam **inglês** (`amount`, `price`,
   `plannedAmount`, `reserveAmount`, `unitPrice`, `totalCost`, `currency`) e um
   único tipo por camada: `Decimal` na base de dados → **cêntimos inteiros** na
   aritmética → `number` (unidades maiores) no fio. Fonte de verdade:
   `packages/api/src/shared/finance/money.ts`.
2. **“Valor/Valores” existe apenas como texto** — rótulos de UI, cabeçalhos de
   relatório, comentários e mensagens de validação. Não há nenhum
   campo/coluna/identificador de domínio chamado `valor`.
3. **Não há vocabulário único.** O mesmo conceito (“montante acordado de um
   fornecedor”) é chamado **“Valor acordado”** nos relatórios mas **“Montante
   acordado”** no ecrã de fornecedores; os totais de inventário são **“Valor
   total/concluído/pendente”** nas *stats* mas **“Montante total/concluído/
   pendente”** nos detalhes; o custo de movimento é **“Custo total”**.
4. **“Valor/Valores” domina no budget, inventário e exportações; “Montante”
   domina nos fornecedores; “Preço” é o preço unitário; “Custo” é o custo de
   movimentos/consumo; “Orçamento” é o alvo de planeamento.** Ver §5–§6.

> **Conclusão:** o dinheiro está tecnicamente correto (inteiros, sem *drift*),
> mas **semântica e lexicalmente fragmentado** na camada de apresentação.
> “Valor/Valores” é o termo mais frequente — aparecia 71× no código de
> aplicação (fora de testes) — mas partilha os ecrãs com “Montante” (48×).

---

## 2. Fonte de verdade técnica

| Ficheiro | Papel |
| --- | --- |
| `packages/api/src/shared/finance/money.ts:11` | `CENTS_PER_UNIT = 100` |
| `packages/api/src/shared/finance/money.ts:17` | `toCents(Decimal\|number\|null)` → cêntimos inteiros |
| `packages/api/src/shared/finance/money.ts:31` | `fromCents(cents)` → `Prisma.Decimal` (2 casas) |
| `packages/api/src/shared/finance/money.ts:36` | `centsToUnits(cents)` → `number` para o cliente |
| `packages/api/src/shared/finance/money.ts:41` | `formatCents(cents)` → string `"150000.50"` |
| `packages/api/src/shared/finance/supplier-money.ts` | Regras puras de dinheiro/estado de pagamento (em cêntimos) |
| `packages/api/src/shared/finance/supplier-rules.ts` | Guardas de integridade (soma ≤ acordado), com mensagens em “montante” |
| `packages/api/src/modules/budget/breakdown.ts:16` | “All amounts are integer cents throughout.” |
| `packages/db/prisma/schema/schema.prisma:335` | `Event.currency String @default("AOA")` |
| `apps/web/src/utils/format-currency.ts` | `formatCurrency`/`formatCurrencyCompact` → `pt-AO` + sufixo `Kz` |
| `packages/api/src/exports/...` | `formatMoney(value, currency)` nos relatórios |

Comentário canónico do modelo (`money.ts:3-9`):

> *“`Decimal` is the storage type; integer cents are the arithmetic type. All
> sums and comparisons happen in cents so no rounding error can accumulate, and
> the value crosses the wire to the client as a plain number.”*

**Nota:** `Event.currency` existe e é propagado aos relatórios
(`export-context.ts:53`, `reports/event.ts:148`), mas a UI formata sempre em
`Kz` (`format-currency.ts`) — ou seja, a moeda é, na prática, fixa (AOA).

---

## 3. Modelo de dados (Prisma) — nomes em **inglês**

| `model.field` | Tipo | Significado |
| --- | --- | --- |
| `Event.currency` | `String @default("AOA")` | Moeda do evento |
| `Budget.plannedAmount` | `Decimal @default(0)` | Alvo de planeamento (orçamento) |
| `Budget.reserveAmount` | `Decimal? @default(0)` | Reserva retida do alvo |
| `Supplier.price` | `Decimal?` | Montante acordado (nullable até fechar negociação) |
| `SupplierPayment.amount` | `Decimal` | Valor de um pagamento |
| `SupplierInstallment.amount` | `Decimal` | Valor de uma parcela |
| `SupplierPaymentStatus` | enum | `PENDING · PAID · INSTALLMENTS · OVERDUE · CANCELLED` |
| `InventoryItem.unitPrice` | `Decimal?` | Preço unitário |
| `InventoryMovement.unitPrice` | `Decimal?` | Preço unitário do movimento |
| `InventoryMovement.totalCost` | `Decimal?` | Custo total do movimento |
| `FoodPlanItem.quantity` | `Decimal` | Quantidade (não é dinheiro) |

Evidência: `packages/db/prisma/schema/schema.prisma:335, 495-496, 512, 553, 574,
825, 845-846`. Não existe qualquer coluna `valor`, `montante`, `preco` ou
`custo`.

> `Budget` não guarda totais: “*Every derived figure (totalBudget, totalSpent,
> totalPaid, totalPending, totalOverdue, breakdown, analytics) is computed by
> the API from Inventory + Suppliers; nothing is stored here*”
> (`schema.prisma:489-492`).

---

## 4. Contrato da API (DTOs) — nomes em **inglês**

| Campo | Unidade | Origem |
| --- | --- | --- |
| `Budget.plannedAmount`, `reserveAmount` | unidades maiores (`number`) | `routers/budget.ts:41-42` |
| `Budget` totals: `totalBudget`, `reserve`, `planned`, `spent`, `paid`, `pending`, `overdue`, `remaining` | cêntimos **internos**; expostos conforme endpoint | `modules/budget/breakdown.ts:153-182` |
| Linhas de budget: `planned`, `paid`, `pending` | unidades maiores | `routers/budget.ts:74-78` |
| `Supplier.price`, `total`, `paid`, `pending`, `percentage` | unidades maiores | `routers/suppliers.ts:238-248` (`projectSupplier`) |
| `SupplierPayment.amount`, `SupplierInstallment.amount` | unidades maiores | `routers/suppliers.ts:224-228` |
| Inventário: `unitPrice`, `totalValue`, `completedValue`, `pendingValue` | unidades maiores | `modules/inventory/service.ts:73-84, 129-149` |
| Inventário: `unitPrice`, `totalCost` (movimentos) | unidades maiores | `modules/inventory/service.ts:162-178` |

Tipos públicos: `packages/api/src/shared/types/entities.ts:248-249`
(`Budget`), `:261` (`Supplier.price`), `:286-296` (`SupplierMoney`),
`:654/679-682/695-696/733-735` (inventário), `:1039` (`budgetAmount`).

**Validação de entrada (zod):** o dinheiro entra como número ≥ 0 em unidades
maiores e é convertido para cêntimos com `Math.round(v * 100)`:
`routers/budget.ts:32` e `routers/suppliers.ts:117`.

---

## 5. Onde o dinheiro é tratado por **“Valor/Valores”**

### 5.1 API (`packages/api/src`)

| Local | Texto exato | Nota |
| --- | --- | --- |
| `routers/budget.ts:32` | `"Valor inválido"` | mensagem do `moneyInput` (refine) |
| `routers/budget.ts:122` | `"A reserva não pode ultrapassar o valor planeado."` | erro de negócio |
| `routers/budget.ts:220` | `só os valores efectivamente pagos` | comentário |
| `modules/budget/paid-expenses.ts:8` | `... o inventário adquirido entra pelo seu valor gasto` | comentário |
| `modules/budget/paid-expenses.ts:10` | `Valores pendentes,` | comentário |
| `shared/utils/validate-enum.ts:23` | `"Valor inválido."` | erro de validação |
| `shared/errors/map-error.ts:70` | `"Valor inválido."` | mapeamento de erro |
| `shared/errors/map-error.ts:77,84,91,98,106` | `"O valor é demasiado curto/pequeno/longo/grande"` / `"O valor não respeita o intervalo permitido."` | mensagens zod |
| `shared/errors/map-error.ts:114` | `` `Valor inválido (campo ${index + 1}).` `` | erro composto |
| `exports/reports/event.ts:481` | `label: "Valor total"` | relatório de evento |
| `exports/reports/event.ts:485` | `label: "Valor pendente"` | relatório de evento |
| `exports/reports/inventory.ts:82` | `label: "Valor total"` | relatório de inventário |
| `exports/reports/inventory.ts:86` | `label: "Valor pendente"` | relatório de inventário |
| `exports/reports/rows/inventory.ts:52` | `header: "Valor total"` (key `totalValue`) | PDF/XLSX |
| `exports/reports/rows/suppliers.ts:26` | `header: "Valor acordado"` (key `price`) | PDF/XLSX |
| `exports/reports/suppliers.ts:28` | `header: "Valor"` (key `amount`) | pagamentos |
| `exports/reports/suppliers.ts:44` | `header: "Valor"` (key `amount`) | parcelas |

### 5.2 Web (`apps/web/src`)

| Local | Texto exato | Nota |
| --- | --- | --- |
| `utils/supplier-schemas.ts:63` | `"O valor não pode ser negativo"` | validação do preço |
| `utils/supplier-schemas.ts:77,87` | `"O valor deve ser maior que zero"` | pagamento/parcela |
| `shared/errors/parse-api-error.ts:157` | `"Valor inválido."` | espelho de `map-error` |
| `events/$eventId/-components/event-stats/budget-stats-card.tsx:87` | `label: "Valor"` | legenda do donut de budget |
| `events/$eventId/budget/-components/budget-target-dialog.tsx:56` | `O valor total planeado para o evento.` | descrição |
| `events/$eventId/budget/-components/budget-target-dialog.tsx:125` | `Valor planeado (Kz)` | label do alvo |
| `events/$eventId/budget/-components/budget-lines-table.tsx:46` | `"Ainda não existem itens com valores no inventário ou nos fornecedores."` | estado vazio |
| `events/$eventId/inventory/-components/inventory-stats.tsx:38` | `title="Valor total"` | stat |
| `events/$eventId/inventory/-components/inventory-stats.tsx:46` | `title="Valor concluído"` | stat |
| `events/$eventId/inventory/-components/inventory-stats.tsx:54` | `title="Valor pendente"` | stat |
| `events/$eventId/inventory/-components/inventory-details-dialog.tsx:183` | `<h3>Valores</h3>` | secção dos detalhes |
| `events/$eventId/food-plan/-components/food-plan-header.tsx:30` | `Os valores monetários ficam no...` | descrição |
| `events/$eventId/food-plan/-components/food-plan-item-dialog.tsx:118` | `...o valor do catering fica no fornecedor...` | descrição |

### 5.3 Falsos positivos (NÃO são dinheiro)

“Valor/valor” genérico (`value`) em utilitários e componentes agnósticos — não
documentam dinheiro e devem ser ignorados numa normalização de vocabulário:
`shared/utils/date-helper.ts:362`; `shared/utils/number/aggregates.ts:2,16`;
`shared/utils/number/to-fixed-safe.ts:4`; `packages/ui/src/components/select.tsx:20,173`;
`shared/components/metrics/{metric-card,metric-progress-card,metric-radial-card,metric-status-list,segmented-progress}.tsx`
(passam a chamar-se `valor` porque servem qualquer métrica, incluindo dinheiro).

---

## 6. O mesmo conceito, outros vocábulos

### 6.1 “Montante” — 48× (domina nos fornecedores)

| Local | Texto |
| --- | --- |
| `routers/suppliers.ts:117` | `"Montante inválido"` (mensagem do `moneyInput`) |
| `shared/finance/supplier-rules.ts:38,101` | `"Defina primeiro o montante acordado do fornecedor."` |
| `shared/finance/supplier-rules.ts:54` | `"O montante pago tem de ser maior que zero."` |
| `shared/finance/supplier-rules.ts:61` | `"A soma dos pagamentos excede o montante acordado..."` |
| `shared/finance/supplier-rules.ts:94` | `"A parcela N tem de ter um montante maior que zero."` |
| `shared/finance/supplier-rules.ts:108` | `"A soma das parcelas (...) excede o montante acordado (...)"` |
| `suppliers/-components/supplier-table.tsx:68` | `Montante acordado` (cabeçalho) |
| `suppliers/-components/supplier-table.tsx:69` | `Montante em falta` (cabeçalho) |
| `suppliers/-components/supplier-details-dialog.tsx:78` | `Montante acordado` |
| `suppliers/-components/supplier-form.tsx:434` | `Montante acordado (Kz)` |
| `suppliers/-components/supplier-form.tsx:496` | `Montante pago (Kz)` |
| `suppliers/-components/supplier-payment-dialog.tsx:101` | `` `Montante em falta: ...` `` |
| `inventory/-components/inventory-details-dialog.tsx:200-220` | `Montante total / concluído / pendente` |
| `inventory/-components/inventory-table.tsx:67` | `Montante` (cabeçalho) |

### 6.2 “Preço” — preço unitário

- `inventory/-components/inventory-create-dialog.tsx:204`, `-edit-dialog.tsx:196`,
  `-add-quantity-dialog.tsx:122` → `Preço unitário (Kz)`
- `inventory/-components/inventory-details-dialog.tsx:191` → `Preço unitário`
- `exports/reports/rows/inventory.ts:51` → `header: "Preço unitário"` (key `unitPrice`)

### 6.3 “Custo” — custo de consumo/movimento

- `inventory/-components/inventory-history-dialog.tsx:90` → `Custo total`
- `inventory/-components/inventory-costliest-chart.tsx:74` → `label: "Custo total"`,
  `:51` → `emptyMessage="Ainda não há itens com custo definido."`
- Domínio: `InventoryMovement.totalCost` (`schema.prisma:846`),
  `computeMovementCost` (`modules/inventory/service.ts:95`).

### 6.4 “Orçamento” — alvo de planeamento

- `create-event-dialog.tsx:342` → `Orçamento (Kz)` mapeia para o input
  `budgetAmount` (`events.types.ts:40`), que o servidor grava em
  `Budget.plannedAmount` (`routers/events.ts:359-363`).
- Na página de budget, o mesmo campo é `Valor planeado (Kz)`
  (`budget-target-dialog.tsx:125`).

### 6.5 “Gasto/Em atraso/Disponível/Reserva”

Colunas/labels de relatório derivadas de `spent`/`overdue`/`available`/`reserve`:
`exports/reports/event.ts:263-266, 395-405`. Não é uma inconsistência lexical,
mas confirma que o vocabulário de apresentação é escolhido caso a caso.

---

## 7. Inconsistências detetadas

| # | Inconsistência | Evidência |
| --- | --- | --- |
| 1 | **Valor vs Montante** para o mesmo conceito (montante acordado do fornecedor / total de inventário) | Relatório `reports/rows/suppliers.ts:26` “Valor acordado” ⇔ UI `supplier-form.tsx:434` “Montante acordado”; `inventory-stats.tsx:38` “Valor total” ⇔ `inventory-details-dialog.tsx:200` “Montante total” |
| 2 | **Três palavras para os totais de inventário** (Valor / Montante / Custo) no mesmo conjunto de números (`totalValue`/`completedValue`/`pendingValue`) | `inventory-stats.tsx:38-54` vs `inventory-details-dialog.tsx:200-220` vs `inventory-history-dialog.tsx:90` |
| 3 | **Mensagens de erro divergentes** para o mesmo validador de dinheiro | `routers/budget.ts:32` `"Valor inválido"` ⇔ `routers/suppliers.ts:117` `"Montante inválido"` |
| 4 | **“Orçamento” vs “Valor planeado”** para o mesmo campo | `create-event-dialog.tsx:342` ⇔ `budget-target-dialog.tsx:125` (ambos → `Budget.plannedAmount`) |
| 5 | **“Valor” (nome) vs coluna “Montante/Pago/Pendente”** na tabela de inventário | `inventory-table.tsx:67` |
| 6 | **`totalValue`/`completedValue`/`pendingValue` (DTO, “value”)** convivem com `Customer`… `totalCost` e `plannedAmount` (nomes diferentes para “total”) | `modules/inventory/service.ts:73-84` |
| 7 | **“Pago/Pendente” como nomes de estado e como rótulos de coluna** | `suppliers/.../supplier-table-row.tsx` e cabeçalhos de budget `budget-lines-table.tsx:60-61` |

---

## 8. Glossário recomendado (proposta)

Para eliminar a fragmentação, fixar **um** termo por conceito na UI (o
armazenamento permanece em inglês):

| Conceito | Termo canónico | Evitar |
| --- | --- | --- |
| Quantia genérica de dinheiro | **Valor** | quantia |
| Montante combinado com um fornecedor | **Valor acordado** | “Montante acordado” |
| Já liquidado | **Valor pago** | “Montante pago” |
| Por liquidar | **Valor pendente** | “Montante em falta”, “Montante pendente” |
| Preço por unidade | **Preço unitário** | — |
| Custo de um movimento/consumo | **Custo** | “Valor” |
| Total de uma linha de inventário | **Valor total** | “Montante total”, “Custo total” |
| Alvo de planeamento | **Orçamento** ou **Valor planeado** (escolher um) | usar ambos |
| Total do evento | **Valor total** | — |

> Recomendação mínima: escolher **“Valor/Valores”** como termo padrão para o
> dinheiro (já é o mais frequente, 71×), reservando **“Preço”** para preço
> unitário e **“Custo”** para custo de movimento; **substituir as ~48
> ocorrências de “Montante”** por “Valor”.

---

## 9. Como verificar (comandos)

```bash
# Onde o dinheiro é guardado (Prisma)
grep -nE "amount|price|cost|plannedAmount|reserveAmount|unitPrice|totalCost|currency" \
  packages/db/prisma/schema/schema.prisma

# Onde aparece "Valor/Valores" no código de aplicação (fora de testes)
grep -rniE "\bvalor(es)?\b" apps/web/src packages/api/src \
  --include="*.ts" --include="*.tsx" | grep -viE "\.test\.|__tests__"

# Onde aparece "Montante"
grep -rniE "montante" apps/web/src packages/api/src \
  --include="*.ts" --include="*.tsx" | grep -viE "\.test\.|__tests__"

# A fronteira do dinheiro
sed -n '1,43p' packages/api/src/shared/finance/money.ts
```

---

## Anexo — Mapa rápido por módulo

| Módulo | Palavra dominante | Campos/DTOs (inglês) |
| --- | --- | --- |
| Budget | **Valor** (“Valor planeado”, “Valor”) | `plannedAmount`, `reserveAmount`, `totalBudget/spent/pending/overdue` |
| Fornecedores | **Montante** | `price`, `amount`, `paid`, `pending`, `total` |
| Inventário | **Valor** (stats) + **Montante** (detalhes/tabela) + **Custo** (movimentos) | `unitPrice`, `totalValue`, `completedValue`, `pendingValue`, `totalCost` |
| Food plan | **Valor** (“valores monetários”, “valor do catering”) | *(sem dinheiro próprio — vive no `Supplier`)* |
| Exportações | **Valor** | `amount`, `price`, `totalValue` |
| Evento (criação) | **Orçamento** | `budgetAmount` → `Budget.plannedAmount` |
