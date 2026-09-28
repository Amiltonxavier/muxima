# Auditoria de Selects — Front-end Web

> **Data:** 2026-09-28 · **Branch:** `big-refactor`
> **Estado actual:** ✅ **Migrado para `@headlessui/react`** (ver §0). As secções seguintes mantêm-se como catálogo histórico dos pontos de utilização (localizações e contagens inalteradas).
> **Âmbito:** `apps/web/src` (incl. componentes partilhados), `packages/ui` (design system `@muxima/ui`) e verificação de `apps/native`.
> **Objetivo:** mapear e catalogar **todas** as utilizações de Select/dropdown de seleção no front-end, independentemente da implementação. Nenhum código foi alterado.

---

## 0. Migração para Headless UI (2026-09-28)

Todos os Selects catalogados foram migrados para o `Select` do `@headlessui/react` (v2.2.10).

**O que mudou:**

- `packages/ui/src/components/select.tsx` — reescrito sobre `import { Select as HeadlessSelect } from "@headlessui/react"`. O Headless `Select` renderiza um `<select>` nativo estilizável; o wrapper preserva **exactamente a API pública anterior** (`Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton`, props `onValueChange`/`items`/`value`), pelo que os 47 pontos de consumo e o `Pagination` não precisaram de alterações de comportamento.
  - `onValueChange` é um adapter sobre o `onChange` nativo.
  - `items` é aceite e ignorado (compatibilidade Base UI) — o texto mostrado passa a vir do próprio `<option>`.
  - `SelectTrigger`/`SelectValue`/`SelectContent` são shims sem DOM próprio: o placeholder (e o caso `value=""`) desenha-se via portal numa slot do wrapper; `SelectItem` renderiza `<option>` nativo; `SelectGroup`/`SelectLabel` renderizam `<optgroup>`; `SelectSeparator` e os botões de scroll são no-ops.
- `@base-ui/react` deixou de ser usado pelo Select (o pacote permanece no monorepo para outros componentes: Menu, ContextMenu, Dialog, etc.).
- **Zero** selects Radix, **zero** `<select>` fora do wrapper, **zero** call sites alterados.
- Novo teste de regressão: `apps/web/src/shared/components/__tests__/select.test.tsx` (6 casos, incl. placeholder, `value=""` + item vazio, adapter `onValueChange`, associação `id`↔`label`).

**Nota de validação (jsdom):** em browsers, `value` sem correspondência → `selectedIndex === -1`; o jsdom satura para a 1ª opção. O wrapper detecta o desfasamento `value`↔DOM para mostrar o placeholder corretamente em ambos os ambientes.

**Validação executada:** `tsc --noEmit` (packages/ui + web), `vite build`, 168 testes vitest (15 ficheiros), `biome check` nos ficheiros alterados — tudo verde.

---

| Métrica | Valor |
|---|---|
| Instâncias `<Select>` (raiz) no `apps/web/src` | **47** |
| Ficheiros no `apps/web/src` com Select | **22** |
| Implementações distintas encontradas | **4** (Base UI + 3 wrappers internos) |
| Selects nativos (`<select>`) | **0** |
| Radix UI (`@radix-ui/*`) | **0** |
| App mobile (`apps/native`) | **0** selects/pickers |

### Implementações encontradas

1. **Headless UI** (`@headlessui/react`) — implementação actual (ver §0). *(Antes da migração: Base UI.)*
2. **Wrapper `@muxima/ui/components/select`** (`packages/ui/src/components/select.tsx`) — abstração estilizada sobre a Base UI; **todas as 47 instâncias** do `apps/web/src` passam por este wrapper.
3. **Wrapper interno `Pagination`** (`packages/ui/src/components/pagination.tsx`) — usa o wrapper acima internamente (10 pontos de consumo).
4. **Componente custom `LinkedEntitySelect`** (`apps/web/src/routes/_private/events/$eventId/checklist/index.tsx`) — definido no próprio ficheiro, também sobre o wrapper.

**Nota importante:** embora o `@base-ui/react` e o `@shadcn/react` constem no `packages/ui/package.json`, a implementação de Select do design system importa **exclusivamente de `@base-ui/react/select`** (não de Radix UI). Não existe qualquer `@radix-ui/react-select` no monorepo.

