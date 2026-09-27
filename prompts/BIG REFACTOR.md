# BIG REFACTOR — FORNECEDORES, BUDGET, ALIMENTAÇÃO, CHECKLIST E INTEGRAÇÃO DE MÓDULOS

## 0. CONTEXTO

Vamos executar uma **big refactor de negócio e arquitetura no Muxima**.

Esta não é uma simples implementação de UI. Existem alterações de domínio, banco de dados, APIs, queries, mutations, seeds, regras de negócio, remoção de funcionalidades antigas e criação de novos módulos.

O objetivo é fazer o sistema evoluir para um modelo em que:

* fornecedores possuem gestão completa;
* pagamentos possuem estado e histórico;
* comprovativos podem ser anexados;
* o Budget deixa de ser um CRUD manual;
* o Budget passa a ser uma **visão agregadora de custos de todos os módulos que possuem preço**;
* Inventory continua sendo responsável pelos preços dos seus produtos;
* alimentação passa a ser um módulo independente e **sem preços**;
* determinadas categorias deixam de pertencer ao Inventory;
* fornecedores passam a possuir campos específicos por categoria;
* campos customizados devem ser suportados;
* checklist pode ser associado a fornecedores e inventário;
* o progresso da checklist deve ser atualizado automaticamente de acordo com regras de negócio;
* a página do evento passa a apresentar countdown e resumo financeiro;
* todas as estatísticas devem vir do backend;
* o frontend NÃO deve calcular métricas de negócio;
* toda a implementação deve ser type-safe;
* testes devem proteger as alterações.

---

# 1. REGRA FUNDAMENTAL DA IMPLEMENTAÇÃO

Antes de alterar qualquer código:

1. Auditar a arquitetura atual.
2. Identificar todas as entidades existentes relacionadas com:

   * Event
   * Budget
   * Expenses
   * Suppliers
   * Inventory
   * Inventory categories
   * Dispensas
   * Payments
   * Files/attachments
   * Checklist, caso exista parcialmente
   * Food/meal-related entities, caso existam
3. Identificar todas as relações Prisma existentes.
4. Identificar todas as APIs/orPC procedures/controllers/services.
5. Identificar todas as queries/mutations do frontend.
6. Identificar todas as rotas e dialogs que serão removidos.
7. Identificar todas as seeds afetadas.
8. Identificar testes existentes.
9. Procurar cálculos feitos atualmente no frontend.

Não assumir que o código atual segue exatamente este prompt.

Primeiro entender o domínio atual.

Depois apresentar internamente um plano de migração.

Só então executar.

---

# 2. PRINCÍPIOS OBRIGATÓRIOS

## Backend é a fonte da verdade

O frontend deve ser apenas consumidor.

É proibido fazer no frontend cálculos como:

```ts
expenses.reduce(...)
products.reduce(...)
suppliers.reduce(...)
totalPaid = ...
totalPending = ...
totalBudget = ...
```

Se um dado representa uma métrica de negócio, deve existir no backend.

Exemplos:

```text
totalBudget
totalSpent
totalPending
supplierTotal
inventoryTotal
foodTotal
mostExpensiveSupplier
cheapestSupplier
topSpendingCategory
topSpendingProduct
paymentProgress
```

Tudo deve ser calculado no backend.

O frontend apenas consome:

```ts
const { data } = useBudgetStats(eventId);
```

e apresenta.

---

# 3. TYPESAFE

Toda a implementação deve ser type-safe.

Obrigatório:

* TypeScript strict;
* schemas Zod onde aplicável;
* tipos derivados dos schemas;
* nenhuma utilização desnecessária de `any`;
* validação backend;
* validação frontend;
* enums centralizados;
* evitar strings mágicas;
* reutilizar tipos existentes quando fizer sentido.

Não duplicar tipos manualmente quando estes podem ser derivados do backend/schema.

---

# 4. FORNECEDORES — NOVO MODELO DE NEGÓCIO

O módulo de fornecedores deve ser completamente evoluído.

Ao criar um fornecedor devem existir:

### Informações gerais

* nome;
* categoria;
* contacto;
* telefone;
* email;
* endereço;
* descrição;
* preço;
* status;
* campos específicos da categoria;
* campos customizados.

---

# 5. PREÇO DO FORNECEDOR

Um fornecedor deve poder possuir um preço.

Exemplo:

```text
Fornecedor: Decorações Muxima
Preço: 850.000 Kz
```

Este preço deve entrar posteriormente no Budget agregado.

---

# 6. ESTADO DE PAGAMENTO DO FORNECEDOR

Criar um modelo completo de pagamento.

O sistema deve suportar pelo menos:

```text
NÃO PAGO
PAGO
PARCELADO
```

Não tratar simplesmente como boolean.

O estado deve representar o estado real do pagamento.

Exemplo:

```text
Preço total: 1.000.000 Kz

Pago:
300.000 Kz

Pendente:
700.000 Kz
```

