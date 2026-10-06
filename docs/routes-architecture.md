# Arquitetura de Rotas — guideline reutilizável

> **Âmbito.** Estratégia de *routing* de `src/routes` numa aplicação React + TypeScript +
> **TanStack Router** (file-based routing). Este documento é um **espelho conceitual**, não uma
> cópia da implementação: toda a estrutura de exemplo usa nomes genéricos (`resource`,
> `$resourceId`, `sub-resource`, `feature`, `settings`, `index`) para que possa ser aplicado a
> qualquer projeto novo, sem conhecimento do projeto de origem nem das suas entidades.
>
> **Fora de âmbito.** Componentes internos, hooks, queries, estado de negócio e UI. Tudo isso
> co-existe nas pastas de rota, mas **não faz parte da estratégia de routing** e não é documentado
> aqui além do suficiente para saber onde fica (secção 4).
>
> **Referência analisada.** `apps/web/src/routes` — 24 páginas navegáveis, 3 agrupamentos
> pathless, 1 raiz; árvore gerada automaticamente por `@tanstack/router-plugin`.

---

## 1. Objetivo

Permitir que qualquer developer estruture o routing de um **novo projeto** seguindo a mesma
arquitetura, respondendo a três perguntas, sempre pela mesma ordem:

1. **Onde fica o ficheiro?** → *estrutura física* (secções 3 e 4)
2. **Que responsabilidade tem?** → *responsabilidade do nível* (secções 3, 5–10)
3. **Como se chama?** → *convenção de naming* (secção 4)

O resultado prático: uma árvore de diretórios que é, ao mesmo tempo, a árvore de URLs — sem
configuração adicional de rotas, sem ficheiro de rotas central, sem hand-written route map.

---

## 2. Princípios

| # | Princípio |
| --- | --- |
| P1 | **O ficheiro é a rota.** A árvore de rotas é gerada a partir de `src/routes`; nunca se edita o ficheiro gerado (`routeTree.gen.ts`). |
| P2 | **Cada ecrã navegável tem um único ficheiro de rota**: `index.tsx` dentro da pasta que representa o segmento de URL. |
| P3 | **A hierarquia de diretórios é a hierarquia de URLs.** Pastas com prefixo `_` são *pathless*: agrupam, mas não acrescentam segmento ao URL. |
| P4 | **Guarda no nível mais alto que a unifica.** Sessão → grupo; instância → layout do recurso. Nunca duplicar a mesma guarda em cada página filha. |
| P5 | **Layout = contexto + `<Outlet/>`.** Um layout carrega dados/partilha chrome e delega a página ao filho. Nunca renderiza os children manualmente. |
| P6 | **URL é para ecrãs partilháveis.** Criar/editar/apagar numa página existente é *ação* (diálogo dentro da página), não uma rota nova. |
| P7 | **Search params só para valores gerados por máquina** (tokens de partilha/recuperação). Filtros, paginação e pesquisa vivem em estado local da página. |
| P8 | **Código co-localizado mas fora da árvore de rotas**, sempre com o prefixo `-` (módulos privados ao gerador de rotas). |
| P9 | **Uma responsabilidade por rota.** Lista ≠ detalhe ≠ sub-módulo. Se duas URLs têm o mesmo conteúdo, uma delas está errada. |
| P10 | **Rotas leves.** O gerador faz code-splitting automático por rota (`autoCodeSplitting: true`); o ficheiro de rota orquestra, os módulos `-` implementam. |

### 2.1 Configuração que sustenta a estratégia

```ts
// vite.config.ts — gerador de rotas
tanstackRouter({
  target: "react",
  routeToken: "layout",   // ficheiro de rota de um diretório chama-se `layout.tsx`
  autoCodeSplitting: true,
})

// main.tsx — router
createRouter({
  routeTree,
  defaultPreload: "intent",   // preload em hover/foco dos <Link>
  scrollRestoration: true,
  context: { /* serviços tipados */ },   // tipado na raiz via createRootRouteWithContext
})
```

Tokens usados pelo gerador (todos por omissão, exceto indicado):

