# Opções para a Página de Dashboard (`/`) — Métricas, Dados e Funcionalidades

**Data:** 2026-10-15
**Âmbito:** conceção da página inicial da aplicação — o que o utilizador vê
imediatamente após autenticar-se (`apps/web/src/routes/_private/_dashboard/index.tsx`,
montada no caminho `/`). Este documento **não altera nenhum ficheiro de produção**;
é um catálogo de possibilidades, dados disponíveis e uma decisão estrutural.
**Pergunta que responde:** *"o que posso colocar nesta página (métricas, dados,
funcionalidades), e devo eliminar a página de Eventos e trazer tudo para o
dashboard?"*

**Níveis de evidência:** VERIFICADO (confirmado no código) · PARCIAL · PROPOSTA
(não implementado) · NÃO VERIFICADO.

---

## 1. Resumo executivo

1. A página de dashboard **existe e está ligada** (`/` → `_dashboard/index.tsx`),
   mas **renderiza apenas uma saudação** — "Bom dia, {nome}" e a linha "Resumo
   geral da plataforma" (`index.tsx:55-65`). Não mostra um único número.
2. O ficheiro **já busca os dados globais** via `orpc.dashboard.getGlobalStats`
   (`index.tsx:35-38`) e **importa** `MetricCard`, `StatsGrid`, `QueryState`,
   `dateHelper`, `getStatusColor/Label`, ícones, `useEvents` e `Card`/`Button`/`Badge`
   (`index.tsx:1-20`) — ou seja, houve intenção de construir KPIs e uma lista de
   eventos, mas ficou por terminar. **Todos esses imports estão por usar**, o que
   hoje falha o lint.
3. O backend **já tem quase todo o "combustível"**: além do `getGlobalStats`
   (contagens), existe um agregador completo por evento — `getEventSummaryAnalytics`
   (`modules/dashboard/event-analytics.ts:116`) — que reúne convidados, mesas,
   orçamento, fornecedores, inventário, tarefas, checklist, alimentação, dedicatórias
   e contagem decrescente. **Esse agregador não está exposto por oRPC** (só numa rota
   REST e na camada de export/relatórios).
4. A página de **Eventos** (`/events`) já está **completa e madura** (listagem,
   filtros, paginação, criar/eliminar, aceitar/recusar convites). A "visão geral do
   evento" (`/events/$eventId`) também é rica (KPIs, gráficos, funil de preparação,
   calendário).
5. **Recomendação:** manter as duas páginas com papéis distintos — o Dashboard como
   **cockpit de conta** ("o que exige a minha atenção agora, em todos os eventos") e
   Eventos como **catálogo/gestão** — **sem** as fundir. A opção de fusão está
   analisada no §5 com o inventário de impacto.

---

## 2. Estado atual (VERIFICADO)

### 2.1 Dashboard

| Aspeto | Evidência |
| --- | --- |
| Rota `/`, componente `DashboardPage` | `apps/web/src/routes/_private/_dashboard/index.tsx:27-31` |
| Saudação (Bom dia/tarde/noite) | `index.tsx:52-61` |
| Único conteúdo visível | `index.tsx:55-65` (título + "Resumo geral da plataforma") |
| Busca métricas globais mas **não as mostra** | `index.tsx:35-38` |
| Imports por usar (≈15) → falha o lint | `index.tsx:1-20` |
| `EventCard` local **órfão** (ninguém o importa) | `_dashboard/-components/event-card.tsx` |

`orpc.dashboard.getGlobalStats` é a **única** chamada de dashboard usada na app
web hoje (`grep` confirma: só `_dashboard/index.tsx:37`).

### 2.2 Eventos (já feito)

- Listagem completa: `apps/web/src/routes/_private/events/index.tsx` (162 linhas) —
  filtros (busca, status, tipo), paginação, criar, eliminar, aceitar/recusar convites.
