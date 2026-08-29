# PROMPT — UI/UX COMPLETA DA APLICAÇÃO MUXIMA

Cria a **UI/UX completa da aplicação web Muxima**, uma plataforma de gestão e organização de **noivados e casamentos**.

A aplicação deve transmitir uma sensação de:

- Elegância
- Organização
- Confiança
- Sofisticação
- Romantismo discreto
- Profissionalismo
- Simplicidade

A aplicação **não deve parecer uma aplicação infantil, excessivamente romântica ou decorativa**.

O objetivo principal é criar uma interface profissional de **gestão de eventos**, utilizando o casamento/noivado como contexto.

---

# 1. CONCEITO VISUAL

A interface deve ser moderna, limpa e sofisticada.

Evitar:

- Excesso de elementos decorativos
- Excesso de animações
- Cores muito fortes
- Gradientes exagerados
- Cards excessivos
- Sombras pesadas
- Ícones desnecessários
- Emojis como elementos de interface
- Layouts visualmente confusos

Priorizar:

- Espaçamento consistente
- Tipografia clara
- Hierarquia visual forte
- Bordas discretas
- Ícones simples
- Botões claros
- Informação financeira facilmente legível
- Estados visuais consistentes
- Layout responsivo

A aplicação deve parecer um produto SaaS premium de gestão de eventos.

---

# 2. ESTRUTURA GERAL DA APLICAÇÃO

A aplicação deve possuir dois grandes contextos:

```text
AUTH
│
├── Login
├── Criar conta
├── Recuperar password
├── Redefinir password
└── Aceitar convite

APP
│
├── Dashboard
├── Eventos
├── Orçamento
├── Fornecedores
├── Convidados
├── Mesas
├── Tarefas
├── Cronograma
├── Inventário
├── Documentos
├── Notificações
└── Configurações
```

---

# 3. LAYOUT PRINCIPAL

Depois de autenticado, o layout principal deve seguir:

```text
┌──────────────────────────────────────────────────────────────────┐
│ TOPBAR                                                           │
│ Logo   Evento atual                         Notificações  Avatar │
├───────────────┬──────────────────────────────────────────────────┤
│               │                                                  │
│   SIDEBAR     │              MAIN CONTENT                       │
│               │                                                  │
│ Dashboard     │                                                  │
│ Evento        │                                                  │
│ Orçamento     │                                                  │
│ Fornecedores  │                                                  │
│ Convidados    │                                                  │
│ Mesas         │                                                  │
│ Tarefas       │                                                  │
│ Cronograma    │                                                  │
│ Inventário    │                                                  │
│ Documentos    │                                                  │
│               │                                                  │
│               │                                                  │
│ Configurações │                                                  │
│ Ajuda         │                                                  │
│               │                                                  │
│ User          │                                                  │
└───────────────┴──────────────────────────────────────────────────┘
```

---

# 4. SIDEBAR

A sidebar deve possuir largura fixa em desktop.

Estrutura:

```text
MUXIMA
────────────────────

EVENTO

💍 John & Maria
15 Dez 2026

────────────────────

MENU

Dashboard

Planeamento
  Orçamento
  Fornecedores
  Tarefas
  Cronograma

Convidados
  Lista de convidados
  Mesas

Logística
  Bebidas
  Alimentação
  Bolos
  Inventário

Documentos

────────────────────

SISTEMA

Notificações
Configurações
Ajuda

────────────────────

UTILIZADOR
Nome
Email
```

Não utilizar emojis reais.

Utilizar ícones consistentes.

A sidebar deve possuir:

- Estado ativo
- Hover
- Focus
- Separação visual entre grupos
- Scroll independente quando necessário

---

# 5. TOPBAR

A topbar deve possuir:

```text
[Menu mobile]

MUXIMA / Casamento Amilton & Maria

                           🔔     [Avatar]
```

No desktop:

```text
Evento atual
             Notificações
             Ajuda
             Perfil
```

A topbar deve permanecer fixa enquanto o conteúdo principal pode fazer scroll.

---

# 6. SELETOR DE EVENTO

Caso o utilizador possua vários eventos, deve existir um seletor:

```text
┌──────────────────────────────┐
│ 💍 Casamento Amilton & Maria │
│    15 Dezembro 2026          │
│                              │
│    ↓                         │
└──────────────────────────────┘
```

Ao abrir:

```text
Meus eventos

✓ Casamento Amilton & Maria
  15 Dezembro 2026

  Noivado João & Ana
  20 Setembro 2026

──────────────────

+ Criar novo evento
```

