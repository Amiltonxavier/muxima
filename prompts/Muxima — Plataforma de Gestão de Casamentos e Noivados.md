# 💍 Muxima — Plataforma de Gestão de Casamentos e Noivados

> **Muxima** significa “coração” em várias línguas bantu de Angola e representa o propósito da aplicação: colocar o casal no centro de toda a organização do seu grande dia.

**Slogan:**  
> **Do compromisso ao grande dia, tudo sob controlo.**

---

# 1. Visão do Produto

O **Muxima** é uma plataforma de gestão de eventos focada inicialmente em:

- Noivados
- Casamentos

A aplicação permite ao casal centralizar toda a preparação do evento, incluindo:

- Data e local
- Orçamento
- Despesas
- Pagamentos
- Fornecedores
- Contratos
- Convidados
- Acompanhantes
- Mesas
- Bebidas
- Alimentação
- Bolos
- Tarefas
- Cronograma
- Documentos
- Notificações
- Participantes do evento
- Progresso geral

O sistema deve responder rapidamente a perguntas como:

> Quanto já gastámos?

> Quanto ainda falta pagar?

> O que ainda precisamos contratar?

> Quem ainda não confirmou presença?

> Quantas bebidas temos?

> Quais pagamentos vencem este mês?

> Quais tarefas estão atrasadas?

> Quanto falta para o casamento?

---

# 2. Conceito Fundamental

O objeto central da aplicação é o **Evento**.

Um utilizador não gere diretamente um casamento.

Ele gere um:

```text
Evento
```

O evento possui:

```text
Tipo
Data
Local
Casal
Orçamento
Fornecedores
Convidados
Tarefas
Cronograma
Inventário
Documentos
Participantes
```

Um evento pode ser:

```text
NOIVADO
CASAMENTO
```

Na primeira versão, apenas estes dois tipos são permitidos.

---

# 3. Utilizadores

Um utilizador representa uma pessoa que possui uma conta na plataforma.

Dados mínimos:

```text
id
nome
email
telefone
password
estado
data de criação
data de atualização
```

Estados:

```text
ACTIVE
INACTIVE
SUSPENDED
```

Um utilizador pode:

- Criar eventos
- Participar em eventos
- Ser convidado para eventos
- Gerir eventos
- Visualizar eventos
- Gerir tarefas
- Gerir convidados
- Gerir orçamento, caso tenha permissão

---

# 4. Evento

O evento é a entidade principal.

Dados:

```text
id
nome
tipo
data
hora
local
descrição
orçamento previsto
estado
data de criação
data de atualização
```

Tipos:

```text
ENGAGEMENT
WEDDING
```

Estados:

```text
DRAFT
PLANNING
CONFIRMED
COMPLETED
CANCELLED
```

## Regras

### Criação

Um utilizador pode criar um evento.

Ao criar o evento:

- O criador torna-se automaticamente proprietário.
- O evento começa em `DRAFT`.
- O evento ainda não precisa possuir orçamento.
- O evento ainda não precisa possuir convidados.
- O evento ainda não precisa possuir fornecedores.

### Publicação

Um evento passa para `PLANNING` quando o proprietário começa efetivamente a preparar o evento.

### Conclusão

Um evento pode ser marcado como `COMPLETED` depois da data do evento.

### Cancelamento

Um evento pode ser cancelado pelo proprietário.

Um evento cancelado:

- Não pode receber novas despesas.
- Não pode receber novos pagamentos.
- Não pode receber novas tarefas.
- Não pode receber novos convidados.
- Não pode receber novos fornecedores.

Os dados históricos devem permanecer disponíveis.

---

# 5. Casal

Um evento pode possuir duas pessoas principais:

```text
PARTNER_ONE
PARTNER_TWO
```

Normalmente:

```text
Noivo
Noiva
```

Mas o sistema não deve depender do género.

Cada parceiro é um utilizador.

## Regras

- Um evento pode ter inicialmente apenas um proprietário.
- O proprietário pode convidar o segundo parceiro.
- O segundo parceiro pode aceitar o convite.
- Depois de aceite, passa a ter acesso ao evento.
- O proprietário pode conceder ao parceiro permissões equivalentes.
- O sistema não deve exigir que os dois parceiros tenham contas antes da criação do evento.

---

# 6. Participantes do Evento

Qualquer pessoa que tenha acesso ao evento é um participante.

Tipos:

```text
OWNER
PARTNER
ADMIN
EDITOR
VIEWER
```

## OWNER

Pode:

- Gerir o evento
- Gerir participantes
- Alterar permissões
- Gerir orçamento
- Gerir fornecedores
- Gerir convidados
- Gerir inventário
- Gerir tarefas
- Gerir documentos
- Cancelar o evento
- Eliminar dados

## PARTNER

Pode:

- Visualizar o evento
- Gerir preparação
- Gerir convidados
- Gerir tarefas
- Gerir fornecedores
- Gerir orçamento
- Gerir inventário

## ADMIN