| Token | Exemplo | Significado |
| --- | --- | --- |
| `__root` | `__root.tsx` | raiz do router (única, inamovível) |
| `_` | `_private/`, `_home/` | pasta/pathless: agrupa sem criar segmento de URL |
| `$` | `$resourceId`, `$token` | parâmetro dinâmico do URL |
| `index` | `index.tsx` | página do diretório (segmento `/`) |
| `layout` | `layout.tsx` | rota do próprio diretório (configurado via `routeToken`) |
| `-` | `-components/`, `-queries/` | **ignorado** pelo gerador — módulo privado, nunca vira rota |

---

## 3. Estrutura genérica de diretórios

### 3.1 Árvore

Representa fielmente os **níveis** existentes na implementação de referência, com nomes genéricos:

```
src/routes/
│
├── __root.tsx                            # N0  raiz
│
├── _auth/                                # N1  grupo pathless — área pública
│   ├── layout.tsx                        #     rota do grupo: guarda + chrome + <Outlet/>
│   └── feature/
│       └── index.tsx                     # N2/N3  ecrã público      → /feature
│
├── _private.tsx                          # N1  grupo pathless — área privada (variante: ficheiro-adjacente)
├── _private/
│   ├── _home/
│   │   └── index.tsx                     # N2/N3  página raiz do grupo → /
│   ├── settings/
│   │   └── index.tsx                     # N2/N3  área transversal     → /settings
│   ├── 403/
│   │   └── index.tsx                     # N2/N3  página de estado     → /403
│   │
│   └── resource/                         # N2    pasta de recurso (coleção)
│       ├── index.tsx                     # N3    página de coleção     → /resource
│       ├── -components/                  #       módulo privado (ignorado)
│       ├── -queries/                     #       módulo privado (ignorado)
│       ├── $resourceId.tsx               # N4    layout da instância   → (sem URL próprio)
│       └── $resourceId/
│           ├── index.tsx                 # N3    página de detalhe     → /resource/$resourceId
│           └── sub-resource/             # N5    pasta de sub-recurso
│               └── index.tsx             # N3    sub-página            → /resource/$resourceId/sub-resource
│
└── public/                               # N1    rota pública de topo (fora de qualquer grupo)
    └── $token/
        └── index.tsx                     # N2/N3 ecrã público dinâmico → /public/$token
```

### 3.2 Propósito de cada nível

| Nível | Estrutura física | Responsabilidade | Convenção de naming |
| --- | --- | --- | --- |
| **N0 — Raiz** | `__root.tsx` | `head` global (meta/ícone), providers globais, `errorComponent` e `notFoundComponent` globais, contexto tipado do router. Não tem URL. | Sempre `__root.tsx`. |
| **N1 — Grupo pathless** | `_auth/layout.tsx` **ou** `_private.tsx` + pasta `_private/` | Guarda de acesso (sessão), *shell* partilhado (chrome, navegação lateral, banners), `pendingComponent`. **Não altera o URL.** | Prefixo `_` + nome curto de domínio de acesso (`_auth`, `_private`). |
| **N1b — Rota pública de topo** | `public/$token/index.tsx` | Ecrã acessível sem sessão e fora da navegação da aplicação; valida o parâmetro e trata os seus próprios estados. | Pasta kebab-case; parâmetro opaco `$token`. |
| **N2 — Pasta de recurso/feature** | `resource/` | Só existe para agrupar o segmento de URL e o código associado. Não tem componente. | kebab-case; plural para coleções (`resources`), singular para áreas sem contagem (`settings`). |
| **N3 — Página (`index.tsx`)** | `resource/index.tsx` | O ecrã em si: cabeçalho, filtros, estados (vazio/erro/carregamento), ações. É o único ficheiro que renderiza UI de página. | Sempre `index.tsx`. |
| **N4 — Recurso dinâmico (layout)** | `resource/$resourceId.tsx` | Resolve a instância uma vez: carrega, mostra estados de carregamento/não encontrado, entrega `<Outlet/>`. Também é o ponto onde se protege o acesso à instância. | `$` + camelCase, id de entidade termina em `Id`. |
| **N5 — Sub-recurso** | `resource/$resourceId/sub-resource/index.tsx` | Módulo de negócio que **só faz sentido dentro do contexto da instância** (um segmento adicional, uma `index.tsx`, sem layout próprio). | kebab-case, plural para coleções. |
| **Lateral — Módulos privados** | `-components/`, `-queries/`, `-hooks/`, `-constants/`, `-types/`, `-utils/`, `-styles/` | Código co-localizado com a rota mas **fora** da árvore de rotas. Testes ficam em `__tests__` dentro destas pastas. | Prefixo obrigatório `-`; nunca usado em ficheiros/pastas de rota. |

