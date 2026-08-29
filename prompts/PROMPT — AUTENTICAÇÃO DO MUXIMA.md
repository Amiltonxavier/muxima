# PROMPT — AUTENTICAÇÃO DO MUXIMA

Implementa o módulo completo de autenticação da aplicação **Muxima**, utilizando **Better Auth** como solução oficial de autenticação.

A implementação deve ser simples, segura, tipada e preparada para o crescimento da aplicação, sem criar abstrações desnecessárias.

---

# 1. OBJETIVO

Criar toda a infraestrutura de autenticação necessária para que um utilizador possa:

- Criar uma conta
- Iniciar sessão
- Terminar sessão
- Recuperar a palavra-passe
- Redefinir a palavra-passe
- Consultar a sessão atual
- Atualizar os seus dados
- Alterar a palavra-passe
- Gerir a sua conta
- Proteger as páginas privadas
- Ser redirecionado corretamente entre áreas públicas e privadas

A autenticação deve ser construída utilizando **Better Auth**.

Não implementar um sistema de autenticação próprio.

---

# 2. TECNOLOGIA PRINCIPAL

Utilizar:

```text
Better Auth
```

O Better Auth será a fonte principal para:

- Authentication
- Sessions
- Users
- Accounts
- Password authentication
- Session management
- Email verification
- Password reset
- OAuth, quando implementado futuramente

Não duplicar funcionalidades que já são fornecidas pelo Better Auth.

---

# 3. STACK RELACIONADA

Utilizar:

```text
Better Auth
TypeScript
React
Vite
React Hook Form
Zod
TanStack Router
TanStack Query
js-cookie
Tailwind CSS 4
Base UI
Lucide Icons
gooey-toast
Vitest
Testing Library
```

---

# 4. PRINCÍPIO DE AUTENTICAÇÃO

O frontend não deve implementar a lógica de autenticação.

O fluxo deve ser:

```text
User
 ↓
Auth UI
 ↓
Better Auth Client
 ↓
Better Auth Server
 ↓
Session
 ↓
Authenticated User
```

O frontend apenas consome o estado da sessão disponibilizado pelo Better Auth.

---

# 5. SESSÃO

A sessão deve ser gerida pelo Better Auth.

Não criar:

```text
auth-token
access-token
refresh-token
```

manualmente no frontend.

Não implementar:

```text
localStorage
```

para guardar tokens de autenticação.

Não armazenar o access token num Zustand store.

A sessão deve utilizar o mecanismo de cookies/sessão do Better Auth.

---

# 6. JS-COOKIE

A aplicação utiliza `js-cookie` quando existir uma necessidade legítima de manipulação de cookies da aplicação.

Porém:

```text
NÃO utilizar js-cookie para implementar manualmente a sessão do Better Auth.
```

Não duplicar cookies de autenticação.

O Better Auth deve controlar os cookies de sessão.

# 8. NAMING

Todos os ficheiros:

```text
kebab-case
```

---

# 9. ROTAS

Todas as rotas devem ser:

```text
English
kebab-case
```

Utilizar:

```text
/login
/register
/forgot-password
/reset-password
```

Área privada:

```text
/dashboard
/events
/settings
```

Nunca:

```text
/entrar
/registar
/esqueci-password
```

A interface pode estar em português.

As URLs continuam em inglês.

---

# 10. PÁGINAS PÚBLICAS

Criar:

```text
/login
/register
/forgot-password
/reset-password
```

Estas páginas não necessitam de autenticação.

---

# 11. PÁGINAS PRIVADAS

Toda a aplicação principal deve exigir uma sessão válida.

Exemplos:

```text
/dashboard
/events
/events/:event-id
/events/:event-id/budget
/events/:event-id/guests
/events/:event-id/vendors
/events/:event-id/tasks
/settings
/notifications
```

Se não existir sessão:

```text
→ redirect /login
```

---

# 12. PROTEÇÃO DAS ROTAS

Utilizar os mecanismos do **TanStack Router** para proteger as rotas.

Não repetir a mesma lógica de autenticação dentro de todas as páginas.

Criar uma proteção no nível adequado da árvore de rotas.

Conceito:

```text
Public Routes
├── login
├── register
├── forgot-password
└── reset-password

Private Routes
├── dashboard
├── events
├── notifications
└── settings
```

---

# 13. COMPORTAMENTO DE UTILIZADOR NÃO AUTENTICADO

Se o utilizador tentar aceder:

```text
/dashboard
```

sem sessão:

```text
→ /login
```

Se possível, preservar a URL original para que, após login, o utilizador possa voltar à página inicialmente solicitada.

Exemplo:

```text
/dashboard
 ↓
/login?redirect=/dashboard
```

Não permitir valores arbitrários de redirect que possam criar open redirect.

Validar sempre o destino.

---

# 14. UTILIZADOR JÁ AUTENTICADO

Se um utilizador autenticado tentar abrir:

```text
/login
/register
```

redirecionar para:

```text
/dashboard
```

ou para o destino previamente solicitado, quando aplicável.

---

# 15. REGISTO

Criar formulário de registo.

Campos iniciais:

```text
Nome completo
Email
Password
Confirmar password
```

O formulário deve utilizar:

```text
React Hook Form
+
Zod
```

---

# 16. VALIDAÇÃO DO REGISTO

Criar:

```text
registerSchema
```

Validar:

```text
Nome obrigatório
Email válido
Password obrigatória
Password com requisitos mínimos
Confirmação da password
```

A confirmação deve coincidir com a password.

A validação visual deve aparecer junto aos campos.

---

# 17. LOGIN

Criar:

```text
loginSchema
```

Campos:

```text
Email
Password
```

Fluxo:

```text
Submit
 ↓
Better Auth
 ↓
Session criada
 ↓
Redirecionamento
```

Durante o login:

```text
Entrando...
```

O botão deve ficar indisponível para impedir múltiplos submits.

---

# 18. ERROS DE LOGIN

Não revelar informações sensíveis.

Evitar mensagens como:

```text
Este email não existe.
```

Preferir:

```text
Email ou palavra-passe inválidos.
```

Erros inesperados:

```text
Não foi possível iniciar sessão.
Tente novamente.
```

---

# 19. LOGOUT

Criar ação:

```text
Terminar sessão
```

Fluxo:

```text
Logout
 ↓
Better Auth
 ↓
Session encerrada
 ↓
Cache de dados privados limpo
 ↓
/login
```

Após logout, não permitir acesso aos dados privados através do cache do frontend.

---

# 20. SESSION QUERY

Criar uma forma simples de consultar a sessão atual.

Exemplo conceptual:

```text
useSession()
```

ou o mecanismo oficial disponibilizado pelo Better Auth.

Não criar uma implementação paralela de sessão.

---

# 21. UTILIZADOR AUTENTICADO

A aplicação precisa de acesso a:

```text
id
name
email
image
emailVerified
```

e outros campos realmente necessários.

Não guardar uma cópia completa da sessão num store global se o Better Auth já fornece essa informação.

---

# 22. AUTH STORE

Não criar um:

```text
AuthStore
```

apenas para duplicar a sessão do Better Auth.

O Better Auth é a fonte da verdade da autenticação.

Um store só deve existir se houver estado de UI ou estado de aplicação que não pertença ao Better Auth.

---

# 23. TANSTACK QUERY

Não utilizar TanStack Query para duplicar a sessão se o Better Auth já fornecer um mecanismo adequado para isso.

TanStack Query deve continuar responsável pelos dados do domínio:

```text
Events
Guests
Budget
Vendors
Tasks
Inventory
```

Não transformar a sessão em mais uma camada desnecessária.

---

# 24. RECUPERAÇÃO DE PASSWORD

Criar:

```text
/forgot-password
```

Campos:

```text
Email
```

Fluxo:

```text
Email
 ↓
Better Auth
 ↓
Password reset request
 ↓
Email
 ↓
Reset link
 ↓
/reset-password
```

---

# 25. RESET PASSWORD

Criar:

```text
/reset-password
```

A página deve validar o token fornecido pelo fluxo do Better Auth.

Campos:

```text
Nova password
Confirmar password
```

Após sucesso:

```text
Password atualizada
 ↓
Toast de sucesso
 ↓
/login
```

---

# 26. ALTERAR PASSWORD

Na área de definições:

```text
/settings/security
```

Criar:

```text
Alterar password
```

Campos:

```text
Password atual
Nova password
Confirmar nova password
```

Utilizar:

```text
React Hook Form
Zod
Better Auth
```

---

# 27. EMAIL VERIFICATION

Preparar a autenticação para verificação de email.

Estado:

```text
emailVerified
```

Se a aplicação exigir email verificado para determinadas operações, criar uma proteção específica.

Não implementar regras complexas de verificação na primeira versão se ainda não forem necessárias.