- Visão geral do evento: `apps/web/src/routes/_private/events/$eventId/index.tsx`
  (100 linhas) compõe cabeçalho, grelha de informação, localização, **estatísticas**
  (orçamento, contagem decrescente, cronograma, fornecedores, tarefas), **gráficos**
  (capacidade de convidados), **análise de preparação** (funil) e **calendário**.
- Ver ~30 componentes em `events/$eventId/-components/`.

**Conclusão:** o dashboard **não deve replicar** o que a visão geral do evento já faz
bem. O valor do dashboard está no **agregado de conta** e na **triagem**.

### 2.3 Navegação global

`apps/web/src/shared/components/sidebar.tsx:140-...` (`globalNavGroups`):
Dashboard (`/`, l.144), Eventos (`/events`, l.148), Perfil (`/profile`),
Notificações (`/notifications`), Configurações (`/settings`).
O menu contextual de evento é outro (`eventNavGroups`, l.35).

---

## 3. Dados e métricas disponíveis (o "combustível")

### 3.1 Nível de conta (global) — pronto a usar

| Fonte | O que devolve | Estado |
| --- | --- | --- |
| `dashboard.getGlobalStats` | contagens de **eventos, convidados, convites, fornecedores, orçamentos, membros** — limitados a eventos onde o utilizador tem adesão `ACTIVE` (`routers/dashboard.ts:11-51`) | VERIFICADO, exposto, **por usar** |
| `notifications.list`, `getUnreadCount` | feed de notificações + contagem por ler (`routers/notifications.ts`) | VERIFICADO |
| `activityLogs.list` | registo de atividade (aciona feed de atividade) (`routers/activity-logs.ts:25`) | VERIFICADO |
| `events.list` | lista paginada; inclui `invitation` pendente por evento (usado na página Eventos) | VERIFICADO |
| `memberInvites.*` | convites de equipa pendentes (aceitar/recusar) | VERIFICADO |

> **Nota de âmbito:** `getGlobalStats` filtra por **adesão ativa**
> (`members.some.userId`, `routers/dashboard.ts:15-18`), não por `ownerId` — logo o
> "meu painel" inclui eventos em que sou PARTNER/ADMIN sem ter criado. Correto para
> um dashboard pessoal.

### 3.2 Nível de evento (agregadores já existentes)

- **Agregador completo:** `getEventSummaryAnalytics(client, eventId, userId)`
  (`packages/api/src/modules/dashboard/event-analytics.ts:116`) devolve:
  `event`, `countdown` (`computeCountdown`, l.79), `guests`, `invitations`, `tables`,
  `schedule`, `budget`, `suppliers`, `inventory`, `tasks`, `checklist`, `foodPlan`,
  `dedications`.
  - **Não exposto por oRPC.** Só serve a rota REST
    `/api/v1/events/:eventId/dashboard` (`modules/dashboard/routes.ts`) e a exportação
    (`exports/reports/event.ts:125`). Para o dashboard web usá-lo, é preciso
    **adicionar um procedimento oRPC** que o emita.
- **Analytics por módulo** (todos reutilizáveis, com muitos campos): `getGuestAnalytics`
  (total, confirmados, pendentes, por tipo/estado, taxa de confirmação, capacidade),
  `getTableAnalytics` (ocupação, mesas cheias/parciais/vazias), `getTaskAnalytics` /
  `getScheduleAnalytics`, `getBudgetAnalytics`, `supplierAnalytics`,
  `inventoryAnalytics`, `checklistAnalytics`, `foodPlanAnalytics`,
  `dedicationAnalytics` (privado do utilizador), `invitationAnalytics`.
  Reexportados em `packages/api/src/exports/index.ts`.
- **Gráficos por evento já expostos:** `dashboard.getGuestChart`
  (`routers/dashboard.ts:53`, usado em
  `events/$eventId/-queries/use-guest-chart.ts:8`) e `dashboard.getBudgetChart`
  (`routers/dashboard.ts:91`, **sem uso na web**).

### 3.3 Infra de apresentação (já existe, não é preciso inventar)

