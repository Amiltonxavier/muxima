# PROMPT COMPLETO — MUXIMA
## Arquitetura, Tecnologias, Ferramentas e Regras de Desenvolvimento

Cria a aplicação web **Muxima**, uma plataforma de gestão e organização de **noivados e casamentos**, seguindo rigorosamente as regras, tecnologias, padrões de código e arquitetura definidos neste documento.

O objetivo é construir uma aplicação profissional, simples de manter, escalável e consistente, evitando complexidade desnecessária.

---

# 1. IDENTIDADE DO PRODUTO

**Nome:** Muxima

**Slogan:**

> Do compromisso ao grande dia, tudo sob controlo.

A aplicação permite ao casal controlar:

- Evento
- Data
- Local
- Orçamento
- Despesas
- Pagamentos
- Fornecedores
- Convidados
- Acompanhantes
- Mesas
- Tarefas
- Cronograma
- Bebidas
- Alimentação
- Bolos
- Inventário
- Documentos
- Notificações
- Participantes
- Progresso da preparação

O produto deve ser inicialmente focado apenas em:

- Noivado
- Casamento

Não implementar funcionalidades de outros tipos de eventos nesta fase.

---

# 2. STACK OBRIGATÓRIA

Utilizar:

- React
- TypeScript
- Vite
- TanStack Router
- TanStack Query
- React Hook Form
- Zod
- Tailwind CSS 4
- Base UI
- Lucide Icons
- date-fns
- js-cookie
- jsPDF
- gooey-toast
- Bklit
- Axios
- ESLint
- Prettier
- Vitest
- Testing Library

---

# 3. PRINCÍPIOS DE DESENVOLVIMENTO

Seguir estes princípios:

```text
Simplicidade
Legibilidade
Reutilização
Separação de responsabilidades
Tipagem forte
Baixo acoplamento
Código previsível
Componentes pequenos
Hooks simples
Queries simples
Services simples
```

Não criar abstrações apenas porque "pode ser reutilizado".

A reutilização deve acontecer quando existe realmente comportamento compartilhado.

Evitar:

```text
GenericManager
BaseService
UniversalForm
DynamicCrud
AbstractRepository
GenericQueryBuilder
```

quando uma implementação simples resolve o problema.

---

# 4. REGRA DE NOMENCLATURA

## 4.1 Files

Todos os ficheiros devem utilizar:

```text
kebab-case
```

Exemplos corretos:

```text
event-form.tsx
create-event.tsx
event-service.ts
event-queries.ts
event-schema.ts
event-types.ts
date-helper.ts
format-currency.ts
```

Nunca:

```text
EventForm.tsx
CreateEvent.tsx
eventForm.tsx
event_form.ts
```

---

# 5. PATHS

Todos os paths devem utilizar:

```text
kebab-case
```

Exemplo:

```text
/events
/events/create
/events/:event-id
/events/:event-id/budget
/events/:event-id/vendors
/events/:event-id/guests
```

Nunca utilizar:

```text
/eventManagement
/event_management
/eventManagement/create
```

---

# 6. ROTAS

Todos os nomes das rotas devem estar obrigatoriamente em **English**.

Exemplos:

```text
/dashboard
/events
/events/create
/events/:event-id
/events/:event-id/budget
/events/:event-id/vendors
/events/:event-id/guests
/events/:event-id/tables
/events/:event-id/tasks
/events/:event-id/schedule
/events/:event-id/inventory
/events/:event-id/documents
/settings
/notifications
```

Mesmo que a interface esteja em português, as rotas permanecem em inglês.

Exemplo:

```text
UI:
Convidados

URL:
/events/:event-id/guests
```

---

# 7. ROTAS DO BACK-END

As rotas da API também devem utilizar inglês.

Exemplo:

```text
/api/events
/api/events/:event-id
/api/events/:event-id/budget
/api/events/:event-id/expenses
/api/events/:event-id/payments
/api/events/:event-id/vendors
/api/events/:event-id/guests
/api/events/:event-id/tasks
/api/events/:event-id/schedule
/api/events/:event-id/inventory
```

Nunca:

```text
/api/eventos
/api/convidados
/api/fornecedores
/api/pagamentos
```

A interface pode estar em português, mas o domínio técnico deve permanecer em inglês.


# 9. ESTRUTURA DAS FEATURES

Cada feature deve possuir somente aquilo que realmente necessita.

Exemplo:

```text
features/events/
│
├── components/
│   ├── event-card.tsx
│   ├── event-form.tsx
│   └── event-list.tsx
│
├── event-queries.ts
├── event-schema.ts
├── event-service.ts
├── event-types.ts
└── index.ts
```

Não criar dezenas de pastas vazias.

---

# 10. REGRA PARA QUERIES

As queries devem ser simples.

Não criar classes ou encapsulamentos complexos.

Exemplo conceitual:

```text
event-queries.ts
```

Deve conter:

```text
eventKeys
useEvents
useEvent
useCreateEvent
useUpdateEvent
useDeleteEvent
```

Ou a estrutura equivalente mais simples.

Não criar:

```text
EventQueryManager
EventQueryFactory
BaseQueryService
QueryRepository
```

sem necessidade.

---

# 11. REGRA PARA SERVICES

Services devem apenas tratar comunicação com a API.

Exemplo:

```text
event-service.ts
```

Responsabilidades:

```text
getEvents
getEvent
createEvent
updateEvent
deleteEvent
```

O service não deve:

- Gerir estado da interface
- Renderizar componentes
- Controlar formulários
- Fazer lógica de UI

---

# 12. REGRA PARA SCHEMAS

Todos os formulários devem utilizar **Zod**.

Exemplo:

```text
event-schema.ts
```

Responsável por:

```text
createEventSchema
updateEventSchema
```

Não duplicar validações entre:

```text
component
service
schema
```

A validação de formulário deve estar centralizada no schema.

---

# 13. REACT HOOK FORM

Todos os formulários complexos devem utilizar:

```text
React Hook Form
+
Zod
```

Fluxo:

```text
Form
 ↓
React Hook Form
 ↓
Zod Resolver
 ↓
Submit
 ↓
Service
```

Não controlar manualmente todos os inputs com:

```text
useState
```

quando React Hook Form é adequado.

---

# 14. FORMULÁRIOS

Todos os formulários devem possuir:

```text
defaultValues
schema
resolver
submit handler
error handler
loading state
```

Exemplo conceptual:

```text
useForm({
  resolver: zodResolver(schema),
  defaultValues,
})
```

---

# 15. REGRAS DOS FORMULÁRIOS

Não colocar lógica pesada dentro do JSX.

Evitar:

```text
onChange={() => {
  // dezenas de linhas
}}
```

Mover lógica para:

- helpers
- hooks
- schema
- handlers

conforme o caso.

---

# 16. DATE-FNS

Todas as operações de datas devem utilizar:

```text
date-fns
```

Não criar funções manuais para:

```text
diferença de dias
formatação
comparação
adicionar dias
subtrair dias
início/fim do mês
```

Utilizar helpers próprios apenas para encapsular formatos específicos da aplicação.

Exemplo:

```text
format-date.ts
date-helper.ts
```

---

# 17. DATAS

Nunca manipular datas de forma inconsistente.

Criar helpers quando necessário:

```text
formatDate
formatDateTime
getDaysRemaining
isOverdue
```

Mas não criar um "DateManager".

---

# 18. MOEDA

A aplicação utiliza inicialmente:

```text
AOA
```

Todos os valores devem ser apresentados como:

```text
4.500.000 Kz
```

Criar helper:

```text
format-currency.ts
```

Responsável pela apresentação.

Não espalhar:

```text
Intl.NumberFormat
```

por dezenas de componentes.

---

# 19. JS-COOKIE

Utilizar:

```text
js-cookie
```

para cookies necessários ao frontend.

Não guardar tokens sensíveis em:

```text
localStorage
sessionStorage
```

O access token não deve ser colocado no estado global do frontend.

---

# 20. AUTENTICAÇÃO

A aplicação deve possuir:

```text
Login
Register
Forgot password
Reset password
Logout
```

Após autenticação:

```text
Authenticated User
```

deve conter apenas dados do utilizador necessários para a interface.

Exemplo:

```text
id
name
email
phone
```

Não armazenar o access token no Zustand ou outro store.

---

# 21. ESTADO GLOBAL

Não utilizar estado global para tudo.

Utilizar:

```text
TanStack Query
```

para:

```text
server state
```

Utilizar estado local para:

```text
UI state
modal aberto
tab ativa
filtros temporários
etc.
```

Utilizar store apenas quando realmente existir estado global necessário.

---

# 22. TANSTACK QUERY

TanStack Query será responsável por:

```text
Fetching
Caching
Mutation
Invalidation
Loading
Error
Refetch
```

Após uma mutation:

```text
create
update
delete
```

invalidar apenas as queries relacionadas.

Não fazer refetch global da aplicação.

---

# 23. TANSTACK ROUTER

Todas as páginas devem utilizar TanStack Router.

As rotas devem ser:

```text
English
kebab-case
```

Exemplo:

```text
events/
events/create
events/$event-id/
events/$event-id/budget
```

Seguir a convenção oficial do TanStack Router para parâmetros.

A URL pública continua utilizando nomes em inglês.

---

# 24. NAVEGAÇÃO

A aplicação deve possuir:


Interface apresentada em português portugal.

Rotas em inglês.

---

# 25. UI LIBRARY

Utilizar:

```text
Base UI
```

para os componentes comportamentais/primitivos necessários.

Utilizar:

```text
Lucide
```

para ícones.

Utilizar:

```text
Tailwind CSS 4
```

para estilização.

Não criar componentes UI duplicados quando já existir componente adequado.

---

# 26. DESIGN SYSTEM

Criar uma base consistente para:

```text
Button
Input
Textarea
Select
Checkbox
Radio
Switch
Dialog
Drawer
Dropdown
Popover
Tooltip
Tabs
Badge
Card
Table
Pagination
Skeleton
Alert
Toast
Avatar
Calendar
Date Picker
```

Todos os componentes devem seguir a mesma linguagem visual.

---

# 27. TAILWIND CSS 4

Utilizar Tailwind CSS 4 como sistema principal de estilização.

Evitar CSS espalhado.

Não criar ficheiros CSS específicos para pequenos componentes quando Tailwind resolver.

CSS customizado deve existir apenas quando realmente necessário.

---

# 28. DESIGN VISUAL

A interface deve ser:

```text
Elegante
Minimalista
Profissional
Sofisticada
Clara
Moderna
```

Não utilizar:

```text
Excesso de sombras
Gradientes exagerados
Excesso de animações
Cores muito fortes
Emojis
Elementos decorativos desnecessários
```

---

# 29. BKLIT

Utilizar **Bklit** para montar os gráficos chart

A interface final deve manter consistência entre.

---

# 30. GOOEY-TOAST

Utilizar:

```text
gooey-toast
```

para feedbacks rápidos.

Exemplos:

```text
Evento criado com sucesso.
Pagamento registado com sucesso.
Convidado atualizado.
Fornecedor removido.
```

Não utilizar alertas nativos do browser.

Evitar toast para erros de validação de campos.

Erros de formulário devem aparecer junto aos campos.

---

# 31. JSPDF

Utilizar:

```text
jsPDF
```

para geração de documentos PDF no frontend quando apropriado.

Primeiros relatórios:

```text
Resumo do evento
Relatório financeiro
Lista de convidados
Lista de mesas
Inventário
Cronograma
```

Criar funções específicas:

```text
generate-budget-report
generate-guests-report
generate-event-summary
```

Não criar um:

```text
PdfManager
```

genérico sem necessidade.

---

# 32. ÍCONES

Utilizar apenas Lucide Icons.

Não utilizar:

```text
emoji
ícones em texto
SVGs aleatórios
bibliotecas diferentes de ícones
```

O mesmo conceito deve utilizar sempre o mesmo ícone.

---

# 33. LAYOUT DA APLICAÇÃO

Desktop:

```text
┌────────────────────────────────────────────────────────────┐
│ TOPBAR                                                     │
├──────────────┬─────────────────────────────────────────────┤
│              │                                             │
│ SIDEBAR      │                MAIN CONTENT                 │
│              │                                             │
│ Dashboard    │                                             │
│ Events       │                                             │
│ Planning     │                                             │
│ Guests       │                                             │
│ Logistics    │                                             │
│ Documents    │                                             │
│              │                                             │
│ Settings     │                                             │
│              │                                             │
└──────────────┴─────────────────────────────────────────────┘
```

Sidebar e conteúdo devem possuir scroll independente quando necessário.

---

# 34. DASHBOARD

O dashboard deve mostrar:

```text
Contagem regressiva
Orçamento
Total pago
Total pendente
Preparação
Convidados
Tarefas
Inventário
Alertas
Próximas atividades
```

O dashboard deve priorizar problemas.

---

# 35. EVENTOS

Rotas:

```text
/events
/events/create
/events/:event-id
```

Páginas:

```text
Lista
Criar
Detalhe
Editar
```

---

# 36. ORÇAMENTO

Rotas:

```text
/events/:event-id/budget
/events/:event-id/budget/expenses
/events/:event-id/budget/payments
```

Funcionalidades:

```text
Visualizar orçamento
Categorias
Despesas
Pagamentos
Pendências
Atrasos
Resumo financeiro
```

---

# 37. FORNECEDORES

Rota:

```text
/events/:event-id/vendors
```

Funcionalidades:

```text
Listar
Criar
Editar
Visualizar
Contratar
Cancelar
Contratos
Pagamentos
Documentos
```

---

# 38. CONVIDADOS

Rota:

```text
/events/:event-id/guests
```

Funcionalidades:

```text
Listar
Criar
Editar
Eliminar
Confirmar
Recusar
Acompanhantes
Convites
Pesquisa
Filtros
```

---

# 39. MESAS

Rota:

```text
/events/:event-id/tables
```

Funcionalidades:

```text
Criar mesa
Editar mesa
Definir capacidade
Associar convidado
Remover convidado
Visualizar ocupação
```

---

# 40. TAREFAS

Rota:

```text
/events/:event-id/tasks
```

Visualizações:

```text
Lista
Kanban
```

Filtros:

```text
Todas
Pendentes
Em andamento
Concluídas
Atrasadas
```

---

# 41. CRONOGRAMA

Rota:

```text
/events/:event-id/schedule
```

Visualizações:

```text
Lista
Calendário
Timeline
```

---

# 42. INVENTÁRIO

Rota:

```text
/events/:event-id/inventory
```

Subcategorias:

```text
Drinks
Food
Cakes
Decoration
Other
```

A interface pode apresentar labels em português de portugal:

```text
Bebidas
Alimentação
Bolos
Decoração
Outros
```

---

# 43. DOCUMENTOS

Rota:

```text
/events/:event-id/documents
```

Categorias:

```text
Contratos
Comprovativos
Orçamentos
Outros
```

---

# 44. NOTIFICAÇÕES

Rota:

```text
/notifications
```

Tipos:

```text
Finance
Tasks
Guests
Inventory
Event
```

para notificações usa websoket, não usar polling, se a camunicação com websoket deixar um banner com uma mnesagem de que as notificações não estão disponivél por enqunato att, essa coisa toda, se a comunicar falhar a aplicação não deve parar de funcionar.

Interface em português portugal.

---

# 45. CONFIGURAÇÕES

Rotas:

```text
/settings
/settings/profile
/settings/notifications
/settings/preferences
```

Configurações do evento devem permanecer dentro do contexto do evento:

```text
/events/:event-id/settings
```

---

# 46. COMPONENTES REUTILIZÁVEIS

Criar componentes compartilhados somente quando houver necessidade real.

Exemplos:

```text
page-header
page-container
empty-state
error-state
loading-state
confirm-dialog
data-table
status-badge
currency-display
date-display
search-input
filter-bar
pagination
```

Não criar componentes gigantes.

---

# 47. COMPONENTES DE DOMÍNIO

Componentes específicos devem permanecer dentro do modulo.

Exemplo:

```text
budget/-components/
```

pode conter:

```text
budget-summary.tsx
expense-form.tsx
expense-table.tsx
payment-form.tsx
payment-history.tsx
```

---

# 48. REGRA PARA COMPONENTES

Um componente deve possuir uma responsabilidade clara.

Evitar:

```text
EventPage
```

com:

```text
500+ linhas
```

Dividir em:

```text
event-header
event-summary
event-stats
event-alerts
event-activity
```

quando necessário.

Mas não dividir artificialmente cada pequeno bloco.

---

# 49. REGRA PARA PÁGINAS

As páginas devem coordenar componentes.

A página não deve conter toda a lógica de negócio.

Exemplo:

```text
EventPage
 ├── EventHeader
 ├── EventSummary
 ├── EventStats
 ├── EventAlerts
 └── EventActivity
```

---

# 50. REGRAS DE NEGÓCIO NO FRONTEND

Não duplicar regras críticas que pertencem ao backend.

O frontend deve:

```text
validar UX
mostrar estados
formatar dados
controlar interação
```

O backend deve ser a autoridade final para:

```text
permissões
valores
regras financeiras
integridade
relacionamentos
```

---

# 51. PERMISSÕES

A interface deve respeitar:

```text
OWNER
PARTNER
ADMIN
EDITOR
VIEWER
```

Itens sem permissão não devem aparecer na navegação quando apropriado.

A ocultação da UI não substitui autorização no backend.

---

# 52. LOADING STATES

Todas as operações assíncronas devem possuir estado de loading.

Exemplo:

```text
Carregando eventos...
```

Para listas:

```text
Skeleton
```

Para botões:

```text
Guardar...
```

Não bloquear a aplicação inteira durante uma operação local.

---

# 53. EMPTY STATES

Todas as listas devem possuir empty state.

Exemplo:

```text
Ainda não existem fornecedores.

Adicione o primeiro fornecedor
do seu evento.

[Adicionar fornecedor]
```

---

# 54. ERROR STATES

Toda página que depende de API deve possuir tratamento de erro.

Exemplo:

```text
Não foi possível carregar os convidados.

[Tentar novamente]
```

Nunca deixar:

```text
undefined
null
NaN
```

aparecer na interface.

---

# 55. DELETE

Operações destrutivas devem pedir confirmação.

Exemplo:

```text
Eliminar fornecedor?

Esta ação não pode ser desfeita.

[Cancelar] [Eliminar]
```

Para dados financeiros ou históricos, preferir cancelamento/inativação quando a regra de negócio exigir histórico.

---

# 56. RESPONSIVIDADE

Desktop:

```text
≥ 1024px
```

Tablet:

```text
768px – 1023px
```

Mobile:

```text
< 768px
```

Não criar layout completamente diferente.

Adaptar o mesmo sistema.

---

# 57. MOBILE NAVIGATION

No mobile:

```text
Topbar
Menu
Content
```

A sidebar deve transformar-se em:

```text
Drawer
```

ou menu equivalente.

---

# 58. TABELAS RESPONSIVAS

Não forçar tabelas largas em telas pequenas.

No mobile, transformar dados em:

```text
List
Cards compactos
Accordion
```

conforme o contexto.

---

# 59. ACESSIBILIDADE

Todos os elementos interativos devem possuir:

```text
aria-label quando necessário
focus
keyboard navigation
labels
mensagens de erro
```

Não depender apenas de cores para comunicar estados.

---

# 60. TESTES

Utilizar:

```text
Vitest
Testing Library
```

Testar principalmente:

```text
Schemas
Helpers
Components
Hooks
Forms
Queries
Critical user flows
```

---

# 61. TESTES UNITÁRIOS

Testar:

```text
format-currency
format-date
get-days-remaining
is-overdue
schemas
status helpers
calculations
```

Exemplo:

```text
4.500.000 → 4.500.000 Kz
```

---

# 62. TESTES DE COMPONENTES

Testar componentes críticos:

```text
EventForm
ExpenseForm
PaymentForm
GuestForm
TaskForm
InventoryForm
```

Validar:

```text
render
interação
validação
submit
erro
loading
```

---