### 3.3 Níveis de navegação

A navegação compõe-se de quatro camadas, da mais genérica para a mais específica:

1. **Global (raiz)** — meta, tema, toasts, ecrãs de erro/404. Visível em todas as rotas.
2. **Grupo** — shell autenticado (sidebar/topbar) ou shell público (painel de marca). É onde
   vive a guarda de sessão; todas as rotas do grupo entram e saem juntas.
3. **Contexto de instância** — `resource/$resourceId`: os filhos partilham os mesmos dados da
   instância e a mesma navegação contextual.
4. **Página / sub-módulo** — o conteúdo final; não tem filhos, exceto outro sub-recurso.

As rotas públicas de topo **saltam a camada 2** (renderizam diretamente na raiz).

---

## 4. Convenção de nomenclatura

### 4.1 Pastas

- Tudo em **kebab-case**, minúsculas: `sub-resource`, `another-sub` → nunca `SubResource`.
- **Coleções plurais** (`resources`), **áreas sem contagem singulares** (`settings`).
- **Pathless** = prefixo `_` (`_private`, `_home`). Agrupamento sem URL.
- **Dinâmicas** = prefixo `$` (`$resourceId`).
- **Ignoradas pelo gerador** = prefixo `-` (`-components`). Nunca usar `-` numa pasta de rota nem
  `_` numa pasta de módulo: os prefixos têm significado oposto.
- Um segmento de URL = uma pasta. Não criar pastas que não correspondem a um segmento.

### 4.2 Ficheiros

| Tipo | Nome | Quando |
| --- | --- | --- |
| Página | `index.tsx` | sempre, para qualquer pasta que tenha URL próprio |
| Layout de diretório | `layout.tsx` | quando o diretório precisa da **sua própria rota** (guarda/chrome do grupo) |
| Layout de instância | `$resourceId.tsx` | irmão da pasta `$resourceId/`; renderiza `<Outlet/>` |
| Raiz | `__root.tsx` | um só, na raiz de `src/routes` |
| Módulo privado | `-<tipo>.tsx` / `-<tipo>/` | tudo o que não é rota |

### 4.3 Route IDs (`createFileRoute(...)`)

- O id é o **caminho completo do ficheiro dentro de `routes/`**, incluindo os grupos pathless.
- Rotas `index` terminam em `/`; layouts e dinâmicas **não**:

```ts
createFileRoute("/_private")                             // grupo
createFileRoute("/_private/resource/")                   // index (termina em /)
createFileRoute("/_private/resource/$resourceId")        // layout dinâmico
createFileRoute("/_private/resource/$resourceId/sub-resource/")
createFileRoute("/public/$token/")                       // público, fora dos grupos
```

- Os grupos pathless aparecem **no id mas nunca no URL** (P3).
- O id é escrito à mão uma vez; depois disso é a **tipagem** que manda — `<Link to="...">`,
  `Route.useParams()` e `Route.useSearch()` só aceitam rotas existentes.

### 4.4 Parâmetros

- `$` + camelCase. Id de entidade → sufixo `Id` (`$resourceId`); valor opaco → nome do valor
  (`$token`).
- Ler com `Route.useParams()`; passar em links com `params={{ resourceId }}` — nunca concatenar
  strings para construir URLs internas.

### 4.5 O que fica fora do naming de rotas

Os módulos `-` (componentes, queries, hooks, constantes, tipos, utils, estilos) seguem os
convenções do projeto, mas **não têm regras de routing**: o gerador nem os vê. Um ficheiro `.tsx`
que não exporte `Route` e não tenha o prefixo `-` é excluído com *warning* — por isso o prefixo é
obrigatório e não opcional.

---

## 5. Rotas públicas

Duas formas coexistem, ambas legítimas:

**a) Grupo público** (`_auth/layout.tsx` + `feature/index.tsx`)

