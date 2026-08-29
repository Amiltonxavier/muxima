# MUXIMA — ARQUITETURA BACKEND

## 1. OBJETIVO

Criar uma arquitetura backend **simples, modular e escalável**, evitando overengineering.

A aplicação deve utilizar uma abordagem de:

```text
Modular Monolith
+
Domain-oriented structure
+
Service Layer
+
Repository Layer
```

Cada domínio deve ser independente o suficiente para crescer sem criar dependências desnecessárias entre módulos.

---

# 2. PRINCÍPIO PRINCIPAL

A estrutura deve seguir:

```text
Request
   ↓
Route
   ↓
Schema Validation
   ↓
Service
   ↓
Repository
   ↓
Database
```

Exemplo:

```text
POST /events

Route
 ↓
Validate input
 ↓
EventService
 ↓
EventRepository
 ↓
Database
```

A `route` não deve conter regras de negócio.

O `repository` não deve conter regras de negócio.

O `service` é responsável pelas regras de negócio.

---

# 3. ESTRUTURA

Utilizar uma estrutura simples:

```text
src/
├── app/
│   ├── server.ts
│   ├── app.ts
│   ├── env.ts
│   └── config.ts
│
├── modules/
│   ├── auth/
│   │   ├── routes.ts
│   │   ├── schemas.ts
│   │   ├── service.ts
│   │   └── types.ts
│   │
│   ├── users/
│   │   ├── routes.ts
│   │   ├── schemas.ts
│   │   ├── service.ts
│   │   ├── repository.ts
│   │   └── types.ts
│   │
│   ├── events/
│   │   ├── routes.ts
│   │   ├── schemas.ts
│   │   ├── service.ts
│   │   ├── repository.ts
│   │   └── types.ts
│   │
│   ├── members/
│   │   ├── routes.ts
│   │   ├── schemas.ts
│   │   ├── service.ts
│   │   ├── repository.ts
│   │   └── types.ts
│   │
│   ├── budget/
│   │   ├── routes.ts
│   │   ├── schemas.ts
│   │   ├── service.ts
│   │   ├── repository.ts
│   │   └── types.ts
│   │
│   ├── vendors/
│   │   ├── routes.ts
│   │   ├── schemas.ts
│   │   ├── service.ts
│   │   ├── repository.ts
│   │   └── types.ts
│   │
│   ├── guests/
│   │   ├── routes.ts
│   │   ├── schemas.ts
│   │   ├── service.ts
│   │   ├── repository.ts
│   │   └── types.ts
│   │
│   ├── tasks/
│   │   ├── routes.ts
│   │   ├── schemas.ts
│   │   ├── service.ts
│   │   ├── repository.ts
│   │   └── types.ts
│   │
│   ├── schedule/
│   │   ├── routes.ts
│   │   ├── schemas.ts
│   │   ├── service.ts
│   │   ├── repository.ts
│   │   └── types.ts
│   │
│   ├── inventory/
│   │   ├── routes.ts
│   │   ├── schemas.ts
│   │   ├── service.ts
│   │   ├── repository.ts
│   │   └── types.ts
│   │
│   ├── documents/
│   │   ├── routes.ts
│   │   ├── schemas.ts
│   │   ├── service.ts
│   │   ├── repository.ts
│   │   └── types.ts
│   │
│   ├── notifications/
│   │   ├── routes.ts
│   │   ├── service.ts
│   │   ├── repository.ts
│   │   └── types.ts
│   │
│   └── dashboard/
│       ├── routes.ts
│       ├── service.ts
│       └── types.ts
│
├── shared/
│   ├── errors/
│   │   ├── app-error.ts
│   │   └── error-handler.ts
│   │
│   ├── database/
│   │   └── prisma.ts
│   │
│   ├── auth/
│   │   ├── auth.ts
│   │   └── auth-middleware.ts
│   │
│   ├── http/
│   │   └── response.ts
│   │
│   ├── utils/
│   │   └── helpers.ts
│   │
│   └── types/
│       └── common.ts
│
└── routes.ts
```

---

# 4. REGRA DE DOMÍNIO

