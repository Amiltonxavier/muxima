# Auditoria — Motor genérico de layout PDF (`muxima-pdf-layout.ts`)

> **Âmbito:** auditoria de código apenas. **Nenhum ficheiro de produção foi alterado** (nem testes
> foram escritos no repositório). As conclusões baseiam-se no código existente e em medições feitas
> com uma aplicação de análise temporária executada **fora** do repositório
> (`/tmp/opencode/pdfaudit`), que intercepta os primitivos do jsPDF (`text`, `rect`, `line`,
> `addImage`, `addPage`) e devolve a geometria realmente desenhada.
>
> Versão auditada: `packages/api/src/exports/core/pdf/muxima-pdf-layout.ts` (**2578 linhas**,
> modificada no *working tree*), jsPDF **4.2.1**.
> Modelo de estilo: `docs/export-pdf-xlsx-audit.md`.

---

## 1. Resumo executivo

O motor é funcional (PDFs válidos, determinísticos, com cabeçalho/rodapé, capa, KPIs, pares,
parágrafos, imagens e tabelas paginadas), mas **o modelo de medição não é o modelo de desenho**.
Três falhas estruturais explicam quase todos os sintomas observados (transbordamento, sobreposição,
páginas desequilibradas, tabelas "partidas"):

1. **Dois sistemas de medição que não concordam.** `measureTextWidth` (`:1934`) e `wrap` (`:2438`)
   medem sempre em `helvetica`/`times` **`normal`**, enquanto o desenho usa **`bold`** (cabeçalhos
   de tabela, valores de pares, valores de KPI). A diferença medida é ~1,09× (helv 8 pt) e ~1,07×
   (times 12,5–22 pt). Texto medido "justo" em `normal` é re-partido pelo jsPDF em `bold` **depois**
   de o espaço já ter sido reservado com outro número de linhas.
2. **As reservas de página não correspondem à altura desenhada.** `ensureSpace` (`:2313`) garante
   uma altura, mas vários blocos desenham mais do que reservaram (títulos de secção, imagem +
   legenda + alt, cabeçalho de tabela + 1.ª linha) ou reservam a menos do que a soma das suas
   partes. Resultado: **órfãos** (cabeçalho, título ou totais sozinhos no fim/íncio de página) e
   **blocos partidos** (imagem com a legenda/alt na página seguinte).
3. **A correcção final de `resolveColumnWidths` descarrega toda a diferença numa única coluna**
   (`:1917-1928`) quando Σ(mínimos) > `CONTENT_WIDTH` → **larguras negativas**, colunas abaixo do
   próprio mínimo e conteúdo desenhado para fora da folha.

| Sintoma | Problema(s) | Evidência medida |
| --- | --- | --- |
| Tabelas a transbordar / colunas sobrepostas | **P-01**, P-02 | 12 col → última coluna **−429,2 pt**; 16 col → **−875,3 pt**; 16 col → **48** caixas além da margem direita (`x1` = 833,9 > 799,89), 2 cabeçalhos sobrepostos |
| Valores truncados com `…` / dinheiro partido | **P-05**, P-06 | `128 450 0…`, `96 300 0…`; **282** células monetárias de 70 linhas × 4 colunas partidas no U+202F |
| Sobreposição de texto | **P-02**, P-07, P-11, P-14 | linhas de valores de pares **oy = 7,9 pt** (5/5 comprimentos); parágrafo ⊓ título **oy = 3,3**; rótulos de pares ⊓ linha seguinte **oy = 3,1** (15 casos) |
| Páginas desequilibradas / quase vazias | **P-03**, P-04, P-08, P-13 | página só com cabeçalho de tabela; página só com totais (**folga 413/561 = 74 %**); página só com imagem de 40 pt (folga 336); `pageBreak` → 163/561 e 140/561 |
| Cabeçalho/rodapé a colidir ou sair da página | **P-09**, P-10 | nome longo: ox = 132,5 / oy = 8,1; rodapé com 4 linhas → fundo **598,3 > 595,28** |

**Severidade global: alta.** Nada disto impede a geração do ficheiro, mas **P-01, P-05 e P-06
alteram dados visíveis** (valores truncados/quebrados) e **P-02/P-03/P-04/P-07/P-08 aparecem em
qualquer relatório suficientemente longo**.

---

## 2. Problemas encontrados

Severidade: **Crítica** = corrompe dados/layout sistematicamente; **Alta** = visível em relatórios
reais; **Média** = depende de dados extremos; **Baixa** = higiene/contrato.

