# Auditoria dos Stats Cards — Muxima Web

Auditoria global de apresentação de métricas, feita sobre a biblioteca
reutilizável em `src/shared/components/metrics/` (ver `metrics.md`).

Regra aplicada: **discernimento > cobertura**. Um card novo só entra onde
elimina duplicação, melhora a leitura da métrica, cria consistência entre
módulos, evidencia progresso/capacidade ou reduz markup. Charts, tabelas e
cards que já comunicam bem ficaram como estão.

---

## 1. Âmbito auditado

- Dashboard global (`_private/_dashboard`)
- Event Overview (`events/$eventId` + `event-stats/*` + `event-charts/*` + `analytics/*`)
- Guests (lista, analytics, capacity alert)
- Tables (lista, analytics dialog, view dialog)
- Inventory (stats, analytics)
- Checklist
- food-plan
- Tasks (kanban + analytics)
- Budget (stats, available card, analytics completo)
- Suppliers (stats, details dialog)
- Invitations (stats)
- Schedule, Dedications, Documents, Members, Events index (varridos)

Não foram encontradas métricas relevantes em schedule, dedications, documents
ou members (são listas/CRUD, não dashboards).

---

## 2. Mapeamento de oportunidades

| Local | Situação atual | Problema | Componente recomendado | Motivo | Prioridade |
| --- | --- | --- | --- | --- | --- |
| Dashboard global | `getGlobalStats` (events, guests, invitations, suppliers, members) era **buscada mas nunca renderizada**; a página prometia "Resumo geral da plataforma" sem o mostrar | Informação disponível do backend desperdiçada; página sem hierarquia | `StatsGrid` + `MetricCard` | Responde à pergunta "como está a minha plataforma?" num relance; dados já existem na API | **Alta** |
| Checklist | Card "Progresso" (% como texto) **e** um Card extra com "Conclusão do checklist" + `Progress` — a mesma métrica duas vezes, uma por baixo da outra | Duplicação direta da mesma métrica | `MetricProgressCard` (no grid) | Uma só representação, com valor/limite/%/barra; menos um Card na página | **Alta** |
| food-plan | Card "Progresso" (% texto) **e** Card de conclusão com o mesmo % + `Progress`; o card "Fornecedor" do grid repetia o Card standalone de catering | Duplicação de progresso e de fornecedor | `MetricProgressCard`; Card de catering só como CTA quando `!hasSupplier` | Mesmo raciocínio do checklist; o CTA mantém a ação visível sem duplicar o nome | **Alta** |
| Inventory stats | "Qtd. planeada" e "Qtd. concluída" como cards separados, com a planeada repetida na description "de N" | Relação adquirido/planeado implícita; valor duplicado | `MetricProgressCard` (`totalCurrent` / `totalQuantity`) | "320 / 400" + barra é leitura direta; 1 card a menos no grid | **Média** |
| Suppliers stats | Overdue destacado com `<span className="text-destructive">` hard-coded | Sem consistência com a biblioteca | `MetricCard` (value ReactNode) | Removida a indireção `StatsCard`; destaque preservado | **Média** |
| Event Overview — budget-stats-card | StatRows + `Progress` de utilização + mini chart | — | — (mantido) | Já funciona; gravação do `StatRow` já consolidada | Baixa |
| Event Overview — guests-stats-card, pending-tasks-card | Componentes **sem nenhum import** em todo o app | Dead code | — | Removidos | **Alta** (limpeza) |
| Event Charts — budget-summary-chart + chart-stat-item + use-budget-chart | Consumidos pelo `event-charts/index.tsx` mas **nunca renderizados** (o index só usa `GuestCapacityChart`) e chamavam um endpoint que ninguém vê | Dead code + request de rede inútil | — | Removidos | **Alta** (limpeza) |
| Guests stats / analytics | Cards simples + radar + barras manuais com aria | — | — (mantido) | Radar comunica melhor; a taxa por tipo já tem barra acessível | Baixa |
| Tables | StatsGrid + tabela + pie no dialog | — | — (mantido) | A tabela resolve; pie comunica ocupação | Baixa |
| Budget | `BudgetStats` + `BudgetAvailableCard` + 8 charts | — | — (mantido) | Read-model de charts já coerente; substituir seria decoração | Baixa |
| Tasks analytics | "Resumo" com 4 mini-cards manuais (`border p-3`) | Padrão visual próprio, fora do design system | `MetricCard`/`StatsGrid` (futuro) | Só estética marginal — não aplicado nesta ronda | Baixa |
| Supplier details dialog | `Progress` de pagamento inline num dialog | — | — (mantido) | Dialog, não dashboard; trocar acrescentaria ruído | Baixa |

---

## 3. Alterações aplicadas

1. **`_private/_dashboard/index.tsx`** — nova secção de resumo com
   `StatsGrid columns={4}` + `MetricCard` (Eventos, Convidados, Convites,
   Fornecedores) a consumir `dashboard.getGlobalStats` (query já existente;
   nenhum endpoint novo).
2. **`checklist/index.tsx`** — card "Progresso" → `MetricProgressCard`
   (`completed` / `total`, `%` do backend); removido o Card duplicado de
   "Conclusão do checklist".
3. **`food-plan/index.tsx`** — card "Progresso" → `MetricProgressCard`; o Card
   de conclusão passou a ser apenas o CTA "Associar fornecedor", renderizado
   só quando `!stats.hasSupplier` (o nome do catering já vive no grid).
4. **`inventory/-components/inventory-stats.tsx`** — "Qtd. planeada" + "Qtd.
   concluída" fundidos num `MetricProgressCard` (320 / 400); "Progresso" →
   `MetricProgressCard`.
5. **`suppliers/-components/supplier-stats.tsx`** — migrado de `StatsCard`
   (fachada) para `MetricCard`; overdue com destaque preservado.
6. **Remoção de dead code** (verificados com grep antes de apagar):
   `event-stats/guests-stats-card.tsx`, `event-stats/pending-tasks-card.tsx`,
   `event-charts/budget-summary-chart.tsx`, `event-charts/chart-stat-item.tsx`,
   `-queries/use-budget-chart.ts` (+ import limpo em `event-charts/index.tsx`).

## 4. Preservado deliberadamente

- **Budget analytics** completo (`budget-overview-ring`, `budget-payment-gauge`,
  source/category/payment-status charts, monthly spend, overdue table,
  top-pending chart) — análise, não resumo.
- **`tasks-stats-card`** (BarChart) e **`guest-capacity-chart`** (Pie) — os
  charts comunicam melhor a distribuição.
- **`event-preparation-analytics`** — funnel + pie de ocupação; os mini-totais
  por baixo do pie são contexto do chart.
- **Guests/Tables/Invitations/Checklist grids** em `StatsGrid` + `StatsCard` —
  já consistentes; trocar `StatsCard` por `MetricCard` seria cosmético.
- **`budget-available-card`** e `supplier-details-dialog` — `Progress` inline
  com contexto próprio (mensagem de over-budget, status de pagamento).
- **Regra mantida:** nenhuma estatística calculada no frontend; todos os
  números vêm dos endpoints de stats que já existiam.

## 5. Validação

- `pnpm --filter web check-types` ✓ (build + `tsc --noEmit` limpos)
- `pnpm --filter web test:run` ✓ — 193 testes / 16 ficheiros
  (teste `inventory-stats` atualizado ao novo arranjo: "/ 400")
- `biome check` ✓ nos ficheiros tocados
- Review de UX: dashboard com hierarquia resumo→lista; checklist e food-plan
  sem métricas repetidas; nenhum módulo com excesso de cards.
