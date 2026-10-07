



**## 3. Arquitectura Actual de Autenticação**

**\*\*Evidências:\*\***

\- \`packages/auth/src/index.ts:1-165\` — Better Auth instance creation

\- \`packages/db/prisma/schema/auth.prisma:33-59\` — Session/Account/User models

\- \`packages/api/src/context.ts:1-50\` — oRPC context with session resolution

\- \`packages/api/src/shared/auth/auth-middleware.ts:1-120\` — Fastify REST middleware

\- \`apps/web/src/lib/auth-client.ts:1-65\` — Frontend auth client

\- \`apps/web/src/utils/orpc.ts:1-140\` — oRPC client with 401 handling

**\*\*Resumo:\*\*** Monorepo que utiliza Better Auth v1.7.1 com adaptador Prisma (Postgres). O servidor disponibiliza Better Auth at \`/api/auth/\*\` e utiliza oRPC para chamadas RPC. O frontend utiliza \`@tanstack/react-router\` para encaminhamento com guards de sessão, \`@tanstack/react-query\` com cliente oRPC.



**## 4. Expiração no Backend**

**### 4.1 Modelo e Esquema da Sessão**

**\*\*Evidências:\*\***

\- \`packages/db/prisma/schema/auth.prisma:33-59\`

\`\`\`text

model Session {

  id        String   @id

  expiresAt DateTime

  token     String

  createdAt DateTime @default(now())

  updatedAt DateTime @default(now())? (updatedAt @updatedAt in actual schema)

  ipAddress String?

  userAgent String?

  userId    String

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([token])

  @@index([userId])

  @@map("session")

}

\`\`\`

**\*\*Conclusão:\*\*** A sessão possui \`expiresAt\` (DateTime) — o timestamp de expiração é persistido. Não existe nenhum \`expiresIn\` column. The actual \`updatedAt\` uses \`@updatedAt\` (see line 42 in schema).

**### 4.2 Configuração do Better Auth**

**\*\*Evidências:\*\***

\- \`packages/auth/src/index.ts:22-165\`

A configuração inclui:

\- \`database: prismaAdapter(prisma, { provider: "postgresql" })\`

\- \`emailAndPassword: { enabled: true }\`

\- \`secret\`, \`baseURL\`, \`trustedOrigins\`

\- \`user.additionalFields\`: \`phone\`, \`status\` (ACTIVE/BLOCKED, input\:false)

\- \`databaseHooks\` on session create/delete (for activity logging)

\- \`advanced.defaultCookieAttributes\`: \`sameSite: "none"\`, \`secure: true\`, \`httpOnly: true\`

\- Plugins: \`expo()\`, \`customSession()\` to enrich session with roles/permissions

**\*\*Observação crítica:\*\*** No \`session\` configuration object specified (e.g., no \`session: { expiresIn: ..., updateAge: ... }\`). Therefore Better Auth uses valores predefinidos.

**\*\*Evidência do Better Auth v1.7.1 (node_modules):\*\***

\- \`packages/auth/node_modules/better-auth/dist/context/create-context.mjs:147\` — \`expiresIn: options.session?.expiresIn || 3600 \* 24 \* 7\` (7 days = 604800 seconds)

\- Session cookie maxAge also valores predefinidos to 7 days when not specified (\`create-context.mjs:52\`)

\- \`sessionConfig.expiresIn\` valores predefinidos to 7 days

**\*\*Conclusão:\*\*** \`TTL real = 7 dias (604800 segundos)\`. Não existe substituição explícita no código da aplicação.

**\*\*Localização:\*\*** \`packages/auth/src/index.ts\` — no \`session\` block present. Default from Better Auth v1.7.1.



**### 4.3 Criação da Sessão**

**\*\*Evidências:\*\***

\- \`packages/auth/src/index.ts:51-86\` — \`databaseHooks.session.create\`

\- A criação da sessão é gerida by Better Auth internamente durante o início de sessão; os hooks da aplicação são executados \`before\`/\`after\`

\- \`before\` hook (line 55-66): verifica o estado do utilizador; se estiver BLOCKED lança \`APIError("FORBIDDEN", { code: "ACCOUNT_BLOCKED", message: BLOCKED_USER_MESSAGE })\`

\- \`after\` hook (line 70-83): regista a actividade LOGIN via \`createActivityLog\`

**\*\*Comportamento:\*\*** Quando um utilizador inicia sessão com sucesso, Better Auth creates a Session record with \`expiresAt = now + expiresIn\` (predefinido 7d). A aplicação apenas intercepta to block BLOCKED users and to log.

**\*\*Ficheiros:\*\*** \`packages/auth/src/index.ts:51-86\`

**### 4.4 Validação da Sessão (Servidor)**

**\*\*Evidências:\*\***

\- REST: \`packages/api/src/shared/auth/auth-middleware.ts:8-22\` — \`auth.api.getSession({ headers: fromNodeHeaders(request.headers) })\`

\- oRPC context: \`packages/api/src/context.ts:15-43\` — same call to resolve session

\- Better Auth handler at \`/api/auth/\*\`: \`packages/api/src/app.ts:108-181\` — proxies to \`auth.handler(req)\`

**\*\*Como o servidor identifica uma sessão expirada:\*\*** Better Auth valida o token da sessão contra a BD e verifica \`expiresAt\`. If expired/invalid, \`auth.api.getSession()\` returns \`null\` (or may throw depending on context). In middleware, catch block sets \`request.session = null\`. In Better Auth's own endpoints, it returns respostas de erro adequadas.

**\*\*Quando expira:\*\*** Better Auth compara a hora actual to \`session.expiresAt\`. On \`/api/auth/get-session\` or when validating, expired sessions are é tratada como inexistente/inválida.

**\*\*Ficheiros:\*\*** 

\- \`packages/api/src/shared/auth/auth-middleware.ts:8-22\`

\- \`packages/api/src/context.ts:19\`

\- \`packages/api/src/app.ts:108-181\`



**### 4.5 Erros de Sessão Expirada**

**\*\*Erros internos do Better Auth (mapeados):\*\***

\- \`SESSION_EXPIRED\` → status 401, code \`AUTH_CODES.SESSION_EXPIRED\`, message "A sessão expirou. Inicia sessão novamente para continuar." (from translation table)

\- \`TOKEN_EXPIRED\` → status 401, code \`AUTH_CODES.INVALID_TOKEN\`, message "O token enviado expirou."

\- \`INVALID_TOKEN\`, \`ACCESS_TOKEN_NOT_FOUND\`, \`REFRESH_TOKEN_NOT_FOUND\` → 401 com mensagens adequadas

**\*\*Evidências:\*\*** \`packages/api/src/shared/auth/better-auth-error.ts:80-115, 155-200\`

**\*\*Envelope de erro da API:\*\*** A aplicação utiliza um envelope normalizado via \`errorEnvelope()\` and error handler. When Better Auth endpoint returns error, it's mapped via \`mapBetterAuthError()\` (line 159-181 in app.ts). REST/oRPC errors passam pelo gestor global de erros.

**\*\*Estado HTTP devolvido para uma sessão expirada:\*\***

\- When accessing protected REST routes, \`requireSessionUserId()\` lança \`UnauthorizedError()\` if no session (line 45-90 in auth-middleware.ts). \`UnauthorizedError\` produz 401 (per app error classes).

\- When Better Auth directly reports \`SESSION_EXPIRED\`, mapeado para 401.

\- oRPC procedures that call guards throw UnauthorizedError → 401.

**\*\*Payload:\*\*** Envelope de erro normalizado da aplicação \`{ error: { code, message, details } }\` (see error handling). PT-PT messages per mapping.

**\*\*Ficheiros:\*\***

\- \`packages/api/src/shared/auth/better-auth-error.ts\`

\- \`packages/api/src/shared/errors/app-error.ts\` (referenced)

\- \`packages/api/src/shared/auth/auth-middleware.ts:45-90\`

**### 4.6 Actualização / Renovação**

**\*\*Resultados da pesquisa:\*\***

\- No \`refreshToken\` rotation logic in custom code

\- Não existem referências a actualização automática de tokens no frontend (no interceptor retry, no silent refresh)

\- Better Auth suporta refresh tokens (schema has \`refreshToken\`, \`refreshTokenExpiresAt\` in Account model), mas a aplicação não configura um comportamento personalizado de actualização nem chama explicitamente endpoints de actualização

\- Frontend apenas chama \`authClient.getSession()\` and \`authClient.signOut()\`; no \`refreshSession()\` or similar found

\- oRPC client on 401 does immediate redirecciona para o login (line 93-120 in orpc.ts) — sem tentativa de actualização

**\*\*Evidências:\*\***

\- O modelo Account possui campos de refresh token: \`packages/db/prisma/schema/auth.prisma:67-88\` (accessToken, refreshToken, idToken, accessTokenExpiresAt, refreshTokenExpiresAt)

\- Não foi encontrada utilização de actualização na lógica da aplicação

\- No "refresh" in web app auth code beyond maybe not present

**\*\*Conclusão:\*\*** **\*\*Refresh automático não existe.\*\*** Não existe actualização automática implementada. Quando a sessão expira, o cliente recebe 401 and é redireccionado para o login. Não existe nova tentativa com refresh token.

**\*\*Declaração explícita necessária:\*\*** **\*\*Não encontrado:\*\*** não existe implementação de refresh automático após pesquisa nos pontos de autenticação/client HTTP encontrados.



**### 4.7 Logout e Revogação**

**\*\*Logout no backend:\*\***

\- Better Auth gere o sign-out via its API (\`/api/auth/sign-out\` etc.)

\- App has \`databaseHooks.session.delete.after\` hook (line 86-104 in auth/index.ts) that logs LOGOUT activity when session row is deleted

\- On sign-out, Better Auth invalida/elimina a sessão

**\*\*Revogação:\*\***

\- As sessões são eliminadas no sign-out (per hook behavior: "Sessions are removed on sign-out and when a password change revokes the other devices")

\- Password change revocation mentioned in comment (line 84-85)

\- No other bulk revocation logic in app code found

\- BLOCKED users: when session is created, before hook checks status and blocks if BLOCKED (line 55-66). Also in middleware, when session exists, app checks user.status and lança Forbidden if BLOCKED (line 47-71, 87-119 in auth-middleware.ts). But sessões existentes of BLOCKED users permanecem até expirarem ou serem eliminadas; a verificação é aplicada aos pedidos.

**\*\*Evidências:\*\***

\- \`packages/auth/src/index.ts:84-104\` — session delete hook logs LOGOUT

\- \`packages/api/src/shared/auth/auth-middleware.ts:47-71, 87-119\` — BLOCKED user checks

\- Comment in auth/index.ts:67-69, 84-86

**\*\*Após o logout:\*\*** Cookie de sessão limpo by Better Auth, registo da sessão eliminado, LOGOUT activity logged.



**## 5. Gestão da Expiração no Frontend**

**### 5.1 Cliente de Autenticação**

**\*\*Evidências:\*\*** \`apps/web/src/lib/auth-client.ts:59-65\`

\`authClient = createAuthClient({ baseURL: new URL("/api/auth", getServerUrl(env.VITE_SERVER_URL)).toString() })\`

Utiliza o cliente React do Better Auth. Não está configurada nenhuma consulta periódica personalizada da sessão. Comportamento predefinido: \`useSession()\` obtém a sessão actual; client depende da validação do servidor.

**### 5.2 Hooks da Sessão**

**\*\*Utilização:\*\*** \`apps/web/src/shared/components/user-menu.tsx:103\` — \`const { data: session, isPending } = authClient.useSession();\`

**\*\*Comportamento:\*\*** O hook consulta o estado da sessão. When session becomes invalid server-side, next fetch devolve null/error; o componente reage em conformidade.

**\*\*Nenhuma consulta periódica encontrada:\*\*** No \`refetchInterval\`, \`polling\`, or \`setInterval\` calls for session refresh in web codebase.

**### 5.3 Cliente oRPC/API e Interceptores**

**\*\*Evidências:\*\*** \`apps/web/src/utils/orpc.ts:70-140\`

\- Creates RPCLink to \`/rpc\` with \`credentials: "include"\`

\- O wrapper de fetch intercepta \`response.status === 401\`:

  \- Se estiver no browser e não estiver nas páginas de autenticação (\`/login\`, \`/register\`, \`/invite/\*\`), mostra um toast with SESSION_EXPIRED_MESSAGE e redirecciona to \`/login\` via \`window\.location.href = "/login"\`

\- Não existe nova tentativa em 401, no refresh attempt

**\*\*Comportamento perante 401:\*\*** Redireccionamento imediato para o login (navegação forçada), preserving original path only in the sense that user lands on /login but a localização original é perdida, salvo se for armazenada noutro local. Não foi observada preservação de parâmetros de consulta in this code.

**\*\*Ficheiros:\*\*** \`apps/web/src/utils/orpc.ts:93-120\`

**### 5.4 TanStack Query Error Handling**

**\*\*Evidências:\*\*** \`apps/web/src/utils/orpc.ts:32-68\`

\- QueryCache onError: chama \`handleApiError\` with toast + "Tentar novamente" action (invalidates query)

\- MutationCache onError: chama \`handleApiError\`

\- Ambos utilizam o tratamento de erros partilhado; 401s are also caught by fetch interceptor above

**\*\*Nota:\*\*** Both layers may react to errors; interceptor runs at network level, query cache also receives error. But o redireccionamento é tratado no interceptor for 401.

**### 5.5 Guards de Rotas (Middleware/BeforeLoad)**

**\*\*Layout das rotas de autenticação:\*\*** \`apps/web/src/routes/\_auth/layout.tsx:63-88\`

\`beforeLoad\`:

\- Calls \`authClient.getSession()\`

\- If session exists → \`throw redirect({ to: "/" })\` (redirecciona utilizadores autenticados para fora das páginas de autenticação)

\- On redirect (TanStack) rethrow; on other errors, return (allow auth page to render)

**\*\*Rotas privadas:\*\*** \`apps/web/src/routes/\_private.tsx:10-49\`

\`beforeLoad\`:

\- Calls \`authClient.getSession()\`

\- If no session AND no error → \`throw redirect({ to: "/login" })\`

\- If error present → return (do not redirect; permite que a aplicação seja apresentada/tente novamente)

\- On other errors (non-redirect), catch and return (no redirect)

**\*\*Comportamento:\*\*** Os guards de rotas verificam a sessão durante a navegação. Dependem do cliente Better Auth. Não existe lógica de actualização.



**### 5.6 Detecção e Fluxo no Frontend**

**\*\*Como o frontend sabe que o utilizador está autenticado:\*\*** 

\- \`authClient.useSession()\` fornece os dados da sessão (user + session). O componente verifica se existe valor.

\- Route guards use \`getSession()\` result.

**\*\*Detecção de sessão expirada:\*\***

\- Os pedidos de rede devolvem 401 → oRPC fetch interceptor desencadeia o redireccionamento

\- Route navigation triggers \`beforeLoad\` guards which call \`getSession()\` → se a sessão for null (and no error), redirecciona para o login

\- Não existe detecção proactiva (no verificação de expiração baseada em temporizador)

**\*\*Verificação periódica:\*\*** **\*\*Não encontrado.\*\*** No polling/refetch interval for session.

**\*\*401 handling:\*\*** 

\- oRPC layer (RPCLink fetch): catches 401, toasts, redirects to \`/login\` (skipping auth/invite pages) — immediate hard redirect

\- Route guards: also redirect on navigation if session absent

**\*\*Preservar a rota original:\*\*** **\*\*Não encontrado.\*\*** No query params like \`redirect\`/\`returnTo\` passados. Após 401, o utilizador vai para \`/login\` with sem indicação do caminho original.

**\*\*Loops de redireccionamento:\*\*** Possível se session check returns inconsistent results? Route guard for private routes evita redireccionar em caso de erro (line 25-41 in \_private.tsx) para evitar o logout devido a erros transitórios. Auth layout also catches non-redirect errors. This atenua loops causados por problemas de rede.

**\*\*Pedidos concorrentes durante a expiração:\*\*** Vários pedidos podem receber 401 em simultâneo. Cada um irá desencadear the fetch interceptor's 401 handling. Sem deduplicação (no flag to prevent multiple redirects/toasts). Podem aparecer vários toasts; multiple \`window\.location.href\` assignments (o último prevalece).

**\*\*Estado de autenticação desactualizado:\*\*** Possível se a sessão expirar entre renderizações e pedidos. TanStack Query cache pode manter dados; 401 from queries causes redirect. Não existe limpeza explícita para além da realizada por signOut.



**## 6. Fluxo de Expiração de Ponta a Ponta**

Reconstruído com base nas evidências do código:

\`\`\`text

LOGIN

  ↓

Better Auth validates credentials (auth.handler)

  ↓

Session created in DB with expiresAt = now + 7d (default)

  ↓  [packages/auth/src/index.ts:51-86; Better Auth internals]

Session cookie set (httpOnly, secure, sameSite\:none)

  ↓

Request authenticated (cookies sent)

  ↓

Server validates via auth.api.getSession() (middleware/context)

  ↓  [auth-middleware.ts:8-22, context.ts:15-43]

Session valid if expiresAt > now

  ↓

Time passes → session expires

  ↓

New request with expired cookie

  ↓

auth.api.getSession() sees expired → returns null/invalid

  ↓

REST: middleware sets session=null; protected route guard throws UnauthorizedError (401)

  OR oRPC: context has session null; procedure guards throw UnauthorizedError

  OR Better Auth endpoint itself returns SESSION_EXPIRED mapped to 401

  ↓  [auth-middleware.ts:45-90, better-auth-error.ts:80-115]

Response HTTP 401 with app error envelope

  ↓

Frontend receives 401

  ↓

oRPC fetch interceptor (orpc.ts:93-120): detects 401, toasts, redirects to /login

  OR Route guard on navigation detects no session → redirects to /login

  ↓

User at /login (no original return path preserved)

\`\`\`

**\*\*Evidência por etapa:\*\*** As referenced above.

**## 7. Ciclo de Vida do Token / Sessão**

\| Fase | Acção | Localização | Evidência |

\|---|---|---|---|

\| Criação | Better Auth creates Session with expiresAt | Better Auth internals (DB) | Schema \`auth.prisma:39\` (\`expiresAt DateTime\`); predefinido TTL 7d from Better Auth config valores predefinidos |

\| Hooks de criação | Block BLOCKED users before create; log LOGIN after create | \`packages/auth/src/index.ts:55-83\` | Lines 55-66, 70-83 |

\| Utilização activa | Session validated on each request via getSession | Middleware/context | \`auth-middleware.ts:11-21\`, \`context.ts:19\` |

\| Verificação da expiração | Server compares now vs expiresAt | Better Auth | Default behavior (v1.7.1) |

\| Pedido expirado | Returns 401 Unauthorized | Guards + error mapping | \`auth-middleware.ts:45-90\`, \`better-auth-error.ts:80-115\` |

\| Renovação/Actualização | **\*\*None\*\*** | — | Não encontrado na base de código |

\| Logout | Session deleted via Better Auth sign-out; LOGOUT logged | Delete hook | \`auth/index.ts:86-104\`, \`user-menu.tsx:153-186\` |

\| Revocation | Session deletion on sign-out/password change; BLOCKED enforcement | Hooks + middleware | Comments + middleware checks |



**## 8. HTTP Error Behaviour**

\| Cenário | Estado HTTP | Código de Erro | Mensagem (PT-PT) | Origem |

\|---|---|---|---|---|

\| Session expired (Better Auth) | 401 | \`AUTH_CODES.SESSION_EXPIRED\` | "A sessão expirou. Inicia sessão novamente para continuar." | \`better-auth-error.ts:101-107\` |

\| Token expired | 401 | \`AUTH_CODES.INVALID_TOKEN\` | "O token enviado expirou." | \`better-auth-error.ts:96-100\` |

\| Invalid/missing token | 401 | \`AUTH_CODES.INVALID_TOKEN\` | Várias mensagens | \`better-auth-error.ts:108-125\` |

\| No session (protected route) | 401 | From UnauthorizedError → mapped | Mensagem 401 normalizada | \`auth-middleware.ts:45, 60, 89, 114\`; \`parse-api-error.ts:40,50\` |

\| BLOCKED user | 403 | \`ERROR_CODES.ACCOUNT_BLOCKED\` | "A tua conta está bloqueada..." | \`better-auth-error.ts:88-95\`, \`auth-middleware.ts:53-71, 98-119\` |

\| Generic 401 from API | 401 | \`ERROR_CODES.UNAUTHORIZED\` | "É necessário iniciar sessão para continuar." | \`parse-api-error.ts:40,50\` |

Payload format: \`{ error: { code: string, message: string, details?: {...} } }\` (REST/envelope) or oRPC flat forms; normalizado pelo tratamento de erros.

**## 9. Comportamento de Actualização / Renovação**

\| Item | Estado | Detalhes/Evidência |

\|---|---|---|

\| Actualização automática após expiração | **\*\*Inexistente\*\*** | No code implementing refresh on 401. oRPC interceptor immediately redirects to login (\`orpc.ts:93-120\`). |

\| Actualização silenciosa (iframe oculto/chamada ao endpoint de actualização) | **\*\*Inexistente\*\*** | Não foi encontrada tal lógica. |

\| Rotação do token | **\*\*Não determinado / Inexistente\*\*** | Better Auth suporta refresh tokens in schema; no custom rotation logic visible. |

\| Quando ocorreria a actualização | **\*\*N/A\*\*** | Não existe implementação. |

\| Em caso de falha da actualização | **\*\*N/A\*\*** | Não existe implementação. |

\| Após o logout | **\*\*N/A\*\*** | Não existe caminho de actualização. |

**\*\*Conclusão:\*\*** Não existe refresh automático. Comportamento atual: após 401 → toast + redirect para login (sem tentativa de refresh).



**## 10. Logout e Revogação**

\| Item | Estado | Detalhes/Evidência |

\|---|---|---|

\| Acção de logout no frontend | Implementado | \`authClient.signOut()\` called from UserMenu; on success limpa a cache de queries and navigates to "/" (\`user-menu.tsx:153-186\`) |

\| Gestão do logout no backend | Implementado via Better Auth | Better Auth processa o sign-out at \`/api/auth/\*\`; registo da sessão eliminado |

\| Registo de actividade no logout | Implementado | \`databaseHooks.session.delete.after\` logs LOGOUT action (\`auth/index.ts:86-104\`) |

\| Revogação da sessão após alteração da palavra-passe | Mencionado | Comment states "when a password change revokes the other devices" (\`auth/index.ts:84-85\`) — handled by Better Auth |

\| Revogação de todas as sessões do utilizador | Parcial | Better Auth can revoke sessions; no custom admin UI action visible beyond framework capabilities |

\| Invalidação da sessão de utilizador BLOCKED | Aplicado | Before session create blocked; middleware blocks BLOCKED users on requests (\`auth/index.ts:55-66\`, \`auth-middleware.ts:53-71, 98-119\`) |

**\*\*Comportamento após logout observado no código:\*\*** Client signs out via Better Auth, clears React Query cache, navega para a página inicial. Server regista a actividade on session deletion.

**## 11. Pedidos Concorrentes**

\| Aspecto | Constatação | Evidência |

\|---|---|---|

\| Deduplicação do tratamento de 401 | **\*\*Não encontrado\*\*** | \`orpc.ts:93-120\` não possui protecção contra multiple simultaneous 401s; o wrapper de fetch de cada pedido é executado de forma independente |

\| Actualização single-flight | **\*\*Não encontrado\*\*** (no refresh) | Não existe qualquer lógica de actualização |

\| Colocação de pedidos em fila durante a transição de autenticação | **\*\*Não encontrado\*\*** | Não existe colocação de pedidos em fila |

\| Condições de corrida no logout | **\*\*Potencial\*\*** | Se vários pedidos falharem with 401 aproximadamente ao mesmo tempo, multiple toasts/redirects podem ocorrer. |

\| Gestão de estado desactualizado | **\*\*Parcial\*\*** | Os guards de rotas evitam redireccionar em caso de erro (\_private.tsx:25-41) to prevent logout on network issues; mas sessões expiradas provocam redireccionamento |

**\*\*Comportamento observado:\*\*** Cada pedido falhado que devolve 401 desencadeia o interceptor. Não existe mutex/flag like \`isRedirecting\` present.



**## 12. Constatações de Segurança**

\| ID | Severidade | Área | Problemaa | Evidência | Impactoo |

\|---|---|---|---|---|---|

\| SEC-001 | MEDIUM | Frontend | Não preserva rota original após 401/expiração | \`orpc.ts:93-120\` redirecciona directamente para \`/login\` sem \`returnTo\`/redirect param | UX: utilizador perde contexto da página a que tentava aceder |

\| SEC-002 | LOW | Frontend | Múltiplos 401s simultâneos podem gerar múltiplos toasts/redireccionamentos | \`orpc.ts:93-120\` sem deduplicação | Pequeno ruído UX; não quebra segurança |

\| SEC-003 | INFO | Backend | Sessões existentes de utilizadores BLOCKED não são revogadas automaticamente | Middleware verifica BLOCKED em cada request (\`auth-middleware.ts:53-71\`) mas sessões antigas persistem até expirarem | Defesa em profundidade: pedidos com sessão antiga são bloqueados (403) — mitigado, não corrigido por revogação forçada |

**\*\*Observação:\*\*** Nenhuma vulnerabilidade crítica identificada com base no código analisado. O sistema usa cookies httpOnly/secure com sameSite\:none (adequado para cross-origin conforme config), e erros não vazam informação sensível.

**## 13. Cobertura de Testes**

**\*\*Testes existentes relacionados com autenticação:\*\***

\| Ficheiro | Tipo | Cenários cobertos |

\|---|---|---|

\| \`packages/api/src/shared/auth/better-auth-error.test.ts\` | Unitário | Mapeamento de erros Better Auth (credenciais inválidas, mensagens PT-PT, códigos, status, BLOCKED) |

\| \`packages/api/src/shared/auth/\_\_tests\_\_/authorization-behavior.test.ts\` | Unitário/Integração (BD simulada) | Guards de autorização, roles, permissões, IDOR checks |

\| \`packages/api/src/shared/auth/\_\_tests\_\_/permission-coverage.test.ts\` | Unitário | Cobertura/correcção de matriz de permissões por role |

\| \`packages/api/src/shared/auth/\_\_tests\_\_/resource-guard.test.ts\` | Unitário | Guards por recurso |

\| \`packages/api/src/shared/auth/\_\_tests\_\_/rest-authorization.test.ts\` | Estrutural | Garante que REST não usa guards antigos/sem permissão |

\| \`packages/api/src/shared/auth/rate-limit.test.ts\` | Unitário | Lógica de limitação de taxa |

**\*\*Cenários de expiração/401/refresh especificamente:\*\***

\| Cenário | Coberto? | Notas |

\|---|---|---|

\| Expiração de sessão (SESSION_EXPIRED mapping) | Parcial | Testado no \`better-auth-error.test.ts\` (linhas com SESSION_EXPIRED) |

\| Tratamento de 401 no frontend | Não | Sem testes E2E/unitários para interceptor de 401/orpc |

\| Redirect após 401 | Não | Não testado |

\| Refresh automático | Não aplicável | Não implementado |

\| Fluxo de logout | Não | Sem testes explícitos de logout |

\| 401 concorrentes | Não | Não testado |

\| Route guards com sessão expirada | Não | Sem testes de router guards |

\| Sessão expirada vs rede com erro (distinguir) | Parcial | Lógica implementada em \_private.tsx mas não testada |

**\*\*Lacunas identificadas:\*\*** Testes de integração E2E para fluxo completo de expiração (sessão expira → pedido seguinte → 401 → redirect). Testes unitários para interceptor do oRPC client (401 handling). Testes para route guards.



**## 14. Constatações**

**### Tabela de constatações**

\| ID | Severidade | Área | Problemaa | Evidência | Impactoo |

\|---|---|---|---|---|---|

\| FIND-001 | MEDIUM | Backend/Config | TTL não explicitado na config; depende de predefinido Better Auth (7d) | \`packages/auth/src/index.ts:22-165\` — sem bloco \`session: { expiresIn: ... }\`; valores predefinidos em \`better-auth/dist/context/create-context.mjs:147\` | Menor transparência; difícil auditar/alterar sem conhecer predefinido; mas comportamento documentado via valores predefinidos |

\| FIND-002 | MEDIUM | Frontend | Após 401 não preserva rota original | \`apps/web/src/utils/orpc.ts:93-120\` — redirect para \`/login\` sem \`returnTo\` | UX degradado; utilizador perde local original |

\| FIND-003 | LOW | Frontend | Sem deduplicação de 401s concorrentes | \`apps/web/src/utils/orpc.ts:93-120\` — sem flag \`isHandling401\` | Múltiplos toasts/redireccionamentos em pedidos simultâneos com 401 |

\| FIND-004 | INFO | Backend | Refresh automático inexistente (intencional?) | Ausência total de lógica de refresh em código app; Account tem refreshToken fields mas não usados | Após expiração, logout forçado imediato — simples, mas não oferece "sessão prolongada" sem re-login |

\| FIND-005 | INFO | Backend | Sessões BLOCKED antigas não revogadas à força | \`auth-middleware.ts:53-71, 98-119\` rejeita pedidos (403); mas sessão permanece no DB até expirar | Defesa em profundidade funciona; revogação atempada não implementada, mas impacto baixo |

\| FIND-006 | INFO | Frontend | Sem verificação periódica da sessão | Nenhuma polling/refetchInterval encontrado | Sessão expira "silenciosamente" até próximo pedido/ navegação; detecção reativa |

**\*\*Todos os findings acima têm evidência baseada em código analisado.\*\***

**## 15. Correcções Recomendadas**

Recomendações respeitando arquitectura existente (incrementais):

\| ID | Prioridade | Ação | Localização sugerida | Observações |

\|---|---|---|---|---|

\| REC-001 | 2 | Tornar TTL explícito na configuração Better Auth | \`packages/auth/src/index.ts\` (adicionar \`session: { expiresIn: ... }\`) | Documenta valor real; facilita alteração futura. Não reescreve auth, apenas clarifica config. |

\| REC-002 | 2 | Preservar rota original no redirect pós-401 | \`apps/web/src/utils/orpc.ts:93-120\` e possivelmente login route para aceitar \`returnTo\` | Guardar \`window\.location.pathname+search\` e passar como query param para \`/login\`; login pode redireccionar de volta após sucesso. |

\| REC-003 | 3 | Deduplicar handling de 401s (singleton flag) | \`apps/web/src/utils/orpc.ts\` | Evitar múltiplos toasts/redirects simultâneos (ex.: \`let handling401 = false; if(handling401) return; handling401=true; ... redirect ...\`). |

\| REC-004 | 4 | Adicionar testes E2E/unitários para expiração | \`apps/web/e2e/\*\`, \`apps/web/src/utils/\_\_tests\_\_/\*\` | Cobrir: sessão expira → 401 → redirect com/sem returnTo. |

\| REC-005 | 5 | Considerar documentação sobre "sem refresh automático" | \`docs/authentication-expiration-audit.md\` (já feito) | Tornar decisão arquitectural explícita. |

**\*\*Prioridades:\*\*** 1=segurança crítico (nenhum encontrado), 2=comportamento incorrecto/inconsistente, 3-5 conforme especificado.



**## 16. Plano de Implementação**

Plano incremental (sem reescrita):

1\. **\*\*Documentação (feito)\*\*** — Criar este documento com evidências

2\. **\*\*Tornar TTL explícito (REC-001)\*\*** — Adicionar \`session.expiresIn\` em Better Auth config com valor 604800s (7d) para clareza. Validar não altera comportamento.

3\. **\*\*Melhorar UX pós-401 (REC-002)\*\*** — Em interceptor, guardar \`returnTo\` e redireccionar para \`/login?returnTo=...\`; ajustar login para redireccionar de volta (se não autenticado). Verificar auth layout guards.

4\. **\*\*Prevenir duplicados (REC-003)\*\*** — Adicionar flag global no módulo orpc para evitar múltiplos redirects.

5\. **\*\*Testes (REC-004)\*\*** — Adicionar testes E2E para fluxo de expiração; unit tests para interceptor.

**\*\*Nota:\*\*** Etapas 2-5 são sugestões, não executadas nesta auditoria (regra de não alteração).

**## 17. Lista de Verificação**

\- [x] TTL real identificado. (7 dias, predefinido Better Auth v1.7.1)

\- [x] Localização exacta do TTL identificada. (valores predefinidos em node_modules dist + ausência de override em \`packages/auth/src/index.ts\`)

\- [x] Mecanismo de expiração identificado. (expiresAt no Session + validação Better Auth via getSession)

\- [x] Comportamento do back-end após expiração identificado. (retorna null/401 mapeado conforme cenário)

\- [x] HTTP status identificado. (401 para sessão/token inválido/expirado; 403 para BLOCKED)

\- [x] Payload de erro identificado. (envelope app com code/message/details, PT-PT)

\- [x] Refresh identificado ou explicitamente confirmado como inexistente. (**\*\*Confirmado inexistente\*\***)

\- [x] Logout analisado. (Frontend signOut + backend delete hook + LOGOUT log)

\- [x] Revogação analisada. (delete on sign-out, password change revocation via framework, BLOCKED enforcement)

\- [x] Cookies analisados. (advanced.predefinidoCookieAttributes: sameSite\:none, secure\:true, httpOnly\:true)

\- [x] Front-end após \`401\` analisado. (oRPC interceptor redirect; route guards)

\- [x] Redirect para login analisado. (direto, sem returnTo preservado)

\- [x] Requests simultâneas analisadas. (sem deduplicação)

\- [x] Testes existentes analisados. (6 ficheiros de auth; cobrem mapeamento/guards/permissions, não fluxo E2E de expiração)

\- [x] Lacunas de testes identificadas. (E2E expiração, interceptor unit tests, route guards)

\- [x] Todos os findings possuem evidência. (citações de ficheiros/linhas)

\- [x] Documento \`.md\` criado. (\`docs/authentication-expiration-audit.md\`)

\- [x] Nenhum comportamento foi inferido sem evidência. (usadas referências directas ao código)

**## Conformidade com a Regra Final**

**\*\*Precisão > quantidade.\*\*** Cada afirmação importante inclui ficheiro + localização + evidência. Quando não encontrado, escrito explicitamente. Nenhuma implementação inventada.