- Pasta `_`-prefixed com `layout.tsx` → guarda e chrome próprios, sem sidebar da aplicação.
- A guarda é **inversa**: se já existe sessão, redireciona para a área privada; falha na
  verificação de sessão **não** bloqueia o acesso (deixa o utilizador ver o ecrã).
- Tem `pendingComponent` próprio (o shell privado não existe para estas rotas).

**b) Rota pública de topo** (`public/$token/index.tsx`)

- Pasta de topo, **fora de qualquer grupo**, sem ficheiro de layout: renderiza diretamente na
  raiz, com apenas o chrome global.
- Serve ecrãs partilháveis por link (tokens, partilhas, páginas de estado).
- Como não tem grupo, **a página trata os seus próprios estados**: carregamento, parâmetro
  inválido, expirado, erro.

**Regras**

- Nenhuma rota privada pode viver fora do grupo privado (bypass da guarda, P4).
- Parâmetros públicos são **sempre validados** na página — vêm de fora e não são confiáveis.
- O conteúdo público nunca depende de sessão; dados públicos têm query própria e estados próprios.
- Nomes de página entre grupos diferentes têm de ser **únicos no URL final** (grupos não criam
  segmento, por isso `/feature` de dois grupos colidiriam).

---

## 6. Rotas privadas

Tudo o que exige sessão vive **sob um único grupo pathless privado**:

```
_private.tsx        ← guarda + shell
_private/
├── _home/…           → /
├── settings/…        → /settings
├── 403/…             → /403
└── resource/…        → /resource
```

- **Guarda em `beforeLoad` do grupo**, com semântica explícita:
  - sessão **ausente** → `throw redirect({ to: "/login" })`;
  - **erro** na verificação de sessão (rede/500) → **não** redireciona; a aplicação continua e
    tenta de novo na próxima navegação (um erro de servidor nunca pode provocar um logout
    aparente);
  - redirects do TanStack Router re-lançam-se; qualquer outro erro é engolido de forma
    controlada.
- **Shell**: navegação lateral + barra superior + banners + `<main><Outlet/></main>`; a página
  só preenche o conteúdo.
- `pendingComponent` no grupo: o shell nunca pisca sem sessão confirmada.
- **Acesso negado**: a API devolve um erro `FORBIDDEN`, o router entrega-o ao `errorComponent`
  global da raiz, que mostra o ecrã de acesso negado em qualquer ponto da app. Existe
  adicionalmente uma página `/403` navegável dentro do grupo.
- Filhos do grupo: página raiz (`_home`), features de página única (`settings`, `403`), o
  recurso principal e as suas páginas.

**Regra de ouro:** o guard vive no grupo. Se uma página filha precisar de "estou autenticado?",
a guarda está no sítio errado.

---

## 7. Recursos e entidades

- **Recurso** = pasta de topo dentro da área privada que corresponde a uma coleção de entidades
  navegável: `resource/index.tsx` → `/resource`.
- A página de coleção segue sempre o mesmo esqueleto: **cabeçalho → filtros → estados
  (vazio/carregando/erro) → conteúdo (tabela/grelha) → paginação → ações**.
- **Entidade não é pasta.** Uma entidade só ganha diretório quando tem URL próprio (secção 8);
  até lá vive dentro do recurso.
- **Ações são diálogos, não rotas.** Criar, editar, apagar e ações em massa abrem a partir da
  própria página, com estado local (`useState`) — não existem `/resource/new` nem
  `/resource/$resourceId/edit`.
- **Filtros e paginação ficam em estado local**, não em search params (P7). O URL de uma lista
  não é partilhável por desenho: só o é quando o produto o exige e aí usa `validateSearch`.
- **Search params** só aparecem em `validateSearch` quando o valor vem de fora (ex.: `?token=`
  de recuperação), lidos com `Route.useSearch()`.
- Navegação para o recurso: `<Link to="/resource">` (tipado, com preload por intenção).

---

## 8. Recursos dinâmicos

Dois ficheiros, dois papéis:

```
resource/
├── $resourceId.tsx          ← layout da instância (sem URL próprio)
└── $resourceId/
    └── index.tsx            ← página de detalhe
```