# 63. TESTES DE INTEGRAÇÃO

Criar testes para fluxos importantes:

```text
Criar evento
Editar evento
Adicionar fornecedor
Criar despesa
Registar pagamento
Adicionar convidado
Confirmar convidado
Criar tarefa
Concluir tarefa
Adicionar inventário
```

---

# 64. REGRA PARA TESTES

Não testar implementação interna.

Testar comportamento.

Preferir:

```text
o utilizador consegue criar um evento
```

em vez de:

```text
a função X foi chamada três vezes
```

quando isso não representa comportamento real.

---

# 65. LINT

O projeto deve utilizar ESLint.

Não permitir:

```text
unused imports
unused variables
any desnecessário
console.log
erros de hooks
```

---

# 66. TYPESCRIPT

Utilizar TypeScript de forma rigorosa.

Evitar:

```text
any
as any
unknown sem validação
```

Interfaces/types devem representar corretamente o domínio.

---

# 67. TIPOS

Tipos específicos devem permanecer próximos da feature.

Exemplo:

```text
features/events/event-types.ts
features/budget/budget-types.ts
features/guests/guest-types.ts
```

Tipos realmente globais podem ficar em:

```text
types/
```

---

# 68. API TYPES

Os tipos de resposta da API devem ser claros.

Exemplo:

```text
Event
EventMember
Budget
Expense
Payment
Vendor
Guest
Task
ScheduleItem
InventoryItem
```

Não utilizar:

```text
ApiResponse<any>
```

para tudo.

---

# 69. HELPERS

Helpers devem resolver problemas pequenos e concretos.

Exemplos:

```text
format-currency.ts
format-phone.ts
calculate-budget.ts
calculate-guest-count.ts
```

Evitar helpers gigantes.

---

# 70. UTILIZAÇÃO DE DATE-FNS

Exemplos de responsabilidades:

```text
format
differenceInDays
isBefore
isAfter
addDays
subDays
startOfDay
endOfDay
```

Toda lógica de calendário deve utilizar date-fns.

---

# 71. FORMATAÇÃO DE NÚMEROS

Valores financeiros e quantidades devem possuir helpers de apresentação.

Exemplo:

```text
formatCurrency(4500000)
→ 4.500.000 Kz
```

---

# 72. DASHBOARD — DADOS

O dashboard deve consumir dados reais do evento.

Mostrar:

```text
Event date
Days remaining
Budget
Paid
Pending
Guests
Tasks
Inventory
Alerts
```

Não criar valores fake depois da integração com a API.

---

# 73. DASHBOARD — PRIORIDADE

A ordem visual deve ser:

```text
1. Estado do evento
2. Alertas
3. Financeiro
4. Preparação
5. Próximas tarefas
6. Convidados
7. Inventário
8. Atividade recente
```

---

# 74. ESTADOS DO EVENTO

Utilizar:

```text
DRAFT
PLANNING
CONFIRMED
COMPLETED
CANCELLED
```

Labels na UI:

```text
Rascunho
Em preparação
Confirmado
Concluído
Cancelado
```

---

# 75. ESTADOS FINANCEIROS

Backend:

```text
PLANNED
PARTIALLY_PAID
PAID
OVERDUE
CANCELLED
```

Frontend:

```text
Planeado
Parcialmente pago
Pago
Atrasado
Cancelado
```

---

# 76. ESTADOS DOS CONVIDADOS

Backend:

```text
PENDING
CONFIRMED
DECLINED
WAITING
```

Frontend:

```text
Pendente
Confirmado
Recusado
Em espera
```

---

# 77. ESTADOS DAS TAREFAS

Backend:

```text
TODO
IN_PROGRESS
COMPLETED
CANCELLED
```

Frontend:

```text
Por fazer
Em andamento
Concluído
Cancelado
```

---

# 78. INVENTÁRIO

Toda alteração deve apresentar feedback.

Exemplo:

```text
+ 20 caixas adicionadas
```

ou:

```text
- 5 garrafas registadas como consumo
```

O histórico deve ser consultável.

---

# 79. FILTROS

Filtros devem ser simples.