Pode gerir praticamente todo o evento, exceto:

- Transferir propriedade
- Eliminar o evento
- Remover o proprietário

## EDITOR

Pode:

- Criar dados
- Editar dados
- Atualizar tarefas
- Gerir convidados
- Atualizar inventário

Não pode:

- Alterar permissões
- Gerir proprietários
- Eliminar o evento

## VIEWER

Pode apenas:

- Visualizar informações permitidas.

Não pode alterar dados.

---

# 7. Convites para Participantes

O proprietário pode convidar pessoas.

O convite contém:

```text
id
evento
email ou telefone
papel
token
estado
expiração
data de criação
```

Estados:

```text
PENDING
ACCEPTED
REJECTED
EXPIRED
CANCELLED
```

## Regras

- Um convite pode ser utilizado apenas uma vez.
- Um convite expirado não pode ser aceite.
- Um convite cancelado não pode ser aceite.
- O proprietário pode cancelar convites pendentes.
- O convidado pode aceitar ou rejeitar.
- Se o convidado ainda não tiver conta, deve poder criar uma conta através do convite.
- Depois de aceitar, o convite deixa de controlar o acesso; o participante passa a ser associado diretamente ao evento.

---

# 8. Orçamento

Cada evento pode possuir um orçamento.

Dados:

```text
id
evento_id
valor_planeado
valor_reserva
observação
```

O orçamento representa quanto o casal pretende gastar.

Exemplo:

```text
Orçamento:
4.500.000 Kz

Reserva:
500.000 Kz
```

---

# 9. Categorias de Orçamento

As categorias organizam os gastos.

Categorias padrão:

```text
LOCAL
DECORATION
MUSIC
PHOTOGRAPHY
VIDEO
FOOD
DRINKS
CAKE
CLOTHING
INVITATIONS
TRANSPORT
CEREMONY
BEAUTY
ENTERTAINMENT
SECURITY
ACCOMMODATION
OTHER
```

O utilizador pode criar categorias personalizadas.

---

# 10. Despesas

Uma despesa representa um compromisso financeiro.

Dados:

```text
id
evento_id
categoria_id
fornecedor_id
descrição
valor_total
valor_pago
valor_pendente
data_prevista
estado
observação
```

Estados:

```text
PLANNED
PARTIALLY_PAID
PAID
OVERDUE
CANCELLED
```

## Regras

### Valor total

Deve ser maior que zero.

### Valor pago

Nunca pode ser maior que o valor total.

### Valor pendente

Sempre:

```text
valor_pendente = valor_total - valor_pago
```

### Estado

Se:

```text
valor_pago = 0
```

estado:

```text
PLANNED
```

Se:

```text
0 < valor_pago < valor_total
```

estado:

```text
PARTIALLY_PAID
```

Se:

```text
valor_pago = valor_total
```

estado:

```text
PAID
```

Se a data de pagamento passou e ainda existe valor pendente:

```text
OVERDUE
```

---

# 11. Pagamentos

Um pagamento representa uma transação efetuada sobre uma despesa.

Dados:

```text
id
despesa_id
valor
data
método
referência
observação
criado_por
```

Métodos:

```text
CASH
BANK_TRANSFER
ATM
CARD
MOBILE_PAYMENT
OTHER
```

## Regras

- O pagamento deve estar associado a uma despesa.
- O valor deve ser maior que zero.
- O total dos pagamentos nunca pode ultrapassar o valor da despesa.
- Um pagamento registado deve atualizar automaticamente o valor pago da despesa.
- A eliminação de um pagamento deve recalcular a despesa.
- Pagamentos devem manter histórico.
- O sistema deve identificar quem registou o pagamento.

---

# 12. Fornecedores

Fornecedor é uma pessoa ou empresa responsável por prestar um serviço.

Dados:

```text
id
evento_id
nome
categoria
telefone
email
morada
descrição
estado
observação
```

Estados:

```text
PROSPECT
CONTACTED
NEGOTIATING
CONTRACTED
COMPLETED
CANCELLED
```

Categorias:

```text
VENUE
DECORATION
MUSIC
PHOTOGRAPHY
VIDEO
CATERING
CAKE
DRINKS
TRANSPORT
BEAUTY
SECURITY
ENTERTAINMENT
OTHER
```

---

# 13. Contratos

Um fornecedor pode possuir um contrato.

Dados:

```text
id
fornecedor_id
evento_id
número
data_inicio
data_fim
valor
estado
documento
observação
```

Estados:

```text
DRAFT
ACTIVE
COMPLETED
CANCELLED
```

O contrato deve poder ser associado às despesas e pagamentos correspondentes.

---

# 14. Convidados

Um convidado pertence a um evento.

Dados:

```text
id
evento_id
nome
telefone
email
grupo
tipo
estado
número_acompanhantes
observação
```

Tipos:

```text
FAMILY
FRIEND
COLLEAGUE
VIP
OTHER
```

Estados:

```text
PENDING
CONFIRMED
DECLINED
WAITING
```

## Regras

- Um convidado deve pertencer a um evento.
- O nome é obrigatório.
- O telefone é opcional.
- Email é opcional.
- O número de acompanhantes nunca pode ser negativo.
- Um convidado confirmado pode possuir acompanhantes.
- Um convidado recusado não deve ocupar lugar na capacidade confirmada.

---

# 15. Acompanhantes

Um convidado pode possuir acompanhantes.

Dados:

```text
id
guest_id
nome
estado
```

Estados:

```text
PENDING
CONFIRMED
DECLINED
```

O número real de pessoas deve ser calculado através dos convidados e acompanhantes confirmados.

---

# 16. Convites dos Convidados

O sistema pode gerar convites digitais.

Dados:

```text
id
evento_id
guest_id
código
url
estado
data_envio
data_resposta
```

Estados:

```text
CREATED
SENT
OPENED
RESPONDED
EXPIRED
```

O convidado pode responder:

```text
CONFIRM
DECLINE
```

---

# 17. Lista de Convidados

O dashboard deve apresentar:

```text
Total de convidados
Confirmados
Pendentes
Recusados
Total de acompanhantes
Total de pessoas confirmadas
```

Exemplo:

```text
Convidados: 250
Confirmados: 180
Pendentes: 45
Recusados: 25

Pessoas confirmadas:
218
```

---

# 18. Capacidade do Evento

O evento pode possuir uma capacidade máxima.

```text
capacidade = 250
```

O sistema deve alertar quando:

```text
pessoas_confirmadas >= capacidade
```

E impedir novas confirmações caso o proprietário tenha ativado:

```text
LIMIT_GUEST_CAPACITY
```

Caso contrário, deve apenas emitir um alerta.

---

# 19. Mesas

O evento pode possuir mesas.

Dados:

```text
id
evento_id
nome
número
capacidade
localização
observação
```

Um convidado pode ser associado a uma mesa.

## Regras

- Uma mesa não pode ultrapassar a capacidade definida.
- Um convidado só pode estar associado a uma mesa.
- Um convidado recusado não deve ocupar lugar.
- O sistema deve permitir alterar a mesa.
- O sistema deve mostrar lugares ocupados e disponíveis.

---

# 20. Tarefas

As tarefas representam coisas que precisam ser feitas.

Dados:

```text
id
evento_id
título
descrição
responsável
prazo
prioridade
estado
categoria
data_conclusão
criado_por
```

Prioridades:

```text
LOW
MEDIUM
HIGH
URGENT
```

Estados:

```text
TODO
IN_PROGRESS
COMPLETED
CANCELLED
```

Categorias:

```text
FINANCE
VENUE
GUESTS
FOOD
DRINKS
DECORATION
CEREMONY
DOCUMENTS
CLOTHING
TRANSPORT
OTHER
```

---

# 21. Regras das Tarefas

Uma tarefa pode ter:

```text
responsável
prazo
prioridade
```

Se:

```text
prazo < data atual
```

e:

```text
estado != COMPLETED
```

a tarefa deve ser considerada:

```text
OVERDUE
```

Uma tarefa concluída deve guardar:

```text
data_conclusão
quem_concluiu
```

---

# 22. Checklist Inicial

Ao criar um casamento, o sistema pode disponibilizar um checklist padrão.

Exemplo:

```text
Definir orçamento
Escolher data
Escolher local
Contratar decoração
Contratar fotógrafo
Contratar vídeo
Contratar música
Definir menu
Contratar bolo
Definir bebidas
Criar lista de convidados
Enviar convites
Confirmar convidados
Escolher mesas
Preparar roupas
Confirmar fornecedores
Confirmar pagamentos
Confirmar cronograma
```

O proprietário pode:

- Adicionar tarefas
- Editar tarefas
- Remover tarefas
- Alterar prazos
- Alterar responsáveis

---

# 23. Cronograma

O cronograma representa acontecimentos importantes do evento.

Dados:

```text
id
evento_id
título
descrição
data
hora_inicio
hora_fim
local
responsável
estado
```

Exemplos:

```text
Preparação
Cerimónia
Receção
Entrada dos noivos
Corte do bolo
Primeira dança
Jantar
Fotografia
Encerramento
```

---

# 24. Cronograma do Dia

O sistema deve permitir organizar o próprio dia do casamento.

Exemplo:

```text
08:00 — Preparação da noiva
09:00 — Preparação do noivo
11:00 — Fotografia
14:00 — Cerimónia
16:00 — Receção
17:00 — Entrada dos noivos
18:00 — Jantar
20:00 — Corte do bolo
21:00 — Música
23:00 — Encerramento
```

---

# 25. Inventário

O inventário controla produtos físicos necessários para o evento.

Categorias:

```text
DRINK
FOOD
CAKE
DECORATION
OTHER
```

Dados:

```text
id
evento_id
nome
categoria
quantidade_planeada
quantidade_atual
unidade
preço_unitário
fornecedor
observação
```