**`$resourceId.tsx` (layout)**

- Lê o parâmetro (`Route.useParams()`), carrega a instância **uma vez** e mostra os estados de
  carregamento / não encontrado **antes** de qualquer filho renderizar.
- Renderiza `<Outlet/>` — nunca a página filha diretamente.
- É o ponto natural para proteger o acesso à instância: se o servidor negar, o erro sobe para o
  `errorComponent` global.
- Cria-se quando existir **mais do que uma página filha** ou quando o detalhe partilha o mesmo
  carregamento com os filhos; sem isso, `index.tsx` sozinho chega.

**`$resourceId/index.tsx` (detalhe)**

- O "resumo" da instância: identidade, métricas, acessos rápidos para os sub-recursos.
- Não repete o carregamento do layout quando este já fornece os dados.

**Regras**

- Parâmetros dinâmicos são sempre `$` + nome; nunca segmentos fixos com valores variáveis.
- Links exigem `params`: `<Link to="/resource/$resourceId" params={{ resourceId }} />`.
- Sub-recursos herdam o layout — não revalidam a instância.

---

## 9. Sub-recursos

- **Definição:** módulo de negócio que só faz sentido **dentro** de uma instância. URL:
  `/resource/$resourceId/sub-resource`.
- **Estrutura mínima:** uma pasta + `index.tsx`. Um sub-recurso é **folha** — não tem layout
  próprio, não tem `$subResourceId` e não desce mais um nível (a implementação de referência não
  tem nenhum caso mais profundo; não introduzir sem necessidade real de navegação).
- **Herdam tudo:** sessão (grupo privado) e instância (`$resourceId.tsx`) já resolvidos.
- **Ações dentro de sub-recursos seguem P6**: criar/editar/apagar são diálogos na página, não
  rotas.
- **Quando NÃO é sub-recurso:** se o módulo funciona com qualquer instância ou sem ela, é uma
  feature de topo (`_private/<feature>/index.tsx`).

**Critério de decisão (resource vs dinâmico vs sub-resource vs feature)**

| Situação | Estrutura |
| --- | --- |
| Coleção navegável, sem contexto | `resource/index.tsx` |
| Precisa de uma instância concreta no URL | `resource/$resourceId.tsx` + `resource/$resourceId/index.tsx` |
| Módulo que depende da instância | `resource/$resourceId/sub-resource/index.tsx` |
| Página única sem contexto | `feature/index.tsx` |
| Só precisa de parâmetro, sem layout | `public/$token/index.tsx` |

---

## 10. Layouts e hierarquia

### 10.1 Composição

```
__root.tsx                      head + providers + error/404 global
└── _private.tsx                guarda de sessão + shell        ← camada 2
    └── resource/$resourceId.tsx  carrega instância + <Outlet/>  ← camada 3
        └── sub-resource/index.tsx  página                       ← camada 4
```

Cada nível renderiza exatamente **um** `<Outlet/>`; o conteúdo vem sempre de baixo.

### 10.2 O que um layout pode e não pode conter

| Pode | Não pode |
| --- | --- |
| `beforeLoad` (guarda), `pendingComponent` | lógica de negócio da página |
| chrome partilhado (sidebar, topbar, banners) | UI de detalhe do sub-módulo |
| carregamento do contexto (instância) e estados base | render manual dos children em vez de `<Outlet/>` |
| composição de páginas filhas | novo segmento de URL (o layout não tem URL, salvo `layout.tsx` de diretório com segmento) |

### 10.3 Onde vive cada guarda

| Tipo de guarda | Nível |
| --- | --- |
| Sessão / autenticação | grupo pathless (`_private.tsx`, `_auth/layout.tsx`) |
| Acesso à instância | `resource/$resourceId.tsx` (ou servidor, com erro a subir à raiz) |
| Permissão negada pelo servidor | `errorComponent` global (raiz) |
| 404 / rota inexistente | `notFoundComponent` global (raiz) |

---

## 11. Estratégia para novos módulos

Transformar um novo módulo de negócio em estrutura de rotas é uma sequência determinística:

1. **Classificar a visibilidade.** Privado → dentro do grupo privado. Público com sessão
   inversa → grupo público. Público partilhável por link → pasta de topo fora de grupos.