| ID | Sev. | Problema | Causa raiz (código) | Correcção estrutural |
| --- | --- | --- | --- | --- |
| **P-01** | **Crítica** | `resolveColumnWidths` devolve larguras negativas e colunas abaixo do próprio mínimo | `:1809-1928` — mínimos por coluna (Σ pode exceder `CONTENT_WIDTH`) + correcção final `widths[n-1] += difference` (`:1917-1928`) | Atribuição com mínimos **factíveis**: distribuir a escassez por todas as colunas acima do mínimo (o *loop* de 4 passes, `:1831-1912`, já tenta isso mas aborta em `flexible <= 0`, `:1884`); se Σ mínimos > `CONTENT_WIDTH`, decidir por ordem de prioridade/peso (ou reduzir corpo/trocar de folha); **nunca** devolver largura ≤ 0 |
| **P-02** | **Alta** | Medição em `normal`, desenho em `bold` → re-partição não prevista pelo modelo | `:1934-1947` e `:2438-2441` (sempre `normal`); desenho em `bold` em `:1258-1275` (cabeçalhos), `:894-918` (valores de pares), `:765-796` (valores de KPI) | Medidor único `measureTextWidth(text, family, style, size)` usado por `wrap` **e** por `resolveColumnWidths`, sempre com o estilo de desenho; `wrap` devolve linhas contidas no espaço com o estilo final |
| **P-03** | **Alta** | Cabeçalho de tabela órfão (banda no fim da página, linhas na seguinte) | `:1289-1291` — `ensureSpace(headerHeight + 20)` = **42**, mas `headerHeight` (22) + `rowHeight` mínimo (24, `:1369-1378`) = **46** | Reserva **atómica** de cabeçalho + primeira linha: calcular `rowHeight` da 1.ª linha antes de `drawHeader()` e reservar `headerHeight + rowHeight` |
| **P-04** | **Altra** | Linha de totais órfã numa página quase vazia | `:1571-1589` — reserva só `rowHeight + 4` (28), sem ligação à tabela; `ensureSpace` (`:2313`) parte cegamente | *Keep-together*: reservar os totais junto com as últimas linhas (ou repetir cabeçalho + janela de linhas na página nova) |
| **P-05** | **Alta** | Totais truncados com `…` → **valores agregados incorrectos** | `:1653-1665` — `wrap(..., maxLines=1)` com largura insuficiente (vinda de P-01) | Largura mínima própria para a linha de totais (medida com o estilo real), redução de corpo como recurso explícito, ou quebra controlada; **nunca** truncar um agregado |
| **P-06** | **Alta** | Dinheiro partido no separador de milhar fino (U+202F), `Kz` isolado | `format.ts:77` (`\u202f`) + `:2449-2501` (`splitTextToSize` quebra em qualquer espaço) | Tratar o valor formatado como **token não quebrável** em `wrap` (no-break no agrupamento ou quebra só entre grupos), para `1 029 500,00 Kz` nunca se dividir |
| **P-07** | **Alta** | Títulos de secção reservam a menos do que desenham; invadem bloco anterior/topo de página | `:583` reserva **42**; `:601-614` desenha com `baseline = cursorY` (tinta ~9,75 pt acima) e consome `16,875/linha + 10` (2 linhas = **43,75** > 42) | Âncora do título a partir de `cursorY` (não sobre ele) + reserva calculada sobre as linhas devolvidas por `wrap`; encadear `título + bloco seguinte` numa só reserva |
| **P-08** | **Alta** | Bloco de imagem encolhe e divide-se (legenda/alt na página seguinte) | `:1042-1076` — `textBlock` não conta os espaçadores reais `+8` (`:1097`), `+4` (`:1131`), `+12` (`:1164`); `safeAvailableHeight = max(available, 40)` (`:1054-1058`) é calculado **antes** de `ensureSpace` (`:1074`) | Somar a altura real do bloco (imagem + 8 + legenda + 4 + alt + 12) e decidir a página **antes** de calcular o `ratio`, para a altura desenhada corresponder ao espaço da página final |
| **P-09** | **Média** | Capa: subtítulo sobrepõe título de 2 linhas; tinta acima de `CONTENT_TOP`; meta colide com a capa | `:430-439` (`maxWidth` mas avanço de uma linha), `:420` baseline em `CONTENT_TOP + 4` → tinta em 114,8; `:2151-2178` grelha de meta sem teto (`y = 64 + row × 13`) | Medir o título com o estilo real e avançar o `y` pelas linhas desenhadas; ancorar a tinta dentro de `CONTENT_TOP`; limitar a grelha de meta ao espaço do cabeçalho |
| **P-10** | **Média** | Nomes longos no cabeçalho/rodapé: re-partição, colisão e saída de página | `:2067-2078`, `:2094-2107`, `:2276-2287` — `maxWidth` sem limite de linhas nem reserva | Limitar linhas com orçamento próprio (ou reduzir corpo) e travar o `y` do rodapé dentro de `FOOTER_BLOCK` |
| **P-11** | **Média** | KPI: *hint* a sair do cartão, rótulo de 2 linhas a tocar o valor, valor re-partido | `:674` (`cardHeight = 50` fixo), `:752-763` (rótulo sem orçamento), `:775-796` (`wrap` em `normal` + desenho em `bold`), `:809-820` (*hint* fixo em `y + 45`) | Orçamento de linhas por cartão: medir rótulo/valor/*hint* com o estilo real e decidir a altura do cartão (ou limitar explicitamente as linhas de cada campo) |
| **P-12** | **Média** | Truncamento silencioso (células > 3 linhas, parágrafos > 14 linhas) | `:103-104`, usado em `:1356` e `:968`; `wrap:2515-2544` acrescenta `…` | Tornar o limite explícito no contrato (`ReportColumn`) ou elevá-lo com base na medida real; garantir por teste que nenhum relatório real o atinge |
| **P-13** | **Média** | Paginação por blocos inteiros sem *keep-together* → páginas quase vazias e buracos | `:2313-2327`, `:1385-1396`, `{ kind: "pageBreak" }` | Cadeia de reserva por secção (título + primeira unidade) e reserva combinada das peças que têm de ficar juntas (título+linhas, linhas+totais, imagem+texto) |
| **P-14** | **Baixa** | Contratos implícitos e sanitização incoerente | `isContactColumn` (`:233-247`) decide a formatação pelo **texto** do cabeçalho/chave; `sanitizeText` colapsa `\n` em pares (`:854`), parágrafos (`:953`) e capa, mas não nas células (`:1330`) | Semântica explícita no tipo (`column.format: "contact"`) e regra única de quebra de linha por tipo de campo |

### 2.1 P-01 — larguras negativas (crítica)

`resolveColumnWidths` (`:1711-1932`) corre em quatro fases: pesos proporcionais (`:1719-1802`),
mínimos por coluna (`:1809-1826`), quatro passes de redistribuição (`:1831-1912`) e **correcção
final** (`:1917-1928`):

```ts
const difference = CONTENT_WIDTH - widths.reduce((sum, width) => sum + width, 0);
if (widths.length > 0) widths[widths.length - 1] += difference;
```

Quando Σ(mínimos) > `CONTENT_WIDTH`, os passes param em `flexible <= 0` (`:1884`) com as larguras
ainda a somar **mais** do que a folha, e o `difference` (grande e **negativo**) cai só sobre a
última coluna. Medido (cabeçalhos de 28 caracteres; a soma é sempre 757,9 = `CONTENT_WIDTH`):

| Nº de colunas | larguras devolvidas (resumo) |
| --- | --- |
| 8 | `107,1 × 7` e **`8,0`** (mínimo próprio ~100) |
| 12 | `107,1 × 9, 111,5, 111,5, **−429,2**` |
| 16 | `107,1 × 9, 111,5 × 6, **−875,3**` |

- **Sintoma (16 colunas):** 48 caixas de texto com `x1` para além da margem direita (até
  `x1 = 833,9 > 799,89`), 2 cabeçalhos sobrepostos, 8 células com `…`.
- **Consequência:** com largura negativa, `anchorX` de colunas `right` (`:1245-1256`) e a soma
  `x += width` (`:1281`) deslocam as colunas seguintes; o desenho sai da área de conteúdo e
  colide com a coluna vizinha.
- **Não é um caso teórico:** os relatórios reais do projecto têm 9–11 colunas
  (`exports/reports/rows/inventory.ts`, `rows/suppliers.ts`), onde a folga é pequena; a
  medição em `normal` (P-02) comprime ainda mais os mínimos.

### 2.2 P-02 — medição `normal` vs desenho `bold`

Cadeia causal medida (valor de parágrafo/pair com texto longo):

1. `wrap(sanitizeText(item.value), FONT_SANS, SIZE.body, …)` (`:854-862`) mede em **normal**;
2. o desenho usa `setFont(FONT_SANS, "bold", SIZE.body)` (`:894-898`) e passa `maxWidth`
   (`:914-917`);
3. o jsPDF volta a dividir a linha (bold ≈ 1,09× mais largo) e desenha a continuação com o
   *leading* dele (1,15 × 9 = 10,35 pt);
4. o nosso modelo avançou 1,35 × 9 = 12,15 pt (`:910-912`) → a continuação fica **1,8 pt** acima
   da linha seguinte modelada → sobreposição de tinta de **7,9 pt** (`oy = 12,4 − 4,5`).

Medições: comprimentos 180/240/300/360/420 → **5/5 com sobreposição** (`oy = 7,9`, `ox = 39,6`).
No cabeçalho de tabela o mesmo mecanismo dá uma 2.ª linha fora da banda dourada de 22 pt: página 2
do inventário → banda `128–150`, linhas do cabeçalho `138,56–147,2` e `147,76–156,4`
(**6,4 pt dentro da 1.ª linha de dados**), **5/5 páginas**.

### 2.3 P-03/P-04 — cabeçalho e totais órfãos

Reserva do cabeçalho (`:1289-1291`): `ensureSpace(headerHeight + 20)` = 42 pt. O que se segue a
desenhar exige 22 + 24 = **46 pt** (linha mínima, `:1369-1378`). Janela de falha:
`cursorY ∈ (515,28 ; 519,28]`. Varredura (preenchimento de tabela × pares × tabela final com
1.ª linha de 2 linhas) encontrou **4 casos** concretos:

| preench. | pares | página | `y` do cabeçalho | folga abaixo |
| --- | --- | --- | --- | --- |
| 1 | 15 | 1 | 517,4 | 21,9 pt |
| 6 | 8 | 1 | 518,4 | 20,9 pt |
| 8 | 5 | 1 | 515,4 | 23,9 pt |
| 12 | 0 | 1 | 518,4 | 20,9 pt |

Nestes casos a banda de cabeçalho fica sozinha no fim da página e as linhas recomeçam na seguinte.

Totais (`renderTotals`, `:1571-1693`): com 13 linhas, a página 2 contém **apenas** o rect de
totais (`y=128`, `h=24`) e os seus 3 textos — **folga 413/561 (74 % vazia)**, sem cabeçalho nem
linhas. A reserva é `rowHeight + 4 = 28` (`:1588-1589`) e não há qualquer ligação aos dados que
resume.

### 2.4 P-05/P-06 — dinheiro truncado e partido

- **Truncado:** relatório de fornecedores (70 linhas, 9 colunas + totais) → 4 caixas com `…`,
  todas na linha de totais: `128 450 0…`, `96 300 0…`, `128 450…`, `128 450…`. Causa directa:
  `wrap(..., maxLines = 1)` (`:1653-1665`) + coluna insuficiente (P-01) + corpo fixo.
  **É incorrecto:** `128 450 000,00 Kz` deixa de ser o total.
- **Partido:** `formatMoney` (`format.ts:77`) agrupa com `\u202f` (U+202F, espaço fino sem
  separação); `splitTextToSize` trata-o como espaço normal e quebra ali. Medições:
  inventário **60/60** linhas com pelo menos uma célula monetária partida; fornecedores
  **282** (≈ 70 linhas × 4 colunas monetárias). Exemplo visível: `1 029 500,` numa linha e `Kz`
  noutra.

### 2.5 P-07/P-08 — títulos e imagem

**Título de secção** (`:565-623`): reserva 42 (`:583`), desenha com `baseline = this.cursorY`
(`:601-614`), avança `12,5 × 1,35 = 16,875` por linha e `+10` depois do filete (`:616-622`).
Consequências medidas:

- tinta **acima** do espaço reservado: título no topo de página com `top = 118,25 < CONTENT_TOP`
  (128); a capa tem `top = 114,8`;
- colisão com o parágrafo anterior: parágrafo `198,4–208,1` vs título `204,8–218,3` → **oy = 3,3**;
- 2 linhas consomem **43,75 > 42** reservados;
- **título órfão:** a reserva de 42 é libertada e a tabela seguinte pede outros 42
  (`:1289`) → partição de página com o título sozinho. Varrimento de pares `n = 1..60` com
  título de 1 linha **e** de  2 linhas: `n = 16, 40, 41` nos dois casos; no `n = 16` a página 1
  termina no título com **folga 54,3 pt** e a página 2 fica com 164/561.

**Imagem** (`:1009-1165`):

- `textBlock = (legenda + alt + 1) × 8 × 1,35` (`:1042-1047`) não inclui os `+8` (`:1097`),
  `+4` (`:1131`) e `+12` (`:1164`) que o código soma depois → défice de ~13 pt quando a imagem
  é dimensionada até ao fim da página. Varredura `n = 0..70` pares antes da imagem:
  **57/71 casos** com legenda/alt a acabar noutra página;
- `safeAvailableHeight = Math.max(availableHeight, 40)` (`:1054-1058`) é calculado **antes** do
  `ensureSpace(height + textBlock)` (`:1074`): quando não cabe, a imagem salta de página mas
  **mantém a altura calculada com o espaço residual da página anterior** — medido: imagem
  **60 × 40 pt** no topo de uma página quase vazia (folga 336/561), e casos com 103,5 / 86,5 /
  69,5 pt para posições sucessivas.

### 2.6 P-09 a P-12 — capa, cabeçalho/rodapé, KPI, truncamentos

- **Capa** (`:417-519`): `text(título, …, maxWidth)` (`:430-437`) seguido de `y += 22 × 1.2`
  (`:439`) — avanço de **uma** linha; um título de 2 linhas é sobreposto pelo subtítulo.
  A baseline inicial é `CONTENT_TOP + 4 = 132` (`:420`) → tinta de 114,8 a 138,6.
- **Meta da 1.ª página** (`:2151-2178`): grelha de 2 colunas, `y = 64 + row × 13`, **sem teto**.
  `buildMeta` (`:1979`) junta 4 entradas fixas + `context.meta`; colisão com o título da capa a
  partir de `context.meta ≥ 5` (2 colisões) e `≥ 8` (4 colisões, com caixas a
  `123,4–131,2` a cruzar `CONTENT_TOP = 128`).
- **Cabeçalho com nomes longos** (`:2067-2107`): `reportName` re-parte em 2 linhas e a 2.ª linha
  colide com o nome do evento (**ox = 132,5 / oy = 8,1**).
- **Rodapé** (`:2276-2287`): nome de evento longo → 4 linhas em `565,7 / 573,9 / 582,2 / 590,5`,
  fundo **598,3 > 595,28** → **fora da página** (1 ocorrência).
- **KPI** (`:649-830`): cartão de 50 pt (`:674`); rótulo desenhado em `y + 14` sem orçamento
  (`:752-763`) → 2 linhas terminam em 247,4 com o valor a começar em 247,1 (toque); valor medido
  em `normal` (`wrap`, `:775-784`) e desenhado em `bold` (`:786-796`); *hint* fixo em `y + 45`
  (`:809-820`) → **fuga de 4,8 pt** para fora do cartão (`bottom` 273,3 vs 278,1).
- **Truncamentos** (P-12): varredura com 8 colunas e texto longo → **90 células** com `…`
  (30 linhas × 3 colunas de texto); parágrafo de 300 palavras → **14 linhas desenhadas**, a
  última com `…` (`MAX_PARAGRAPH_LINES`), i.e. **texto perdido sem aviso**.

---

## 3. Geometria

### 3.1 Constantes declaradas (`:58-104`)

| Constante | Valor | Linha | Efeito |
| --- | --- | --- | --- |
| `PAGE` | 841,89 × 595,28 (A4 *landscape*) | `:84-87` | 1 folha = 595,28 pt de altura |
| `MARGIN_X` | 42 | `:89` | margem lateral |
| `HEADER_BLOCK` / `FOOTER_BLOCK` | 86 / 34 | `:91-92` | bandas de cabeçalho e rodapé |
| `CONTENT_TOP` | `MARGIN_X + HEADER_BLOCK` = **128** | `:94` | primeiro y utilizável |
| `CONTENT_BOTTOM` | `595,28 − 34` = **561,28** | `:95` | último y utilizável |
| `CONTENT_WIDTH` | `841,89 − 84` = **757,89** | `:96` | largura útil |
| `LINE_HEIGHT` | 1,35 | `:98` | avanço de linha usado no modelo |
| `CELL_PADDING_X` / `_Y` | 5 / 4 | `:100-101` | interior das células |
| `MAX_CELL_LINES` / `MAX_PARAGRAPH_LINES` | 3 / 14 | `:103-104` | tetos de truncamento (P-12) |
| `SIZE` | coverTitle 22, eventName 15, sectionTitle 12,5, headerReport 10, headerMeta 7,5, body 9, tableHeader 8, tableCell 8, kpiLabel 7, kpiValue 13, footer 7,2, note 8 | `:58-71` | corpos tipográficos |

### 3.2 Duas constantes de entrelinha que não são a mesma coisa

- Modelo (o código): `LINE_HEIGHT = 1,35` — usado em todos os `cursorY += … * LINE_HEIGHT`.
- Realidade do jsPDF: quando `text()` recebe `maxWidth`, ele próprio divide com *leading*
  **1,15 × corpo**.

Isto é **conservador** onde o código controla o avanço (linhas de tabela, parágrafos — nunca
transbordam para `CONTENT_BOTTOM`: nas varreduras, `contentBottom = 0` para conteúdo), mas
**é a causa exacta das sobreposições** quando o jsPDF re-divide uma linha que o modelo já tinha
colocado (P-02: 12,15 − 10,35 = **1,8 pt** de desalinhamento → 7,9 pt de tinta sobreposta).

### 3.3 Medição de fontes (bold vs normal, factor medido)

| Fonte/corpo | bold ÷ normal |
| --- | --- |
| times 22 pt (título de capa) | 1,074 |
| times 12,5 pt (título de secção) | 1,071 |
| helvetica 8 pt (cabeçalho/célula) | 1,089 |
| helvetica 7,2 pt (rodapé) | ~1,09 |

É este factor que `measureTextWidth` (`:1934-1947`) e `wrap` (`:2438-2441`) **não** aplicam.

### 3.4 Reservas declaradas vs. altura desenhada

| Bloco | Reserva (linha) | Altura real desenhada | Δ |
| --- | --- | --- | --- |
| Título de secção | 42 (`:583`) | 16,875 × linhas + 10 (2 linhas = **43,75**) | −1,75 (2 linhas) + tinta 9,75 pt acima do cursor |
| Cabeçalho de tabela + 1.ª linha | 42 (`:1289`) | 22 + **24** = 46 | **−4** (P-03) |
| Linha de tabela | `max(24, n×10,8+10)` (`:1369-1378`) | idêntica | 0 ✓ |
| Linha de totais | 28 (`:1588`) | 24 | +4, mas sem ligação à tabela (P-04) |
| Linha de KPI | 60 (`:692`) | 50 + 10 ✓ (rótulo/*hint* não orçamentados) | campo por campo (P-11) |
| Imagem + texto | `height + textBlock` (`:1074`) | `height + 8 + legenda×10,8 + 4 + alt×10,8 + 12` | **≈ −13** (P-08) |
| Linha de parágrafo | 12,15 (`:980`) | 12,15 ✓ | 0 ✓ |
| Linha de par *(pairs)* | `max(17, valor×12,15+4)` (`:864-870`) | não conta o **rótulo** (2.ª linha do rótulo escapa, P-02/P-14) | −≈10,4 com rótulo de 2 linhas |
| Capa | **nenhuma** (`:417-519`) | título multi-linha não medido | −(n−1) × 26,4 (P-09) |
| Meta da 1.ª página | **nenhuma** (`:2151-2178`) | 13 pt por linha, sem teto | ilimitado (P-09) |

---

## 4. Paginação

### 4.1 Semântica de `ensureSpace` (`:2313-2327`)

```ts
if (this.cursorY + height <= CONTENT_BOTTOM) return;
this.doc.addPage();
this.cursorY = CONTENT_TOP;
```

Só isto. Não há noção de *keep-together* (encadear título+primeira unidade), nem reposição de
cabeçalho quando um bloco salta, nem penalização por deixar buracos. Existem **três** sítios que
partem página: `ensureSpace` (genérico), o ciclo de linhas da tabela (`:1385-1396`, que repete o
cabeçalho ✓) e as chamadas por linha dentro da legenda/alt da imagem (`:1108`, `:1142`).

### 4.2 Catálogo de falhas de paginação (medido)

| Tipo | Como nasce | Evidência |
| --- | --- | --- |
| **Cabeçalho de tabela órfão** | reserva 42 < 46 (P-03) | 4 casos; banda a `y = 515,4–518,4`, folga 20,9–23,9 pt |
| **Título de secção órfão** | título reserva 42 e liberta; tabela pede 42 (P-07) | `n = 16, 40, 41`; p1 termina no título com folga 54,3, p2 com 164/561 |
| **Totais órfãos** | `renderTotals` reserva 28 isolado (P-04) | p2 = só o rect `y=128 h=24`; folga **413/561** |
| **Imagem + legenda/alt divididos** | `textBlock` subestima (P-08) | **57/71** posições; p3 só com imagem de 40 pt (folga 336) |
| **Página quase vazia por `pageBreak`** | secção `{ kind: "pageBreak" }` não calcula nada | 163/561 e 140/561 |
| **Título no topo a invadir a banda do cabeçalho** | baseline = `cursorY` (P-07) | `top = 118,25 < 128` |
| **Conteúdo a cruzar `CONTENT_BOTTOM`** | — | **não observado** (`contentBottom = 0` para conteúdo; o modelo 1,35 é conservador) |

### 4.3 Balanço de páginas (fill real, excluindo mobiliário)

| Relatório | páginas | fill por página |
| --- | --- | --- |
| Inventário (11 col, 60 linhas) | 5 | 555 / 554 / 554 / 554 / 491 |
| Fornecedores (9 col, 70 linhas) | 6 | 528 / 554 × 4 / **423** |
| Título órfão (16 pares + tabela) | 2 | 507 (folga 54) / **164** |
| Totais órfãos (13 linhas) | 2 | 548 / **148** |
| Imagem ao piso de 40 pt | 3 | 541 / 497 / **225** |
| `pageBreak` explícito | 2 | … / **163** |

As páginas intermediárias de tabelas ficam bem preenchidas (554/561, folga 7 pt) porque a linha
nunca parte (`:1380-1396`) — **esse comportamento está correcto**. O desequilíbrio vem dos
órfãos/blocos inteiros a saltarem, não das linhas.

---

## 5. Tabelas

### 5.1 Pipeline (`renderTable`, `:1171-1570`)

1. `renderSectionTitle` (`:1181`) — P-07;
2. `resolveColumnWidths(columns, rows)` (`:1200`) — P-01;
3. `ensureSpace(headerHeight + 20)` + `drawHeader()` (`:1289`, `:1208-1287`);
4. por linha: `formatCellValue` → `wrap(..., MAX_CELL_LINES)` (`:1327-1358`) → `rowHeight`
   (`:1369`) → partida de página com repetição de cabeçalho (`:1385-1396`) → fundo alternado,
   texto linha a linha com avanço explícito (`:1461-1484`);
5. `renderTotals` (`:1557`) — P-04/P-05.

### 5.2 O algoritmo de larguras e as suas três falhas

- **Mínimos** (`:1809-1826`): `min(145, max(52, largura(cabeçalho) + 10 + 10))`, medidos em
  `normal` (P-02) → mínimos subestimados ~9 % para cabeçalhos em `bold`;
- **Passes** (`:1831-1912`): sobem colunas abaixo do mínimo, depois rebaixam as flexíveis, mas
  param quando `flexible <= 0` (`:1884`) — i.e. **quando a folga já não existe**;
- **Correcção** (`:1917-1928`): toda a diferença para a última coluna → P-01.

A terceira falha é de **contrato**: a função promete `sum(w) = CONTENT_WIDTH` mas não promete
`w ≥ 0` nem `w ≥ mínimo`, e o único sinal (a soma bater certo) mascara o problema.

### 5.3 O que está correcto

- A linha nunca é dividida entre páginas e o cabeçalho é redesenhado na página nova
  (`:1380-1396`) — decisão documentada e bem implementada;
- a célula é desenhada **linha a linha** com o mesmo `width` usado no `wrap` e em `normal`
  (`:1461-1484`), pelo que **não sofre do P-02** (medido: `cellCross = 0` e `overlap = 0` nas
  duas tabelas reais);
- `alignFor` (`:312-328`): `align` explícito > tipo (`money`/`number`/`percent` → `right`) >
  `left`;
- mensagem de tabela vazia com reserva própria (`:1295-1323`).

### 5.4 Medidas de largura vs. conteúdo (relatórios reais)

Comparação entre a largura atribuída, a largura útil (`w − 10`) e a maior linha única de conteúdo
(mesmo estilo, sem `\n`):

| Relatório | colunas com conteúdo > útil | exemplos |
| --- | --- | --- |
| Inventário (11 col) | **3/11** | `Artigo` 168,7 vs 90,2 (+78,6); `Fornecedor` 168,7 vs 90,2; `Notas internas…` 99,8 vs 82,5 |
| Fornecedores (9 col) | **2/9** | `Nome do fornecedor` 195,3 vs 170,7 (+24,6); `Contacto` 137,2 vs 98 (+39,2) |

Para colunas de texto isso é **legítimo** (a célula pode ter 2–3 linhas) e por isso não é
apontado como bug — mas mostra que a distribuição é proporcional ao *peso* com um factor de
conteúdo amortecido (`:1765-1773`, intervalo 0,85–1,8), não ao que a coluna precisa. O sintoma
real aparece nas colunas numéricas e no cabeçalho, onde **não** pode haver 3 linhas.

### 5.5 Linha de totais (`:1571-1693`)

- `rowHeight = 24` (`:1586`), reserva `+4` (`:1588`);
- cada valor é envolvido com `maxLines = 1` (`:1653-1665`) → qualquer valor mais largo que a
  coluna é **truncado com `…`** (P-05). Medido: 4 valores afectados no relatório de fornecedores;
- a linha é desenhada com o mesmo `align` das colunas e âncora `x + width − 5`, pelo que com
  largura negativa (P-01) os totais também saem da área de conteúdo.

---

## 6. Envoltório de texto (`wrap`)

### 6.1 Contrato actual (`:2421-2445`)

```ts
private wrap(text, family, size, maxWidth = CONTENT_WIDTH, maxLines = ∞): string[]
```

1. `setFont(family, "normal")` (`:2438-2441`) — **sempre `normal`**, qualquer que seja o estilo
   com que a linha vai ser desenhada (P-02). A função ainda **deixa o estado global da fonte
   alterado** para quem chamar a seguir;
2. divide o texto por `\n` (`:2449-2450`) e usa `splitTextToSize` (`:2451-2455`);
3. *fallback* caractere a caractere para tokens que não cabem (`:2463-2501`) — quebra emails e
   palavras ao meio (aceitável, mas invisível no contrato);
4. se `lines.length > maxLines`, corta e acrescenta `…` (`:2508-2544`), com um `while` que encolhe
   a última linha até caber — **é aqui que nascem os textos truncados**.

### 6.2 Quem chama e com que estilo real

| Chamada | Estilo medido | Estilo desenhado | Risco |
| --- | --- | --- | --- |
| Células (`:1343`) | sans `normal` 8 | sans `normal` 8 (`:1437-1441`) | nenhum ✓ |
| Parágrafos (`:963`) | sans `normal` 9 | sans `normal` 9 (`:971-975`) | nenhum ✓ (mas `maxLines = 14`) |
| **Valores de pares** (`:854`) | sans `normal` 9 | sans **`bold`** 9 (`:894-898`) | **sobreposição** (P-02) |
| **Rótulos de KPI/valor** (`:775`) | serif `normal` 13 | serif **`bold`** 13 (`:765-769`) | re-partição (P-11) |
| **Cabeçalhos de tabela** | medida em `measureTextWidth` `normal` | sans **`bold`** 8 (`:1258`) | 2.ª linha fora da banda (P-02) |
| Título de secção (`:593`) | serif `normal` 12,5 | serif **`bold`** (`:585-589`) | re-partição do título |
| Legenda/alt (`:1021-1040`) | sans `normal` 8 | sans **`bold`**/`italic` 8 (`:1099`, `:1133`) | quebra extra dentro do bloco da imagem |