Unidades:

```text
UNIT
BOX
CASE
BOTTLE
KG
LITER
PACKAGE
OTHER
```

---

# 26. Bebidas

Bebidas devem ser tratadas como inventário.

Exemplo:

```text
Cerveja
Quantidade planeada: 120 grades
Quantidade atual: 90 grades

Vinho
Quantidade planeada: 100 garrafas
Quantidade atual: 92 garrafas

Água
Quantidade planeada: 60 caixas
Quantidade atual: 55 caixas
```

O sistema deve permitir:

```text
Adicionar
Consumir
Ajustar
Transferir
Corrigir
```

---

# 27. Movimentação de Inventário

Cada alteração do inventário deve gerar um movimento.

Dados:

```text
id
item_id
tipo
quantidade
motivo
data
utilizador
```

Tipos:

```text
PURCHASE
ADD
CONSUMPTION
ADJUSTMENT
LOSS
RETURN
```

## Regra fundamental

O sistema não deve simplesmente alterar:

```text
quantidade_atual
```

sem guardar histórico.

Exemplo:

```text
100 garrafas

+ 50 compra
- 10 consumo
- 5 perda
```

Resultado:

```text
135 garrafas
```

---

# 28. Planeamento de Bebidas

O sistema deve permitir definir:

```text
Número de convidados
Produto
Quantidade planeada
```

Posteriormente poderá existir um cálculo automático baseado em regras configuráveis.

Exemplo:

```text
250 pessoas
+
consumo estimado
=
quantidade recomendada
```

O cálculo deve ser configurável e nunca obrigatório.

O sistema não deve assumir que todos os eventos possuem o mesmo padrão de consumo.

---

# 29. Alimentação

A alimentação deve funcionar de forma semelhante ao inventário.

Exemplos:

```text
Arroz — 30 kg
Carne — 50 kg
Frango — 40 kg
Salada — 20 kg
Sobremesa — 250 unidades
```

Cada item pode possuir:

```text
quantidade planeada
quantidade disponível
unidade
fornecedor
custo estimado
```

---

# 30. Bolos

Bolos podem ser tratados como itens específicos.

Tipos:

```text
WEDDING_CAKE
GROOM_CAKE
BRIDE_CAKE
GUEST_CAKE
BIRTHDAY_CAKE
CHILDREN_CAKE
OTHER
```

Cada bolo pode possuir:

```text
nome
tipo
quantidade
peso
fornecedor
valor
data de entrega
estado
```

---

# 31. Documentos

O evento pode armazenar documentos relacionados à organização.

Exemplos:

```text
Contrato do salão
Contrato do fotógrafo
Contrato da decoração
Orçamentos
Comprovativos
Notas
Documentos dos fornecedores
```

Dados:

```text
id
evento_id
nome
tipo
referência
entidade_relacionada
estado
data
```

Os documentos devem poder estar relacionados com:

```text
Fornecedor
Despesa
Pagamento
Evento
```

---

# 32. Notificações

O sistema deve gerar notificações importantes.

Exemplos:

```text
Pagamento próximo do vencimento
Pagamento atrasado
Tarefa atrasada
Tarefa próxima do prazo
Convite pendente
Convidado ainda não respondeu
Inventário abaixo do planeado
Evento próximo
Contrato próximo do fim
```

Prioridades:

```text
INFO
WARNING
IMPORTANT
CRITICAL
```

---

# 33. Alertas Financeiros

O sistema deve identificar:

```text
Despesas pendentes
Despesas parcialmente pagas
Despesas atrasadas
Pagamentos próximos
Pagamentos atrasados
Orçamento ultrapassado
```

Se:

```text
total_despesas > orçamento
```

o sistema deve apresentar:

```text
Orçamento ultrapassado
```

---

# 34. Métricas do Dashboard

O dashboard deve calcular automaticamente:

### Financeiro

```text
Orçamento total
Total contratado
Total pago
Total pendente
Total em atraso
Percentagem do orçamento utilizada
```

### Preparação

```text
Total de tarefas
Tarefas concluídas
Tarefas pendentes
Tarefas atrasadas
Percentagem de conclusão
```

### Convidados

```text
Total
Confirmados
Pendentes
Recusados
Acompanhantes
Total de pessoas
```

### Inventário

```text
Produtos
Quantidade planeada
Quantidade disponível
Produtos abaixo do esperado
```

### Evento

```text
Data
Dias restantes
Estado
Percentagem de preparação
```

---

# 35. Percentagem de Preparação

A aplicação deve possuir uma métrica geral de preparação.

Exemplo:

```text
Financeiro       80%
Fornecedores     90%
Convidados       65%
Tarefas          75%
Inventário       50%

Preparação geral 72%
```

A fórmula deve ser baseada em critérios configuráveis.

Não deve ser simplesmente:

```text
tarefas concluídas / tarefas totais
```

O sistema pode atribuir peso a diferentes áreas.

---

# 36. Relatórios

