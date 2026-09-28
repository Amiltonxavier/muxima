# Biblioteca de Métricas — Muxima

> **Localização:** `apps/web/src/shared/components/metrics/`
> Building blocks reutilizáveis para KPIs, progresso, breakdowns e status.
> Extraídos dos padrões de Stats da referência visual, adaptados ao design
> system do Muxima. Nenhum dado/label da referência foi assumido — tudo chega
> via props.

## Componentes

### `MetricCard`

Métrica simples.

| Prop | Tipo | Descrição |
|---|---|---|
| `title` | `string` | Título/label da métrica |
| `value` | `ReactNode` | Valor principal (já formatado) |
| `description?` | `ReactNode` | Texto de apoio sob o valor |
| `secondaryValue?` | `ReactNode` | Texto secundário adicional |
| `icon?` | `ReactNode` | Ícone no canto (decorativo, `aria-hidden`) |
| `trend?` | `{ label, tone? }` | Indicador de tendência (texto + tone) |
| `action?` | `ReactNode` | Ação opcional (Button/Link) |

```tsx
<MetricCard title="Convidados" value={120} description="de 200" icon={<Users />} />
```

Quando **não** usar: métrica com progresso → `MetricProgressCard`; com
categorias → `MetricBreakdownCard`.

---

### `MetricProgressCard`

Métrica valor vs. limite com progress bar.

| Prop | Tipo | Descrição |
|---|---|---|
| `title` | `string` | Título (também `aria-label` da barra) |
| `value` | `number` | Valor actual |
| `limit` | `number` | Valor máximo |
| `percentage?` | `number` | % pré-calculada; por omissão calculada com `safePercentage` |
| `label?` | `string` | Label curto no canto (ex.: "42 de 100") |
| `tone?` | `MetricTone` | Tone da barra (default `primary`) |
| `description?` / `icon?` / `action?` | | Como `MetricCard` |

```tsx
<MetricProgressCard title="Mesas" value={7} limit={10} tone="success" />
```

Casos-limite tratados: `0/0 → 0%`, `120/100 → 100%` (clamped), `NaN`/`∞ → 0%`.
O `limit <= 0` esconde o sufixo "/ N" em vez de mostrar `/ 0`.

---

### `MetricBreakdownCard`

Métrica composta por categorias: valor total + barra segmentada + legenda.

```tsx
<MetricBreakdownCard
  title="Tarefas"
  value={24}
  items={[
    { label: "Baixa", value: 6, tone: "default" },
    { label: "Alta", value: 18, tone: "danger" },
  ]}
/>
```

`total?` define a referência das percentagens (por omissão, a soma dos items).
`formatValue?` formata os valores da legenda (ex.: `formatCurrency`).

---

### `SegmentedProgress`

Apenas a barra segmentada (sem card). Mesma API de segmentos que
`MetricBreakdownCard`. Mostra espaço restante quando `total` explícito > soma.
Legenda opcional (`showLegend`, `showTotal`, `totalLabel`, `remainingLabel`).

---

### `MetricStatusList`

Lista de métricas com status e progresso opcionais por linha.

```tsx
<MetricStatusList
  aria-label="Mesas"
  items={[
    {
      label: "Mesa 1",
      value: "4/6",
      status: { label: "Crítico", tone: "danger" },
      progress: { value: 4, max: 6 },
    },
  ]}
/>
```

O status é **sempre texto** (nunca apenas cor). `MetricStatusTone` restringe
os tones a `default | success | warning | danger`.

---

### `RadialProgress` / `MetricRadialCard`

Progresso circular. Encapsula o `RingChart` (visx) existente — as páginas não
toca em `Ring`/`RingCenter`. Valor clamped a 0–100.

```tsx
<MetricRadialCard title="Conclusão" value={72} label="concluído" suffix="%" />
```

---

### `StatsGrid`

Apenas layout (grid responsiva). `columns={2 | 3 | 4}` (default 3) controla o
desktop; 1 coluna em mobile, 2 em `sm`.

---

## Tipos partilhados

- `MetricTone` = `"default" | "primary" | "success" | "warning" | "danger"`
- `safePercentage(value, max)` — divisão segura, clamped 0–100
- `metricToneBarClass` / `metricToneTextClass` — classes por tone

## Acessibilidade

- Barras: `role="progressbar"` + `aria-valuenow/min/max` (via `Progress` da
  Base UI ou nativo no `SegmentedProgress`); todas nomeadas (`aria-label`).
- Estados nunca dependem apenas de cor — status/trend são texto.
- Ícones decorativos marcados `aria-hidden`.

## Consolidação (o que já existia)

- `StatsCard` (`shared/components/stats-card`) → fachada de `MetricCard`
  (prop `gauge` removida — sem usos).
- `StatRow` (event-stats) → fachada de `MetricStatusList`.
- Grids `grid gap-4 sm:grid-cols-2 lg:grid-cols-*` dos módulos de stats
  (budget, guests, invitations, inventory, suppliers, checklist, tables,
  food-plan, event-stats) → `StatsGrid`.

## Quando NÃO usar esta biblioteca

- Charts multi-série/temporais → sistema de charts (`components/charts`).
- Listagens paginadas com tabelas → `Table`.
- Conteúdo não-métrico dentro de cards → `Card` directamente.
