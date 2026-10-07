# Auditoria — Exportação para PDF/XLSX não envia nenhuma requisição

> **Âmbito:** auditoria de código apenas. **Nenhum ficheiro de produção foi alterado.**
> Um teste temporário (criado, executado e **removido** depois da verificação) foi usado para
> provar a causa raiz; o seu conteúdo e resultados estão descritos em
> [Verificações executadas](#7-verificações-executadas).
>
> Todas as conclusões são baseadas no código existente neste repositório.

---

## 1. Causa raiz

**Os itens de menu "PDF" e "Excel" do `ExportMenu` usam `onSelect`, um prop que não existe
no componente base usado pela aplicação. O handler nunca é invocado, logo `mutate()` nunca
corre, o `fetch` nunca é emitido e a rede nunca vê um pedido.**

Detalhe:

- `apps/web/src/shared/components/export-menu.tsx:124` e `:141` —
  `<DropdownMenuItem onSelect={() => run("pdf")} ...>` e `<DropdownMenuItem onSelect={() => run("xlsx")} ...>`.
- `packages/ui/src/components/dropdown-menu.tsx:75-90` — `DropdownMenuItem` **não** é um
  componente Radix; é um *alias* do `Menu.Item` do **Base UI** (`@base-ui/react` 1.7.0):
  `const DropdownMenuItem = ... <MenuPrimitive.Item ... />`.
- A definição de tipos de `Menu.Item`
  (`node_modules/.pnpm/@base-ui+react@1.7.0.../@base-ui/react/menu/item/MenuItem.d.ts`)
  só expõe `onClick`, `disabled`, `label`, `closeOnClick` (**default `true`**) e `id`.
  **Não existe `onSelect` em todo o `menu/` do Base UI** (verificado por grep no pacote).
- Em runtime, `MenuItem.js` desestrutura os props que conhece e envia o resto
  (`...elementProps`, incluindo `onSelect`) para a `<div>` renderizada. Como `onSelect`
  é um prop DOM válido do React (evento `select`, que só dispara em `input`/`textarea`/`select`),
  **não há aviso no console** e o handler simplesmente nunca é chamado num `div`.

Consequência observável: o menu **abre e fecha** (Base UI fecha por `closeOnClick` a clicar no
item) mas nada mais acontece — sem toast, sem spinner, sem pedido na aba Network.

### Porque é que ninguém apanhou o bug

1. **A migração Radix → Base UI antecede a funcionalidade.** `git log`:
   - `794f21c` (2026-08-29) *"migrate all UI components from Radix UI to Base UI"* — o
     `dropdown-menu.tsx` passou a ser Base UI.
   - `fde37b4` (2026-10-02) *"feat: exports + shared analytics (PDF/XLSX) ... UI export controls"*
     — o `export-menu.tsx` **nasceu com `onSelect`** (linhas 97/114 do ficheiro original), hábito
     da API do Radix. O bug existe desde o primeiro commit da funcionalidade.
2. **O TypeScript não apanha**: `onSelect` é um prop válido de `React.ComponentProps<"div">`,
   que `MenuItemProps` estende — logo é *aceite* pelo tipo e ignorado em runtime.
3. **Não há teste de interação**: `apps/web/src/shared/hooks/__tests__/export-modules.test.ts`
   apenas compara, em texto, a lista de módulos/permissoções do browser com a do servidor.
   Não simula um clique. Não existe nenhum teste e2e de exportação (`apps/web/e2e/` não
   contém qualquer referência a export).
4. `ExportPdfButton` e `InvitationPdfButton` usam `onClick` (correcto) e funcionam — dá a
   impressão de que "as exportações funcionam", quando só funcionam os botões de formato único.

### Prova empírica

Um teste temporário com Testing Library (ficheiro `export-menu.audit.test.tsx`, **apagado
depois da execução**) renderizou o `ExportMenu` real (com `useEventCan` e
`useExportEventModule` substituídos por *mocks*), abriu o menu e clicou em "PDF" e "Excel":

- `expect(mutate).not.toHaveBeenCalled()` → **passou** para os dois formatos, i.e. o clique
  não chega sequer à mutation.
- Teste de controlo no mesmo componente `DropdownMenuItem` com `onClick` → o handler
  **dispara** (`toHaveBeenCalledTimes(1)`), provando que o evento chega ao item e que só
  `onSelect` é que é ignorado.

---

## 2. Ficheiros e código envolvido

### Front-end (onde falha)

| Ficheiro | Linhas | Papel |
| --- | --- | --- |
| `apps/web/src/shared/components/export-menu.tsx` | **124, 141** | `onSelect` nos itens PDF/XLSX — **ponto de falha** |
| idem | 74-78 | `useEventCan(eventId, EXPORT_CREATE, <permissão do módulo>)`; `89`: `if (!canExport) return null` (menu esconde-se sem permissão) |
| idem | 80-86 | `useExportEventModule({ onSuccess })` — a mutation que nunca chega a ser invocada |
| idem | 87 | `const run = (format) => mutate({ eventId, module, format })` |
| idem | 92-111 | `<DropdownMenuTrigger>` com `<Button>` como filho — gera `<button>` aninhado (ver E2) |
| idem | 165-200 | `ExportPdfButton` — correcto, usa `onClick` |
| `apps/web/src/shared/hooks/use-export-download.ts` | 149-168 | `useExportEventModule` (`useMutation`, `mutationKey ["export","event-module"]`) |
| idem | 162 | URL: `` `${serverOrigin()}/api/v1/events/{id}/exports/{module}/{format}` `` |
| idem | 123-146 | `download()` — `fetch(url, { credentials: "include" })` (linha 128), erro → `toApiError`, sucesso → `saveBlob` |
| idem | 41-44 | `serverOrigin()` a partir de `env.VITE_SERVER_URL` |
| idem | 37 | `type ExportFormat = "pdf" \| "xlsx"` |
| `packages/ui/src/components/dropdown-menu.tsx` | 7 / 75-90 | `DropdownMenuTrigger = Menu.Primitive.Trigger`; `DropdownMenuItem = Menu.Primitive.Item` (**Base UI**) |
| `apps/web/src/main.tsx` | 14-17 | `QueryClientProvider` está presente — a mutation tem cliente |
| `apps/web/src/utils/orpc.ts` | 36-40 | `MutationCache.onError` global → `handleApiError` (únicos toasts de erro das exportações) |
| `packages/env/src/web.ts` | 5-7 | `VITE_SERVER_URL: z.url()` (obrigatória; em `apps/web/.env` = `http://localhost:3000`) |

### Back-end (íntegro, nunca chega a ser contactado)

| Ficheiro | Linhas | Papel |
| --- | --- | --- |
| `packages/api/src/routes.ts` | 4, 22 | `registerRoutes` regista `exportRoutes` |
| `packages/api/src/modules/exports/routes.ts` | 117-156 | `GET /api/v1/events/:eventId/exports/:module/:format` |
| idem | 41 | `FORMATS = ["pdf", "xlsx"]` (allowlist de formato) |
| idem | 53-64 / 72-83 | `EXPORT_PERMISSIONS` + `assertCanExport` (404 disfarçado sem permissão) |
| idem | 120-123 | `requireSessionUser` + `exportLimiter.check` (5/min, burst 3/10s — `shared/auth/rate-limit.ts:200-205, 236`) |
| `packages/api/src/exports/orchestration/export-service.ts` | 105-125 | `sendExport` → `Content-Type`, `Content-Disposition`, `Content-Length`, `Cache-Control: no-store` |
| `packages/api/src/exports/registry/export-registry.ts` | 37+ | 10 módulos servidos; pares módulo/formato sem relatório devolvem 404 |
| `packages/api/src/app.ts` | 24-30 | CORS: `origin: env.CORS_ORIGIN`, `credentials: true`, **sem `exposedHeaders`** (ver E3) |
| `apps/server/src/index.ts` | 71 | servidor escuta na porta **3000** |

### Componentes que já fazem as coisas certas (referência interna)

- `apps/web/src/shared/components/mode-toggle.tsx:17` e `user-menu.tsx:89` — trigger com
  `render={<Button .../>}` (sem botão aninhado) e itens com `onClick`.
- `apps/web/src/shared/components/invitation-pdf-button.tsx:40` — `mutate(..., { onError })` com `onClick`.

---

## 3. Fluxo esperado vs. fluxo actual

### Esperado (como o código foi desenhado — ver comentários em `export-menu.tsx:50-62` e `use-export-download.ts:7-12`)

```
1. Clique em "Exportar"            → DropdownMenu abre
2. Clique em "PDF" / "Excel"       → handler do item corre: run(format)
3. run()                           → mutate({ eventId, module, format })
4. React Query mutationFn          → download(url, ...)
5. fetch GET http://localhost:3000/api/v1/events/{id}/exports/{module}/{format}
                                    (credentials: "include" → cookie de sessão)
6. Fastify: authMiddleware → requireSessionUser → exportLimiter → assertCanExport
             → allowlist módulo/formato → getReportName → buildExportContext
             → sendExport() → 200 + binário + Content-Disposition
7. download()                      → response.blob() → saveBlob() → âncora <a> clica → ficheiro guardado
8. onSuccess                       → toast "Relatório gerado." + botão reposto (isPending)
```

### Actual

```
1. Clique em "Exportar"            → DropdownMenu abre            ✅
2. Clique em "PDF" / "Excel"       → Base UI fecha o menu (closeOnClick: true)
                                     e IGNORA o `onSelect`         ❌  ← falha aqui
3. run() nunca executa
4-8. nada acontece: sem mutation, sem fetch, sem registo na aba Network,
     sem toast, sem spinner. O utilizador vê apenas o menu a fechar-se.
```

O `ExportPdfButton`/`InvitationPdfButton` (passo 2 com `onClick`) percorrem todo o fluxo —
por isso a diferença entre "os botões de PDF funcionam, o menu não" é exactamente a linha 124/141.

---

## 4. Erros encontrados

| # | Severidade | Erro | Evidência |
| --- | --- | --- | --- |
| **E1** | **Crítica** | `onSelect` nos itens do menu (`export-menu.tsx:124, 141`) não existe no `Menu.Item` do Base UI → nenhuma requisição é enviada, para PDF e XLSX, em todos os ecrãs que usam `ExportMenu` (guests, budget, inventory, schedule, suppliers, tasks, checklist, food-plan, event, dedications) | defs de tipos Base UI + teste RTL (§7) |
| **E2** | Média | HTML inválido no trigger: `<DropdownMenuTrigger><Button/></DropdownMenuTrigger>` produz `<button>` dentro de `<button>` (o `Menu.Trigger` do Base UI renderiza a sua própria `<button>`). React avisa *"In HTML, \<button\> cannot be a descendant of \<button\>"*. `user-menu`/`mode-toggle` evitam isto com `render={<Button/>}` | aviso React capturado no teste (§7); `dropdown-menu.tsx:7` |
| **E3** | Média (após corrigir E1) | `Content-Disposition` não é exposto pelo CORS: `@fastify/cors` 11.3.0 tem `exposedHeaders: null` por omissão (`index.js:16,232-235`) e `packages/api/src/app.ts:24-30` não o define. Em dev o front é `localhost:3001` e a API `localhost:3000` (cross-origin), e `Content-Disposition` não é um header *safelisted* → `response.headers.get("Content-Disposition")` devolve `null` → `filenameFromDisposition` cai no fallback `muxima-<module>.<format>`, perdendo o nome real (nome do evento, relatório, data, acentos) que o servidor calcula em `createExportFileName` | `app.ts:24-30`, `use-export-download.ts:52-71`, README do `@fastify/cors` |
| **E4** | Baixa | Import não usado: `DropdownMenuLabel` em `export-menu.tsx:7` (`npx biome check` → `lint/correctness/noUnusedImports`) — resquício de refacção incompleta do cabeçalho do menu | biome (§7) |
| **E5** | Baixa | Duplo toast de erro: `query-core/src/mutation.ts:279` chama `mutationCache.config.onError` **e** a linha 291 chama `options.onError`. Como `orpc.ts:36-40` já faz `handleApiError` globalmente, os componentes que passam `onError` por-mutate (`invitation-pdf-button.tsx:40`, `ExportPdfButton` em `export-menu.tsx:193`) mostram **dois** toasts iguais no mesmo falhanço | `mutation.ts:279/291`, `handle-api-error.ts:58` |
| **E6** | Baixa | Cobertura de testes: nenhum teste de interação/e2e para exportações; o comentário de `export-menu.tsx:22-31` ("The test below fails if the two ever diverge") só cobre a *lista de permissões*, não os handlers de evento | `export-modules.test.ts`, `e2e/` sem export |

**Não foram encontrados erros** nos seguintes pontos (verificados, todos correctos):
rota Fastify registada (`routes.ts:22`), allowlist de módulos alinhada front/back (teste
`export-modules.test.ts` verde), allowlist de formatos, permissões (`EXPORT_CREATE` e
`*.export` existem em `packages/permissions/src/catalogue.ts:41,125`), `QueryClientProvider`
presente, `VITE_SERVER_URL` definida e válida, CORS `origin` = `http://localhost:3001`
coerente com `vite.config.ts` (porta 3001), cookies cross-origin OK (same-site `localhost`,
`credentials: "include"`), back-end coberto por 40 testes verdes (`vitest run src/exports`).

---

## 5. Problemas de configuração, eventos, mutations/queries e chamadas à API

### Eventos (causa raiz + adjacentes)

- **`onSelect` vs `onClick`**: em Radix, `DropdownMenuItem` dispara `onSelect`; em Base UI,
  só existe `onClick`. Migração feita em `794f21c` sem actualizar — e a feature de export,
  criada depois, já saiu escrita contra a API antiga. **Único ficheiro da app com `onSelect`**
  (`grep onSelect apps/web` → só `export-menu.tsx:124,141`).
- **Botão aninhado (E2)**: o trigger não usa o padrão `render={...}` do Base UI.
- **`closeOnClick: true` (default)**: disfarça a falha — o menu fecha como se tivesse funcionado.

### Mutations / queries

- `useExportEventModule` está correcta em si: `mutationKey`, `mutationFn`, URL, `credentials`.
- A mutation **nunca é disparada** — não há problema de `enabled`, cache, retry nem provider.
- `useEventAccess`/`useEventCan` (`use-can.ts`) funcionam: enquanto carrega devolve `false`
  (menu esconde-se); depois mostra o menu. Como o utilizador consegue abrir o menu, a permissão
  não é o bloqueio.
- Feedback de erro: as exportações do menu dependem só do `MutationCache` global; os botões
  que acrescentam `onError` duplicam o toast (E5).

### Chamadas à API / configuração

- **Nenhuma chamada é feita** — a análise do lado do servidor é profética: o pedido nunca sai.
- URL montada (`use-export-download.ts:162`) corresponde exactamente à rota registada;
  método GET simples → não gera *preflight*.
- **CORS**: `origin` e `credentials` OK, mas falta `exposedHeaders: ["Content-Disposition"]` (E3).
- **Cross-origin em dev**: web `:3001` → API `:3000` (`VITE_SERVER_URL=http://localhost:3000`).
  O `nginx.conf` do `apps/web` **não tem proxy de `/api`**, portanto em produção também é
  cross-origin e exige `VITE_SERVER_URL` absoluta + `CORS_ORIGIN` coerentes — reforça E3.
- **Rate limit**: `exportLimiter` (5/min, rajada 3/10 s) e o limite global de 100/min só se
  tornam relevantes depois de E1 estar corrigido (um utilizador a clicar à espera de ver
  alguma coisa poderá esgotar a rajada).

---

## 6. Correcções recomendadas (não aplicadas — auditoria apenas)

1. **R1 — Essencial (corrige a causa raiz):** em `apps/web/src/shared/components/export-menu.tsx`
   trocar os dois `onSelect` por `onClick`:
   - linha 124: `onClick={() => run("pdf")}`
   - linha 141: `onClick={() => run("xlsx")}`

   Nada mais no fluxo precisa de mudar: `run` → `mutate` → `fetch` → rota → download já estão
   prontos e testados do lado do servidor.
2. **R2 — Trigger válido (E2):** usar o padrão do resto da app,
   `<DropdownMenuTrigger render={<Button className={className} variant={variant} size={size} disabled={isPending}>...</Button>}>`,
   eliminando o `<button>` aninhado (referência: `mode-toggle.tsx:17`).
3. **R3 — CORS (E3):** em `packages/api/src/app.ts` adicionar
   `exposedHeaders: ["Content-Disposition"]` ao registo do `@fastify/cors`, para que o browser
   devolva o nome de ficheiro do servidor em vez do fallback genérico.
4. **R4 — Teste de regressão (E6):** teste de interação (RTL + `userEvent`) que abre o
   `ExportMenu`, clica em "PDF" e "Excel" e afirma que a mutation/fetch é chamada com o
   módulo e formato correctos — exactamente o teste temporário desta auditoria, que falharia
   hoje e passaria após R1. Considerar também um e2e Playwright de descarga.
5. **R5 — Limpeza (E4):** remover o import `DropdownMenuLabel` não usado (`biome check` já o assinala).
6. **R6 — Toast duplicado (E5):** escolher uma só via — ou o `MutationCache` global, ou o
   `onError` por-mutate (ex.: passar `toastOptions: { id: "export" }` para deduplicar).
7. **Verificação pós-correcção:** com a app a correr (web `:3001`, api `:3000`), clicar
   "Exportar → PDF/Excel" e confirmar na aba Network `GET /api/v1/events/.../exports/... 200`,
   descarga do ficheiro com o nome correcto e toast de sucesso; repetir para um utilizador sem
   `exports.create` (menu deve continuar oculto) e para par módulo/formato inexistente (404 com
   envelope PT-PT).

---

## 7. Verificações executadas

| Verificação | Resultado |
| --- | --- |
| Teste temporário RTL sobre o `ExportMenu` real (clique PDF/XLSX → `mutate` chamado?) + controlo com `onClick` | **2/2 passaram**: `mutate` **nunca** chamado com `onSelect`; `onClick` dispara. Ficheiro **removido** depois da execução (`git status` limpo, apenas as alterações pré-existentes) |
| `cd packages/api && npx vitest run src/exports` | **40/40 passaram** (renderers, export-registry, invitation-report) — back-end íntegro |
| `npx biome check apps/web/src/shared/components/export-menu.tsx apps/web/src/shared/hooks/use-export-download.ts` | 1 aviso: `noUnusedImports` (`DropdownMenuLabel`, linha 7) |
| Definições de tipos + fonte do `@base-ui/react@1.7.0` (`menu/item/MenuItem.d.ts`, `MenuItem.js`) | `Menu.Item` sem `onSelect`; `closeOnClick` default `true`; props extra repassados à `<div>` |
| `grep -r onSelect apps/web/src` | apenas `export-menu.tsx:124,141` |
| História git (`794f21c`, `fde37b4`) | migração Radix→Base UI (29/08) anterior à feature de exportação (02/10) que já nasceu com o bug |
| `grep -i export apps/web/e2e` | sem cobertura de exportação |
| `@fastify/cors@11.3.0` (`index.js:16,232-235`) | `exposedHeaders: null` por omissão → header `Content-Disposition` não exposto |

**Conclusão:** o back-end está pronto e testado; toda a falha está no front-end, na linha de
eventos do menu — nenhuma requisição chega a ser emitida porque o handler do clique nunca corre.