- **Biblioteca de métricas** (`apps/web/src/shared/components/metrics/index.ts`):
  `MetricCard`, `MetricProgressCard`, `MetricBreakdownCard`, `MetricRadialCard`,
  `MetricStatusList`, `StatsGrid`, `SegmentedProgress`, `RadialProgress`.
- **Gráficos:** `recharts` (`apps/web/package.json`).
- **kibo-ui:** `calendar`, `gantt`, `kanban`, `list` (`packages/ui/src/components/kibo-ui/`).
- **Exportação:** motor PDF/XLSX (`packages/api/src/exports/`) — base para ações
  "Exportar" no dashboard.
- **Estados:** `QueryState` (`apps/web/src/shared/components/states`), `Spinner`
  (`@muxima/ui/components/spinner`) — para loading/erro/vazio.

---

## 4. Catálogo de possibilidades

Cada bloco diz **o que é**, **de onde vêm os dados** e **esforço/valor**
(esforço: S/M/L; valor: baixo/médio/alto). Ordenado por relação valor/esforço.

### A. Oblíquo — só precisa de ligar o que já existe (esforço S, valor alto)

1. **KPIs de conta (4–6 cartões).** `StatsGrid` + `MetricCard` com os 6 números de
   `getGlobalStats`: Eventos, Convidados, Convites, Fornecedores, Orçamentos, Membros.
   *Está a um `map` de distância.*
   **Fontes:** `routers/dashboard.ts:11`; componentes em `shared/components/metrics`.
2. **Cabeçalho pessoal + ações rápidas.** Manter a saudação e acrescentar botões
   "Criar evento" (abre `CreateEventDialog`, que já existe em `events/-components/`)
   e "Ver todos os eventos".
3. **Estado vazio (onboarding).** Se `events === 0`, mostrar convite a criar o primeiro
   evento em vez de zeros. **Fonte:** `getGlobalStats.events`.

### B. Triagem — "o que exige a minha atenção" (esforço M, valor alto)

4. **Convites de equipa pendentes.** Lista com aceitar/recusar — a lógica já existe na
   página Eventos (`events/index.tsx` handlers) e pode ser reutilizada.
   **Fonte:** `events.list` (campo `invitation`) / `memberInvites`.
5. **Próximos eventos.** Cartões dos eventos mais próximos da data, com **contagem
   decrescente** (`dateHelper`, `event-card.tsx` já tem o esqueleto, hoje órfão).
   **Fonte:** `events.list` (ordenar por `eventDate`); `computeCountdown` no servidor.
6. **Notificações por ler.** Badge + resumo; liga a `/notifications`.
   **Fonte:** `notifications.getUnreadCount`, `notifications.list`.
7. **Feed de atividade recente.** Últimas N ações nos meus eventos.
   **Fonte:** `activityLogs.list` (verificar filtragem por utilizador/`ACTIVE`).

### C. Vírgula de gestão — progresso por evento (esforço M/L, valor alto)

8. **Cartões de "saúde" por evento.** Para cada evento ativo: barra de progresso de
   tarefas, taxa de confirmação de convidados, % de orçamento usado. Requer
   **endpoint agregado de conta** (ver §6) que some por evento — hoje só existe o
   agregado por evento.
   **Fonte:** `getEventSummaryAnalytics` por evento (N chamadas) ou novo agregador.
9. **Tarefas e checklist em atraso (agregado).** "12 tarefas por fazer, 3 em atraso
   em 2 eventos". `getTaskAnalytics` devolve `byStatus` e atrasos, mas **por evento**.
10. **Financeiro agregado.** Orçamento total planeado/gasto/pendente de todos os meus
    eventos. `getBudgetAnalytics` é por evento; para o total é preciso somar
    (cuidar de moedas diferentes — `currency` por evento).

### D. Análise/gráficos globais (esforço M, valor médio)

11. **Distribuição de eventos por mês** (linha/barra) — próximos 12 meses.
12. **Eventos por tipo** (Casamento/Noivado) e **por estado** (Rascunho/Planeado/...)
    — `getStatusLabel/Color` já existem (`utils/status-helpers`).
