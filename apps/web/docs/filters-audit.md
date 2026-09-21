# Filtros — Auditoria e Implementação

## Resumo

- **16 endpoints de listagem** com filtros server-side implementados
- **11 rotas REST** atualizadas com suporte a filtros via query params
- **10 procedures oRPC** atualizadas com schemas de filtro tipados
- **13 hooks de query frontend** atualizados para aceitar e enviar filtros
- **4 páginas frontend** com UI de filtros implementada
- **2 páginas** com filtros client-side removidos e substituídos por filtros server-side

---

## Contrato de Filtros

### Request

```ts
{
  page?: number;       // default: 1
  limit?: number;      // default: 20, max: 100
  search?: string;     // pesquisa textual (insensitive)
  // + filtros específicos por entidade
}
```

### Response

```ts
{
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;       // total de registos filtrados
    totalPages: number;
  };
}
```

---

## Schemas compartilhados

Todos os schemas de filtro estão definidos em:

`packages/api/src/shared/schemas/filters.ts`

| Schema | Utilizado por |
|--------|---------------|
| `eventListInput` | Events (REST + oRPC) |
| `taskListInput` | Tasks (REST + oRPC) |
| `scheduleListInput` | Schedules (REST + oRPC) |
| `guestListInput` | Guests (REST + oRPC) |
| `tableListInput` | Tables (REST + oRPC) |
| `vendorListInput` | Vendors (REST + oRPC) |
| `expenseListInput` | Expenses (REST + oRPC) |
| `inventoryListInput` | Inventory (REST + oRPC) |
| `documentListInput` | Documents (REST + oRPC) |
| `notificationListInput` | Notifications (REST + oRPC) |
| `memberListInput` | Members (REST + oRPC) |

---

## Inventário de filtros por entidade

### 1. Events

| Filtro | Campo Prisma | Tipo | REST query param | oRPC input |
|--------|-------------|------|------------------|------------|
| search | name, venueName, description | insensitive contains | `?search=` | `search` |
| status | status | enum exact | `?status=` | `status` |
| type | type | enum exact | `?type=` | `type` |

**Frontend**: `apps/web/src/routes/_private/events/index.tsx`
**Estado**: ✅ UI de filtros implementada (Search + Status + Type)

### 2. Tasks

| Filtro | Campo Prisma | Tipo | REST query param | oRPC input |
|--------|-------------|------|------------------|------------|
| search | title, description | insensitive contains | `?search=` | `search` |
| status | status | enum exact | `?status=` | `status` |
| category | category | enum exact | `?category=` | `category` |
| priority | priority | enum exact | `?priority=` | `priority` |

**Frontend**: `apps/web/src/routes/_private/events/$eventId/tasks/index.tsx`
**Estado**: ✅ UI de filtros implementada (Search + Status + Category + Priority)

### 3. Guests

| Filtro | Campo Prisma | Tipo | REST query param | oRPC input |
|--------|-------------|------|------------------|------------|
| search | name, email, phone | insensitive contains | `?search=` | `search` |
| status | status | enum exact | `?status=` | `status` |
| type | type | enum exact | `?type=` | `type` |

**Frontend**: `apps/web/src/routes/_private/events/$eventId/guests/index.tsx`
**Estado**: ✅ Filtros client-side removidos, server-side integrado (Search + Status + Type)

### 4. Vendors

| Filtro | Campo Prisma | Tipo | REST query param | oRPC input |
|--------|-------------|------|------------------|------------|
| search | name, email, phone, description | insensitive contains | `?search=` | `search` |
| category | category | enum exact | `?category=` | `category` |
| status | status | enum exact | `?status=` | `status` |

**Frontend**: `apps/web/src/routes/_private/events/$eventId/suppliers/index.tsx`
**Estado**: ⏳ Backend pronto, UI pendente

### 5. Expenses

| Filtro | Campo Prisma | Tipo | REST query param | oRPC input |
|--------|-------------|------|------------------|------------|
| search | description, notes | insensitive contains | `?search=` | `search` |
| status | status | enum exact | `?status=` | `status` |
| type | type | enum exact | `?type=` | `type` |
| vendorId | vendorId | uuid exact | `?vendorId=` | `vendorId` |

**Frontend**: `apps/web/src/routes/_private/events/$eventId/budget/index.tsx`
**Estado**: ⏳ Backend pronto, UI pendente