### 6.3 Casos especiais de envoltório

- **Dinheiro**: `formatMoney` (`format.ts:77`) usa U+202F; `splitTextToSize` quebra nesse ponto
  → P-06 (282 ocorrências em 70 linhas × 4 colunas).
- **Contactos**: `formatContactValue` devolve `parts.join("\n")` (`:230`) e as células **não**
  passam por `sanitizeText` (`:1330`) → a quebra intencional sobrevive ✓. Mas os *pairs* passam
  (`:855`) e os parágrafos também (`:953`) → `\n` intencional é silenciosamente colapsado
  (P-14).
- **`sanitizeText`** (`format.ts:108-115`) colapsa qualquer sequência de espaço/control em um
  espaço só — bom para cabeçalhos, errado para campos multi-linha.
- **`maxLines`**: 3 nas células, 14 nos parágrafos, 1 nos totais, 2 no título de secção, 3 na
  legenda/alt. Nenhum destes tetos está no contrato `ReportDefinition` (P-12).

---

## 7. KPIs (`renderKpis`, `:649-830`)

Grelha: `perRow = min(4, max(2, floor(757,89 / 170)))` = 4 (`:663-671`), `gap = 10`,
`cardHeight = 50` (`:673-674`), `cardWidth = (757,89 − 30) / 4 ≈ 181,97` (`:676-679`).