13. **Convidados confirmados vs. capacidade** — agregado (hoje existe por evento em
    `getGuestChart`).
14. **Orçamento por categoria** (agregado) — `budgetAnalytics.byCategory`.

### E. Extras (esforço S/M, valor baixo/médio)

15. **Atalhos** para secções transversais (Perfil, Configurações, Notificações).
16. **Cartão de perfil/equipa** (quem sou, papel, eventos partilhados).
17. **Exportar resumo** (PDF/XLSX) dos meus eventos — reutiliza o motor de export.

### F. O que **evitar** no dashboard

- Duplicar o **funil de preparação** e os gráficos da visão geral do evento
  (`events/$eventId/-components/analytics/`, `event-charts/`) — pertencem ao contexto
  de **um** evento.
- Reimplementar listagens de convidados/tarefas/fornecedores — isso é trabalho das
  páginas dedicadas; o dashboard deve **ligar**, não substituir.

---

## 5. Decisão estrutural: manter Eventos separado, ou fundir no Dashboard?

### Modelo 1 — Dashboard de conta + página Eventos separada (**atual, recomendado**)

- **Prós:** papéis claros (cockpit vs. catálogo); não há regressão de rotas/links;
  aproveita a página Eventos já madura; o dashboard pode evoluir só com agregados.
- **Contras:** dois pontos de entrada; risco de informação redundante se o dashboard
  crescer demasiado.

### Modelo 2 — Fundir: o Dashboard passa a ser a lista de eventos + KPIs

- **Prós:** uma única página; menos duplicação aparente.
- **Contras / impacto real:** a lista de eventos tem filtros, paginação, aceitação de
  convites (com `onAccept`/`onDecline`) e diálogos de criar/eliminar — misturá-la com
  KPIs torna a página pesada. (Nota: o bloqueio por estado de evento — `useEventLock` —
  vive nas sub-páginas do evento, p. ex. fornecedores e alimentação, e não nesta
  listagem.) A rota `/events` continua a ser necessária para links profundos e para o
  `beforeLoad` do layout de evento.
- **Inventário de impacto da remoção de `/events`** (VERIFICADO por `grep`):
  - Navegação: `sidebar.tsx:148` (item "Eventos"), `sidebar.tsx:249` ("Trocar evento"),
    `header.tsx:9` (breadcrumb "Events"), `403/index.tsx:30` (botão "voltar aos eventos").
  - Rotas/redirecionamentos: `apps/web/src/routeTree.gen.ts` (gerado), redirecionamentos
    pós-login e de perfil (ver `utils/__tests__/auth-redirect.test.ts`).
  - Profundidade: `events/$eventId/**` depende de `/events` como raiz de navegação
    (breadcrumbs, "voltar"). Removê-la obriga a redesenhar a árvore e o
    `globalNavGroups`.
  - Testes: `events/-components/__tests__/event-card.test.tsx`,
    `auth-redirect.test.ts`.

### Modelo 3 — Híbrido por perfil