---

# 7. DASHBOARD

O dashboard é a página principal.

Layout:

```text
┌─────────────────────────────────────────────────────────────┐
│ Bom dia, John                                            │
│ Aqui está o estado da preparação do seu casamento.          │
│                                                             │
│ Casamento John & Maria                                   │
│ 15 Dezembro 2026 · Huambo                                  │
└─────────────────────────────────────────────────────────────┘
```

---

# 8. CARD DE CONTAGEM REGRESSIVA

Destacar:

```text
┌──────────────────────────────────────┐
│ SEU GRANDE DIA                       │
│                                      │
│ 108                                   │
│ dias                                  │
│                                      │
│ 15 Dezembro 2026                     │
└──────────────────────────────────────┘
```

Quando estiver próximo:

```text
Faltam 7 dias
```

Depois do evento:

```text
Evento realizado
15 Dezembro 2026
```

---

# 9. DASHBOARD FINANCEIRO

Criar uma área:

```text
Resumo financeiro
```

Com cards:

```text
┌───────────────┐
│ ORÇAMENTO     │
│ 4.500.000 Kz  │
└───────────────┘

┌───────────────┐
│ CONTRATADO    │
│ 3.200.000 Kz  │
└───────────────┘

┌───────────────┐
│ PAGO          │
│ 1.850.000 Kz  │
└───────────────┘

┌───────────────┐
│ POR PAGAR     │
│ 1.350.000 Kz  │
└───────────────┘
```

Abaixo:

```text
Utilização do orçamento

████████████████░░░░

71% utilizado
```

---

# 10. DASHBOARD DE PREPARAÇÃO

Mostrar:

```text
Preparação do evento

72%

Financeiro       █████████░
Fornecedores     ██████████
Convidados       ██████░░░░
Tarefas          ████████░░
Inventário       █████░░░░░
```

---

# 11. ALERTAS

Criar uma área chamada:

```text
Requer atenção
```

Exemplo:

```text
⚠ Pagamento do salão vence em 3 dias
   300.000 Kz pendentes

⚠ 45 convidados ainda não responderam

⚠ 3 tarefas estão atrasadas

⚠ Bebidas abaixo da quantidade planeada
```

Cada alerta deve permitir ação:

```text
Ver pagamento →
Ver convidados →
Ver tarefas →
Ver inventário →
```

---

# 12. PRÓXIMAS ATIVIDADES

Mostrar:

```text
Próximas atividades

Hoje
────────────────────────
Pagamento fotógrafo
75.000 Kz

Amanhã
────────────────────────
Confirmar decoração

02 Setembro
────────────────────────
Enviar convites

05 Setembro
────────────────────────
Reunião com fornecedor
```

---

# 13. PÁGINA DE EVENTOS

Página:

```text
Meus eventos
```

Mostrar eventos em cards ou lista.

Cada evento:

```text
┌────────────────────────────────────────┐
│ CASAMENTO                              │
│                                        │
│ Amilton & Maria                        │
│ 15 Dezembro 2026                       │
│ Huambo                                 │
│                                        │
│ Preparação 72%                         │
│ ██████████████░░░░                     │
│                                        │
│ 108 dias restantes                     │
│                                        │
│ [Abrir evento]                         │
└────────────────────────────────────────┘
```

Botão:

```text
+ Criar evento
```

---

# 14. CRIAR EVENTO

Criar um formulário simples e dividido por etapas.

## Etapa 1

```text
Que tipo de evento está a preparar?

[ Noivado ]

[ Casamento ]
```

## Etapa 2

```text
Informações do evento

Nome do evento
Data
Hora
Local
Província
Município
```

## Etapa 3

```text
Orçamento

Quanto pretende gastar?

[ 4.500.000 Kz ]

Adicionar orçamento depois
```

## Etapa 4

```text
Convidar parceiro

Nome
Email / Telefone

[ Enviar convite ]

Pular esta etapa
```

---

# 15. PÁGINA DE ORÇAMENTO

Layout:

```text
Orçamento
────────────────────────────────────────────

Orçamento total
4.500.000 Kz

Pago
1.850.000 Kz

Pendente
1.350.000 Kz

────────────────────────────────────────────

Categorias
```

Tabela:

```text
Categoria       Planeado      Pago       Pendente

Salão           800.000       500.000    300.000
Comida          900.000       400.000    500.000
Decoração       450.000       300.000    150.000
Música          300.000       200.000    100.000
Bebidas         500.000       250.000    250.000
```