| Elemento | Posição | Orçamento | Problema |
| --- | --- | --- | --- |
| Rótulo (7 pt bold, `upper`) | `y + 14`, `maxWidth = cardWidth − 20` (`:752-763`) | nenhum | 2 linhas → termina em 247,4 com o valor a começar em 247,1 (**toque de 0,3 pt**); 3 linhas → sobreposição directa |
| Valor (13 pt serif bold) | `y + 34` (`:786-796`) | `wrap(..., maxLines = 1)` em `normal` | medido em `normal`, desenhado em `bold` → re-partição não prevista |
| *Hint* (6,8 pt) | `y + 45`, `maxWidth = cardWidth − 20` (`:809-820`) | nenhum | 2 linhas → `textBottom = 278,1` vs `cardBottom = 273,3` → **fuga de 4,8 pt**; 3 linhas → colide com a linha seguinte de cartões (linha seguinte em `y + 60`) |
| Reserva por linha de cartões | `ensureSpace(cardHeight + gap)` = 60 (`:692`) | ✓ para o rectângulo | não cobre o conteúdo que sai do rectângulo |

Medido com rótulo longo + *hint* de 3 linhas: `cardSpill` = 1 (`fuga 4,8 pt`), rótulo em
`231,8–239,4` + `239,9–247,4`, valor em `247,1–261,2`.