---

## 2. Fontes / Fundação (design system)

### 2.1 `packages/ui/src/components/select.tsx` *(reescrito na migração §0)*

- **Componente:** wrapper `Select` (re-exporta `Select`, `SelectContent`, `SelectGroup`, `SelectItem`, `SelectLabel`, `SelectScrollDownButton`, `SelectScrollUpButton`, `SelectSeparator`, `SelectTrigger`, `SelectValue`)
- **Implementação:** **Headless UI** — `import { Select as HeadlessSelect } from "@headlessui/react"` (antes da migração: Base UI)
- **Contexto:** wrapper único do design system `@muxima/ui`. Todos os selects da aplicação web consomem este wrapper — nunca a biblioteca base directamente.

### 2.2 `packages/ui/src/components/pagination.tsx`

- **Componente:** `Pagination` (seletor de itens por página)
- **Implementação:** **wrapper interno** (`Select` de `./select`, i.e. Base UI indireto)
- **Contexto:** Select `"Mostrar [10|20|50] por página"` — só renderiza quando `onLimitChange` é fornecido. Consumido por 10 páginas de listagem (ver §4.3).

### 2.3 Componentes com dropdown mas que **não são Select**

Para rigor da auditoria — usam `@base-ui/react/menu` / `@base-ui/react/context-menu` (padrão *menu de ações*, não *seleção de valor*):

- `packages/ui/src/components/dropdown-menu.tsx` — wrapper de `Menu` da Base UI
- `packages/ui/src/components/context-menu.tsx` — wrapper de `ContextMenu` da Base UI
- Consumo no `apps/web`: `apps/web/src/shared/components/user-menu.tsx` e `apps/web/src/shared/components/mode-toggle.tsx` (menus de conta e de tema).

---

## 4. Catálogo de Utilizações — `apps/web/src`

> 47 instâncias de `<Select>` (raiz) em 22 ficheiros. Todas usam o wrapper `@muxima/ui/components/select` (Base UI por baixo), exceto os dois casos identificados como wrapper próprio (`Pagination`, via design system; `LinkedEntitySelect`, custom local — ambos ainda assim assentes no mesmo wrapper).

### 4.1 Páginas e componentes de funcionalidade

#### `apps/web/src/routes/_private/events/index.tsx` — 3 selects

| Linha | Campo | Contexto |
|---|---|---|
| 116 | Filtro "Estado" | Filtros de listagem de eventos (`ALL` + estados) |
| 135 | Filtro "Tipo" | Filtros de listagem de eventos (`ALL`, `WEDDING`, `ENGAGEMENT`) |
| 404 | "Tipo de evento" | `EventFormDialog` — criação/edição de evento (TanStack Form) |

#### `apps/web/src/routes/_private/notifications/index.tsx` — 2 selects

| Linha | Campo | Contexto |
|---|---|---|
| 97 | Filtro "Tipo" | Filtro de notificações (`ALL`, `FINANCE`, `TASKS`, `GUESTS`, `INVENTORY`, `EVENT`) |
| 116 | Filtro "Estado" | Filtro de notificações (`ALL`, `UNREAD`, `READ`) |

#### `apps/web/src/routes/_private/events/$eventId/-components/update-event-status.tsx` — 1 select

| Linha | Campo | Contexto |
|---|---|---|
| 46 | Estado do evento | Badge clicável no header do evento; o trigger é estilizado como badge (sem borda) e muda o estado via mutation |

#### `apps/web/src/routes/_private/events/$eventId/-components/edit-event-dialog.tsx` — 1 select

| Linha | Campo | Contexto |
|---|---|---|
| 138 | "Estado" | `EditEventDialog` — edição do estado do evento a partir de `EVENT_STATUS_LABELS` (TanStack Form) |

#### `apps/web/src/routes/_private/events/$eventId/guests/-components/guests-filters.tsx` — 2 selects

| Linha | Campo | Contexto |
|---|---|---|
| 42 | Filtro "Estado" | Filtros de convidados (`GUEST_STATUS_FILTER_OPTIONS`) |
| 59 | Filtro "Tipo" | Filtros de convidados (`GUEST_TYPE_FILTER_OPTIONS`) |