2. **Decidir se precisa de contexto.** Sem instância no URL → pasta de topo
   (`resource/` ou `feature/`). Com instância → pasta + `$resourceId.tsx` + `$resourceId/`.
3. **Criar a página de entrada**: `index.tsx` com `createFileRoute("<id completo>")`. O id segue
   a secção 4.3 (inclui grupos pathless, termina em `/`).
4. **Adicionar sub-recursos** como pastas irmãs dentro de `$resourceId/`, cada uma só com
   `index.tsx`.
5. **Co-localizar o código** do módulo em pastas `-` dentro da pasta da rota
   (`-components`, `-queries`, `-hooks`, `-constants`, `-types`, `-utils`), com os testes em
   `__tests__` dentro delas.
6. **Colocar as guardas**: sessão já vem do grupo; instância no `$resourceId.tsx`. Não repetir
   nas páginas filhas.
7. **Ligar a navegação**: entradas na navegação lateral / links internos com `<Link to>` tipado
   (parâmetros via `params`).
8. **Deixar o gerador correr** (dev server ou `vite build` regenera a árvore) e verificar com o
   typecheck do projeto que os `to=`/`params` fecham. Nunca editar a árvore gerada à mão.
9. **Ações ficam na página**: criar/editar/apagar como diálogos acionados por estado local.

**Exemplo — módulo com lista, detalhe e dois sub-módulos:**

```
_private/resource/
├── index.tsx                      → /resource
├── $resourceId.tsx                → layout (carrega instância)
├── $resourceId/
│   ├── index.tsx                  → /resource/$resourceId
│   ├── sub-resource/…  index.tsx  → /resource/$resourceId/sub-resource
│   └── another-sub/…    index.tsx → /resource/$resourceId/another-sub
├── -components/  -queries/  -constants/  -types/  -utils/
```

---

## 12. Exemplos genéricos

| URL | Pasta | Tipo | Camadas renderizadas (secção 3.3) |
| --- | --- | --- | --- |
| `/` | `_private/_home/index.tsx` | privada, raiz do grupo | 1 → 2 → 4 |
| `/feature` | `_auth/feature/index.tsx` | pública (grupo) | 1 → 2 → 4 |
| `/settings` | `_private/settings/index.tsx` | privada, página única | 1 → 2 → 4 |
| `/403` | `_private/403/index.tsx` | privada, página de estado | 1 → 2 → 4 |
| `/resource` | `_private/resource/index.tsx` | privada, recurso (coleção) | 1 → 2 → 4 |
| `/resource/$resourceId` | `_private/resource/$resourceId/index.tsx` | privada, recurso dinâmico (detalhe) | 1 → 2 → 3 → 4 |
| `/resource/$resourceId/sub-resource` | `…/$resourceId/sub-resource/index.tsx` | privada, sub-recurso | 1 → 2 → 3 → 4 |
| `/public/$token` | `public/$token/index.tsx` | pública, dinâmica, sem grupo | 1 → 4 |

URLs que **não** existem por decisão (P6):

```
/resource/new                    ✗  criar → diálogo na página de coleção
/resource/$resourceId/edit       ✗  editar → diálogo na página de detalhe
/resource/$resourceId/$id        ✗  detalhe de sub-recurso → diálogo ou página própria só se for
                                     partilhável de forma independente
/feature/list                    ✗  a lista é /feature; não duplicar variantes de visualização
```

Search params:

```
/reset?token=<opaque>            ✓  valor gerado por máquina → validateSearch
/resource?status=open&page=2     ✗  filtros ficam em estado local (P7)
```

---

## 13. Regras e anti-patterns

### Regras

1. Um ecrã navegável = um `index.tsx`; um segmento de URL = uma pasta.
2. Guarda de sessão **uma vez**, no grupo pathless; nunca em páginas filhas.
3. Layouts só com contexto + `<Outlet/>`; children sempre via outlet.
4. Prefixo `-` em **todo** o ficheiro/pasta que não é rota.
5. Route id completo (com grupos pathless) e com `/` final apenas nos `index`.
6. Parâmetros lidos com `useParams()`/`Route.useParams()`; links sempre tipados.
7. Search params só para valores externos; filtros/paginação em estado local.
8. Rotas privadas exclusivamente dentro do grupo privado; públicas fora dele.
9. Estados de página (carregamento/vazio/erro) definidos na própria página; estados de transição
   do grupo no `pendingComponent`.
