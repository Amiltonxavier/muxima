# Estrutura do Modulo de Inventario - Guia para Replicacao

## Visao Geral

O modulo de inventario segue uma arquitetura **feature-sliced** com pastas privadas (prefixo `-`) que co-localizam toda a logica de um feature junto a sua rota. Este documento documenta os padroes para replicacao em outros modulos.

## Arvore de Diretorios

```
inventory/
├── index.tsx                              # Entrada da rota (pagina principal)
├── -components/                           # Componentes UI e dialogs
│   ├── __tests__/                         # Testes de componentes
│   │   └── update-inventory-dialog.test.tsx
│   ├── beverage-planning.tsx              # Panel de planejamento de bebidas
│   ├── create-inventory-dialog.tsx        # Dialog de criacao
│   ├── delete-dialog.tsx                  # Dialog de confirmacao de exclusao
│   ├── inventory-category-badge.tsx       # Badge de categoria (apresentacional)
│   ├── inventory-filters.tsx              # Barra de filtros
│   ├── inventory-table.tsx                # Tabela principal + orquestracao de dialogs
│   ├── movement-dialog.tsx                # Dialog de movimentacao de estoque
│   ├── update-inventory-dialog.tsx        # Dialog de edicao
│   └── view-dialog.tsx                    # Dialog de visualizacao (read-only)
├── -constants/                            # Constantes de dominio
│   └── index.ts
├── -queries/                              # Hooks de dados (React Query + oRPC)
│   └── inventory-queries.ts
├── -schema/                               # Schemas de validacao Zod
│   └── inventory-schemas.ts
├── -types/                                # Tipos TypeScript derivados
│   └── index.ts
├── -utils/                                # Funcoes utilitarias puras
│   ├── __tests__/                         # Testes unitarios
│   │   ├── build-payload.test.ts
│   │   └── parse-error-message.test.ts
│   ├── index.ts                           # buildPayload
│   └── parse-error-message.ts             # parseErrorMessage
└── prompts/                               # Documentacao (este arquivo)
    └── ESTRUTURA-MODULO.md
```

## Camadas e Responsabilidades

| Camada | Pasta | Responsabilidade |
|--------|-------|------------------|
| **Rota** | `index.tsx` | Definicao da rota, estado da pagina, orquestracao de queries, composicao do layout |
| **Componentes** | `-components/` | UI pura, dialogs de formulario, componentes presentacionais |
| **Queries** | `-queries/` | Toda logica de busca e mutacao de dados |
| **Schema** | `-schema/` | Regras de validacao Zod e tipos TypeScript derivados |
| **Constantes** | `-constants/` | Valores estaticos de dominio e enums |
| **Tipos** | `-types/` | Definicoes TypeScript derivadas das constantes |
| **Utils** | `-utils/` | Funcoes utilitarias puras (transformacao de payload, parsing de erros) |

## Padroes de Implementacao

### 1. Convencao de Pastas Privadas (prefixo `-`)

Pastas com prefixo `-` sao **privadas** ao modulo. Nao devem ser importadas de fora da arvore de rotas. Isto garante limites estritos entre features.

```
-components/    # Componentes UI
-constants/     # Constantes
-queries/       # Hooks de dados
-schema/        # Schemas Zod
-types/         # Tipos TypeScript
-utils/         # Utilitarios
```

### 2. TanStack Router (File-Based Routing)

O `index.tsx` usa `createFileRoute` com o caminho que espelha o sistema de arquivos:

```tsx
export const Route = createFileRoute("/_private/events/$eventId/inventory/")({
    component: InventoryPage,
});
```

O `$eventId` e um segmento dinamico extraido via `Route.useParams()`.

### 3. oRPC + React Query (Camada de Dados)

#### Query Key Factory

```tsx
export const inventoryKeys = {
    all: ["inventory"] as const,
    list: (eventId: string) => [...inventoryKeys.all, "list", eventId] as const,
    stats: (eventId: string) => [...inventoryKeys.all, "stats", eventId] as const,
    detail: (id: string) => [...inventoryKeys.all, "detail", id] as const,
};
```

#### Hooks de Query (Leitura)

