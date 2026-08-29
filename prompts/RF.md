# MUXIMA
## Requisitos Funcionais do Sistema

**Versão:** 1.0  
**Produto:** Muxima  
**Domínio:** Gestão de Noivados e Casamentos  
**Idioma da interface:** Português  
**Idioma técnico:** Inglês

---

# 1. OBJETIVO

O Muxima é uma aplicação para ajudar casais a planear, organizar e acompanhar todos os aspectos relacionados com o seu noivado ou casamento.

O sistema deve permitir controlar:

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
- Participantes
- Notificações
- Progresso da preparação

A primeira versão suporta exclusivamente:

```text
NOIVADO
CASAMENTO
```

---

# 2. REGRAS GERAIS

## RG-001 — Utilizador

Todo recurso privado deve estar associado a um utilizador autenticado ou a um evento ao qual o utilizador tenha acesso.

## RG-002 — Evento

Um utilizador pode possuir zero, um ou vários eventos.

## RG-003 — Isolamento

Um utilizador não pode visualizar, editar ou eliminar dados de eventos aos quais não possui acesso.

## RG-004 — Moeda

A moeda padrão da aplicação é:

```text
AOA / Kz
```

## RG-005 — Datas

Todas as datas devem considerar a timezone configurada para o evento/utilizador.

## RG-006 — Histórico

Operações financeiras importantes não devem destruir histórico quando isso comprometer a integridade dos dados.

## RG-007 — Autorização

Estar autenticado não significa possuir permissão para executar todas as operações.

---

# 3. REQUISITOS FUNCIONAIS — BACKEND

---

# AUTHENTICATION

## RF-BE-001 — Registo

O backend deve permitir que um utilizador crie uma conta através do Better Auth.

Dados mínimos:

```text
name
email
password
```

---

## RF-BE-002 — Login

O backend deve permitir autenticação através de email e password utilizando Better Auth.

---

## RF-BE-003 — Logout

O backend deve permitir terminar a sessão atual.

---

## RF-BE-004 — Sessão atual

O backend deve disponibilizar a sessão e o utilizador autenticado através dos mecanismos oficiais do Better Auth.

---

## RF-BE-005 — Recuperação de password

O backend deve permitir solicitar recuperação de password.

---

## RF-BE-006 — Reset de password

O backend deve permitir redefinir a password através do fluxo seguro do Better Auth.

---

## RF-BE-007 — Alteração de password

O utilizador autenticado deve poder alterar a própria password.

---

## RF-BE-008 — Verificação de email

O sistema deve suportar o fluxo de verificação de email disponibilizado pelo Better Auth.

---

## RF-BE-009 — Proteção de recursos

Endpoints privados devem rejeitar requests sem sessão válida.

---

# USERS

## RF-BE-010 — Consultar perfil

O utilizador autenticado deve poder consultar os próprios dados.

---

## RF-BE-011 — Atualizar perfil

O utilizador deve poder atualizar:

```text
name
phone
image
```

quando estes campos estiverem disponíveis.

---

## RF-BE-012 — Isolamento de utilizadores

Nenhum utilizador pode consultar ou modificar dados privados pertencentes exclusivamente a outro utilizador.

---

# EVENTS

## RF-BE-013 — Criar evento

O utilizador autenticado deve poder criar um evento.

Dados mínimos:

```text
name
type
event_date
location
```

Tipos permitidos:

```text
ENGAGEMENT
WEDDING
```

---

## RF-BE-014 — Atualizar evento

Um utilizador com permissão adequada deve poder atualizar os dados do evento.

---

## RF-BE-015 — Consultar evento

O utilizador deve poder consultar um evento ao qual possui acesso.

---

## RF-BE-016 — Listar eventos

O utilizador deve poder consultar os eventos aos quais possui acesso.

---

## RF-BE-017 — Eliminar evento

O proprietário do evento deve poder eliminar/cancelar um evento de acordo com as regras de integridade definidas pelo sistema.

---

## RF-BE-018 — Estado do evento

O evento deve suportar:

```text
DRAFT
PLANNING
CONFIRMED
COMPLETED
CANCELLED
```

---

## RF-BE-019 — Data do evento

O backend deve validar a data do evento.

---

## RF-BE-020 — Evento ativo

O sistema deve permitir identificar o evento atualmente utilizado pelo utilizador através do contexto da aplicação, sem depender de uma variável global como única fonte de verdade.

---

# EVENT MEMBERS

## RF-BE-021 — Proprietário