#### `apps/web/src/routes/_private/events/$eventId/guests/-components/companion-manager-dialog.tsx` — 1 select

| Linha | Campo | Contexto |
|---|---|---|
| 134 | Estado do acompanhante | Dialog de gestão de acompanhantes; trigger compacto (`h-7`, `text-xs`) por linha, mutação imediata de estado (`PENDING`/`CONFIRMED`/`DECLINED`) |

#### `apps/web/src/routes/_private/events/$eventId/guests/-components/guest-dialog/guest-form-fields.tsx` — 3 selects

| Linha | Campo | Contexto |
|---|---|---|
| 87 | "Tipo" | Formulário de convidado (criar/editar), opções de `GUEST_TYPE_LABELS` |
| 128 | "Mesa" | Atribuição de mesa ao convidado; inclui item vazio `""` → "Sem mesa" e lista mesas com capacidade |
| 155 | "Estado" | Só em modo edição; opções de `EDITABLE_GUEST_STATUS_OPTIONS` |

#### `apps/web/src/routes/_private/events/$eventId/inventory/-components/inventory-filters.tsx` — 2 selects

| Linha | Campo | Contexto |
|---|---|---|
| 45 | Filtro "Estado" | Filtros de inventário (`INVENTORY_STATUS_FILTER_OPTIONS`) |
| 62 | Filtro "Categoria" | Filtros de inventário (`INVENTORY_CATEGORY_FILTER_OPTIONS`) |

#### `apps/web/src/routes/_private/events/$eventId/inventory/-components/inventory-create-dialog.tsx` — 2 selects

| Linha | Campo | Contexto |
|---|---|---|
| 119 | "Categoria" | Criação de item de inventário (`INVENTORY_CATEGORY_LABELS`, TanStack Form) |
| 152 | "Unidade" | Criação de item de inventário (`INVENTORY_UNIT_LABELS`, TanStack Form) |

#### `apps/web/src/routes/_private/events/$eventId/inventory/-components/inventory-edit-dialog.tsx` — 2 selects

| Linha | Campo | Contexto |
|---|---|---|
| 111 | "Categoria" | Edição de item de inventário (mesmos labels de categoria) |
| 144 | "Unidade" | Edição de item de inventário (mesmos labels de unidade) |

#### `apps/web/src/routes/_private/events/$eventId/checklist/index.tsx` — 5 selects

| Linha | Campo | Contexto |
|---|---|---|
| 246 | Filtro de estado | Filtro da checklist ("Todos os estados" + `CHECKLIST_STATUS_LABELS`) |
| 587 | "Estado" | Formulário do item de checklist (TanStack Form), escondido quando o item é auto-gerido |
| 619 | "Associação (opcional)" | Formulário do item; escolhe `NONE`/`SUPPLIER`/`INVENTORY` e condiciona o select seguinte |
| 715 | Fornecedor | **`LinkedEntitySelect`** (componente custom definido neste ficheiro, linha ~695) — lista fornecedores do evento quando `linkType === "SUPPLIER"` |
| 735 | Item de inventário | **`LinkedEntitySelect`** — lista itens de inventário quando `linkType === "INVENTORY"` |

#### `apps/web/src/routes/_private/events/$eventId/tasks/index.tsx` — 6 selects

| Linha | Campo | Contexto |
|---|---|---|
| 252 | Filtro "Estado" | Filtros de tarefas (`ALL` + estados) |
| 271 | Filtro "Categoria" | Filtros de tarefas (`ALL` + categorias) |
| 290 | Filtro "Prioridade" | Filtros de tarefas (`ALL` + prioridades) |
| 764 | "Categoria" | Formulário de tarefa (criar/editar), itens via `TASK_CATEGORY_LABELS` (TanStack Form) |
| 806 | "Prioridade" | Formulário de tarefa (`LOW`/`MEDIUM`/`HIGH`/`URGENT`) |
| 840 | "Estado" | Formulário de tarefa (`TODO`/`IN_PROGRESS`/`COMPLETED`/`CANCELLED`) |