---

## 8. Cabeçalho, rodapé e capa

### 8.1 Passe de mobiliário (`renderPageFurniture`, `:1953-2037`)

O cabeçalho/rodapé são desenhados **depois** de todo o conteúdo, num segundo passe que percorre
todas as páginas (`:1960-1973`). Consequências: (a) o mobiliário nunca "empurra" conteúdo — se o
conteúdo invadir a banda, há sobreposição visual; (b) tudo o que o cabeçalho desenha é *independente*
do layout do corpo.

### 8.2 Cabeçalho (`drawHeader`, `:2039-2223`)

- Marca `MUXIMA` em `y = 30` (`:2052-2056`); `reportName` alinhado à direita com
  `maxWidth = 0,55 × 757,89 ≈ 416,8` (`:2067-2079`); nome do evento por baixo com o mesmo
  `maxWidth` (`:2094-2107`); filete em `y = 48` (`:2121-2140`).
- **1.ª página**: grelha de 2 colunas, `metaStartY = 64`, `y = 64 + row × 13`
  (`:2151-2178`), etiqueta com `maxWidth = 75` e valor com `maxWidth = metaColumnWidth − 78`
  (= 273,4). **Sem teto de linhas nem verificação contra `CONTENT_TOP` ou a capa** (P-09):
  - `context.meta ≥ 5` → colisão com o título da capa (2 caixas, `oy = 3,3`);
  - `context.meta ≥ 8` → caixas em `123,4–131,2`, a cruzar `CONTENT_TOP = 128`.