Não criar sistemas complexos de filtros dinâmicos sem necessidade.

Exemplo:

```text
Status
Category
Date
Search
```

---

# 80. PESQUISA

Pesquisa deve possuir:

```text
debounce
estado de loading
empty state
clear
```

quando aplicável.

---

# 81. PAGINAÇÃO

Listas grandes devem possuir paginação.

A paginação deve permanecer consistente em:

```text
Guests
Vendors
Expenses
Payments
Documents
Tasks
```

---

# 82. URL STATE

Filtros importantes que precisam sobreviver ao refresh podem ser armazenados na URL.

Exemplo:

```text
/events/123/guests?status=confirmed
```

Rotas continuam em inglês.

---

# 83. MODAIS

Utilizar dialogs para operações pequenas.

Exemplo:

```text
Adicionar convidado
Adicionar pagamento
Criar tarefa
Criar mesa
```

Para formulários grandes, preferir página dedicada quando melhorar a experiência.

---

# 84. CONFIRMAÇÃO

Não utilizar:

```text
window.confirm()
```

Criar componente de confirmação consistente.

---

# 85. TOASTS

Utilizar gooey-toast para:

```text
Success
Info
Warning
Error
```

Não utilizar toast como substituto de:

```text
inline validation
empty state
error page
```

---

# 86. PDF

Os relatórios PDF devem possuir:

```text
Logo Muxima
Nome do evento
Data
Informações principais
Conteúdo do relatório
Data de geração
```

Exemplo:

```text
MUXIMA

Casamento Amilton & Maria
15 Dezembro 2026

RELATÓRIO FINANCEIRO

Orçamento
4.500.000 Kz

Pago
1.850.000 Kz

Pendente
1.350.000 Kz
```

---

# 87. SEGURANÇA NO FRONTEND

Nunca confiar apenas na UI para segurança.

Não colocar:

```text
password
access token
dados sensíveis
```

em stores persistentes desnecessários.

Não expor dados de outro evento.

---

# 88. CONTEXTO DO EVENTO

Todas as páginas internas devem saber qual é o evento atual.

Exemplo:

```text
/events/:event-id/guests
```

Nunca depender de:

```text
selectedEvent
```

global como única fonte da verdade.

O ID da URL é a referência principal para o contexto da página.

---

# 89. EVENT SWITCHER

O utilizador poderá alternar entre eventos.

Exemplo:

```text
Casamento Amilton & Maria
15 Dezembro 2026

↓

Noivado João & Ana
20 Setembro 2026
```

Ao mudar de evento, navegar para o dashboard desse evento.

---

# 90. PERMISSÕES NA UI

Exemplo:

```text
OWNER
→ tudo

PARTNER
→ gestão completa do evento

ADMIN
→ gestão operacional

EDITOR
→ edição limitada

VIEWER
→ apenas leitura
```

A UI deve esconder ações não permitidas.

---

# 91. NÃO DUPLICAR COMPONENTES

Antes de criar:

```text
guest-table
vendor-table
expense-table
```

avaliar se existe um `data-table` compartilhado.

Mas não criar uma tabela genérica impossível de manter.

---

# 92. NÃO DUPLICAR FORMULÁRIOS

Criar:

```text
guest-form
```

e utilizá-lo para:

```text
CreateGuest
EditGuest
```

quando os campos forem essencialmente os mesmos.

Se as regras forem significativamente diferentes, separar.

---

# 93. ARQUITETURA DE IMPORTAÇÃO

Preferir imports claros.

Evitar aliases excessivos.

Exemplo:

```text
import { EventForm } from "../components/event-form";
```

ou aliases consistentes definidos no projeto.

Não criar barrel files gigantes.

---

# 94. INDEX.TS

Utilizar `index.ts` apenas quando melhorar a importação.

Não criar:

```text
index.ts
```

em todas as pastas automaticamente.

---

# 95. COMENTÁRIOS

Não comentar código óbvio.

Evitar:

```text
// set loading true
setLoading(true)
```

Comentários devem explicar:

```text
porquê
```

e não:

```text
o que
```

---

# 96. FUNÇÕES

Funções devem ser pequenas.