- O `/` é o Dashboard de conta; a página Eventos ganha **abas** ("Todos / Próximos /
  Convites"). Não funde rotas; apenas organiza.

**Recomendação:** **Modelo 1**, com o Modelo 3 como evolução da página Eventos. O
dashboard ganha valor ao mostrar **sinais transversais** (convites, próximos eventos,
notificações, progresso), não ao repetir a lista de eventos.

---

## 6. Proposta faseada

### Fase 0 — Arrumar o que está (esforço S)

- Remover os **imports por usar** de `_dashboard/index.tsx` (falha o lint hoje) e
  decidir o destino do `_dashboard/-components/event-card.tsx` (usar ou apagar).

### Fase 1 — MVP do dashboard (esforço S/M, apenas dados já expostos)

- KPIs de conta (§4.A.1), cabeçalho + ações rápidas (§4.A.2), estado vazio (§4.A.3),
  próximos eventos/contagem decrescente (§4.B.5), convites pendentes (§4.B.4),
  notificações por ler (§4.B.6).
- **Nenhum endpoint novo** necessário (exceto, no máximo, ordenação por data em
  `events.list` — verificar se já aceita).

### Fase 2 — Progresso e atividade (esforço M)

- Feed de atividade (§4.B.7), cartões de saúde por evento e/ou tarefas agregadas
  (§4.C.8–9). Introduzir **um endpoint agregado de conta** (proposta abaixo).

### Fase 3 — Análise global (esforço M/L)

- Gráficos globais (§4.D.11–14) e financeiro agregado (§4.C.10), com atenção a
  moedas por evento.

### Endpoint agregado proposto (Fase 2+) — PROPOSTA

Novo procedimento, p. ex. `dashboard.getAccountOverview`, que corre em paralelo (como
`getEventSummaryAnalytics` faz por evento) e devolve, por evento com adesão `ACTIVE`:
contagem/estado, próximo marco, % de tarefas, % de orçamento e taxa de confirmação —
mais os totais de conta. Deve **reutilizar** os analytics por módulo, nunca
recalcular números (princípio já documentado em `event-analytics.ts` e
`dashboard/service.ts`).

---

## 7. Riscos, permissões e notas

- **RBAC:** `DASHBOARD_READ` existe no catálogo (`packages/permissions/src/catalogue.ts`)
  e é usado pelo agregador. `getGlobalStats` é `protectedProcedure` (sessão basta). Se
  o dashboard passar a expor dados por evento, deve continuar a verificar
  `requireEventPermission(..., DASHBOARD_READ)` como `getGuestChart`/`getBudgetChart`.
- **Privacidade:** `dedicationAnalytics` é sempre relativa ao **requerente**
  (`event-analytics.ts:110-113`) — não criar agregados de dedicatórias que atravessem
  utilizadores.
- **Moeda:** `currency` é por evento (`event.currency`); somar orçamentos de eventos
  com moedas diferentes é incorreto sem conversão — agrupar por moeda.
- **Desempenho:** agregações de conta fazem várias queries; cache/`staleTime` razoável
  (a app usa React Query). Evitar N+1 chamadas a `getEventSummaryAnalytics` por evento
  a partir do browser.
- **Consistência de nomes:** seguir a convenção de nomenclatura monetária
  (`docs/auditoria-nomenclatura-monetaria.md`) ao rotular valores.

---

## 8. Anexo — Mapa de fontes de dados

| Necessidade | Endpoint/agregador | Onde |
| --- | --- | --- |
| Contagens de conta | `dashboard.getGlobalStats` | `packages/api/src/routers/dashboard.ts:11` |
| Gráfico convidados (evento) | `dashboard.getGuestChart` | `routers/dashboard.ts:53` |
| Gráfico orçamento (evento) | `dashboard.getBudgetChart` | `routers/dashboard.ts:91` |
| Agregado completo (evento) | `getEventSummaryAnalytics` | `modules/dashboard/event-analytics.ts:116` |
| Resumo REST (evento) | `DashboardService.getEventSummary` | `modules/dashboard/service.ts` |
| Analytics convidados | `getGuestAnalytics` | `modules/guests/analytics.ts:74` |
| Analytics tarefas | `getTaskAnalytics` | `modules/tasks/analytics.ts:51` |
| Analytics orçamento | `getBudgetAnalytics` | `modules/budget/analytics.ts:28` |
| Notificações | `notifications.*` | `routers/notifications.ts` |
| Atividade | `activityLogs.list` | `routers/activity-logs.ts:25` |
| Exportação | `generateExport` | `packages/api/src/exports/orchestration/export-service.ts` |
| Componentes de métrica | `MetricCard`… | `apps/web/src/shared/components/metrics/index.ts` |

**Nota final:** este documento é um catálogo de opções; nada foi implementado. A
Fase 0 (limpar imports/`event-card` órfão) é a única ação que corrige um problema
existente hoje.