O sistema deve disponibilizar relatórios do evento.

Relatórios previstos:

```text
Resumo geral
Relatório financeiro
Relatório de fornecedores
Lista de convidados
Lista de mesas
Inventário
Lista de tarefas
Cronograma
Pagamentos
Despesas
```

---

# 37. Auditoria

Alterações importantes devem ser registadas.

Exemplos:

```text
Amilton adicionou uma despesa
Maria registou um pagamento
João confirmou presença
Maria alterou a quantidade de cerveja
Amilton convidou Ana
Maria alterou o orçamento
```

Dados do histórico:

```text
id
evento_id
utilizador_id
ação
entidade
entidade_id
dados_anteriores
dados_novos
data
```

A auditoria não deve ser editável pelos utilizadores.

---

# 38. Regras de Eliminação

Dados financeiros não devem ser eliminados fisicamente sem controlo.

Por exemplo:

```text
Pagamento
Despesa
Contrato
Movimento de inventário
```

devem preferencialmente possuir estado:

```text
CANCELLED
VOID
DELETED
```

mantendo histórico.

A eliminação definitiva deve ser restrita.

---

# 39. Moeda

A aplicação deve inicialmente trabalhar com:

```text
AOA — Kwanza
```

O evento deve guardar a moeda utilizada.

A moeda deve ser associada ao evento para impedir que os valores sejam interpretados incorretamente.

---

# 40. Localização do Evento

O evento deve possuir:

```text
nome do local
endereço
província
município
bairro
referência
latitude
longitude
```

Nem todos os campos precisam ser obrigatórios.

---

# 41. Datas

Um evento deve possuir:

```text
data do evento
hora de início
hora de fim
```

O sistema deve calcular:

```text
dias restantes
```

Se a data já passou:

```text
evento realizado
```

---

# 42. Regras para Eventos Passados

Depois da data do evento:

- O evento continua acessível.
- Os dados históricos permanecem.
- O dashboard muda para modo pós-evento.
- O sistema apresenta resumo final.
- O orçamento final pode ser comparado com o planeado.

Exemplo:

```text
Orçamento planeado: 4.500.000 Kz
Gasto final:         4.230.000 Kz

Economia:
270.000 Kz
```

---

# 43. Comparação Planeado vs Real

O sistema deve diferenciar:

```text
Planeado
Contratado
Pago
Real
```

Exemplo:

```text
Comida

Planeado:    800.000 Kz
Contratado:  850.000 Kz
Pago:        500.000 Kz
Pendente:    350.000 Kz
```

---

# 44. Pesquisa e Filtros

Todas as principais listas devem permitir:

```text
Pesquisar
Filtrar
Ordenar
Paginar
```

Exemplos:

Convidados:

```text
Confirmados
Pendentes
Recusados
```

Despesas:

```text
Pagas
Pendentes
Atrasadas
```

Tarefas:

```text
Concluídas
Pendentes
Atrasadas
```

---

# 45. Configurações do Evento

O proprietário pode configurar:

```text
Nome
Tipo
Data
Hora
Local
Capacidade
Moeda
Orçamento
Privacidade
Notificações
Regras de confirmação
```

---

# 46. Privacidade do Evento

O evento é privado por padrão.

Somente:

```text
Proprietário
Parceiro
Participantes autorizados
```

podem aceder.

Links públicos, quando existirem, devem possuir permissões específicas.

---

# 47. Partilha

O proprietário pode partilhar informações específicas.

Exemplo:

```text
Partilhar convidados
Partilhar cronograma
Partilhar tarefas
Partilhar fornecedores
Partilhar orçamento
```

O acesso deve respeitar permissões.

Uma pessoa que possui acesso ao evento não deve automaticamente ter acesso a todas as informações.

---

# 48. Estado Geral do Evento

O evento deve possuir uma situação resumida:

```text
ON_TRACK
ATTENTION
AT_RISK
COMPLETED
```

### ON_TRACK

Preparação dentro do esperado.

### ATTENTION

Existem problemas que precisam de atenção.

### AT_RISK

Existem problemas graves.

Exemplos:

```text
Muitos pagamentos atrasados
Muitas tarefas atrasadas
Orçamento ultrapassado
Poucos convidados confirmados
Inventário insuficiente
```

---

# 49. Regras de Negócio do Dashboard

O dashboard deve priorizar problemas.

Ordem:

```text
1. Problemas críticos
2. Pagamentos atrasados
3. Tarefas atrasadas
4. Problemas de convidados
5. Inventário insuficiente
6. Próximos pagamentos
7. Próximas tarefas
8. Informações gerais
```

O dashboard não deve ser apenas estatístico.

Deve ser **acionável**.

Exemplo:

```text
⚠ 3 pagamentos vencem esta semana

→ Ver pagamentos
```

---

# 50. Modelo de Dados Principal

A estrutura lógica da BD deve ser organizada aproximadamente assim:

```text
users
│
├── event_members
│
└── invitations


events
│
├── event_members
├── event_invitations
├── budgets
├── budget_categories
├── expenses
├── payments
├── vendors
├── vendor_contracts
├── guests
├── guest_companions
├── guest_invitations
├── tables
├── table_guests
├── tasks
├── schedules
├── inventory_items
├── inventory_movements
├── documents
├── notifications
└── audit_logs
```

---

# 51. Estrutura das Tabelas

## users

```text
id
name
email
phone
password
status
created_at
updated_at
```

---

## events

```text
id
owner_id
name
type
status
event_date
start_time
end_time
venue_name
address
province
municipality
neighborhood
reference
latitude
longitude
capacity
currency
description
created_at
updated_at
```

---

## event_members

```text
id
event_id
user_id
role
status
joined_at
created_at
updated_at
```

---

## event_invitations

```text
id
event_id
invited_by
email
phone
role
token
status
expires_at
accepted_at
created_at
updated_at
```

---

## budgets

```text
id
event_id
planned_amount
reserve_amount
notes
created_at
updated_at
```

---

## budget_categories

```text
id
event_id
name
description
planned_amount
created_at
updated_at
```

---

## expenses

```text
id
event_id
budget_category_id
vendor_id
description
total_amount
due_date
status
notes
created_by
created_at
updated_at
```

---

## payments

```text
id
expense_id
amount
payment_date
method
reference
notes
created_by
created_at
updated_at
```

---

## vendors

```text
id
event_id
name
category
phone
email
address
status
description
notes
created_at
updated_at
```

---

## vendor_contracts

```text
id
event_id
vendor_id
number
start_date
end_date
amount
status
document_id
notes
created_at
updated_at
```

---

## guests

```text
id
event_id
name
phone
email
group
type
status
companions_limit
notes
created_at
updated_at
```

---

## guest_companions

```text
id
guest_id
name
status
created_at
updated_at
```

---

## guest_invitations

```text
id
event_id
guest_id
code
status
sent_at
opened_at
responded_at
created_at
updated_at
```

---

## tables

```text
id
event_id
name
number
capacity
location
notes
created_at
updated_at
```

---

## table_guests

```text
id
table_id
guest_id
assigned_at
```

---

## tasks

```text
id
event_id
title
description
category
priority
status
assigned_to
due_date
completed_at
completed_by
created_by
created_at
updated_at
```

---

## schedules

```text
id
event_id
title
description
start_at
end_at
location
responsible
status
created_at
updated_at
```

---

## inventory_items

```text
id
event_id
name
category
planned_quantity
current_quantity
unit
unit_price
vendor_id
notes
created_at
updated_at
```

---

## inventory_movements

```text
id
inventory_item_id
type
quantity
reason
created_by
created_at
```

---

## documents

```text
id
event_id
name
type
reference
vendor_id
expense_id
payment_id
status
created_by
created_at
updated_at
```

---

## notifications

```text
id
user_id
event_id
type
title
message
priority
read_at
created_at
```

---

## audit_logs

```text
id
event_id
user_id
action
entity
entity_id
old_data
new_data
created_at
```

---

# 52. Relacionamentos Principais

```text
User
 └── Events

Event
 ├── Owner
 ├── Members
 ├── Invitations
 ├── Budget
 ├── Categories
 ├── Expenses
 ├── Vendors
 ├── Payments
 ├── Guests
 ├── Tables
 ├── Tasks
 ├── Schedules
 ├── Inventory
 ├── Documents
 ├── Notifications
 └── Audit Logs
```

Relações:

```text
User 1:N Event
Event 1:N EventMember
Event 1:N Vendor
Event 1:N Guest
Event 1:N Task
Event 1:N Schedule
Event 1:N InventoryItem
Event 1:N Document

Budget 1:N BudgetCategory
BudgetCategory 1:N Expense
Expense 1:N Payment

Vendor 1:N Contract
Vendor 1:N Expense

Guest 1:N Companion
Guest N:1 Table

InventoryItem 1:N InventoryMovement
```

---

# 53. Use Cases

## UC01 — Criar conta

**Ator:** Utilizador

### Pré-condições

Nenhuma.

### Fluxo

1. Utilizador informa dados.
2. Sistema valida dados.
3. Sistema cria conta.
4. Sistema ativa a conta.
5. Utilizador pode entrar na aplicação.

---

# 54. UC02 — Criar evento

**Ator:** Utilizador

### Fluxo

1. Utilizador escolhe tipo.
2. Informa nome.
3. Informa data.
4. Informa local, se disponível.
5. Define orçamento opcional.
6. Sistema cria evento.
7. Utilizador torna-se `OWNER`.
8. Sistema cria checklist inicial.

---

# 55. UC03 — Convidar parceiro

1. Proprietário abre gestão de participantes.
2. Informa email/telefone.
3. Escolhe papel.
4. Sistema cria convite.
5. Sistema envia convite.
6. Parceiro aceita.
7. Sistema cria membro do evento.

---