- Nomes longos: 2.ª linha do `reportName` colide com o nome do evento (**ox = 132,5, oy = 8,1**).

### 8.3 Rodapé (`drawFooter`, `:2225-2307`)

`y = 595,28 − 34 + 10 = 571,28`; filete em `562,28`; marca em `571,28`; nome do evento em
`x = 94` com `maxWidth = 577,89` (`:2276-2287`); número de página alinhado à direita
(`:2298-2306`). Com nome de evento muito longo o jsPDF divide em 4 linhas
(`565,7 / 573,9 / 582,2 / 590,5`) → **fundo 598,3 > 595,28**: o texto sai da folha
(`furnitureOffPage = 1`).

### 8.4 Capa (`renderCover`, `:417-519`)

| Passo | Código | Problema |
| --- | --- | --- |
| Título em `CONTENT_TOP + 4` com `maxWidth` | `:420-437` | baseline acima de `CONTENT_TOP` → tinta em 114,8 (colide com a meta, P-09) |
| `y += 22 × 1.2` | `:439` | avanço de **uma** linha para um texto que pode ter 2 → subtítulo sobrepõe-se |
| Subtítulo, nome do evento, filete | `:441-516` | usam `wrap` ✓ mas herdam o `y` errado |
| `cursorY = y + 20` | `:518` | sem reserva de página para o que vem a seguir |

A capa **não força quebra de página**: o conteúdo começa logo a seguir (`cursorY`),
razoável, mas significa que qualquer erro do `y` propaga-se para o primeiro bloco.

---

## 9. Alinhamento

### 9.1 Regras implementadas

- **Colunas**: `alignFor` (`:312-328`) — `column.align` explícito, senão `right` para
  `money`/`number`/`percent`, senão `left`. Âncora: `x + width − 5` (direita),
  `x + width / 2` (centro), `x + 5` (esquerda) (`:1245-1256`, `:1447-1459`).
- **Totais**: mesma âncora e `align` das colunas (`:1644-1679`).
- **Títulos/capa/parágrafos/pares**: `x = MARGIN_X` (esquerda) ✓.
- **Cabeçalho**: marca à esquerda, `reportName` e nome do evento à direita (`align: "right"`).
- **Rodapé**: marca à esquerda, evento à esquerda (`x = 94`), página à direita.
- **Legenda/alt da imagem**: centradas (`align: "center"`, `:1122`, `:1156`).
- **Verticais**: cabeçalho de tabela com âncora `y + headerHeight/2 + 3` (`:1263-1266`) —
  âncora fixa para **uma** linha; células linha a linha (`:1466-1472`) ✓; títulos de secção com
  `baseline = cursorY` (`:605`) — âncora **acima** do cursor.

### 9.2 Onde o alinhamento se quebra

1. **Largura negativa (P-01)**: `x + width − 5` fica *antes* de `x` → o texto alinhado à direita
   da última coluna é desenhado à esquerda dela, sobre as colunas anteriores, e o `x += width`
   seguinte arrasta tudo;
2. **Cabeçalho com 2 linhas (P-02)**: a âncora `y + 14` é fixa, logo a 2.ª linha cai a
   `y + 23,2 > 22` (banda) — a centralização vertical pretendida não existe para texto dividido;