Ao criar um evento, o utilizador deve tornar-se automaticamente:

```text
OWNER
```

---

## RF-BE-022 — Adicionar participante

Um membro com permissão adequada deve poder convidar outro utilizador para o evento.

---

## RF-BE-023 — Convite

O sistema deve criar um convite associado ao evento e ao utilizador convidado.

---

## RF-BE-024 — Aceitar convite

Um utilizador deve poder aceitar um convite.

---

## RF-BE-025 — Recusar convite

Um utilizador deve poder recusar um convite.

---

## RF-BE-026 — Estado do convite

Um convite deve suportar:

```text
PENDING
ACCEPTED
DECLINED
EXPIRED
```

---

## RF-BE-027 — Roles

Os membros do evento devem possuir uma role.

Roles iniciais:

```text
OWNER
PARTNER
ADMIN
EDITOR
VIEWER
```

---

## RF-BE-028 — Permissões

O backend deve validar as permissões do membro antes de executar operações protegidas.

---

# BUDGET

## RF-BE-029 — Criar orçamento

Cada evento deve possuir um orçamento.

---

## RF-BE-030 — Categorias de orçamento

O sistema deve permitir organizar despesas por categorias.

Categorias iniciais:

```text
VENUE
MUSIC
FOOD
DRINKS
CAKE
DECORATION
PHOTOGRAPHY
VIDEO
CLOTHING
TRANSPORT
INVITATIONS
OTHER
```

---

## RF-BE-031 — Criar despesa

Um utilizador autorizado deve poder criar uma despesa.

Dados:

```text
description
category
planned_amount
due_date
notes
```

---

## RF-BE-032 — Atualizar despesa

Uma despesa pode ser atualizada por utilizadores autorizados.

---

## RF-BE-033 — Eliminar despesa

Uma despesa pode ser eliminada ou cancelada de acordo com as regras financeiras.

---

## RF-BE-034 — Registar pagamento

O utilizador autorizado deve poder registar um pagamento relacionado com uma despesa.

Dados:

```text
amount
payment_date
method
reference
notes
```

---

## RF-BE-035 — Pagamentos parciais

Uma despesa pode possuir vários pagamentos.

---

## RF-BE-036 — Saldo pendente

O backend deve calcular:

```text
planned_amount - total_paid
```

---

## RF-BE-037 — Estado financeiro

O sistema deve determinar automaticamente:

```text
PLANNED
PARTIALLY_PAID
PAID
OVERDUE
CANCELLED
```

---

## RF-BE-038 — Histórico financeiro

Os pagamentos devem possuir histórico.

Não alterar retroativamente um pagamento já registado sem manter rastreabilidade adequada.

---

# VENDORS

## RF-BE-039 — Criar fornecedor

O sistema deve permitir registar fornecedores.

Exemplos:

```text
Salão
DJ
Banda
Fotógrafo
Decorador
Catering
Pastelaria
Transporte
```

---

## RF-BE-040 — Dados do fornecedor

O fornecedor pode possuir:

```text
name
category
phone
email
address
notes
```

---

## RF-BE-041 — Associar fornecedor

Um fornecedor deve poder ser associado ao evento.

---

## RF-BE-042 — Contrato

O sistema deve permitir associar informações contratuais ao fornecedor.

---

## RF-BE-043 — Pagamento do fornecedor

O fornecedor deve poder estar relacionado com uma ou várias despesas/pagamentos.

---

# GUESTS

## RF-BE-044 — Criar convidado

O utilizador autorizado deve poder adicionar convidados.

Dados:

```text
name
phone
email
category
notes
```

---

## RF-BE-045 — Estado do convidado

Estados:

```text
PENDING
CONFIRMED
DECLINED
WAITING
```

---

## RF-BE-046 — Confirmar presença

O sistema deve permitir confirmar a presença de um convidado.

---

## RF-BE-047 — Recusar presença

O sistema deve permitir registar a recusa.

---

## RF-BE-048 — Acompanhantes

Um convidado pode possuir acompanhantes.

O sistema deve permitir definir a quantidade de acompanhantes.

---

## RF-BE-049 — Contagem de convidados

O backend deve calcular:

```text
total guests
confirmed guests
pending guests
declined guests
companions
```

---

# TABLES

## RF-BE-050 — Criar mesa

O utilizador autorizado deve poder criar uma mesa.

---

## RF-BE-051 — Capacidade

Cada mesa deve possuir uma capacidade.

---

## RF-BE-052 — Associar convidado à mesa