Botão:

```text
+ Adicionar despesa
```

---

# 16. DETALHE DA DESPESA

Ao abrir:

```text
Despesa

Salão

Valor total
800.000 Kz

Pago
500.000 Kz

Pendente
300.000 Kz

Estado
Parcialmente pago
```

Abaixo:

```text
Histórico de pagamentos

10 Ago
200.000 Kz

20 Ago
300.000 Kz
```

Botão:

```text
+ Registar pagamento
```

---

# 17. PÁGINA DE FORNECEDORES

Layout:

```text
Fornecedores

[Pesquisar fornecedor]       [+ Adicionar fornecedor]

Todos | Contratados | Pendentes | Concluídos
```

Tabela:

```text
Fornecedor       Categoria       Valor       Estado

Espaço Elegance  Salão           800.000     Contratado
DJ João          Música          300.000     Contratado
Studio X         Fotografia      250.000     Negociação
Decorarte        Decoração       450.000     Contratado
```

---

# 18. DETALHE DO FORNECEDOR

```text
Espaço Elegance

Salão

Contacto
923 xxx xxx

Estado
Contratado

Contrato
Contrato #001

Valor
800.000 Kz

Pago
500.000 Kz

Pendente
300.000 Kz
```

Abas:

```text
Resumo
Contrato
Pagamentos
Documentos
Notas
```

---

# 19. PÁGINA DE CONVIDADOS

Layout:

```text
Convidados

250 pessoas

180 Confirmados
45 Pendentes
25 Recusados
```

Tabela:

```text
Nome            Grupo        Estado        Pessoas

João Manuel     Família      Confirmado    3
Ana Pedro       Amigos       Pendente      1
Carlos Silva    Trabalho     Recusado      1
```

Ações:

```text
+ Adicionar convidado
Importar convidados
Enviar convites
```

---

# 20. DETALHE DO CONVIDADO

```text
João Manuel

Família

Telefone
923 xxx xxx

Estado
Confirmado

Acompanhantes
2

Mesa
Mesa 08
```

Histórico:

```text
Convite enviado
Convite aberto
Presença confirmada
```

---

# 21. PÁGINA DE MESAS

Criar uma interface visual para organização das mesas.

```text
Mesas

Total de mesas: 25
Capacidade: 250
Ocupação: 218
```

Representação:

```text
       ┌─────────────┐
       │   MESA 01   │
       │             │
       │  8 / 10     │
       └─────────────┘

       ┌─────────────┐
       │   MESA 02   │
       │             │
       │  10 / 10    │
       └─────────────┘
```

Permitir:

- Criar mesa
- Alterar capacidade
- Arrastar convidados
- Remover convidados
- Ver lugares disponíveis

---

# 22. PÁGINA DE TAREFAS

Layout:

```text
Tarefas

Todas | Pendentes | Em andamento | Concluídas | Atrasadas
```

Lista:

```text
○ Confirmar salão
  Prazo: 10 Setembro
  Responsável: Amilton

○ Confirmar bebidas
  Prazo: 15 Setembro
  Responsável: Maria

✓ Contratar fotógrafo
  Concluído
```

Botão:

```text
+ Nova tarefa
```

---

# 23. VISUALIZAÇÃO KANBAN

A página de tarefas também deve permitir:

```text
┌──────────────┬──────────────┬──────────────┐
│ A FAZER      │ EM ANDAMENTO │ CONCLUÍDO    │
├──────────────┼──────────────┼──────────────┤
│ Comprar      │ Decoração   │ Fotógrafo    │
│ bebidas      │              │              │
│              │ Convites     │ Salão        │
└──────────────┴──────────────┴──────────────┘
```

---

# 24. PÁGINA DE CRONOGRAMA

Deve possuir duas visualizações:

```text
Lista
Calendário
```

Lista:

```text
15 SET

09:00
Preparação da noiva

11:00
Sessão fotográfica

14:00
Cerimónia

16:00
Receção

18:00
Jantar

20:00
Corte do bolo
```

---

# 25. CRONOGRAMA DO DIA DO CASAMENTO

Criar uma visualização especial:

```text
O GRANDE DIA

08:00 ─ Preparação
09:30 ─ Fotografia
12:00 ─ Transporte
14:00 ─ Cerimónia
16:00 ─ Receção
17:00 ─ Entrada dos noivos
18:00 ─ Jantar
20:00 ─ Corte do bolo
21:00 ─ Festa
```