---

# 28. PÁGINA DE VERIFICAÇÃO

Se necessário:

```text
/verify-email
```

Mostrar:

```text
Verifique o seu email

Enviámos um link de confirmação para o seu endereço de email.
```

Permitir:

```text
Reenviar email
```

com proteção contra spam.

---

# 29. AUTH LAYOUT

As páginas de autenticação devem possuir um layout próprio.

Desktop:

```text
┌────────────────────────────────────────────────────┐
│                                                    │
│                  MUXIMA                            │
│                                                    │
│       ┌──────────────────────────────┐             │
│       │                              │             │
│       │       Authentication         │             │
│       │                              │             │
│       │       Form                   │             │
│       │                              │             │
│       └──────────────────────────────┘             │
│                                                    │
└────────────────────────────────────────────────────┘
```

O layout deve ser:

```text
Minimalista
Elegante
Limpo
Rápido
Responsivo
```

---

# 30. LOGIN UI

O login deve conter:

```text
Logo
Título
Descrição
Email
Password
Esqueci a password
Botão Entrar
Link para criar conta
```

Exemplo:

```text
Bem-vindo de volta

Entre na sua conta para continuar a organizar
o seu grande dia.

Email
Password

Esqueceu a password?

[ Entrar ]

Ainda não tem uma conta?
Criar conta
```

---

# 31. REGISTER UI

Conteúdo:

```text
Criar conta

Comece a organizar o seu grande dia.

Nome completo
Email
Password
Confirmar password

[ Criar conta ]

Já tem uma conta?
Entrar
```

---

# 32. PASSWORD INPUT

O campo password deve possuir:

```text
Mostrar password
Ocultar password
```

Utilizar ícones Lucide.

Não utilizar texto ou emojis como ícone.

---

# 33. FEEDBACK

Utilizar `gooey-toast` para feedback global.

Exemplos:

```text
Conta criada com sucesso.
Sessão iniciada.
Sessão terminada.
Email de recuperação enviado.
Password alterada com sucesso.
```

Erros específicos de campo permanecem no campo.

---

# 34. LOADING

Todos os submits devem possuir loading.

Exemplo:

```text
Entrando...
Criando conta...
Enviando...
Atualizando...
```

Nunca permitir múltiplos submits enquanto a operação estiver pendente.

---

# 35. ERROR HANDLING

Criar tratamento consistente.

Categorias:

```text
Validation Error
Authentication Error
Network Error
Server Error
Unknown Error
```

Não mostrar stack traces ao utilizador.

Não mostrar mensagens técnicas.

---

# 36. ZOD

Criar schemas específicos:

```text
loginSchema
registerSchema
forgotPasswordSchema
resetPasswordSchema
changePasswordSchema
```

Não criar um schema gigante:

```text
authSchema
```

que contenha todos os formulários.

---

# 37. COMPONENTES

Criar componentes simples:

```text
login-form
register-form
forgot-password-form
reset-password-form
change-password-form
password-input
auth-header
auth-footer
```

Não criar:

```text
UniversalAuthForm
AuthFormFactory
GenericAuthenticationManager
```

---

# 38. UI COMPONENTS

Utilizar os componentes do design system existente:

```text
Button
Input
Label
Form
Field
Dialog
Alert
```

através de Base UI e Tailwind CSS 4.

Manter o mesmo padrão visual do resto da aplicação.

---

# 39. ACESSIBILIDADE

Todos os campos devem possuir:

```text
label
id
name
autocomplete
error message
```

Configurar corretamente:

```text
autocomplete="email"
autocomplete="current-password"
autocomplete="new-password"
```

quando aplicável.

---

# 40. SEGURANÇA

Nunca:

```text
console.log(password)
console.log(session)
console.log(tokens)
```

Nunca colocar password em:

```text
URL
query parameters
localStorage
sessionStorage
```

Nunca expor segredos do servidor no frontend.

---

# 41. ENVIRONMENT VARIABLES

Variáveis públicas do frontend devem possuir prefixo adequado ao Vite:

```text
VITE_
```

Segredos do Better Auth permanecem exclusivamente no servidor.

Nunca colocar:

```text
BETTER_AUTH_SECRET
database credentials
private keys
```

em variáveis expostas ao frontend.

---

# 42. BETTER AUTH SECRET

O secret utilizado pelo Better Auth deve existir apenas no backend.

Nunca:

```text
VITE_BETTER_AUTH_SECRET
```