3. **Título de secção**: `baseline = cursorY` significa que o bloco modelado começa *depois* da
   tinta → o alinhamento vertical com o bloco seguinte está sistematicamente 9,75 pt deslocado
   (oy = 3,3 medido contra o parágrafo anterior);
4. **Valores de pares/KPI**: o jsPDF realinha cada linha que ele próprio dividiu, enquanto o
   modelo avançou com 1,35 → as linhas ficam com passo 10,35 em vez de 12,15 (P-02).

---

## 10. Comportamento com relatórios extensos

### 10.1 O que aguenta bem

- **Tabelas de 500+ linhas**: a paginação é por linha (`:1380-1396`), sem alocação global do
  documento inteiro — `renderTable` nunca acumula estado proporcional ao nº de linhas para além
  das linhas formatadas. Fills intermediários 554/561 pt (folga 7 pt) em relatórios de 60 e 70
  linhas.
- **Determinismo**: o teste `deterministic output` garante que o mesmo `ReportDefinition`
  produz bytes idênticos — a paginação não depende de estado aleatório.
- **Conteúdo não desce de `CONTENT_BOTTOM`**: nas varreduras, `contentBottom = 0`; o `LINE_HEIGHT
  = 1,35` (vs 1,15 do jsPDF) dá margem.

### 10.2 O que degrada

| Escala | Efeito | Problema |
| --- | --- | --- |
| +1 por linha de tabela | 1 iteração de `formatCellValue` + `wrap` por célula; sem crescimento de memória notável até milhares de linhas | sem issue estrutural |
| `nrows × ncols` com texto longo | nº de células truncadas cresce linearmente: **90** com 8 col × 30 linhas (vs 6 no caso de 11 col curto) | P-12 |
| `context.meta ≥ 5` | colisão meta ⊓ capa; `≥ 8` cruza `CONTENT_TOP` | P-09 |
| `nsections` elevado | mais oportunidades de título órfão (varredura `n = 1..60` → 3 falhas) | P-07/P-13 |
| Colunas com somatório de mínimos > 757,89 | largura negativa (basta 12 colunas com cabeçalhos médios) | P-01 |
| Evento/relatório com nomes longos | cabeçalho re-parte; rodapé sai da folha | P-10 |

### 10.3 Falhas de escala **reprodutíveis** (medições finais)

- 16 colunas → `[..., −875,3]`; 12 col → `[..., −429,2]`; 8 col → última coluna `8,0` pt.
- Fornecedores (9 col, 70 linhas) → **282** células monetárias partidas no U+202F, **4** totais
  truncados.
- Inventário (11 col, 60 linhas) → **60/60** linhas com money partido; cabeçalho com 2 linhas em
  **5/5** páginas.
- Parágrafo de 300 palavras → 15.ª linha perdida (`…`).

---

## 11. Arquitetura — pontos de acoplamento e contratos implícitos

### 11.1 Fluxo de dados

```
ReportDefinition (contracts/report-definition.ts)
   └─ renderReport(ctx, def)  →  MuximaPdfLayout(ctx)
        ├─ buildCover/cover + meta (buildMeta: 4 fixos + ctx.meta)
        ├─ renderKpis / renderPairs / renderParagraph
        ├─ renderSectionTitle → ensureSpace(headerHeight + 20)
        ├─ renderTable → resolveColumnWidths → wrap(MAX_CELL_LINES) → renderTotals
        ├─ renderImage → shrink & split
        └─ finish(): renderPageFurniture → percorre TODAS as páginas (addPage/restore)
```

### 11.2 Contratos implícitos (P-14)

| Contrato implícito | Onde | Risco |
| --- | --- | --- |
| Formatação de `phone`/`email` decide-se pelo **texto** do header/chave | `isContactColumn` (`:233-247`) | renomear um header quebra silenciosamente o formato |
| `format`/`kind` de coluna não existe | `ReportColumn` | impossível pedir "right, sem truncar" |
| `ReportImage.data` é base64 **sem** prefixo `data:` e `format` ∈ {png, jpeg} | `:1176-1177`, `reports/invite.ts` | data-URL "normal" estoura `addImage` |
| `\n` sobrevive só nas células | `sanitizeText` chamado em `:854/953`, **não** em `:1330` | multi-linha inconsistente por tipo de bloco |
| `align` por texto: `money`/`number`/`percent` → direita | `alignFor` (`:312-328`) | coluna monetária escrita como texto alinha à esquerda |
| `maxLines` 1/3/14 fixos | `:103-104`, `:1653` | nenhum é comunicado ao chamador |

### 11.3 Causa-raiz da fragilidade

O motor mistura três responsabilidades num único ficheiro de 2578 linhas: **medição**
(`measureTextWidth`, `wrap`, `resolveColumnWidths`), **decisão de página** (`ensureSpace`,
`renderTable`, `renderImage`) e **desenho** (`drawHeader`, `drawTable`, `drawFooter`). Não existe
um *layout engine* intermédio que produza um plano (caixas + páginas) e um *renderer* que o
materialize — por isso qualquer divergência entre medir e desenhar só se descobre **no PDF
final**, e os sintomas espalham-se por funções distantes (a largura negativa nasce em
`resolveColumnWidths:1917` mas só se vê no `drawTable:1447`).

---

## 12. Testes actuais

### 12.1 O que existe (`packages/api/src/exports/__tests__/renderers.test.ts`)

| Teste | Asserção | Geometria? |
| --- | --- | --- |
| `renders valid PDF header` | `buffer.toString(0,5) === "%PDF-"` | não |
| `generates PDF buffer of reasonable size` | `buffer.length > 10000` | não |
| `pagination works` | `buffer.length > 10000` ("paginates rather than clipping") | **não** (tamanho ≠ nº de páginas) |
| `deterministic output` | bytes idênticos entre execuções | não |
| `does not crash on large data` | `expect(() => ...).not.toThrow()` | não |
| `embeds QR code image` | `buffer.length > 15000` | não |
| `anonymous user` | corren sem `ctx.user` | não |

Outros ficheiros de teste: `export-registry.test.ts` (registry de formatos), `invitation-report.test.ts`
(nº de secções do *definition*). **Zero** asserções sobre `cursorY`, larguras, sobreposição,
número de páginas ou truncamentos.

### 12.2 Por que é que isto não apanha nada do §2

Todos os problemas desta auditoria produzem **PDFs válidos, grandes e determinísticos** — exactamente
os três únicos sinais que os testes observam. Um teste que verificasse `resolveColumnWidths`
retornando `[-429,2]` falharia instantaneamente; nenhum o faz porque a função é `private` e o
contrato só se exprime no ficheiro final.

---

## 13. Testes recomendados (proposta; não escritos)

### 13.1 Unitários (sem gerar PDF)

1. **`resolveColumnWidths`**: tabela *property-based* com `ncols ∈ [1..20]` e cabeçalhos
   aleatórios → invariante `∀i: width_i ≥ min_i` e `width_i > 0`. Caso 16 col = regressão.