Um convidado confirmado pode ser associado a uma mesa.

---

## RF-BE-053 — Remover convidado da mesa

O sistema deve permitir remover a associação.

---

## RF-BE-054 — Capacidade da mesa

O sistema não deve permitir exceder a capacidade configurada da mesa.

---

# TASKS

## RF-BE-055 — Criar tarefa

O utilizador deve poder criar tarefas relacionadas com a preparação do evento.

---

## RF-BE-056 — Dados da tarefa

Uma tarefa deve possuir:

```text
title
description
due_date
priority
assigned_to
```

---

## RF-BE-057 — Estado da tarefa

Estados:

```text
TODO
IN_PROGRESS
COMPLETED
CANCELLED
```

---

## RF-BE-058 — Responsável

Uma tarefa pode ser atribuída a um membro do evento.

---

## RF-BE-059 — Tarefas atrasadas

O sistema deve identificar automaticamente tarefas cuja data limite tenha passado e que não estejam concluídas.

---

# SCHEDULE

## RF-BE-060 — Criar atividade

O sistema deve permitir criar atividades no cronograma.

---

## RF-BE-061 — Dados da atividade

Uma atividade deve possuir:

```text
title
description
start_at
end_at
location
```

---

## RF-BE-062 — Cronograma

O backend deve disponibilizar as atividades ordenadas cronologicamente.

---

# INVENTORY

## RF-BE-063 — Criar item

O sistema deve permitir criar itens de inventário.

---

## RF-BE-064 — Categorias

Categorias iniciais:

```text
DRINKS
FOOD
CAKES
DECORATION
OTHER
```

---

## RF-BE-065 — Quantidade planeada

Cada item deve permitir definir a quantidade necessária.

---

## RF-BE-066 — Quantidade disponível

O sistema deve registar a quantidade atualmente disponível.

---

## RF-BE-067 — Movimentação

O sistema deve permitir registar:

```text
ADD
REMOVE
CONSUME
ADJUST
```

---

## RF-BE-068 — Stock

O backend deve calcular a quantidade atual do item.

---

## RF-BE-069 — Alertas de inventário

O sistema deve identificar itens abaixo da quantidade mínima definida.

---

# DOCUMENTS

## RF-BE-070 — Adicionar documento

O utilizador autorizado deve poder adicionar documentos relacionados com o evento.

---

## RF-BE-071 — Categorias

Documentos podem possuir:

```text
CONTRACT
RECEIPT
QUOTE
OTHER
```

---

## RF-BE-072 — Associar documento

Um documento deve estar associado ao evento e, quando aplicável, a um fornecedor, despesa ou pagamento.

---

# NOTIFICATIONS

## RF-BE-073 — Criar notificação

O sistema deve gerar notificações para eventos relevantes.

Exemplos:

```text
Pagamento próximo do vencimento
Tarefa atrasada
Convite recebido
Convidado confirmado
Inventário abaixo do mínimo
```

---

## RF-BE-074 — Marcar como lida

O utilizador deve poder marcar uma notificação como lida.

---

## RF-BE-075 — Listar notificações

O sistema deve disponibilizar as notificações do utilizador.

---

# DASHBOARD

## RF-BE-076 — Resumo do evento

O backend deve disponibilizar os dados necessários para o dashboard.

Deve incluir:

```text
event
days_remaining
budget
paid
pending
guests
tasks
inventory
alerts
```

---

## RF-BE-077 — Dias restantes

O backend deve disponibilizar ou permitir calcular o número de dias até ao evento.

---

## RF-BE-078 — Progresso

O sistema deve calcular um indicador geral de preparação.

A fórmula deve ser definida de forma consistente e documentada.

---

# SEARCH

## RF-BE-079 — Pesquisa

Listagens relevantes devem suportar pesquisa.

Inicialmente:

```text
Guests
Vendors
Tasks
Inventory
Expenses
```

---

# FILTERS

## RF-BE-080 — Filtros

As listagens devem suportar filtros relevantes.

Exemplos:

```text
status
category
date
```

---

# PAGINATION

## RF-BE-081 — Paginação

Endpoints de listas grandes devem suportar paginação.

---

# AUDIT

## RF-BE-082 — Histórico de ações

O sistema deve manter histórico para operações importantes quando necessário.

Exemplos:

```text
expense created
payment created
payment updated
guest confirmed
member invited
member role changed
```

---

# REPORTS

## RF-BE-083 — Dados para relatório

O backend deve disponibilizar os dados necessários para:

```text
Budget Report
Guest Report
Inventory Report
Event Summary
```

---

# 4. REQUISITOS FUNCIONAIS — FRONTEND

---

# AUTH

## RF-FE-001 — Página de login

Criar:

```text
/login
```

Com:

```text
Email
Password
Entrar
Esqueci a password
Criar conta
```

---

## RF-FE-002 — Página de registo

Criar:

```text
/register
```

Com:

```text
Nome
Email
Password
Confirmar password
```

---

## RF-FE-003 — Recuperação de password

Criar:

```text
/forgot-password
```

---

## RF-FE-004 — Reset de password

Criar:

```text
/reset-password
```

---

## RF-FE-005 — Proteção de rotas

Rotas privadas devem exigir sessão válida.

---

## RF-FE-006 — Redirect

Utilizador não autenticado:

```text
/private-route
→ /login
```

Utilizador autenticado:

```text
/login
→ /dashboard
```

---

## RF-FE-007 — Logout

Disponibilizar ação de terminar sessão.

Após logout:

```text
→ /login
```

---

# DASHBOARD

## RF-FE-008 — Dashboard

Criar:

```text
/dashboard
```

Mostrar:

```text
Evento atual
Contagem regressiva
Orçamento
Total pago
Total pendente
Convidados
Tarefas
Inventário
Alertas
```

---

## RF-FE-009 — Sem eventos

Quando o utilizador não possuir eventos, apresentar estado vazio com:

```text
Ainda não possui eventos.

[Criar evento]
```

---

# EVENTS

## RF-FE-010 — Lista de eventos

Criar:

```text
/events
```

Mostrar os eventos do utilizador.

---

## RF-FE-011 — Criar evento

Criar:

```text
/events/create
```

---

## RF-FE-012 — Detalhe do evento

Criar:

```text
/events/:event-id
```

---

## RF-FE-013 — Editar evento

Permitir editar:

```text
Nome
Tipo
Data
Local
Descrição
```

---

## RF-FE-014 — Event switcher

Permitir alternar rapidamente entre eventos.

---

# EVENT MEMBERS

## RF-FE-015 — Membros

Criar interface para visualizar membros do evento.

---

## RF-FE-016 — Convidar membro

Permitir convidar utilizadores para o evento.

---

## RF-FE-017 — Gestão de roles

Utilizadores autorizados devem poder visualizar/alterar roles quando permitido.

---

# BUDGET

## RF-FE-018 — Dashboard financeiro

Criar:

```text
/events/:event-id/budget
```

Mostrar:

```text
Orçamento total
Total planeado
Total pago
Total pendente
Despesas atrasadas
```

---

## RF-FE-019 — Despesas

Criar:

```text
/events/:event-id/budget/expenses
```

---

## RF-FE-020 — Criar despesa

Criar formulário para:

```text
Descrição
Categoria
Valor
Data limite
Notas
```

---

## RF-FE-021 — Pagamentos

Criar:

```text
/events/:event-id/budget/payments
```

---

## RF-FE-022 — Registar pagamento

Permitir:

```text
Valor
Data
Método
Referência
Notas
```

---

## RF-FE-023 — Estado financeiro

Mostrar visualmente:

```text
Planeado
Parcialmente pago
Pago
Atrasado
Cancelado
```

---

# VENDORS

## RF-FE-024 — Lista de fornecedores

Criar:

```text
/events/:event-id/vendors
```

---

## RF-FE-025 — Criar fornecedor

Disponibilizar formulário.

---

## RF-FE-026 — Detalhes do fornecedor

Mostrar:

```text
Contacto
Categoria
Contrato
Despesas
Pagamentos
Documentos
```

---

# GUESTS

## RF-FE-027 — Lista de convidados

Criar:

```text
/events/:event-id/guests
```

---

## RF-FE-028 — Criar convidado

Disponibilizar formulário.

---

## RF-FE-029 — Estado de presença

Permitir alterar:

```text
Pendente
Confirmado
Recusado
Em espera
```

---

## RF-FE-030 — Acompanhantes

Permitir visualizar e editar acompanhantes.

---

## RF-FE-031 — Resumo de convidados

Mostrar:

```text
Total
Confirmados
Pendentes
Recusados
Acompanhantes
```

---

# TABLES

## RF-FE-032 — Gestão de mesas

Criar:

```text
/events/:event-id/tables
```

---

## RF-FE-033 — Criar mesa

Permitir:

```text
Nome/Número
Capacidade
```

---

## RF-FE-034 — Distribuição