Preferir:

```text
calculatePendingAmount()
```

em vez de colocar toda a lógica dentro do componente.

---

# 97. JSX

Evitar JSX extremamente grande.

Se uma secção possui comportamento próprio, extrair componente.

---

# 98. REGRAS DE ESTILO

Não utilizar:

```text
!important
```

salvo caso absolutamente necessário.

Evitar:

```text
inline styles
```

quando Tailwind resolver.

---

# 99. DESIGN SEM SHADOW EXCESSIVO

A aplicação deve utilizar principalmente:

```text
border
background
spacing
typography
```

para criar hierarquia.

Sombras devem ser discretas.

---

# 100. REGRA FINAL DE QUALIDADE

Antes de considerar uma funcionalidade concluída, verificar:

```text
[ ] UI implementada
[ ] Responsividade
[ ] Loading
[ ] Empty state
[ ] Error state
[ ] Validation
[ ] Success feedback
[ ] Permissions
[ ] API integration
[ ] Query invalidation
[ ] Tests
[ ] Accessibility
[ ] Naming conventions
[ ] kebab-case
[ ] Routes in English
[ ] No unnecessary abstraction
[ ] No duplicated logic
[ ] TypeScript sem any desnecessário
```

---

# 101. REGRA ABSOLUTA DE NOMENCLATURA

Esta regra tem prioridade em todo o projeto:

### Files

```text
kebab-case
```

### Folders

```text
kebab-case
```

### Frontend paths

```text
kebab-case
```

### Backend paths

```text
kebab-case
```

### Routes

```text
English
```

### API endpoints

```text
English
```

### Database tables

```text
snake_case
```

### Variáveis

```text
camelCase
```

### Funções

```text
camelCase
```

### Componentes React

```text
PascalCase
```

A exceção do `PascalCase` aplica-se apenas ao nome do símbolo/componente React, não ao nome do ficheiro.

Exemplo:

```text
event-form.tsx

export function EventForm() {}
```

---

# 102. REGRA DE IDIOMA

A aplicação possui dois níveis de idioma:

## Interface

Português.

Exemplo:

```text
Convidados
Fornecedores
Orçamento
Pagamentos
Tarefas
```

## Código / Domínio técnico

English.

Exemplo:

```text
Guest
Vendor
Budget
Payment
Task
Expense
```

## URL

English + kebab-case.

Exemplo:

```text
/events
/events/:event-id/guests
/events/:event-id/vendors
/events/:event-id/budget
```

Esta separação deve ser mantida em toda a aplicação.

---

# 103. RESULTADO FINAL ESPERADO

Construir uma aplicação web profissional onde o casal consiga:

```text
Criar o evento
        ↓
Definir data e local
        ↓
Definir orçamento
        ↓
Convidar parceiro
        ↓
Planejar tarefas
        ↓
Contratar fornecedores
        ↓
Registar despesas
        ↓
Registar pagamentos
        ↓
Gerir convidados
        ↓
Organizar mesas
        ↓
Controlar bebidas
        ↓
Controlar alimentação
        ↓
Controlar bolos
        ↓
Organizar cronograma
        ↓
Gerir documentos
        ↓
Acompanhar notificações
        ↓
Ver progresso
        ↓
Gerar relatórios
        ↓
Concluir evento
```

A aplicação deve transmitir ao utilizador:

> **"Tenho controlo total sobre a preparação do meu casamento."**

---

# 104. PRINCÍPIO MAIS IMPORTANTE

Não transformar o Muxima num simples conjunto de CRUDs.

A aplicação deve sempre transformar dados em informação útil.

Em vez de apenas:

```text
Pagamento: 300.000 Kz
```

mostrar:

```text
Pagamento do salão

300.000 Kz pendentes

Vence em 3 dias
```

Em vez de apenas:

```text
45 convidados
```

mostrar:

```text
45 convidados ainda não confirmaram
```

Em vez de apenas:

```text
90 caixas de cerveja
```

mostrar:

```text
30 caixas abaixo da quantidade planeada
```

O Muxima deve funcionar como um **centro de controlo do casamento**, e não como um simples sistema de registos.