#### `apps/web/src/routes/_private/events/$eventId/suppliers/-components/supplier-filters.tsx` — 2 selects

| Linha | Campo | Contexto |
|---|---|---|
| 45 | Filtro "Categoria" | Filtros de fornecedores (`SUPPLIER_CATEGORY_FILTER_OPTIONS`) |
| 62 | Filtro "Pagamento" | Filtros de fornecedores (`SUPPLIER_PAYMENT_STATUS_FILTER_OPTIONS`) |

#### `apps/web/src/routes/_private/events/$eventId/suppliers/-components/supplier-form.tsx` — 2 selects

| Linha | Campo | Contexto |
|---|---|---|
| 122 | "Categoria" | Formulário de fornecedor (criar/editar), trigger com `id="supplier-category"` |
| 147 | "Estado" | Formulário de fornecedor, trigger com `id="supplier-status"` |

#### `apps/web/src/routes/_private/events/$eventId/suppliers/-components/supplier-payment-dialog.tsx` — 1 select

| Linha | Campo | Contexto |
|---|---|---|
| 133 | "Método de pagamento" | Dialog de pagamento a fornecedor, trigger com `id="payment-method"` |

#### `apps/web/src/routes/_private/events/$eventId/invitations/-components/invitations-filters.tsx` — 1 select

| Linha | Campo | Contexto |
|---|---|---|
| 37 | Filtro "Resposta" | Filtros de convites (estado da resposta ao convite) |

#### `apps/web/src/routes/_private/events/$eventId/dedications/-components/dedications-filters.tsx` — 2 selects

| Linha | Campo | Contexto |
|---|---|---|
| 54 | Filtro "Tipo" | Filtros de dedicatórias (`ALL` + tipos) |
| 73 | Filtro "Estado" | Filtros de dedicatórias (`ALL` + estados) |

#### `apps/web/src/routes/_private/events/$eventId/dedications/-components/dedication-form-dialog.tsx` — 2 selects

| Linha | Campo | Contexto |
|---|---|---|
| 304 | "Tipo de dedicatória" | Formulário de dedicatória, trigger com `id="dedication-type"` |
| 341 | "Estado" | Formulário de dedicatória, trigger com `id="dedication-status"` |

#### `apps/web/src/routes/_private/events/$eventId/food-plan/index.tsx` — 3 selects

| Linha | Campo | Contexto |
|---|---|---|
| 669 | "Categoria" | Formulário de item do plano alimentar (`FOOD_PLAN_CATEGORY_LABELS`, TanStack Form) |
| 696 | "Estado" | Formulário de item do plano alimentar (`FOOD_PLAN_STATUS_LABELS`) |
| 744 | "Unidade" | Formulário de item do plano alimentar (`FOOD_PLAN_UNIT_LABELS`) |

#### `apps/web/src/routes/_private/events/$eventId/members/index.tsx` — 2 selects

| Linha | Campo | Contexto |
|---|---|---|
| 167 | Papel do membro | Cartão de membro; muda o papel (`PARTNER`/`ADMIN`/`EDITOR`/`VIEWER`) via mutation imediata |
| 346 | "Papel" | Dialog "Adicionar membro" (TanStack Form) |

#### `apps/web/src/routes/_private/events/$eventId/documents/index.tsx` — 1 select

| Linha | Campo | Contexto |
|---|---|---|
| 254 | "Tipo" | Formulário de documento (criar/editar), opções de `DOCUMENT_TYPE_LABELS` (`OTHER`/`CONTRACT`/`RECEIPT`/`QUOTE`) |

#### `apps/web/src/routes/_private/events/$eventId/budget/-components/budget-source-filter.tsx` — 1 select

| Linha | Campo | Contexto |
|---|---|---|
| 20 | Filtro "Origem" | Filtro da página de orçamento (`BUDGET_SOURCE_FILTER_OPTIONS`, tipo `BudgetSourceFilter`) |

### 4.2 Páginas sem Selects diretos (verificado)