Permitir associar convidados às mesas.

---

## RF-FE-035 — Ocupação

Mostrar:

```text
8 / 10 lugares ocupados
```

---

# TASKS

## RF-FE-036 — Lista de tarefas

Criar:

```text
/events/:event-id/tasks
```

---

## RF-FE-037 — Criar tarefa

Permitir:

```text
Título
Descrição
Prazo
Prioridade
Responsável
```

---

## RF-FE-038 — Alterar estado

Permitir:

```text
Por fazer
Em andamento
Concluído
Cancelado
```

---

## RF-FE-039 — Kanban

Disponibilizar visualização Kanban para tarefas.

---

# SCHEDULE

## RF-FE-040 — Cronograma

Criar:

```text
/events/:event-id/schedule
```

---

## RF-FE-041 — Visualização

Permitir visualizar:

```text
Lista
Calendário
Timeline
```

---

# INVENTORY

## RF-FE-042 — Inventário

Criar:

```text
/events/:event-id/inventory
```

---

## RF-FE-043 — Categorias

Mostrar:

```text
Bebidas
Comida
Bolos
Decoração
Outros
```

---

## RF-FE-044 — Quantidades

Mostrar:

```text
Planeado
Disponível
Consumido
Em falta
```

---

## RF-FE-045 — Movimentação

Permitir:

```text
Adicionar
Remover
Consumir
Ajustar
```

---

## RF-FE-046 — Alerta de stock

Destacar visualmente itens abaixo do mínimo.

---

# DOCUMENTS

## RF-FE-047 — Documentos

Criar:

```text
/events/:event-id/documents
```

---

## RF-FE-048 — Upload

Permitir adicionar documentos relacionados com o evento.

---

## RF-FE-049 — Visualização

Mostrar:

```text
Nome
Tipo
Data
Tamanho
Relacionamento
```

---

# NOTIFICATIONS

## RF-FE-050 — Centro de notificações

Criar:

```text
/notifications
```

---

## RF-FE-051 — Notification badge

Mostrar contador de notificações não lidas.

---

## RF-FE-052 — Marcar como lida

Permitir marcar individualmente ou em lote quando suportado.

---

# SETTINGS

## RF-FE-053 — Perfil

Criar:

```text
/settings/profile
```

---

## RF-FE-054 — Segurança

Criar:

```text
/settings/security
```

---

## RF-FE-055 — Alterar password

Disponibilizar formulário de alteração de password.

---

# REPORTS

## RF-FE-056 — Relatório financeiro

Permitir gerar PDF do orçamento através de `jsPDF`.

---

## RF-FE-057 — Relatório de convidados

Permitir gerar PDF da lista de convidados.

---

## RF-FE-058 — Relatório de inventário

Permitir gerar PDF do inventário.

---

## RF-FE-059 — Resumo do evento

Permitir gerar PDF com resumo geral do evento.

---

# UX / UI

## RF-FE-060 — Loading

Todas as operações assíncronas devem apresentar estado de loading.

---

## RF-FE-061 — Empty state

Todas as listas devem possuir estado vazio.

---

## RF-FE-062 — Error state

Erros de API devem possuir estado visual adequado.

---

## RF-FE-063 — Toast

Operações bem-sucedidas devem utilizar `gooey-toast`.

---

## RF-FE-064 — Form validation

Formulários devem utilizar:

```text
React Hook Form
+
Zod
```

---

## RF-FE-065 — Responsive

Toda a aplicação deve funcionar em:

```text
Desktop
Tablet
Mobile
```

---

## RF-FE-066 — Accessibility

Elementos interativos devem possuir suporte adequado a:

```text
Keyboard
Focus
Labels
ARIA
Error messages
```

---

# 5. REQUISITOS TRANSVERSAIS

## RF-SYS-001 — Interface

A interface deve estar em português.

---

## RF-SYS-002 — Código

Código, entidades, variáveis e domínio técnico devem estar em inglês.

---

## RF-SYS-003 — Rotas

Todas as rotas devem estar em inglês e utilizar kebab-case.

---

## RF-SYS-004 — Files

Todos os ficheiros devem utilizar kebab-case.

---

## RF-SYS-005 — API

Endpoints devem utilizar inglês.

---

## RF-SYS-006 — Moeda

Valores monetários devem ser apresentados em Kz.

---

## RF-SYS-007 — Datas

Datas devem ser apresentadas de forma localizada para português.

---

## RF-SYS-008 — Responsividade

Nenhuma funcionalidade principal deve depender exclusivamente de desktop.