---

# 7. PAGAMENTO PARCELADO

Quando o fornecedor estiver configurado como parcelado:

```text
Número de parcelas
```

deve ser opcional.

Caso o utilizador escolha parcelas, deve poder definir cada parcela.

Exemplo:

```text
Parcela 1
Valor: 300.000 Kz
Data limite: 10/10/2026
Estado: PAGO

Parcela 2
Valor: 300.000 Kz
Data limite: 10/11/2026
Estado: PENDENTE

Parcela 3
Valor: 400.000 Kz
Data limite: 10/12/2026
Estado: ATRASADA
```

O sistema deve detectar automaticamente parcelas atrasadas.

Uma parcela está atrasada quando:

```text
dueDate < currentDate
AND status != PAID
```

O backend deve determinar isso.

Nunca o frontend.

---

# 8. ESTADOS DE PARCELA

Criar estados adequados, por exemplo:

```text
PENDING
PAID
OVERDUE
```

Se necessário, separar:

```text
payment status
installment status
```

para não criar um modelo inconsistente.

---

# 9. MODELO DE PAGAMENTO

O fornecedor deve possuir um modelo/método de pagamento.

Exemplos:

```text
TRANSFERÊNCIA BANCÁRIA
DINHEIRO
MULTICAIXA
TPA
DEPÓSITO
OUTRO
```

O modelo deve ser extensível caso o domínio atual já tenha uma enumeração apropriada.

---

# 10. COMPROVATIVOS DE PAGAMENTO

O fornecedor deve permitir anexar comprovativos.

Formatos permitidos:

```text
PDF
JPG
JPEG
PNG
WEBP
```

Não é obrigatório anexar.

Os ficheiros devem ser associados ao pagamento correspondente quando aplicável.

Preferencialmente:

```text
Supplier
  └── Payments
       └── PaymentAttachments
```

e não simplesmente colocar todos os ficheiros diretamente no Supplier.

Se o sistema atual possuir uma abstração de files/attachments, reutilizá-la.

Não criar outro sistema de ficheiros sem necessidade.

---

# 11. VIEW DETAILS DO FORNECEDOR

Adicionar:

```text
View details
```

Ao abrir:

```text
SupplierDetailsDialog
```

deve apresentar as informações completas.

Organizar o dialog por secções:

### Informações gerais

* nome;
* categoria;
* contacto;
* descrição;
* status.

### Informações específicas

Campos dependentes da categoria.

### Financeiro

* preço total;
* total pago;
* total pendente;
* número de parcelas;
* próxima parcela;
* parcelas atrasadas;
* estado de pagamento.

### Comprovativos

Lista de ficheiros.

### Histórico

Histórico de pagamentos.

### Chart

Adicionar gráfico de pagamentos.

Exemplo:

```text
Total
Pago
Pendente
Atrasado
```

O gráfico deve utilizar dados calculados pelo backend.

---

# 12. STATS DOS FORNECEDORES

Criar endpoint/query específico para estatísticas.

Exemplos:

```text
totalSuppliers
totalSupplierCost
totalPaid
totalPending
totalOverdue
mostExpensiveSupplier
cheapestSupplier
supplierCountByCategory
supplierSpendingByCategory
```

Também considerar:

```text
topSupplierCategories
topSpendingSuppliers
paymentCompletionPercentage
```

Não calcular nada disso no frontend.

---

# 13. IMPORTANTE — INVENTORY JÁ POSSUI PREÇOS

O Inventory já possui um sistema de preços.

NÃO duplicar essa lógica.

O novo Budget deve consumir a fonte existente do Inventory.

Primeiro entender:

```text
Inventory
Product
Stock
Price
Quantity
Category
```

e determinar exatamente qual valor representa custo financeiro para o Budget.

Não inventar uma nova regra de preço.

---

# 14. BIG ALTERAÇÃO — BUDGET

Esta é uma das alterações mais importantes.

Atualmente o Budget é cadastrado manualmente.

Isso deve deixar de existir.

O Budget NÃO deve mais funcionar como:

```text
criar orçamento
adicionar expense
editar expense
remover expense
```

O Budget passa a ser uma **visão financeira agregada do evento**.

---

# 15. REMOVER O BUDGET MANUAL

Remover progressivamente:

* CRUD manual de expenses;
* criação manual de budget items;
* dialogs relacionados;
* mutations relacionadas;
* endpoints/procedures que deixam de ter utilidade;
* componentes;
* hooks;
* queries;
* schemas;
* tipos;
* rotas;
* navegação;
* seeds antigas.

Antes de apagar qualquer coisa, procurar referências em todo o monorepo.

Não deixar código morto.

---

# 16. DESTRUIR RELAÇÃO DISPENSA ↔ INVENTÁRIO

A relação atual entre:

```text
Dispensa ↔ Inventory
```

deve ser removida.

Remover:

### Backend