As seguintes páginas **não** têm `<Select>` no próprio ficheiro: `events/$eventId/index.tsx`, `guests/index.tsx`, `inventory/index.tsx`, `suppliers/index.tsx`, `tables/*`, `schedule/*`, `settings`, `profile`, `auth/*`, `invite/*`. (A listagem de notificações/eventos/etc. tem paginação via `Pagination`, ver §4.3.)

### 4.3 Paginação indireta via `Pagination` (design system) — 10 pontos de consumo

Estes ficheiros não declaram `<Select>` diretamente; o Select de "itens por página" vive dentro de `packages/ui/src/components/pagination.tsx`:

1. `apps/web/src/routes/_private/events/index.tsx`
2. `apps/web/src/routes/_private/notifications/index.tsx`
3. `apps/web/src/routes/_private/events/$eventId/dedications/index.tsx`
4. `apps/web/src/routes/_private/events/$eventId/suppliers/index.tsx`
5. `apps/web/src/routes/_private/events/$eventId/tasks/index.tsx`
6. `apps/web/src/routes/_private/events/$eventId/members/index.tsx`
7. `apps/web/src/routes/_private/events/$eventId/invitations/index.tsx`
8. `apps/web/src/routes/_private/events/$eventId/inventory/index.tsx`
9. `apps/web/src/routes/_private/events/$eventId/tables/index.tsx`
10. `apps/web/src/routes/_private/events/$eventId/schedule/index.tsx`
11. `apps/web/src/routes/_private/events/$eventId/guests/index.tsx`
12. `apps/web/src/routes/_private/events/$eventId/documents/index.tsx`

---

## 5. Padrões Observados

1. **Consistência de implementação:** 100% dos selects do web passam pelo wrapper `@muxima/ui/components/select` — hoje sobre **Headless UI** (antes da migração: Base UI). Nenhum ecrã usa Radix; o `<select>` nativo só existe dentro do próprio wrapper.
2. **Padrão de props:** a maioria segue o contrato da Base UI — `value` + `onValueChange`, frequentemente com a prop `items` (necessária na Base UI para `SelectValue` com objetos `{ value, label }`).
3. **Filtros de listagem** (`*-filters.tsx`): selects controlados com opção "Todos" (`ALL`) e opções geradas de constantes (`*_FILTER_OPTIONS`).
4. **Formulários** (TanStack Form): selects dentro de `form.Field` com `field.state.value` / `field.handleChange`, conversão de tipo via cast (`v as Union`).
5. **Ações imediatas:** alguns selects não pertencem a formulários — disparam mutações diretamente (`update-event-status`, papel do membro, estado do acompanhante).
6. **Gatilhos (triggers) com `id`:** usados quando o `Label` é associado por `id` (`supplier-category`, `supplier-status`, `payment-method`, `dedication-type`, `dedication-status`).
7. **Helper comum:** `toSelectItems(...)` (`apps/web/src/utils/status-helpers.ts`) converte mapas de labels em `{ value, label }[]` para a prop `items` e para renderizar `SelectItem`s.
8. **Valor vazio:** o select de mesa (`guest-form-fields.tsx`) usa `value=""` para "Sem mesa" — padrão a vigiar, porque a Base UI pode tratar `""` de forma diferente do placeholder.

---

## 6. Cobertura da Pesquisa (para garantia de exaustividade)

A auditoria combinou várias estratégias de pesquisa para não depender de componentes conhecidos:

- Import do wrapper: `from "@muxima/ui/components/select"` → 22 ficheiros no `apps/web/src` (todos catalogados).
- JSX: `<Select`, `<select` (case-insensitive), `SelectTrigger/Value/Content/Item`, `SelectGroup/Label/Separator/Scroll*`.
- Outros padrões de seleção: `DropdownMenu`, `Combobox`, `Listbox`, `cmdk`, `Command`, `aria-haspopup`, `role="combobox"`, `role="listbox"`, `aria-expanded`, `picker`.
- Pacote de UI: varrimento completo de `packages/ui/src/components/*` (26 componentes) e `kibo-ui/*` — só o `gantt` menciona "Select" (`onSelectItem`, callback de seleção de itens no canvas, não é um componente Select).
- Monorepo: `apps/native` varrido (0 ocorrências de select/picker/dropdown); `@radix-ui` ausente de todos os `package.json`.