10. Sub-recursos são folhas de um nível; aprofundar apenas com necessidade real de navegação.
11. Erros terminal (403/404/inesperado) resolvem-se na raiz, de forma uniforme.

### Anti-patterns

| Anti-pattern | Porquê |
| --- | --- |
| Editar `routeTree.gen.ts` | é gerado; a alteração é substituída no próximo build |
| Ficheiros de apoio sem prefixo `-` | o gerador tenta torná-los rotas (warnings) ou ignora-os de forma implícita |
| Guard duplicada em cada página | quebra P4; basta uma página esquecida para abrir um buraco |
| Rotas `/new` e `/edit` para ações com diálogo | parte P6; duplica URL e estado |
| Layout que renderiza children sem `<Outlet/>` | quebra lazy loading, preloading e hierarquia de erros |
| Rota privada fora do grupo privado | fica sem guarda e sem shell |
| Segmentos fixos para valores variáveis (`/resource/123` escrito à mão) | perde tipagem e preloading; usar `$param` |
| Concatenar strings para URLs internas | usar `<Link to>` com `params` |
| Navegação por `window.location.href` | recarrega a aplicação inteira; perder SPA, preloading e estado |
| Copiar filtros para a query string "por hábito" | quebra P7; o URL de lista deixa de ser estável |
| Sub-recursos encadeados sem necessidade | aumenta a profundidade sem valor de navegação |

---

## 14. Known Deviations

Estratégia **predominante** (a seguir em projetos novos): página = `index.tsx`; grupos pathless
com guarda no grupo; recurso dinâmico com layout + `index`; sub-recursos como folhas de um nível;
ações como diálogos; filtros em estado local; módulos `-` para tudo o que não é rota.

Desvios pontuais face a essa estratégia na implementação de referência:

| # | Desvios na implementação atual | Estratégia predominante a seguir |
| --- | --- | --- |
| D1 | Os grupos pathless declaram-se de **duas formas**: ficheiro-adjacente (`_private.tsx` + pasta `_private/`) e pasta com token de diretório (`_auth/layout.tsx`). Uma ocorrência de cada. | Padronizar **um** estilo por projeto (recomenda-se o ficheiro-adjacente `_group.tsx` + `_group/`) e usá-lo em todos os grupos. |
| D2 | A página raiz `/` vive dentro de uma **pasta pathless aninhada** no grupo privado (`_private/_dashboard/`), enquanto as restantes páginas privadas são filhas diretas do grupo. | Páginas privadas como filhas diretas do grupo; pastas `_`-prefixed usadas apenas quando criam um layout próprio. |
| D3 | Uma rota legada ficou como **página-aviso** ("mudou de sítio") em vez de `redirect`. | Ao fundir duas rotas, redirecionar com `redirect` ou remover a rota; páginas-aviso só quando há bookmarks externos a preservar. |
| D4 | Pastas de teste `__tests__/` colocadas diretamente sob uma rota **sem** o prefixo `-`; são excluídas apenas por não exportarem `Route` (o gerador avisa). | Testes sempre dentro de pastas `-` (`-components/__tests__/`). |
| D5 | O ecrã público define o título via `document.title` num efeito, enquanto a raiz usa `head:`. | Gerir títulos via `head:`/meta na raiz; efeitos manuais só para títulos que dependem de dados assíncronos da própria página. |
| D6 | Após autenticar, a navegação usa `window.location.href` (reload total) em vez do router. | Navegar sempre com o router (`navigate`/`<Link>`), para manter SPA, preload e estado. |
| D7 | A página `/403` não é alvo de nenhum `Link`/`redirect` e duplica o ecrã de acesso negado do `errorComponent` global. | Um único ecrã de acesso negado, acionado pelo `errorComponent` da raiz; a rota `/403` só se existir navegação para ela. |

---

*Documento gerado a partir da análise de `apps/web/src/routes`. Se a implementação mudar,
atualizar primeiro a estratégia predominante (secções 2–13) e depois os desvios (secção 14).*