# 56. UC04 — Definir orçamento

1. Proprietário informa orçamento.
2. Sistema guarda orçamento.
3. Utilizador cria categorias.
4. Define valores planeados.
5. Sistema calcula distribuição.
6. Dashboard apresenta orçamento.

---

# 57. UC05 — Adicionar fornecedor

1. Utilizador abre fornecedores.
2. Cria fornecedor.
3. Define categoria.
4. Informa contacto.
5. Define estado.
6. Sistema associa fornecedor ao evento.

---

# 58. UC06 — Contratar fornecedor

1. Utilizador seleciona fornecedor.
2. Marca como contratado.
3. Define valor.
4. Cria contrato opcional.
5. Sistema permite associar despesa.
6. Dashboard atualiza compromissos financeiros.

---

# 59. UC07 — Criar despesa

1. Utilizador seleciona categoria.
2. Opcionalmente seleciona fornecedor.
3. Define valor.
4. Define vencimento.
5. Sistema cria despesa.
6. Dashboard atualiza valor contratado.

---

# 60. UC08 — Registar pagamento

1. Utilizador abre despesa.
2. Seleciona "Adicionar pagamento".
3. Informa valor.
4. Informa data.
5. Informa método.
6. Sistema valida limite.
7. Regista pagamento.
8. Atualiza despesa.
9. Atualiza dashboard.

---

# 61. UC09 — Adicionar convidado

1. Utilizador informa nome.
2. Adiciona contacto opcional.
3. Define grupo.
4. Define acompanhantes.
5. Sistema cria convidado como `PENDING`.

---

# 62. UC10 — Confirmar convidado

1. Convidado recebe convite.
2. Abre convite.
3. Confirma presença.
4. Define acompanhantes.
5. Sistema altera estado.
6. Sistema atualiza número total de pessoas.
7. Sistema verifica capacidade.

---

# 63. UC11 — Organizar mesas

1. Utilizador cria mesas.
2. Define capacidade.
3. Seleciona convidados.
4. Associa convidados.
5. Sistema valida capacidade.
6. Sistema apresenta ocupação.

---

# 64. UC12 — Criar tarefa

1. Utilizador cria tarefa.
2. Define prazo.
3. Define prioridade.
4. Define responsável.
5. Sistema cria tarefa.

---

# 65. UC13 — Concluir tarefa

1. Utilizador abre tarefa.
2. Marca como concluída.
3. Sistema guarda data.
4. Sistema guarda responsável pela conclusão.
5. Dashboard atualiza progresso.

---

# 66. UC14 — Adicionar item ao inventário

1. Utilizador seleciona categoria.
2. Informa produto.
3. Define quantidade.
4. Define unidade.
5. Sistema cria inventário.
6. Sistema regista entrada inicial.

---

# 67. UC15 — Consumir inventário

1. Utilizador seleciona item.
2. Informa quantidade.
3. Sistema verifica quantidade disponível.
4. Regista movimento.
5. Atualiza quantidade.
6. Verifica nível mínimo.
7. Se necessário, cria alerta.

---

# 68. UC16 — Adicionar cronograma

1. Utilizador cria atividade.
2. Define data.
3. Define horário.
4. Define local.
5. Define responsável.
6. Sistema adiciona ao cronograma.

---

# 69. UC17 — Adicionar documento

1. Utilizador seleciona entidade.
2. Seleciona tipo.
3. Adiciona documento.
4. Sistema associa ao evento.
5. Documento fica disponível conforme permissões.

---

# 70. UC18 — Visualizar Dashboard

O sistema deve calcular:

```text
Resumo financeiro
Resumo de convidados
Resumo de tarefas
Resumo de inventário
Próximos acontecimentos
Alertas
Dias restantes
Percentagem de preparação
```

---

# 71. UC19 — Consultar pagamentos pendentes

O sistema deve apresentar:

```text
Fornecedor
Despesa
Valor total
Pago
Pendente
Vencimento
Estado
```

Ordenação padrão:

```text
Mais urgente primeiro
```

---

# 72. UC20 — Consultar tarefas atrasadas

O sistema deve listar:

```text
Tarefa
Responsável
Prazo
Prioridade
Dias em atraso
```

---

# 73. UC21 — Consultar convidados pendentes

O sistema deve apresentar:

```text
Nome
Telefone
Grupo
Data do convite
Estado
```

---

# 74. UC22 — Consultar inventário

O sistema deve apresentar:

```text
Produto
Planeado
Atual
Consumido
Percentagem disponível
Estado
```

---

# 75. UC23 — Gerar relatório financeiro

O sistema deve apresentar:

```text
Orçamento
Categorias
Despesas
Pagamentos
Valores pendentes
Valores atrasados
Comparação planeado vs real
```

---

# 76. UC24 — Gerar relatório de convidados

O sistema deve apresentar:

```text
Total
Confirmados
Pendentes
Recusados
Acompanhantes
Distribuição por grupo
Mesas
```

---

# 77. UC25 — Encerrar evento