Cada pasta dentro de `modules` representa uma área funcional do sistema.

Exemplo:

```text
modules/events
```

é responsável exclusivamente pelo domínio de eventos.

Não colocar funcionalidades de eventos em:

```text
shared/
utils/
helpers/
```

apenas para reutilização.

---

# 5. ROUTES

O arquivo:

```text
routes.ts
```

é responsável apenas por declarar endpoints.

Exemplo:

```text
GET    /events
GET    /events/:event-id
POST   /events
PATCH  /events/:event-id
DELETE /events/:event-id
```

A route deve:

1. Receber request.
2. Validar input.
3. Obter utilizador autenticado.
4. Chamar service.
5. Retornar response.

Não deve possuir regras complexas.

---

# 6. SCHEMAS

O arquivo:

```text
schemas.ts
```

é responsável pela validação de entrada.

Exemplo:

```text
createEventSchema
updateEventSchema
listEventsSchema
```

Os schemas devem validar:

```text
params
query
body
```

A validação deve acontecer antes da execução do service.

---

# 7. SERVICE

O arquivo:

```text
service.ts
```

é o coração do módulo.

É responsável pelas regras de negócio.

Exemplo:

```text
EventService.create()
EventService.update()
EventService.delete()
EventService.findById()
EventService.findAll()
```

O service pode utilizar:

```text
repository
shared services
other domain services
```

quando necessário.

---

# 8. REPOSITORY

O arquivo:

```text
repository.ts
```

é responsável pelo acesso à base de dados.

Exemplo:

```text
EventRepository.create()
EventRepository.findById()
EventRepository.findMany()
EventRepository.update()
EventRepository.delete()
```

O repository não deve decidir:

```text
quem pode editar
se o evento pode ser eliminado
se o pagamento é válido
se uma mesa tem lugares disponíveis
```

Essas decisões pertencem ao service.

---

# 9. DATABASE

Utilizar um único acesso centralizado ao Prisma.

```text
shared/database/prisma.ts
```

Exemplo conceptual:

```text
PrismaClient
```

Não criar vários `PrismaClient`.

---

# 10. AUTH

A autenticação deve ficar isolada:

```text
shared/auth/
```

ou:

```text
modules/auth/
```

O Better Auth será responsável por:

```text
register
login
logout
session
password
email verification
```

Os módulos de negócio não devem implementar autenticação novamente.

---

# 11. AUTHORIZATION

Autorização deve ser aplicada nos services.

Exemplo:

```text
EventService.update()
```

deve verificar se o utilizador possui acesso ao evento e permissão suficiente.

Conceito:

```text
authenticate()
 ↓
authorize()
 ↓
business logic
```

---

# 12. EVENT ACCESS

Como quase toda a aplicação gira em torno do evento, criar uma regra central para verificar acesso.

Exemplo conceptual:

```text
EventAccessService
```

Responsabilidades:

```text
getMembership()
hasAccess()
hasRole()
can()
```

Isso evita repetir:

```text
find event
find member
check role
```

em todos os módulos.

---

# 13. RELAÇÃO ENTRE MÓDULOS

A estrutura deve ser:

```text
Events
 ├── Members
 ├── Budget
 ├── Vendors
 ├── Guests
 ├── Tasks
 ├── Schedule
 ├── Inventory
 └── Documents
```

O `event-id` será o principal contexto dos módulos relacionados.

Exemplo:

```text
/events/:event-id/guests
/events/:event-id/vendors
/events/:event-id/tasks
```

---

# 14. NÃO CRIAR UM EVENT CONTEXT GLOBAL

Não criar um objeto gigante:

```text
EventManager
EventController
WeddingManager
WeddingService
```

que controle todo o sistema.

Cada domínio deve controlar os seus próprios dados.

---

# 15. BUDGET

O módulo:

```text
modules/budget
```

controla:

```text
budget
expense
payment
expense-category
```

Fluxo:

```text
BudgetService
 ↓
ExpenseRepository
 ↓
PaymentRepository
 ↓
Database
```

---

# 16. GUESTS

O módulo:

```text
modules/guests
```

controla:

```text
guest
companion
rsvp
```