Nunca enviar o secret para o browser.

---

# 43. COOKIE SECURITY

Os cookies de sessão devem utilizar as configurações de segurança apropriadas do Better Auth e do ambiente.

Em produção:

```text
Secure
HttpOnly quando aplicável
SameSite adequado
```

Não criar manualmente cookies de sessão paralelos.

---

# 44. CSRF / REQUEST SECURITY

Utilizar as proteções fornecidas pelo Better Auth e pelo ambiente da aplicação.

Não criar mecanismos próprios de autenticação quando o Better Auth já resolver o problema.

---

# 45. RATE LIMITING

Operações sensíveis devem possuir proteção contra abuso no backend.

Principalmente:

```text
Login
Register
Forgot password
Reset password
Email verification
```

A implementação deve utilizar mecanismos disponíveis no backend/BETTER AUTH e/ou infraestrutura.

Não confiar apenas no frontend.

---

# 46. PROTEÇÃO DOS DADOS

Depois do login, o utilizador só pode acessar recursos aos quais possui autorização.

A autenticação responde:

```text
Quem é o utilizador?
```

A autorização responde:

```text
O que esse utilizador pode fazer?
```

Não misturar os dois conceitos.

---

# 47. AUTORIZAÇÃO

O sistema deverá posteriormente suportar membros do evento.

Exemplo:

```text
OWNER
PARTNER
ADMIN
EDITOR
VIEWER
```

A autenticação deve identificar o utilizador.

As permissões serão tratadas posteriormente pelo domínio de eventos.

Não criar um RBAC complexo dentro do módulo de autenticação nesta primeira fase.

---

# 48. RELAÇÃO COM EVENTOS

Um utilizador autenticado pode possuir:

```text
0 eventos
1 evento
N eventos
```

Após criar uma conta:

```text
User
 ↓
Dashboard
 ↓
Ainda não possui eventos
 ↓
Criar primeiro evento
```

Não criar automaticamente um casamento ao registrar a conta.

---

# 49. PRIMEIRO LOGIN

Se o utilizador não possuir eventos:

```text
Dashboard
```

deve apresentar:

```text
Ainda não começou a organizar o seu grande dia?

Crie o seu primeiro evento.

[ Criar evento ]
```

---

# 50. CONVITES FUTUROS

A autenticação deve ser preparada para o seguinte cenário:

```text
Noivo
 ↓
Cria evento
 ↓
Convida Noiva
 ↓
Noiva recebe convite
 ↓
Aceita
 ↓
Ambos acessam o evento
```

E:

```text
Casal
 ↓
Convida familiar / organizador
 ↓
Pessoa aceita convite
 ↓
Acede ao evento
 ↓
Permissão definida
```

Não implementar todo este fluxo dentro da autenticação.

O convite pertence ao domínio de:

```text
Event Membership
```

---

# 51. EMAIL

A autenticação deve estar preparada para envio de:

```text
Verification Email
Password Reset
Event Invitation
```

Os dois primeiros pertencem ao Auth.

Convites pertencem ao domínio de Events.

---

# 52. TESTES UNITÁRIOS

Criar testes para:

```text
loginSchema
registerSchema
forgotPasswordSchema
resetPasswordSchema
changePasswordSchema
```

Testar:

```text
valid input
invalid email
empty fields
weak password
password mismatch
```

---

# 53. TESTES DE COMPONENTES

Testar:

```text
LoginForm
RegisterForm
ForgotPasswordForm
ResetPasswordForm
ChangePasswordForm
```

Validar:

```text
renderização
input
validation
submit
loading
error
success
password visibility
```

---

# 54. TESTES DE INTEGRAÇÃO

Criar testes para os principais fluxos:

```text
Register
 ↓
Login
 ↓
Authenticated area
 ↓
Logout
```

E:

```text
Forgot password
 ↓
Reset password
 ↓
Login
```

---

# 55. PROTEÇÃO DE ROTAS — TESTES

Testar:

```text
Unauthenticated → /dashboard
```

resultado:

```text
/login
```

Testar:

```text
Authenticated → /login
```

resultado:

```text
/dashboard
```

---

# 56. CACHE E LOGOUT

Ao terminar sessão:

```text
TanStack Query
```

deve remover/invalidate os dados privados relevantes.

Não deixar dados de eventos do utilizador anterior disponíveis para o próximo utilizador que entrar no mesmo browser.

---

# 57. AUTH STATE

A aplicação deve distinguir claramente:

```text
Loading session
Authenticated
Unauthenticated
```

Evitar redirecionamentos prematuros enquanto a sessão ainda está a ser determinada.

Fluxo:

```text
Checking session
       ↓
 ┌─────┴─────┐
 ↓           ↓
Auth       Guest
 ↓           ↓
App        Login
```

---

# 58. PROTEÇÃO CONTRA FLASH

Não mostrar momentaneamente o dashboard antes de confirmar a sessão.

Não mostrar a página de login durante alguns milissegundos para depois enviar o utilizador para o dashboard.

Criar um estado de carregamento apropriado enquanto a sessão está a ser determinada.

---

# 59. DESIGN RESPONSIVO

As páginas de autenticação devem funcionar em:

```text
Desktop
Tablet
Mobile
```

No mobile:

```text
padding reduzido
form width 100%
botões full width
inputs full width
```

---

# 60. MOBILE

Exemplo:

```text
┌─────────────────────┐
│      MUXIMA         │
│                     │
│ Bem-vindo de volta  │
│                     │
│ Email               │
│ ┌─────────────────┐ │
│ └─────────────────┘ │
│                     │
│ Password            │
│ ┌─────────────────┐ │
│ └─────────────────┘ │
│                     │
│ [      Entrar     ] │
│                     │
│ Criar conta         │
└─────────────────────┘
```

---

# 61. NÃO IMPLEMENTAR NESTA FASE

Não implementar agora:

```text
Google Login
Apple Login
Facebook Login
2FA
Passkeys
Magic Link
Phone Authentication
Biometric Authentication
Enterprise SSO
```

A arquitetura pode permitir essas extensões futuramente, mas não adicionar complexidade agora.

---

# 62. GOOGLE / OAUTH FUTURO

O código deve ser organizado para que futuramente seja possível adicionar:

```text
Google
Apple
Microsoft
```

através do Better Auth.

Não criar abstrações antecipadas.

---

# 63. REGRA PARA BACKEND

O backend deve ser a autoridade para:

```text
Authentication
Session
Password
User identity
Email verification
Password reset
```

O frontend nunca deve assumir que um utilizador está autenticado apenas porque possui dados armazenados localmente.

---

# 64. REGRA PARA FRONTEND

O frontend deve:

```text
Mostrar UI
Validar formulário
Enviar requests
Mostrar loading
Mostrar erros
Redirecionar
Consumir sessão
```

Não deve:

```text
Gerar tokens
Validar sessões manualmente
Guardar passwords
Criar refresh token manualmente
Implementar JWT manualmente
```

quando isso já é responsabilidade do Better Auth.

---

# 65. REGRA DE SIMPLICIDADE

Não criar:

```text
AuthManager
AuthRepository
AuthController
AuthFactory
AuthProviderManager
SessionManager
TokenManager
```

apenas para encapsular chamadas simples do Better Auth.

Utilizar diretamente as APIs oficiais do Better Auth.

Criar helpers apenas quando existir duplicação real.

---

# 66. RESULTADO ESPERADO

No final desta implementação deve existir um sistema de autenticação funcional:

```text
                    MUXIMA
                       │
              ┌────────┴────────┐
              │                 │
          Register            Login
              │                 │
              └────────┬────────┘
                       ↓
                    Session
                       ↓
                   Dashboard
                       ↓
              ┌────────┴─────────┐
              │                  │
          Has Events         No Events
              │                  │
              ↓                  ↓
          Event App        Create Event
```

Com suporte a:

```text
✓ Register
✓ Login
✓ Logout
✓ Session
✓ Forgot password
✓ Reset password
✓ Change password
✓ Email verification preparation
✓ Protected routes
✓ Auth redirects
✓ Loading states
✓ Error handling
✓ Form validation
✓ Responsive UI
✓ Accessibility
✓ Unit tests
✓ Integration tests
```

---

# 67. REGRA FINAL

O **Better Auth é a autoridade da autenticação**.

O **backend é a autoridade da segurança e autorização**.

O **TanStack Router controla o acesso às páginas**.

O **React Hook Form + Zod controla a experiência e validação dos formulários**.

O **TanStack Query controla os dados da aplicação**, não deve duplicar a sessão do Better Auth.

O frontend nunca deve guardar ou manipular manualmente tokens de autenticação.

A implementação deve permanecer **simples, segura, tipada e preparada para que o Muxima evolua posteriormente para colaboração entre noivos, familiares, organizadores e outros participantes do evento**.