1. Proprietário seleciona encerramento.
2. Sistema verifica data.
3. Mostra resumo final.
4. Proprietário confirma.
5. Evento passa para `COMPLETED`.
6. Dados passam a histórico.

---

# 78. Regras Financeiras Fundamentais

O sistema nunca deve permitir:

```text
Pagamento > despesa
Valor negativo
Despesa sem evento
Pagamento sem despesa
Despesa sem categoria
```

O sistema deve sempre conseguir responder:

```text
Quanto foi planeado?
Quanto foi contratado?
Quanto foi pago?
Quanto falta pagar?
Quanto está atrasado?
```

---

# 79. Regras de Convidados Fundamentais

O sistema nunca deve perder a distinção entre:

```text
Convidado
Acompanhante
Pessoa total
```

Exemplo:

```text
100 convidados

70 confirmados

20 acompanhantes confirmados

Total real:
90 pessoas
```

---

# 80. Regras de Inventário Fundamentais

Nunca alterar quantidade sem histórico.

Toda alteração deve possuir:

```text
tipo
quantidade
motivo
utilizador
data
```

O inventário atual deve resultar das movimentações.

---

# 81. Regras de Permissão Fundamentais

Toda operação deve verificar:

```text
Quem está a executar?
A que evento pertence?
Qual é o papel?
Tem permissão?
```

Um utilizador nunca deve conseguir aceder a dados de outro evento apenas conhecendo o identificador.

---

# 82. Regras de Consistência

Todos os dados pertencentes a um evento devem respeitar:

```text
event_id
```

Um fornecedor de:

```text
Evento A
```

não pode ser associado a uma despesa de:

```text
Evento B
```

Da mesma forma:

```text
Guest A
```

não pode ser colocado numa mesa do:

```text
Evento B
```

---

# 83. Regras de Histórico

Informações importantes devem possuir histórico.

Principalmente:

```text
Pagamentos
Despesas
Inventário
Permissões
Participantes
Alterações financeiras
```

O sistema deve permitir descobrir:

```text
Quem alterou?
O que alterou?
Quando alterou?
Qual era o valor anterior?
Qual é o novo valor?
```

---

# 84. Fluxo Principal do Produto

O fluxo ideal do utilizador será:

```text
CRIAR CONTA
      ↓
CRIAR EVENTO
      ↓
DEFINIR DATA
      ↓
DEFINIR ORÇAMENTO
      ↓
CONVIDAR PARCEIRO
      ↓
CHECKLIST INICIAL
      ↓
FORNECEDORES
      ↓
DESPESAS
      ↓
PAGAMENTOS
      ↓
CONVIDADOS
      ↓
BEBIDAS / ALIMENTAÇÃO
      ↓
MESAS
      ↓
CRONOGRAMA
      ↓
CONFIRMAÇÕES
      ↓
ÚLTIMOS PAGAMENTOS
      ↓
GRANDE DIA
      ↓
ENCERRAR EVENTO
      ↓
RELATÓRIO FINAL
```

---

# 85. Conceito de "Centro de Controlo"

O Muxima não deve ser apenas uma aplicação de cadastro.

O sistema deve transformar dados em decisões.

Exemplo:

```text
DADOS

250 convidados
180 confirmados
45 pendentes
4 pagamentos atrasados
7 tarefas pendentes
3 produtos abaixo do planeado
```

deve transformar-se em:

```text
⚠ Existem 45 convidados sem confirmação.

⚠ Existem 4 pagamentos atrasados.

⚠ As bebidas estão abaixo da quantidade planeada.

✓ 78% da preparação está concluída.
```

---

# 86. Futuras Regras de Negócio

Estas funcionalidades não precisam fazer parte do MVP, mas devem ser consideradas na arquitetura do domínio:

```text
Convites digitais
QR Code
Check-in dos convidados
WhatsApp
SMS
Marketplace de fornecedores
Orçamentos de fornecedores
Comparação de fornecedores
Pagamentos online
Lista de presentes
Lua de mel
Lista de desejos
Planeamento de cerimónia
Gestão de padrinhos
Gestão de damas
Gestão de transporte
Gestão de alojamento
Gestão de fotografia
Gestão de música
Gestão de decoração
Aplicação para fornecedores
Aplicação para convidados
```

---

# 87. Princípio Central do Produto

O Muxima deve seguir uma regra simples:

> **O casal não deve precisar de várias ferramentas para saber como está o seu casamento.**

Tudo deve convergir para:

```text
EVENTO
│
├── Quanto temos?
├── Quanto gastámos?
├── Quanto falta pagar?
├── Quem contratámos?
├── Quem vai participar?
├── O que falta fazer?
├── O que temos?
├── O que falta comprar?
├── O que acontece a seguir?
└── Estamos preparados?
```

O objetivo final não é simplesmente **organizar informações**.

É permitir que o casal tenha, em qualquer momento, uma resposta clara para:

> **"Como está a preparação do nosso grande dia?"**