* relação Prisma;
* campos;
* procedures;
* services;
* validation;
* queries;
* mutations;
* seeds;
* testes relacionados à relação.

### Frontend

* campos;
* selects;
* dialogs;
* queries;
* mutations;
* componentes;
* rotas;
* links.

---

# 17. REMOVER POSSIBILIDADE DE ADICIONAR DISPENSAS AO BUDGET

O Budget não deve mais permitir:

```text
Add expense
Add dispensa
Add budget item
```

O orçamento é derivado dos módulos.

---

# 18. NOVO CONCEITO DO BUDGET

O Budget passa a representar:

```text
SUM(all financial sources of the event)
```

Exemplo:

```text
Budget total: 5.000.000 Kz

Inventory: 2.000.000 Kz
Suppliers: 2.500.000 Kz
Other financial modules: 500.000 Kz
```

O sistema deve ser preparado para receber novas fontes no futuro.

---

# 19. ARQUITETURA DE BUDGET

Criar uma camada de agregação.

Conceitualmente:

```text
Budget Aggregator
    ├── Inventory
    ├── Suppliers
    ├── Future financial modules
    └── ...
```

Evitar espalhar cálculos por controllers.

Criar uma service/domain layer responsável por agregar os valores.

Exemplo conceitual:

```ts
getEventBudget(eventId)
getEventBudgetStats(eventId)
getEventBudgetBreakdown(eventId)
```

---

# 20. BUDGET BREAKDOWN

A página Budget deve mostrar quanto cada módulo representa.

Exemplo:

```text
Inventory        2.000.000 Kz
Suppliers        1.500.000 Kz
Other            500.000 Kz
```

Chart:

```text
Inventory
Suppliers
Other
```

---

# 21. SPENDING ANALYTICS

Criar dados como:

```text
totalBudget
totalSpent
totalPending
totalOverdue
```

e:

```text
spendingByModule
spendingByCategory
topSpendingProducts
topSpendingSuppliers
```

Também identificar:

```text
mostExpensiveProduct
mostExpensiveSupplier
mostExpensiveCategory
```

---

# 22. INVENTORY ANALYTICS NO BUDGET

Exemplo:

```text
Inventory total: 2.000.000 Kz
```

Depois:

```text
Alimentos: 900.000 Kz
Decoração: 500.000 Kz
Equipamentos: 300.000 Kz
Outros: 300.000 Kz
```

E:

```text
Produto A — 500.000 Kz
Produto B — 300.000 Kz
Produto C — 150.000 Kz
```

Tudo calculado pelo backend.

---

# 23. FORNECEDOR VS INVENTÁRIO

O Budget deve permitir responder:

```text
Quanto já foi gasto com fornecedores?
Quanto já foi gasto no inventário?
Qual módulo representa maior custo?
Quanto está pendente?
Quanto está atrasado?
```

Sem criar ranking editorial ou qualquer avaliação subjetiva.

São apenas métricas financeiras.

---

# 24. EVENT DETAIL — COUNTDOWN

Na rota:

```text
/events/:eventId
```

adicionar um card de countdown.

Exemplo:

```text
Faltam 10 dias
```

Ou:

```text
Falta 1 dia
```

Ou:

```text
É hoje
```

Ou:

```text
Evento realizado
```

O backend deve fornecer os dados necessários para determinar o estado do evento.

Evitar colocar regras de negócio complexas no frontend.

O frontend pode apenas formatar a apresentação.

---

# 25. EVENT DETAIL — BUDGET CARD

Na mesma página:

```text
/events/:eventId
```

adicionar um card de Budget.

Utilizar o componente:

```text
StatCard
```

com chart.

Exemplo:

```text
Budget

5.000.000 Kz

Spent
3.200.000 Kz

Pending
1.800.000 Kz
```

Chart:

```text
Inventory
Suppliers
Other
```

O componente deve receber dados já agregados pelo backend.

---

# 26. NOVO MÓDULO — PLANO DE ALIMENTAÇÃO

Criar um novo módulo:

```text
Food Plan
Plano de Alimentação
```

Objetivo:

Permitir aos noivos planearem e visualizarem toda a alimentação prevista para o evento.

O módulo NÃO possui preços.

---

# 27. OBJETIVOS DO FOOD PLAN

O utilizador deve conseguir definir:

```text
Entradas
Pratos principais
Acompanhamentos
Sobremesas
Frutas
Doces
Outros
```
NOTA: É POSSIVEL Relacionar um Fornecedor com o plano de alimentação, isto pode ser possivel o usuário contrar alguém para atender o seu plano de alimentação ou cozinhar, isto só é possveil uma unica vez
Mas atenção:

### Doces e salgados NÃO pertencem ao Food Plan.

Eles pertencem a:

```text
Supplier
```

porque representam contratação de fornecedor.

---

# 28. FOOD PLAN — CAMPOS

Cada item pode possuir:

```text
name
category
quantity
unit
description
notes
status
```

Categorias devem ser modeladas corretamente.

Exemplo:

```text
STARTER
MAIN_COURSE
SIDE_DISH
DESSERT
FRUIT
OTHER
```

A lista deve poder ser expandida.

---

# 29. QUANTIDADES

O Food Plan deve ajudar a responder:

```text
Quantos pratos teremos?
Qual comida terá maior quantidade?
Quais alimentos estão previstos?
```

Exemplo:

```text
Frango grelhado — 150 doses
Arroz de legumes — 150 doses
Salada — 150 doses
```

---

# 30. CAMPOS CUSTOMIZADOS NO FOOD PLAN

Adicionar suporte a campos abertos.

Exemplo:

```ts
customFields: [
  {
    label: "Tipo de preparação",
    value: "Grelhado"
  },
  {
    label: "Observação",
    value: "Servir quente"
  }
]
```

Deve ser possível definir:

```text
field
value
```

sem alterar o schema sempre que o utilizador quiser guardar uma informação adicional.

---

# 31. FOOD PLAN — STATS

Criar stats no backend.

Exemplos:

```text
totalItems
totalQuantity
itemsByCategory
mostUsedCategory
largestQuantityItem
```

Não calcular no frontend.

---

# 32. FOOD PLAN — TABS

A página deve possuir pelo menos:

```text
Lista
Analytics
```

### Lista

Apresentar os alimentos.

### Analytics

Apresentar:

* stats;
* charts;
* distribuição por categoria;
* quantidades;
* itens mais representativos.

Tudo vindo do backend.

---

# 33. REMOVER CATEGORIAS DO INVENTORY

As categorias:

```text
Decoração
Alimentação
Bolos
```

não devem continuar como categorias do Inventory.

Remover do backend e frontend.

Mas atenção:

### Decoração

Deve ser tratada através de fornecedor quando aplicável.

### Alimentação

Deve ser tratada pelo Food Plan.

### Bolo

Deve ser tratado como Supplier.

Não simplesmente apagar informação sem migrar o conceito.

---

# 34. REMOVER "QUANTIDADE PARA O SALÃO" no inventory

Existe atualmente uma funcionalidade/campo relacionado a:

```text
quantidade para o salão
```

Remover:

* frontend;
* backend;
* schema;
* banco;
* seed;
* validação;
* UI;
* testes.

Fazer uma busca global para garantir que não ficou nenhuma referência.

---

# 35. FORNECEDORES — CAMPOS DINÂMICOS POR CATEGORIA

O fornecedor deve possuir campos específicos dependendo da categoria.

Não criar um formulário gigante com todos os campos.

O formulário deve ser contextual.

---

# 36. CATEGORIA — DECORAÇÃO

Exemplos de campos:

```text
cor principal
cor secundária
cor das cadeiras
cor das mesas
cor dos pratos
cor dos talheres
cor dos copos
tipo de decoração
tema
estilo
flores
iluminação
painel
mesa principal
cadeiras
toalhas
```

Preparar o sistema para adicionar outros campos.

---

# 37. CATEGORIA — FOTÓGRAFO

Campos possíveis:

```text
tipo de serviço
horas contratadas
quantidade de fotógrafos
quantidade de videógrafos
sessão pré-casamento
álbum
vídeo
drone
entrega digital
prazo de entrega
```

---

# 38. CATEGORIA — MÚSICA / DJ

Campos:

```text
tipo de música
DJ
banda
número de músicos
sistema de som
microfones
iluminação
palco
horas de atuação
playlist
```

---

# 39. CATEGORIA — ROUPA DO NOIVO

Criar categoria:

```text
GROOM_ATTIRE
```

Campos:

```text
tipo de traje
cor
tamanho
camisa
calça
casaco
gravata
sapatos
cinto
acessórios
ajustes
```

---

# 40. CATEGORIA — ROUPA DA NOIVA

Criar categoria:

```text
BRIDE_ATTIRE
```

Campos:

```text
tipo de vestido
tamanho
cor
modelo
véu
sapatos
acessórios
ajustes
```

---

# 41. CATEGORIA — BOLO DE NOIVA

O bolo NÃO pertence ao Food Plan.

Pertence a:

```text
Supplier
```

Criar campos adequados:

```text
tamanho
número de camadas
número de andares
sabor
recheio
cobertura
decoração
formato
cor
peso
topper
tema
```

---

# 42. CATEGORIA — ALIANÇAS

Criar suporte específico.

Campos:

```text
material
ouro
prata
platina
cor
tamanho
quantidade
gravação
modelo
peso
```

---

# 43. CATEGORIA — DOCES E SALGADOS

NÃO pertence ao Food Plan.

É Supplier.

Deve possuir estrutura para vários produtos.

Exemplo:

```ts
items: [
  {
    name: "Bolinho",
    quantity: 200
  },
  {
    name: "Rissol",
    quantity: 300
  },
  {
    name: "Coxinha",
    quantity: 250
  }
]
```

Este é um caso em que devemos utilizar um array estruturado.

---

# 44. OUTRAS CATEGORIAS DE FORNECEDOR

Auditar as categorias existentes e preparar campos adequados para pelo menos categorias como:

```text
DECORATION
PHOTOGRAPHER
VIDEOGRAPHER
DJ
BAND
CATERING
CAKE
BRIDE_ATTIRE
GROOM_ATTIRE
RINGS
SWEETS_AND_SAVORIES
VENUE
TRANSPORT
INVITATIONS
FLORIST
MAKEUP
HAIR
WEDDING_PLANNER
SECURITY
LIGHTING
SOUND
OTHER
```

Não criar campos arbitrários sem necessidade.

Para cada categoria:

1. identificar o objetivo;
2. identificar dados importantes;
3. criar schema;
4. criar UI contextual;
5. criar seed;
6. testar.

---

# 45. CUSTOM FIELDS — FORNECEDOR

Todo fornecedor deve poder possuir campos adicionais.

Estrutura conceitual:

```ts
customFields: [
  {
    label: string;
    value: string;
  }
]
```

Exemplo:

```text
Label: Instagram
Value: @empresa

Label: Horário de montagem
Value: 07:00
```

---

# 46. CUSTOM FIELDS — INVENTORY

Inventory também deve suportar:

```text
field
value
```

sem quebrar o modelo existente.

Não duplicar lógica.

Criar uma abstração reutilizável quando fizer sentido.

---

# 47. NOVO MÓDULO — CHECKLIST

Criar módulo:

```text
Checklist
```

Objetivo:

Permitir que os noivos criem listas de coisas importantes para o casamento.

Exemplo:

```text
☐ Alianças
☐ Vestido
☐ Fato do noivo
☐ Fotógrafo
☐ Bolo
☐ Decoração
```

---

# 48. CHECKLIST — MODELO

Uma checklist pertence a um evento.

Exemplo:

```text
Checklist
  ├── Event
  └── ChecklistItems
```

Cada item deve possuir:

```text
title
description
status
position
dueDate
```

O status deve permitir pelo menos:

```text
PENDING
COMPLETED
```

---

# 49. CHECKLIST + FORNECEDOR

Um item da checklist pode ser associado a um fornecedor.

Exemplo:

```text
Checklist item:
Alianças
```

Fornecedor:

```text
Fornecedor:
Joalharia X

Categoria:
Rings

Status:
CONFIRMED

Payment:
PAID
```

Quando estiver associado:

```text
Checklist Item = COMPLETED
```

desde que as regras estejam satisfeitas.

---

# 50. REGRA DE COMPLETION DO CHECKLIST

Para fornecedor:

```text
supplier.status === CONFIRMED
AND
supplier.paymentStatus === PAID
```

então:

```text
checklistItem.status = COMPLETED
```

Caso contrário:

```text
PENDING
```

Não permitir que o frontend determine isso.

O backend deve ser a autoridade.

---

# 51. CHECKLIST + INVENTORY

A mesma lógica deve funcionar com Inventory.

Exemplo:

```text
Checklist:
☐ 100 cadeiras
```

Inventory:

```text
Produto:
Cadeiras

Status/condição definida pelo domínio
Quantidade necessária atingida
```

Quando a regra de conclusão for satisfeita:

```text
ChecklistItem = COMPLETED
```

Definir claramente no backend qual condição representa "resolvido" para Inventory.

Não inventar uma regra apenas no frontend.

---

# 52. ASSOCIATION

O item da checklist deve poder guardar a referência ao recurso associado.

Evitar criar uma relação polimórfica frágil se a arquitetura atual permitir uma modelagem melhor.

Avaliar:

```text
supplierId
inventoryItemId
```

ou uma entidade de associação apropriada.

A solução deve ser type-safe e consistente com Prisma.

---

# 53. CHECKLIST — UI

Criar interface simples:

```text
Checklist
--------------------------------

☑ Alianças
☐ Vestido
☑ Fotógrafo
☐ Decoração
```

Mostrar claramente:

* progresso;
* total;
* concluídos;
* pendentes.

Stats calculados no backend.

---

# 54. CHECKLIST — AUTO SYNC

Quando fornecedor ou inventory associado sofrer alterações:

```text
supplier updated
inventory updated
```

o backend deve verificar as checklists associadas.

Atualizar automaticamente o status.

Não depender de refresh manual.

---

# 55. SEEDS

Atualizar completamente as seeds.

As seeds antigas que representam o modelo anterior devem ser removidas/alteradas.

Criar dados realistas para:

### Suppliers

Várias categorias:

```text
Decoração
Fotógrafo
DJ
Bolo
Alianças
Roupa da noiva
Roupa do noivo
Doces e salgados
```

### Payments

Criar:

```text
PAID
PENDING
INSTALLMENTS
OVERDUE
```

quando aplicável.

### Inventory

Criar produtos com:

* preço;
* categorias válidas;
* custom fields.

Não criar:

```text
Decoração
Alimentação
Bolos
```

como categorias de Inventory.

### Food Plan

Criar vários itens.

### Checklist

Criar itens associados a suppliers/inventory.

Criar cenários:

```text
completed
pending
overdue
```

para testar o domínio.

---

# 56. MIGRATIONS

As alterações devem ser feitas através de migrations corretas.

Não simplesmente apagar campos manualmente.

Antes da migration:

1. identificar dados existentes;
2. avaliar impacto;
3. preservar dados quando fizer sentido;
4. remover relações obsoletas;
5. criar novos campos;
6. executar migration;
7. executar seed;
8. validar integridade.

---

# 57. API DESIGN

Criar/ajustar endpoints/procedures para:

## Suppliers

```text
createSupplier
updateSupplier
deleteSupplier
getSupplier
listSuppliers
getSupplierStats
getSupplierPaymentStats
```

## Payments

```text
createPayment
updatePayment
markPaymentAsPaid
addInstallment
addPaymentAttachment
```

Não criar APIs desnecessárias se o sistema atual já possui abstrações equivalentes.

---

# 58. BUDGET API

Criar endpoints/procedures como:

```text
getEventBudget
getEventBudgetStats
getEventBudgetBreakdown
getEventSpendingByModule
getEventSpendingByCategory
getEventTopSpending
```

Os nomes devem seguir a convenção já utilizada pelo projeto.

---

# 59. FOOD PLAN API

Criar:

```text
createFoodPlanItem
updateFoodPlanItem
deleteFoodPlanItem
listFoodPlanItems
getFoodPlanStats
getFoodPlanAnalytics
```

---

# 60. CHECKLIST API

Criar:

```text
createChecklist
updateChecklist
deleteChecklist
listChecklists
createChecklistItem
updateChecklistItem
deleteChecklistItem
associateChecklistItem
```

A associação deve respeitar as regras de domínio.

---

# 61. FRONTEND — REGRAS

Frontend deve:

* consumir APIs;
* apresentar loading;
* apresentar error;
* apresentar empty states;
* invalidar queries;
* apresentar mutations;
* apresentar feedback;
* formatar números/datas;
* renderizar charts.

Frontend NÃO deve:

* calcular Budget;
* calcular pagamento;
* determinar overdue;
* determinar stats;
* determinar checklist completion;
* somar preços;
* duplicar regras do backend.

---

# 62. COMPONENTIZAÇÃO

Reutilizar componentes existentes.

Especialmente:

```text
StatCard
Chart
Dialog
DataTable
Tabs
EmptyState
ErrorState
```

Não criar componentes duplicados.

---

# 63. EVENT DETAIL

Na página:

```text
/events/:eventId
```

organizar os cards existentes sem transformar a página em uma dashboard excessivamente carregada.

Adicionar:

```text
Countdown Card
Budget StatCard
```

O Budget StatCard deve usar o sistema de chart já existente.

---

# 64. UX

Seguir os princípios existentes do Muxima:

* clean;
* enterprise;
* whitespace;
* sem excesso de cores;
* sem excesso de badges;
* sem UI "AI-generated";
* sem sombras desnecessárias;
* componentes consistentes;
* acessibilidade;
* responsive;
* loading states;
* empty states;
* error states.

Mensagens em:

```text
pt-PT
```

---

# 65. VALIDAÇÕES

Validar no backend:

### Supplier

```text
price >= 0
installments >= 1 quando informado
installment amount > 0
dueDate válido
sum(instalments) <=/== supplier price
```

Definir corretamente a regra de soma.

Idealmente:

```text
sum(instalments) === totalPrice
```

quando o fornecedor estiver em regime parcelado.

### Food Plan

```text
quantity >= 0
name obrigatório
category válida
```

### Checklist

```text
title obrigatório
position válida
association válida
```

---

# 66. PAGAMENTOS — INTEGRIDADE

Não permitir inconsistências como:

```text
Fornecedor = 100.000 Kz

Parcela 1 = 80.000
Parcela 2 = 80.000
```

porque:

```text
160.000 > 100.000
```

O backend deve rejeitar.

Também impedir:

```text
paidAmount > totalPrice
```

---

# 67. OVERDUE

A definição de atraso deve estar centralizada.

Exemplo:

```ts
isOverdue =
  dueDate < now &&
  paymentStatus !== PAID
```

Não duplicar esta regra em vários serviços.

Criar função/service de domínio reutilizável.

---

# 68. MONEY

Definir uma estratégia consistente para valores monetários.

Não utilizar floats para cálculos financeiros se o backend atual utilizar Decimal.

Respeitar o modelo existente do Prisma.

Garantir precisão.

---

# 69. TESTES — OBRIGATÓRIO