---

# 26. PÁGINA DE INVENTÁRIO

Dashboard do inventário:

```text
Inventário

Total de itens
24

Itens suficientes
18

Atenção
4

Insuficientes
2
```

Categorias:

```text
Bebidas
Alimentação
Bolos
Decoração
Outros
```

Tabela:

```text
Produto       Planeado     Atual       Estado

Cerveja       120 caixas   90 caixas   Atenção
Vinho         100          92          Normal
Água          60           55          Atenção
```

---

# 27. PÁGINA DE BEBIDAS

Criar uma experiência específica para bebidas.

```text
Bebidas

250 convidados

────────────────────────────

Cerveja

Planeado
120 caixas

Disponível
90 caixas

████████████░░░░

[Registar entrada]
[Registar consumo]
```

Vinho:

```text
100 garrafas planeadas
92 disponíveis
```

O sistema deve destacar visualmente quando o stock estiver abaixo do planeado.

---

# 28. PÁGINA DE ALIMENTAÇÃO

```text
Alimentação

Itens planeados

Arroz
30 kg

Carne
50 kg

Frango
40 kg

Salada
20 kg

Sobremesa
250 porções
```

Permitir controlar:

- Quantidade
- Unidade
- Estado
- Fornecedor
- Custo
- Disponibilidade

---

# 29. PÁGINA DE BOLOS

```text
Bolos

Bolo dos noivos
Contratado
150.000 Kz

Bolos para convidados
250 unidades
120.000 Kz

Bolos infantis
50 unidades
60.000 Kz
```

---

# 30. PÁGINA DE DOCUMENTOS

Layout:

```text
Documentos

[Pesquisar]       [+ Adicionar documento]

Todos
Contratos
Comprovativos
Orçamentos
Outros
```

Lista:

```text
Contrato - Salão
Contrato - Fotógrafo
Comprovativo - Bebidas
Orçamento - Decoração
```

---

# 31. NOTIFICAÇÕES

Criar um centro de notificações.

Categorias:

```text
Todas
Financeiro
Tarefas
Convidados
Inventário
Evento
```

Exemplo:

```text
Pagamento próximo

O pagamento do salão de 300.000 Kz
vence daqui a 3 dias.

há 20 minutos
```

---

# 32. CONFIGURAÇÕES DO EVENTO

Dividir em:

```text
Informações gerais
Casal
Local
Orçamento
Convidados
Participantes
Notificações
Privacidade
```

---

# 33. PARTICIPANTES

Página:

```text
Participantes do evento

Amilton
Proprietário

Maria
Parceira

João
Editor

Ana
Visualizador
```

Botão:

```text
+ Convidar pessoa
```

Cada participante deve permitir:

```text
Alterar permissão
Remover acesso
Reenviar convite
```

---

# 34. PERFIL DO UTILIZADOR

```text
Meu perfil

Nome
Email
Telefone

────────────────

Conta

Alterar password
Notificações
Sessões
```

---

# 35. ESTADOS DA INTERFACE

Toda a aplicação deve possuir estados bem definidos.

## Loading

Utilizar skeletons.

Nunca mostrar uma página completamente vazia.

## Empty State

Exemplo:

```text
Ainda não existem fornecedores.

Adicione os fornecedores que irão
participar no seu evento.

[Adicionar fornecedor]
```

## Error State

```text
Não foi possível carregar os fornecedores.

[Tentar novamente]
```

## Success

Após uma operação:

```text
Fornecedor criado com sucesso.
```

## Warning

```text
Este pagamento está atrasado.
```

---

# 36. MODAIS

Modais devem ser utilizados para ações rápidas:

```text
Adicionar pagamento
Adicionar convidado
Adicionar tarefa
Adicionar fornecedor
Adicionar item
Criar mesa
Confirmar exclusão
```

O modal deve possuir:

```text
Header
Conteúdo
Footer
```

O conteúdo pode fazer scroll, mas o header e footer devem permanecer visíveis.

---

# 37. FORMULÁRIOS

Todos os formulários devem seguir a mesma estrutura visual.

```text
Título

Descrição curta

Campo
Label
Input
Mensagem de erro

Campo
Label
Input

────────────────────

[Cancelar] [Guardar]
```

Erros devem aparecer junto ao campo.

Nunca utilizar apenas mensagens genéricas no topo.

---

# 38. TABELAS

As tabelas devem ser profissionais e limpas.