Não colocar convidados dentro de:

```text
events/service.ts
```

---

# 17. INVENTORY

O módulo:

```text
modules/inventory
```

controla:

```text
inventory-item
inventory-category
inventory-movement
```

O stock atual deve ser calculado de forma consistente.

Não permitir que diferentes módulos alterem diretamente o stock.

Todas as alterações devem passar pelo:

```text
InventoryService
```

---

# 18. TASKS

O módulo:

```text
modules/tasks
```

controla:

```text
task
task-assignment
task-status
```

---

# 19. NOTIFICATIONS

O módulo:

```text
modules/notifications
```

controla:

```text
notification
notification-status
```

Outros módulos podem solicitar uma notificação através do service.

Exemplo:

```text
PaymentService
 ↓
NotificationService
```

---

# 20. DASHBOARD

O dashboard não deve possuir tabelas próprias apenas para duplicar dados.

O:

```text
DashboardService
```

deve agregar dados dos outros módulos.

Exemplo:

```text
DashboardService
 ├── BudgetService
 ├── GuestService
 ├── TaskService
 ├── InventoryService
 └── EventService
```

Quando necessário, para performance, pode utilizar queries específicas de agregação diretamente através dos repositories.

---

# 21. SHARED

A pasta:

```text
shared/
```

deve conter apenas código realmente transversal.

Permitido:

```text
errors
database
auth
http
utils
types
```

Não permitido:

```text
shared/events
shared/guests
shared/budget
```

Só porque algum código foi utilizado duas vezes.

---

# 22. ERRORS

Criar um erro base:

```text
AppError
```

Tipos possíveis:

```text
BadRequestError
UnauthorizedError
ForbiddenError
NotFoundError
ConflictError
ValidationError
```

O error handler converte os erros para responses HTTP apropriadas.

---

# 23. RESPONSE

As responses devem possuir uma estrutura consistente.

Sucesso:

```text
{
  "data": {}
}
```

Lista:

```text
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

Erro:

```text
{
  "error": {
    "code": "EVENT_NOT_FOUND",
    "message": "Event not found"
  }
}
```

---

# 24. STATUS CODES

Utilizar HTTP status codes corretamente.

```text
200 OK
201 Created
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
500 Internal Server Error
```

Não retornar `200` para todos os cenários.

---

# 25. PAGINATION

Listagens devem suportar:

```text
page
limit
```

Quando necessário:

```text
search
sort
order
filters
```

Exemplo:

```text
GET /events?page=1&limit=20
```

---

# 26. QUERY PARAMETERS

Utilizar parâmetros em inglês.

Exemplo:

```text
?page=1
&limit=20
&search=wedding
&status=planning
```

Nunca:

```text
?pagina=1
&limite=20
&pesquisa=wedding
```

---

# 27. API VERSIONING

Preparar a API para versionamento.

Utilizar:

```text
/api/v1
```

Exemplo:

```text
/api/v1/events
/api/v1/guests
/api/v1/budget
```

Não criar versões diferentes sem necessidade.

---

# 28. REST

Utilizar REST de forma simples.

Exemplos:

```text
GET    /api/v1/events
POST   /api/v1/events
GET    /api/v1/events/:event-id
PATCH  /api/v1/events/:event-id
DELETE /api/v1/events/:event-id
```

---

# 29. DATABASE TRANSACTIONS

Utilizar transações quando uma operação alterar múltiplos recursos que precisam ser consistentes.

Exemplo:

```text
Create payment
 ↓
Update expense
 ↓
Create notification
```

Se essas operações precisarem ser atomicamente consistentes, utilizar uma transaction.

Não utilizar transaction em todas as operações indiscriminadamente.

---

# 30. BUSINESS LOGIC

Regras de negócio devem estar nos services.

Exemplo:

```text
PaymentService.create()
```

pode verificar:

```text
expense exists
expense is not cancelled
payment amount > 0
payment does not exceed allowed amount
user has permission
```

A route não deve fazer essas verificações.

---

# 31. CROSS-MODULE DEPENDENCY

Evitar dependências circulares.

Não permitir:

```text
Events → Budget
Budget → Events
Events → Budget
```

sem necessidade.

Preferir:

```text
Event
 ↓