Esta refactor não está concluída sem testes.

Criar/atualizar:

### Unit tests

* payment status;
* installment status;
* overdue;
* supplier totals;
* budget aggregation;
* checklist completion;
* food plan stats.

### Integration tests

* supplier creation;
* supplier payment;
* installments;
* payment attachment;
* budget aggregation;
* food plan CRUD;
* checklist association;
* inventory/checklist association.

### API tests

Testar:

```text
400
401
403
404
409
500
```

quando aplicável.

---

# 70. TESTES DE REGRESSÃO

Garantir que as alterações não quebraram:

* autenticação;
* autorização;
* eventos;
* inventory;
* suppliers;
* tables;
* guests;
* budget;
* dialogs;
* navigation;
* event detail.

Executar a suíte existente.

---

# 71. TYPECHECK

Executar:

```bash
pnpm typecheck
```

ou o comando equivalente existente.

Corrigir TODOS os erros.

Não esconder erros com:

```ts
as any
@ts-ignore
@ts-expect-error
```

sem justificativa extremamente clara.

---

# 72. LINT

Executar lint.

Corrigir:

* imports;
* unused variables;
* dead code;
* duplicated code;
* unsafe types.

---

# 73. TESTES E2E

Criar/atualizar E2E para pelo menos:

### Supplier

```text
create supplier
configure payment
add installment
mark paid
view details
```

### Budget

```text
open budget
verify aggregated values
verify module breakdown
```

### Food Plan

```text
create food item
edit
delete
view analytics
```

### Checklist

```text
create checklist
associate supplier
supplier becomes confirmed + paid
verify checklist item completed
```

---

# 74. AUDITORIA GLOBAL

Depois da implementação, procurar no monorepo:

```text
Budget
Expense
Dispensa
Inventory
Supplier
Payment
Food
Checklist
```

Identificar:

* imports mortos;
* routes antigas;
* dialogs antigos;
* services antigos;
* queries antigas;
* mutations antigas;
* types antigos;
* schemas antigos;
* Prisma relations antigas;
* seeds antigas.

Remover o que ficou obsoleto.

---

# 75. NÃO FAZER

Não:

* duplicar sistema de preço do Inventory;
* calcular estatísticas no frontend;
* manter Budget manual parcialmente;
* manter a relação Dispensa ↔ Inventory escondida;
* manter rotas mortas;
* criar categorias inválidas no Inventory;
* colocar Bolo dentro de Food Plan;
* colocar Doces/Salgados dentro de Food Plan;
* colocar preços no Food Plan;
* criar um Supplier com todos os campos possíveis sempre visíveis;
* usar `any`;
* duplicar serviços;
* criar APIs que já existem;
* quebrar compatibilidade sem migration;
* apagar dados sem avaliar impacto.

---

# 76. ORDEM DE EXECUÇÃO

Executar nesta ordem:

## FASE 1 — AUDIT

Mapear:

```text
schema
relations
API
services
frontend
routes
dialogs
queries
mutations
seeds
tests
```

---

## FASE 2 — DOMAIN DESIGN

Definir:

```text
Supplier
SupplierPayment
SupplierInstallment
PaymentAttachment
FoodPlan
FoodPlanItem
Checklist
ChecklistItem
ChecklistAssociation
Budget aggregation
```

Validar se algumas entidades já existem e podem ser reutilizadas.

---

## FASE 3 — DATABASE

Implementar:

* migrations;
* relations;
* enums;
* indexes;
* constraints.

---

## FASE 4 — BACKEND

Implementar:

* Supplier;
* payments;
* installments;
* attachments;
* Supplier stats;
* Budget aggregation;
* Food Plan;
* Checklist;
* automatic checklist synchronization;
* event countdown data;
* event budget stats.

---

## FASE 5 — SEEDS

Atualizar seeds completamente.

Criar dados suficientes para testar todos os estados.

---

## FASE 6 — FRONTEND

Implementar:

* Supplier forms;
* dynamic category fields;
* custom fields;
* Supplier Details;
* Payment chart;
* Supplier stats;
* Budget analytics;
* Food Plan;
* Food Plan analytics;
* Checklist;
* Event countdown;
* Event Budget StatCard.

---

## FASE 7 — REMOÇÃO

Remover:

* Budget CRUD antigo;
* Expense dialogs;
* Dispensa ↔ Inventory;
* categorias removidas do Inventory;
* quantidade para salão;
* rotas antigas;
* código morto.

---

## FASE 8 — TESTES

Executar:

```text
unit
integration
API
E2E
typecheck
lint
build
```

---

# 77. REVIEW FINAL

Antes de considerar concluído, responder internamente:

### Backend

* O backend é fonte única da verdade?
* Existem cálculos financeiros no frontend?
* Existe duplicação?
* Os pagamentos são consistentes?
* Overdue é calculado no backend?
* Budget é realmente agregado?
* Food Plan não possui preço?
* Checklist é sincronizada automaticamente?