```tsx
export function useInventoryItems(eventId: string, filters?: InventoryListFilters) {
    return useQuery({
        ...orpc.inventory.list.queryOptions({
            input: { eventId, ...filters },
        }),
        queryKey: inventoryKeys.list(eventId),
        enabled: !!eventId,
    });
}
```

#### Hooks de Mutacao (Escrita)

```tsx
export function useCreateInventoryItem() {
    const queryClient = useQueryClient();
    return useMutation(
        orpc.inventory.create.mutationOptions({
            onSuccess: (data) => {
                queryClient.invalidateQueries({ queryKey: inventoryKeys.list(data.eventId) });
                queryClient.invalidateQueries({ queryKey: inventoryKeys.stats(data.eventId) });
                toast.success("Item adicionado");
            },
            onError: (error) => toast.error(parseErrorMessage(error)),
        }),
    );
}
```

**Padrao:** Todas as mutacoes invalidam as queries relacionadas automaticamente.

### 4. Zod Schema + TanStack Form (Formularios)

#### Schema de Validacao

```tsx
export const inventoryItemSchema = z.object({
    name: z.string().min(1, "Nome do item e obrigatorio"),
    category: z.enum(["DRINK", "FOOD", "CAKE", "DECORATION", "OTHER"]),
    plannedQuantity: z.number().min(0),
    currentQuantity: z.number().min(0).optional().default(0),
    unit: z.enum(["UNIT", "BOX", "CASE", "BOTTLE", "KG", "LITER", "PACKAGE", "OTHER"]),
    unitPrice: z.number().min(0).optional(),
    deliveryDate: z.string().optional(),
    notes: z.string().optional(),
});

export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;
```

#### Uso no Dialog

```tsx
const form = useForm({
    defaultValues: { ... },
    onSubmit: async ({ value }) => {
        const r = inventoryItemSchema.safeParse(value);
        if (!r.success) {
            toast.error(r.error.issues[0].message);
            return;
        }
        await mutateAsync({ ...r.data, eventId });
    },
});
```

### 5. useSelected Hook (Dispatcher de Acoes)

O hook generico `useSelected<Item, Action>` funciona como uma maquina de estados para acoes por linha:

```tsx
const { clearSelection, isSelected, onSelect, selectedAction, selectedItem } =
    useSelected<SelectedItem, ActionTypeEvent>();
```

Em vez de cada componente gerenciar seu proprio estado open/close, `InventoryTable` mantem um unico estado `{ item, action }` e renderiza condicionalmente o dialog apropriado:

```tsx
{isSelected && selectedAction === ACTION_TYPES_EVENT.UPDATE && selectedItem && (
    <UpdateInventoryDialog
        open={isSelected}
        onOpenChange={clearSelection}
        initialValues={buildPayload(selectedItem)}
    />
)}
```

**Vantagem:** Evita modais sobrepostos e centraliza o ciclo de vida dos dialogs.

### 6. Pipeline de Tratamento de Erros

`parseErrorMessage` fornece uma camada centralizada de traducao erro->mensagem UI:

```tsx
const ERROR_MAP: Array<{ match: string | RegExp; message: string }> = [
    { match: "Invalid option", message: "Tipo de bolo selecionado e invalido." },
    { match: "Item nao encontrado", message: "Item nao encontrado no inventario." },
    { match: "Required", message: "Preencha todos os campos obrigatorios." },
    { match: "Invalid input", message: "Dados invalidos. Verifique os campos preenchidos." },
    // ... mais 13 regras
];

export function parseErrorMessage(error: Error) {
    const message = error.message || "";
    for (const { match, message: mappedMessage } of ERROR_MAP) {
        if (typeof match === "string") {
            if (message.includes(match)) return mappedMessage;
        } else {
            if (match.test(message)) return mappedMessage;
        }
    }
    return message || "Ocorreu um erro desconhecido. Tente novamente.";
}
```

**Consumido por:** Todos os hooks de mutacao no callback `onError`.

### 7. buildPayload (Transformacao de Dados)

Normaliza um registro branco do banco para um objeto de payload limpo:

```tsx
export function buildPayload<T extends Record<string, unknown>>(data: T) {
    return {
        id: String(data.id || ""),
        name: String(data.name || ""),
        category: String(data.category || "OTHER"),
        plannedQuantity: Number(data.plannedQuantity) || 0,
        currentQuantity: Number(data.currentQuantity) || 0,
        unit: String(data.unit || "UNIT"),
        unitPrice: Number(data.unitPrice) || 0,
        cakeType: data.cakeType ? String(data.cakeType) : undefined,
        weight: data.weight ? Number(data.weight) : undefined,
        deliveryDate: data.deliveryDate
            ? new Date(String(data.deliveryDate)).toISOString().split("T")[0]
            : data.event &&
              typeof data.event === "object" &&
              (data.event as Record<string, unknown>).eventDate
                ? new Date(String((data.event as Record<string, unknown>).eventDate))
                    .toISOString().split("T")[0]
                : undefined,
        notes: String(data.notes || ""),
    };
}
```

## Fluxo de Dependencias (Grafo de Imports)

```
index.tsx
  ├── -queries/inventory-queries  (useInventoryItems, useInventoryStats)
  ├── -components/inventory-filters
  ├── -components/inventory-table
  │     ├── -components/inventory-category-badge
  │     ├── -components/movement-dialog
  │     │     ├── -schema/inventory-schemas
  │     │     ├── -constants (MOVEMENT_TYPE_OPTIONS)
  │     │     └── -queries/inventory-queries (useAddInventoryMovement)
  │     ├── -components/view-dialog
  │     │     └── -components/inventory-category-badge
  │     ├── -components/delete-dialog
  │     │     └── -queries/inventory-queries (useDeleteInventoryItem)
  │     ├── -components/update-inventory-dialog
  │     │     ├── -schema/inventory-schemas
  │     │     └── -queries/inventory-queries (useUpdateInventoryItem)
  │     ├── -constants (ACTION_TYPES_EVENT)
  │     ├── -utils/index (buildPayload)
  │     └── -types/index (ActionTypeEvent)
  ├── -components/beverage-planning
  └── -components/create-inventory-dialog
        ├── -schema/inventory-schemas
        └── -queries/inventory-queries (useCreateInventoryItem)

-queries/inventory-queries
  └── -utils/parse-error-message

-types/index
  └── -constants/index
```

**Regra:** Schema e utils sao dependencias folha (sem imports internos). Queries dependem de utils mas nao de components ou schemas. Components dependem de queries, schemas, constants, types e utils, mas nunca o contrario.

## Checklist para Replicar em Outro Modulo

- [ ] Criar pasta do modulo com prefixo `-` em cada subpasta
- [ ] Definir `-constants/index.ts` com enums e opcoes de dominio
- [ ] Criar `-types/index.ts` derivando tipos das constantes
- [ ] Criar `-schema/` com schemas Zod para cada entidade
- [ ] Criar `-utils/index.ts` com `buildPayload` para transformacao de dados
- [ ] Criar `-utils/parse-error-message.ts` com mapa de erros do dominio
- [ ] Criar `-queries/` com key factory + hooks de query e mutacao
- [ ] Criar `-components/` com:
  - [ ] Tabela principal (`-table.tsx`)
  - [ ] Dialog de criacao (`create-*-dialog.tsx`)
  - [ ] Dialog de edicao (`update-*-dialog.tsx`)
  - [ ] Dialog de visualizacao (`view-dialog.tsx`)
  - [ ] Dialog de exclusao (`delete-dialog.tsx`)
  - [ ] Componentes presentacionais (badges, filtros, etc.)
- [ ] Criar `index.tsx` com rota, estado da pagina e composicao
- [ ] Adicionar testes em `-utils/__tests__/` e `-components/__tests__/`
- [ ] Adicionar `prompts/ESTRUTURA-MODULO.md` com documentacao

## Exemplo de Estrutura Minimal para Novo Modulo

```
my-module/
├── index.tsx
├── -components/
│   ├── my-table.tsx
│   ├── create-dialog.tsx
│   ├── update-dialog.tsx
│   ├── view-dialog.tsx
│   └── delete-dialog.tsx
├── -constants/
│   └── index.ts
├── -queries/
│   └── my-queries.ts
├── -schema/
│   └── my-schemas.ts
├── -types/
│   └── index.ts
└── -utils/
    ├── index.ts
    └── parse-error-message.ts
```