EventAccessService
 ↓
Budget
```

ou utilizar uma abstração compartilhada simples quando realmente necessário.

---

# 32. DATABASE MODELS

Os models devem representar o domínio.

Principais entidades:

```text
User
Session
Account

Event
EventMember
EventInvitation

Budget
Expense
Payment

Vendor

Guest
GuestCompanion

Table
TableAssignment

Task

ScheduleItem

InventoryItem
InventoryMovement

Document

Notification
```

---

# 33. SOFT DELETE

Não utilizar soft delete em todas as tabelas automaticamente.

Utilizar apenas onde existir necessidade real de preservar histórico.

Principalmente:

```text
Financial records
Audit records
Important relationships
```

---

# 34. FINANCIAL DATA

Dados financeiros devem possuir precisão adequada.

Nunca utilizar `float` para representar dinheiro.

Utilizar um tipo apropriado no banco para valores monetários.

---

# 35. AUDIT

Operações importantes devem poder ser auditadas.

Criar posteriormente:

```text
AuditLog
```

com:

```text
user_id
event_id
action
entity
entity_id
metadata
created_at
```

Não armazenar passwords ou tokens no audit log.

---

# 36. FILE STORAGE

Documentos não devem ser armazenados diretamente no banco como regra geral.

O banco deve guardar metadados:

```text
name
mime_type
size
storage_key
url
```

O armazenamento físico deve ser abstraído.

---

# 37. SERVICES EXTERNOS

Integrações externas devem ficar isoladas.

Exemplo:

```text
shared/services/
```

ou uma pasta específica de infraestrutura.

Exemplos futuros:

```text
email
storage
payments
notifications
```

Não espalhar chamadas externas pelos módulos.

---

# 38. EMAIL

O código de negócio não deve conhecer detalhes do provider de email.

Preferir:

```text
EmailService
```

Exemplo:

```text
InvitationService
 ↓
EmailService
 ↓
Provider
```

---

# 39. NOTIFICATIONS

As regras de notificação devem ser disparadas pelos serviços de domínio.

Exemplo:

```text
PaymentService
 ↓
NotificationService
```

e não:

```text
PaymentRoute
 ↓
NotificationProvider
```

---

# 40. CACHE

O sistema deve estar preparado para utilização de cache futuramente.

Não adicionar Redis em todos os endpoints desde o início.

Adicionar cache apenas para dados que realmente apresentem necessidade.

Possíveis candidatos:

```text
Dashboard
Statistics
Frequently accessed configuration
```

---

# 41. BACKGROUND JOBS

Operações demoradas não devem bloquear requests HTTP.

Futuramente podem ser executadas em background:

```text
Email
PDF generation
Notifications
Reports
Reminders
```

A arquitetura deve permitir adicionar workers posteriormente.

---

# 42. CRON / REMINDERS

Funcionalidades como:

```text
payment reminders
task reminders
event countdown
```

não devem depender de requests do utilizador.

Devem poder ser executadas por jobs agendados.

---

# 43. TESTES

Cada módulo deve possuir testes próximos do domínio.

Exemplo:

```text
modules/events/
├── routes.ts
├── schemas.ts
├── service.ts
├── repository.ts
├── types.ts
└── service.test.ts
```

Prioridade:

```text
Business Rules
Services
Schemas
Routes
```

---

# 44. TESTES DE SERVICES

Testar principalmente:

```text
authorization
business rules
invalid states
relationships
calculations
```

Exemplo:

```text
Cannot assign guest to full table.
Cannot pay cancelled expense.
Cannot modify event without permission.
Cannot exceed inventory constraints.
```

---

# 45. OPENAPI

A API deve possuir documentação OpenAPI.

Cada endpoint deve documentar:

```text
method
path
parameters
request body
response
errors
authentication
```

---

# 46. LOGGING

Implementar logging estruturado.

Logs devem permitir identificar:

```text
request
method
path
status
duration
user
error
```

Nunca registrar:

```text
password
session token
authentication secrets
sensitive credentials
```

---

# 47. CONFIGURATION

Centralizar configuração da aplicação.

Exemplo:

```text
app
database
auth
email
storage
```

Não utilizar `process.env` espalhado pelo código.

Preferir:

```text
env.ts
```

com validação.

---

# 48. ENVIRONMENT

Separar configurações por ambiente:

```text
development
test
production
```

Segredos nunca devem estar hardcoded no código.

---

# 49. DEPENDENCY RULE

A direção das dependências deve ser:

```text
Routes
  ↓