Devem suportar:

- Pesquisa
- Ordenação
- Filtros
- Paginação
- Seleção
- Ações
- Estado vazio
- Loading
- Erro

As ações devem aparecer de forma discreta.

Exemplo:

```text
Fornecedor       Categoria       Valor       Estado      ...

Espaço Elegance  Salão           800.000     Contratado  ⋮
```

---

# 39. CARDS

Cards devem ser utilizados apenas quando ajudam a organizar informação.

Não transformar toda a interface em cards.

Usar cards principalmente para:

- Métricas
- Resumos
- Alertas
- Eventos
- Estados importantes

Listagens grandes devem preferencialmente utilizar tabelas ou listas.

---

# 40. RESPONSIVIDADE

A aplicação deve funcionar em:

```text
Desktop
Tablet
Mobile
```

No mobile:

- Sidebar transforma-se em menu
- Tabelas podem transformar-se em listas
- Cards ocupam largura disponível
- Formulários passam para uma coluna
- Botões devem ser facilmente clicáveis
- A topbar deve permanecer simples

---

# 41. MOBILE

Layout:

```text
┌──────────────────────────────┐
│ ☰   MUXIMA          🔔       │
├──────────────────────────────┤
│                              │
│ Casamento                    │
│ Amilton & Maria              │
│                              │
│ 108 dias                     │
│                              │
│ Orçamento                    │
│ 4.500.000 Kz                 │
│                              │
│ Tarefas                      │
│ 7 pendentes                  │
│                              │
└──────────────────────────────┘
```

Criar navegação mobile simples e intuitiva.

---

# 42. PÁGINAS DE AUTENTICAÇÃO

## Login

```text
MUXIMA

Bem-vindo novamente

Email
Password

[Entrar]

Esqueci a minha password

Ainda não possui uma conta?
Criar conta
```

## Criar conta

```text
Criar conta

Nome
Email
Telefone
Password
Confirmar password

[Criar conta]
```

---

# 43. PRIMEIRO ACESSO

Depois de criar a conta, apresentar onboarding.

```text
Bem-vindo ao Muxima

Vamos preparar o seu grande dia.

1. Criar evento
2. Definir data
3. Definir orçamento
4. Convidar parceiro
5. Começar preparação
```

Mostrar progresso:

```text
1 de 5
████░░░░░░
```

---

# 44. ONBOARDING DO CASAMENTO

Perguntas simples:

```text
Qual é o tipo de evento?

○ Noivado
○ Casamento
```

Depois:

```text
Qual é a data?
```

Depois:

```text
Quantas pessoas pretende convidar?
```

Depois:

```text
Qual é o orçamento aproximado?
```

Depois:

```text
Deseja convidar o seu parceiro agora?
```

No final:

```text
O seu evento está pronto.

[Começar preparação]
```

---

# 45. SISTEMA DE CORES

A identidade visual deve ser elegante.

Utilizar uma paleta neutra e sofisticada:

```text
Background principal
Superfícies
Texto principal
Texto secundário
Bordas
Cor primária
Sucesso
Aviso
Erro
Informação
```

A cor primária deve ser usada com moderação.

Não utilizar a cor primária em todos os elementos.

Estados:

```text
Success → verde discreto
Warning → âmbar discreto
Error → vermelho discreto
Info → azul discreto
```

---

# 46. TIPOGRAFIA

A tipografia deve possuir:

```text
Display
Heading 1
Heading 2
Heading 3
Body
Small
Caption
Label
```

A hierarquia deve ser clara.

Valores financeiros importantes devem possuir maior destaque.

---

# 47. BOTÕES

Criar variantes:

```text
Primary
Secondary
Outline
Ghost
Destructive
```

Tamanhos:

```text
Small
Medium
Large
```

Estados:

```text
Default
Hover
Focus
Active
Disabled
Loading
```

---

# 48. BADGES

Criar estados padronizados.

Exemplos:

```text
Pago
Pendente
Atrasado
Confirmado
Recusado
Em andamento
Concluído
Cancelado
Contratado
```

O mesmo estado deve possuir sempre o mesmo tratamento visual em toda a aplicação.

---

# 49. ÍCONES

Utilizar ícones simples e consistentes.

Nunca utilizar emojis como ícones de interface.

Os ícones devem servir para:

- Navegação
- Ações
- Estados
- Informação
- Alertas

Não utilizar ícones apenas para decorar.

---

# 50. EXPERIÊNCIA FINANCEIRA