### Database

* Existem relações mortas?
* Existem migrations corretas?
* Existem constraints?
* Existem índices necessários?

### Frontend

* Existem rotas antigas?
* Existem dialogs antigos?
* Existem cálculos?
* Existem componentes duplicados?
* Existem loading/error/empty states?

### Seeds

* Representam o novo domínio?
* Existem fornecedores por categoria?
* Existem pagamentos?
* Existem parcelas?
* Existem alimentos?
* Existem checklists?
* Existem associações?

### Tests

* Todos os novos fluxos estão protegidos?
* O Budget foi testado?
* Payment foi testado?
* Checklist foi testada?
* Food Plan foi testado?
* Inventory continua funcionando?

---

# 78. CRITÉRIO DE ACEITAÇÃO

Considerar esta big refactor concluída somente quando:

1. Supplier possui preço.
2. Supplier possui estado de pagamento completo.
3. Supplier suporta pagamentos parcelados.
4. Parcelas possuem vencimento.
5. Parcelas atrasadas são identificadas pelo backend.
6. Comprovativos podem ser anexados.
7. Supplier Details existe.
8. Supplier possui payment chart.
9. Supplier possui stats.
10. Budget deixou de ser CRUD manual.
11. Budget agrega Inventory + Supplier + futuros módulos financeiros.
12. Budget possui breakdown por módulo.
13. Budget possui spending analytics.
14. Não existem cálculos financeiros no frontend.
15. Dispensa ↔ Inventory foi removido.
16. Food Plan foi criado.
17. Food Plan não possui preços.
18. Food Plan possui stats e analytics.
19. Food Plan suporta custom fields.
20. Decoração/Alimentação/Bolos foram removidos do Inventory.
21. "Quantidade para o salão" foi removida.
22. Supplier possui campos específicos por categoria.
23. Supplier possui custom fields.
24. Inventory possui custom fields.
25. Bolo pertence ao Supplier.
26. Doces/Salgados pertencem ao Supplier.
27. Checklist foi criada.
28. Checklist pode ser associada a Supplier.
29. Checklist pode ser associada a Inventory.
30. Checklist pode atualizar automaticamente o estado.
31. Countdown existe no Event Detail.
32. Budget card existe no Event Detail.
33. Seeds foram atualizadas.
34. Migrations foram executadas.
35. Tests passam.
36. Typecheck passa.
37. Lint passa.
38. Build passa.
39. Não existem rotas/dialogs/código morto relacionados ao antigo Budget.
40. Não existem cálculos de negócio relevantes no frontend.

---

# 79. ENTREGA FINAL

No final da implementação, produzir um relatório objetivo contendo:

## Alterações de Database

* migrations;
* novas entidades;
* relações removidas;
* enums;
* constraints.

## Backend

* novos services;
* APIs;
* regras de negócio;
* agregação do Budget.

## Frontend

* novas páginas;
* dialogs;
* components;
* charts;
* tabs.

## Removido

Lista de funcionalidades antigas eliminadas.

## Seeds

Resumo dos novos dados.

## Tests

Informar:

```text
Unit: PASS/FAIL
Integration: PASS/FAIL
E2E: PASS/FAIL
Typecheck: PASS/FAIL
Lint: PASS/FAIL
Build: PASS/FAIL
```

## Riscos

Se existir alguma migração que possa causar perda de dados, explicar claramente.

## Commits

Organizar os commits por domínio usando Conventional Commits.

Exemplo:

```text
feat(suppliers): add supplier payment management
feat(budget): replace manual budget with aggregated spending
feat(food-plan): add event food planning module
feat(checklist): add supplier and inventory associations
refactor(inventory): remove deprecated categories
refactor(budget): remove manual expense management
test(budget): cover aggregated budget calculations
```

Não fazer um único commit gigante se o projeto permitir separar por domínio.

---

# DIRETIVA FINAL

Esta tarefa deve ser tratada como uma **migração de domínio**, não como uma simples alteração visual.

Não fazer apenas o frontend parecer correto.

O modelo deve ficar correto no:

```text
Database
↓
Domain
↓
Backend
↓
API
↓
Frontend
↓
Tests
↓
Seeds
```

Sempre que existir conflito entre o código atual e esta especificação:

1. entender primeiro o comportamento atual;
2. identificar o impacto;
3. escolher a solução que mantém o domínio consistente;
4. preservar dados quando possível;
5. remover definitivamente funcionalidades obsoletas;
6. garantir que não existem duas fontes da verdade.

A regra principal é:

> **O backend calcula, o backend valida, o backend decide. O frontend apresenta.**

E:

> **O Budget não é mais uma lista manual de despesas. É uma visão financeira agregada de todos os módulos do evento que possuem impacto financeiro.**

Executar a implementação de forma incremental, validando cada fase antes de avançar para a seguinte.