Services
  ↓
Repositories
  ↓
Database
```

Nunca:

```text
Repository
 ↓
Route
```

ou:

```text
Database
 ↓
Service
```

---

# 50. REGRA DE SIMPLICIDADE

Não criar uma camada apenas porque "arquiteturalmente parece correta".

Antes de criar:

```text
factory
adapter
provider
facade
use-case
mapper
interface
abstract class
```

verificar se existe uma necessidade real.

O objetivo é:

```text
Simple
Readable
Testable
Maintainable
Scalable
```

---

# 51. QUANDO UM MÓDULO CRESCER

Inicialmente:

```text
events/
├── routes.ts
├── schemas.ts
├── service.ts
├── repository.ts
└── types.ts
```

Se o módulo crescer muito, pode evoluir para:

```text
events/
├── routes/
│   ├── create-event.ts
│   ├── update-event.ts
│   └── list-events.ts
│
├── schemas/
│   ├── create-event-schema.ts
│   └── update-event-schema.ts
│
├── services/
│   ├── create-event.ts
│   └── update-event.ts
│
├── repositories/
│   └── event-repository.ts
│
└── types/
    └── event-types.ts
```

Não começar já com essa estrutura.

---

# 52. EVOLUÇÃO DA ARQUITETURA

A arquitetura deve evoluir progressivamente:

```text
FASE 1

Modular Monolith
       ↓
Modules
       ↓
Services
       ↓
Repositories
       ↓
Database
```

Se o sistema crescer significativamente:

```text
Modular Monolith
       ↓
Extract independent modules
       ↓
Workers
       ↓
External services
```

Só considerar microservices quando existir uma necessidade real.

---

# 53. REGRA DE IMPLEMENTAÇÃO PARA O AGENTE

Ao implementar uma funcionalidade:

### Passo 1

Identificar o módulo.

Exemplo:

```text
Guest Management
→ modules/guests
```

### Passo 2

Criar/atualizar schema.

### Passo 3

Criar repository quando houver acesso à BD.

### Passo 4

Implementar regra de negócio no service.

### Passo 5

Criar endpoint.

### Passo 6

Adicionar autorização.

### Passo 7

Adicionar tratamento de erros.

### Passo 8

Adicionar testes.

### Passo 9

Documentar endpoint.

---

# 54. REGRA DE NAMING

Todos os ficheiros e paths devem utilizar:

```text
kebab-case
```

Exemplos:

```text
event-service.ts
event-repository.ts
create-event-schema.ts
event-routes.ts
```

Evitar:

```text
EventService.ts
eventService.ts
CreateEvent.ts
```

---

# 55. API NAMING

Rotas sempre em inglês.

Utilizar:

```text
/api/v1/events
/api/v1/event-members
/api/v1/guests
/api/v1/vendors
/api/v1/tasks
/api/v1/inventory
```

Nunca utilizar nomes em português nas URLs.

---

# 56. REGRA FINAL

O backend do Muxima deve começar como um:

**Modular Monolith simples.**

Não criar microservices.

Não criar Clean Architecture excessivamente abstrata.

Não criar dezenas de interfaces.

Não criar Use Cases individuais para cada CRUD simples.

A estrutura inicial deve ser:

```text
Route
 ↓
Schema
 ↓
Service
 ↓
Repository
 ↓
Prisma
 ↓
PostgreSQL
```

Com:

```text
Better Auth
Error Handler
Authorization
OpenAPI
Logging
Tests
```

como infraestrutura transversal.

A arquitetura deve permitir que cada módulo cresça de forma independente, sem transformar o projeto num monólito desorganizado.