---

## RF-SYS-009 — Segurança

A UI nunca deve ser considerada mecanismo de autorização.

---

## RF-SYS-010 — Fonte da verdade

O backend é a fonte da verdade para:

```text
permissions
financial calculations
relationships
security
business rules
```

---

# 6. ORDEM DE IMPLEMENTAÇÃO

O agente deve implementar o sistema nesta ordem.

## FASE 1 — FOUNDATION

```text
1. Project structure
2. Design system
3. Routing
4. API client
5. Error handling
6. Shared components
```

---

## FASE 2 — AUTH

```text
7. Better Auth
8. Register
9. Login
10. Logout
11. Session
12. Protected routes
13. Forgot password
14. Reset password
15. Profile
16. Change password
```

---

## FASE 3 — EVENTS

```text
17. Event creation
18. Event listing
19. Event details
20. Event editing
21. Event switcher
22. Event membership
23. Invitations
24. Roles
```

---

## FASE 4 — DASHBOARD

```text
25. Event dashboard
26. Countdown
27. Financial summary
28. Guest summary
29. Task summary
30. Inventory summary
31. Alerts
```

---

## FASE 5 — FINANCE

```text
32. Budget
33. Categories
34. Expenses
35. Payments
36. Financial status
37. Financial reports
```

---

## FASE 6 — VENDORS

```text
38. Vendors
39. Vendor details
40. Contracts
41. Vendor payments
```

---

## FASE 7 — GUESTS

```text
42. Guests
43. RSVP
44. Companions
45. Guest statistics
```

---

## FASE 8 — TABLES

```text
46. Tables
47. Capacity
48. Guest assignment
49. Occupancy
```

---

## FASE 9 — PLANNING

```text
50. Tasks
51. Task assignment
52. Kanban
53. Schedule
54. Calendar
55. Timeline
```

---

## FASE 10 — INVENTORY

```text
56. Inventory
57. Drinks
58. Food
59. Cakes
60. Decoration
61. Movements
62. Stock alerts
```

---

## FASE 11 — DOCUMENTS

```text
63. Documents
64. Upload
65. Document relations
```

---

## FASE 12 — NOTIFICATIONS

```text
66. Notifications
67. Read state
68. Notification badge
```

---

## FASE 13 — REPORTS

```text
69. Event report
70. Budget report
71. Guest report
72. Inventory report
```

---

# 7. CRITÉRIO DE CONCLUSÃO

Um requisito só deve ser considerado concluído quando:

```text
[ ] Backend implementado
[ ] Frontend implementado
[ ] API integrada
[ ] Validação implementada
[ ] Autorização implementada
[ ] Loading state
[ ] Empty state
[ ] Error state
[ ] Success feedback
[ ] Responsividade
[ ] Acessibilidade
[ ] Testes
```

Quando um requisito não possuir backend, marcar explicitamente como:

```text
N/A
```

e não criar uma implementação artificial.

---

# 8. REGRA PARA O AGENTE DE IA

O agente deve executar os requisitos **pela ordem definida**, sem saltar diretamente para funcionalidades avançadas.

Para cada requisito:

1. Analisar dependências.
2. Implementar backend quando aplicável.
3. Implementar frontend quando aplicável.
4. Integrar API.
5. Validar permissões.
6. Implementar estados de loading/error/empty.
7. Criar testes.
8. Verificar responsividade.
9. Verificar naming conventions.
10. Marcar o requisito como concluído.

Não implementar funcionalidades que não estejam especificadas sem primeiro avaliar se são necessárias para cumprir um requisito existente.

Não criar abstrações antecipadas.

Não duplicar lógica.

Não utilizar dados mockados depois de existir uma API real.

Não considerar uma funcionalidade concluída apenas porque a interface foi criada.

A funcionalidade só está concluída quando o fluxo completo estiver funcional.

---

# 9. PRINCÍPIO DO MVP

A primeira versão deve priorizar:

```text
AUTH
EVENT
MEMBERS
DASHBOARD
BUDGET
VENDORS
GUESTS
TASKS
SCHEDULE
INVENTORY
DOCUMENTS
NOTIFICATIONS
REPORTS
```

Não adicionar funcionalidades fora deste escopo sem necessidade.

O objetivo da primeira versão é entregar uma aplicação onde um casal consiga realmente **criar o seu evento, convidar o parceiro, planear, controlar dinheiro, fornecedores, convidados, tarefas, cronograma e recursos do casamento até ao grande dia**.