### 6. Inventory

| Filtro | Campo Prisma | Tipo | REST query param | oRPC input |
|--------|-------------|------|------------------|------------|
| search | name, notes | insensitive contains | `?search=` | `search` |
| category | category | enum exact | `?category=` | `category` |
| vendorId | vendorId | uuid exact | `?vendorId=` | `vendorId` |

**Frontend**: `apps/web/src/routes/_private/events/$eventId/inventory/index.tsx`
**Estado**: ⏳ Backend pronto, UI pendente

### 7. Documents

| Filtro | Campo Prisma | Tipo | REST query param | oRPC input |
|--------|-------------|------|------------------|------------|
| search | name, reference | insensitive contains | `?search=` | `search` |
| type | type | enum exact | `?type=` | `type` |
| status | status | enum exact | `?status=` | `status` |
| vendorId | vendorId | uuid exact | `?vendorId=` | `vendorId` |

**Frontend**: `apps/web/src/routes/_private/events/$eventId/documents/index.tsx`
**Estado**: ⏳ Backend pronto, UI pendente

### 8. Tables

| Filtro | Campo Prisma | Tipo | REST query param | oRPC input |
|--------|-------------|------|------------------|------------|
| search | name, location, notes | insensitive contains | `?search=` | `search` |

**Frontend**: `apps/web/src/routes/_private/events/$eventId/tables/index.tsx`
**Estado**: ✅ Filtros client-side removidos, server-side integrado (Search)

### 9. Schedules

| Filtro | Campo Prisma | Tipo | REST query param | oRPC input |
|--------|-------------|------|------------------|------------|
| search | title, description, location, responsible | insensitive contains | `?search=` | `search` |
| status | status | enum exact | `?status=` | `status` |

**Frontend**: `apps/web/src/routes/_private/events/$eventId/schedule/index.tsx`
**Estado**: ⏳ Backend pronto, UI pendente

### 10. Notifications

| Filtro | Campo Prisma | Tipo | REST query param | oRPC input |
|--------|-------------|------|------------------|------------|
| search | title, message | insensitive contains | `?search=` | `search` |
| type | type | enum exact | `?type=` | `type` |
| read | readAt | boolean (not null) | `?read=true/false` | `read` |

**Frontend**: `apps/web/src/routes/_private/notifications/index.tsx`
**Estado**: ✅ UI de filtros implementada (Search + Type + Read)

### 11. Members

| Filtro | Campo Prisma | Tipo | REST query param | oRPC input |
|--------|-------------|------|------------------|------------|
| search | user.name, user.email | insensitive contains (relation) | `?search=` | `search` |
| role | role | enum exact | `?role=` | `role` |
| status | status | enum exact | `?status=` | `status` |

**Frontend**: `apps/web/src/routes/_private/events/$eventId/members/index.tsx`
**Estado**: ⏳ Backend pronto, UI pendente

---

## Regra de paginação + filtros

Quando um filtro é alterado, a página deve voltar para `1`.

```tsx
// Exemplo
<Select
  value={filterStatus}
  onValueChange={(v) => { setFilterStatus(v); resetPage(); }}
/>
```

---

## Integração com TanStack Query

As `queryKeys` incluem todos os parâmetros de filtro:

```ts
queryKey: taskKeys.list(eventId, { page, limit, search, status, category, priority })
```

Isto garante cache correto por combinação de filtros.

---

## Pendências

| Item | Estado |
|------|--------|
| UI de filtros em Suppliers/Vendors | Pendente |
| UI de filtros em Budget/Expenses | Pendente |
| UI de filtros em Inventory | Pendente |
| UI de filtros em Documents | Pendente |
| UI de filtros em Schedule | Pendente |
| UI de filtros em Members | Pendente |
| Debounce na pesquisa textual | Pendente |
| Empty state diferenciado (sem resultados para filtros) | Pendente |

---

## Arquitetura final

```text
Filter UI (Input/Select)
   ↓
Filter State (useState)
   ↓
TanStack Query (queryKey inclui filtros)
   ↓
oRPC/REST (input inclui filtros)
   ↓
Zod Schema (validação)
   ↓
Repository (buildXxxWhere)
   ↓
Prisma WHERE (insensitive contains / enum exact)
   ↓
findMany(skip/take) + count(mesmo where)
   ↓
{ data, meta }
   ↓
Frontend (data + Pagination + Filter UI)
```