2. **`measureTextWidth`/`wrap` paridade**: para cada estilo desenhado (`bold`, `italic`),
   `wrap(text, family, size, w)` deve satisfazer `measureTextWidth(linha, family, size, estilo) ≤ w`
   com o **estilo real**.
3. **`wrap` com dinheiro**: `"1 029 500,00 Kz"` nunca se divide em 2 linhas com largura ≥
   a largura da string medida.
4. **`renderTotals`**: nenhum valor truncado com `…` para colunas ≥ largo o suficiente
   (`maxLines = 1` → deve falhar ou reduzir corpo, não cortar).
5. **`isContactColumn`** (ou o seu substituto explícito): contrato fixado por teste.

### 13.2 Integração (gerar PDF e inspecionar geometria)

Usar o padrão já usado no harness: `jsPDF.API.events.push(["initialized", …])` para interceptar
`text`/`rect`/`addPage` e calcular sobreposições e limites. Cenários:

| Cenário | asserção |
| --- | --- |
| Tabela 16 colunas | `max(x1) ≤ 799,89`; nenhum `width ≤ 0` |
| 60 linhas + totais | nenhuma página com apenas a linha de totais (`fill < 30 %`) |
| 13 linhas + totais | p2 tem ≥ 1 linha de dados além dos totais |
| Comprimento de pares 180–420 | `overlap = 0` (detectado pelo interceptor) |
| Título de secção após parágrafo | `overlap = 0`; `title.top ≥ 128` em página nova |
| Imagem com legenda + alt ao piso da página | imagem, legenda e alt na **mesma** página |
| `context.meta = 8` | nenhuma caixa de meta < `128`; sem interseção com a capa |
| Rodapé com nome de 450 chars | `max(y1) ≤ 595,28` |
| Parágrafo de 300 palavras | nº de linhas = nº esperado, **sem** `…` |
| KPI com rótulo/`hint` de 2–3 linhas | todo o texto dentro do rectângulo do cartão |

### 13.3 *Snapshot* de PDF

Manter o teste de determinismo, mas **além** dele: um *snapshot* do número de páginas e da
*folga final* de cada página (`CONTENT_BOTTOM − max(y1)`) por relatório real
(inventário/fornecedores/convite) — qualquer regressão de paginação torna-se visível.

---

## 14. Plano de correcção por prioridade

### Fase 1 — Integridade de dados (Crítica/Alta, sem mudança de arquitectura)

1. **P-01** `resolveColumnWidths`: atribuição com mínimos factíveis (redistribuir a escassez
   entre todas as colunas acima do mínimo; falhar explícito ou reduzir corpo/alternar de folha se
   Σ mínimos > `CONTENT_WIDTH`). Nunca `width ≤ 0`.
2. **P-05** Totais: largura mínima própria da linha de totais; redução de corpo como recurso
   explícito; nunca `…` num agregado.
3. **P-06** Quebra de dinheiro: tratar o valor formatado como token indivisível em `wrap`.

### Fase 2 — Um único modelo de medição (Alta)

4. **P-02** `measureTextWidth`/`wrap` com **estilo** (`bold`/`normal`), usado também em
   `resolveColumnWidths`, `renderSectionTitle`, `renderCover`, `renderKpis`; documentar que
   `wrap` deixa a fonte em `normal`.
5. **P-07** Título de secção: âncora da tinta a partir de `cursorY` + reserva calculada sobre
   `wrap(..., maxSize = 2)` real.

### Fase 3 — Reservas honestas (Alta)

6. **P-03** Reserva atómica cabeçalho + 1.ª linha (`rowHeight` calculada antes de `drawHeader`).
7. **P-08** Imagem: `textBlock` = altura real (incl. `+8/+4/+12`); calcular o `ratio` **depois**
   de saber a página final.
8. **P-04** *Keep-together* dos totais com as últimas N linhas (ou repetir cabeçalho + mínimo de
   linhas na página nova).
9. **P-13** `ensureSpace` com noção de encadeamento título+bloco.

### Fase 4 — Contratos e extremos (Média)

10. **P-11** Orçamento de linhas por cartão de KPI (medir rótulo/valor/*hint* com estilo real).
11. **P-09/P-10** Capa e cabeçalho/rodapé: limitar linhas, reservar, travar `y` dentro de
    `HEADER_BLOCK`/`FOOTER_BLOCK`.
12. **P-12** Tornar `maxLines` explícito no contrato ou removê-lo com truncamento audível.
13. **P-14** `column.format: "contact"` + regra única de `\n`.

### Fase 5 — Arquitectura e testes (Baixa, preparatória)

14. Separar *medição/decisão de página* (plano) de *desenho* (execução), para poder testar o
    plano sem gerar PDF.
15. Automatizar o interceptor `jsPDF.API.events` como utilitário de teste (13.2) e o *snapshot*
    de páginas/folga (13.3).

---

## 15. Critérios de aceitação

Todos mensuráveis com o interceptor de geometria (§13.2); nenhum requer alterar
`ReportDefinition`/`ExportContext`.

| # | Critério | Verificação |
| --- | --- | --- |
| A1 | `resolveColumnWidths` devolve `∀i: w_i ≥ mínimo_i > 0` para `ncols ∈ [1..20]` | teste unitário (13.1.1) |
| A2 | Nenhum `x1` da tabela > `799,89` nem `y1` > `561,28` em qualquer relatório real + 16 col | `contentRight`/`contentBottom` do interceptor |
| A3 | Nenhuma interseção de caixas de texto (`overlap = 0`) nos cenários de pares/título/KPI/cabeçalho | detector de sobreposição |
| A4 | Nenhuma página com fill < 40 % que não seja a última do documento (órfãos) | `pageFill` por página |
| A5 | `renderTotals`: **zero** caixas com `…`; todos os agregados íntegros | busca `…` no texto extraído |
| A6 | `formatMoney` nunca é dividido: `moneySplit = 0` nos relatórios reais | detector `moneySplit` |
| A7 | Cabeçalho de tabela e a sua 1.ª linha na mesma página em todos os cenários da janela `(508,5 ; 519,28]` | varredura (§2.3) |
| A8 | Imagem, legenda e alt na mesma página em `n = 0..70` pares antes | varredura (§2.5) |
| A9 | Meta da 1.ª página: `min(top) ≥ 128` para `context.meta ≤ 8` e sem interseção com a capa | varredura |
| A10 | Rodapé: `max(y1) ≤ 595,28` para nome de evento ≤ 500 chars | `furnitureOffPage = 0` |
| A11 | Parágrafo de 300 palavras: todas as linhas sem `…` (ou corte documentado no contrato) | texto extraído |
| A12 | Todos os testes da §13 verdes em CI, mantendo determinismo byte-a-byte | `pnpm --filter @muxima/api test:run` |

---

*Fim da auditoria. Nenhum ficheiro de produção foi alterado; as medições provêm de aplicações
temporárias fora do repositório (`/tmp/opencode/pdfaudit`), removidas com a sessão.*