Valores monetários devem possuir sempre:

```text
4.500.000 Kz
```

Nunca apresentar valores financeiros sem contexto.

Exemplo:

```text
Por pagar
1.350.000 Kz
```

é preferível a:

```text
1.350.000
```

---

# 51. EXPERIÊNCIA DO CASAL

O sistema deve sempre apresentar o casal e o evento de forma contextual.

Exemplo:

```text
Casamento
Amilton & Maria
15 Dezembro 2026
```

A experiência deve fazer o utilizador sentir que está a gerir **o seu evento**, e não apenas preenchendo formulários.

---

# 52. EXPERIÊNCIA DE ALERTAS

Alertas devem ser úteis e acionáveis.

Evitar:

```text
Existem problemas.
```

Preferir:

```text
3 pagamentos vencem nos próximos 7 dias.

[Ver pagamentos]
```

---

# 53. PRINCÍPIO DE NAVEGAÇÃO

A aplicação deve permitir chegar às áreas principais em no máximo poucos cliques.

Fluxos importantes:

```text
Dashboard
→ Pagamento
→ Registar pagamento
```

```text
Dashboard
→ Convidados
→ Convidado
→ Confirmar
```

```text
Dashboard
→ Inventário
→ Bebidas
→ Registar entrada
```

---

# 54. PESQUISA GLOBAL

Criar futuramente uma pesquisa global:

```text
Pesquisar no Muxima...

⌘ K
```

Pode encontrar:

```text
Convidados
Fornecedores
Despesas
Pagamentos
Tarefas
Documentos
```

---

# 55. ATALHOS

No desktop, suportar atalhos para ações frequentes:

```text
N → Nova tarefa
G → Novo convidado
P → Novo pagamento
V → Novo fornecedor
```

Os atalhos devem ser opcionais e discretos.

---

# 56. ACESSIBILIDADE

Toda a interface deve considerar:

- Contraste adequado
- Navegação por teclado
- Focus visível
- Labels em campos
- Mensagens de erro claras
- Botões acessíveis
- Estados não dependentes apenas de cor
- Tamanhos de toque adequados no mobile

---

# 57. REGRA DE OURO DA UI

A interface deve sempre responder:

```text
O que está a acontecer?
O que precisa da minha atenção?
O que devo fazer agora?
```

O utilizador não deve precisar navegar por várias páginas para descobrir problemas importantes.

---

# 58. HIERARQUIA FINAL DA APLICAÇÃO

```text
MUXIMA
│
├── Dashboard
│
├── Eventos
│   ├── Meus eventos
│   ├── Criar evento
│   └── Detalhe do evento
│
├── Planeamento
│   ├── Orçamento
│   ├── Despesas
│   ├── Pagamentos
│   ├── Fornecedores
│   ├── Tarefas
│   └── Cronograma
│
├── Convidados
│   ├── Lista
│   ├── Convites
│   └── Mesas
│
├── Logística
│   ├── Inventário
│   ├── Bebidas
│   ├── Alimentação
│   └── Bolos
│
├── Documentos
│
├── Notificações
│
└── Configurações
    ├── Evento
    ├── Participantes
    ├── Perfil
    ├── Notificações
    └── Privacidade
```

---

# 59. RESULTADO ESPERADO

A UI final deve parecer uma plataforma profissional de gestão de eventos.

O utilizador deve entrar e imediatamente conseguir perceber:

```text
┌─────────────────────────────────────────────┐
│ CASAMENTO AMILTON & MARIA                   │
│                                             │
│ 108 dias restantes                          │
│                                             │
│ Preparação                                  │
│ 72%                                         │
│                                             │
│ Orçamento                                   │
│ 4.500.000 Kz                                │
│ 1.850.000 Kz pagos                          │
│ 1.350.000 Kz pendentes                      │
│                                             │
│ ⚠ 3 pagamentos precisam de atenção          │
│ ⚠ 45 convidados ainda não responderam       │
│ ⚠ 3 tarefas estão atrasadas                 │
│                                             │
│ Próximo                                      │
│ Pagamento do salão — 300.000 Kz             │
└─────────────────────────────────────────────┘
```

A aplicação deve transmitir a sensação de:

> **"Está tudo aqui. Eu sei exatamente como está o meu casamento."**

O Muxima deve ser construído visualmente como um **centro de controlo do grande dia**, combinando a simplicidade de uma aplicação SaaS com a elegância e importância emocional de um casamento.