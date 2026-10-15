# Disparos de E-mail — Muxima

**Data:** 2026-10-14
**Âmbito:** catálogo de todos os pontos do código onde um e-mail é disparado (fluxos de negócio em `@muxima/api` e `@muxima/auth`), com o gatilho, destinatários e condições.
**Fonte de verdade da infraestrutura:** `docs/email-delivery-audit.md` (pipeline, SMTP, falhas).

---

## 1. Como um e-mail é enviado

Toda a aplicação passa por **uma única fachada** — `MailService` (`packages/mail/src/services/mail-service.ts`). Cada método tipado renderiza o template comum e chama `deliverMail` (`packages/mail/src/client/mailer.ts`), o **único** ponto de `nodemailer.sendMail()` no monorepo.

```
Router/negócio (@muxima/api, @muxima/auth)
        │  MailService.send<Kind>(input)
        ▼
packages/mail/src/services/mail-service.ts   (1 método por tipo de e-mail)
        │  renderBaseEmail(...) → { html, text }
        ▼
packages/mail/src/client/mailer.ts::deliverMail(message)
        │  getTransporter() (singleton lazy)  →  transporter.sendMail(...)
        ▼
packages/mail/src/config/mailer-config.ts::buildMailerConfig()  →  SMTP
```

Regras transversais:
- `deliverMail` **nunca lança**: devolve `MailDeliveryResult` (`ok: true|false` + `code`). Uma falha de SMTP **nunca** reverte a operação de negócio.
- `MAIL_HOST` ausente ⇒ mailer desativado (`SMTP_NOT_CONFIGURED`); comportamento esperado em ambientes sem SMTP.
- O `from` vem sempre de `MAIL_FROM` (fallback `no-reply@muxima.test`, não entregável).

---

## 2. Resumo dos disparos

| # | Método `MailService` | E-mail | Gatilho | Destinatários |
|---|---|---|---|---|
| 1 | `sendEmailVerification` | Confirmação de e-mail | Registo + `POST /api/auth/send-verification-email` | Utilizador |
| 2 | `sendOtp` | Código de acesso (OTP) | `POST /api/auth/email-otp/send-verification-otp` | Utilizador |
| 3 | `sendPasswordChanged` | Palavra-passe alterada | `users.changePassword` | próprio utilizador |
| 4 | `sendAccountBlocked` | Conta bloqueada | `users.blockAccount` | próprio utilizador |
| 5 | `sendAccountUnblocked` | Conta desbloqueada | `users.unblockAccount` | próprio utilizador |
| 6 | `sendPermissionsChanged` | Permissões atualizadas | `members.updateRole` e `users.updateMemberRole` | membro afetado |
| 7 | `sendBudgetChanged` | Orçamento atualizado | `budget.updateTarget` | membros ativos (exceto o autor) |
| 8 | `sendOwnershipChanged` | Propriedade do evento | `events.transferOwnership` | novo dono **e** antigo dono |
| 9 | `sendEventInvitation` | Convite para evento | `invitations.publish` e `invitations.publishBatch` | convidados com e-mail |
| 10 | `sendMemberInvitation` | Convite de membro | `members.add`, `users.inviteMember`, `MembersService` | e-mail convidado |

---

## 3. Detalhe por disparo

### 3.1 `sendEmailVerification` — Confirmação de conta
- **Wiring:** `packages/auth/src/index.ts:51` (opção `emailVerification.sendVerificationEmail`), a partir de `emailVerificationOptions` (`packages/auth/src/email-verification.ts`).
- **Gatilhos:**
  1. **Registo** — `sendOnSignUp: true` (a conta fica inativa até confirmação, `requireEmailVerification: true`).
  2. **Reenvio manual** — `POST /api/auth/send-verification-email` (`{ email, callbackURL? }`).
  3. **Mudança de e-mail** — fluxo de verificação de novo endereço (Better Auth).
- **Condição relevante:** o reenvio manual **só dispara** se o utilizador existir e **não** tiver `emailVerified = true`. Se a conta já estiver verificada (e não houver sessão), o Better Auth devolve `{ status: true }` **sem enviar** (`better-auth/dist/api/routes/email-verification.mjs:108`).
- **Link:** `FRONTEND_URL`/`CORS_ORIGIN` + `/verify-email?token=<jwt>` (validade 1 hora).

### 3.2 `sendOtp` — Código de acesso (login por código)
- **Wiring:** `packages/auth/src/index.ts:169` (plugin `emailOTP`, callback `sendVerificationOTP`), política em `packages/auth/src/otp.ts`.
- **Gatilho:** `POST /api/auth/email-otp/send-verification-otp` (tipos `sign-in`, `email-verification`, `forget-password`).
- **Condições:** código de 6 dígitos, validade 5 min, guardado com hash, `disableSignUp: true` (nunca cria conta), limite de reenvio 3/min. Só contas existentes.

### 3.3 `sendPasswordChanged` — Alerta de segurança
- **Wiring:** `packages/api/src/routers/users.ts:203`.
- **Gatilho:** `users.changePassword` (`users.ts:142`) — após alterar a palavra-passe (com verificação da atual) e registar `PASSWORD_CHANGED`.
- **Destinatário:** o próprio utilizador (e-mail da sessão). Inclui IP quando disponível.

### 3.4 `sendAccountBlocked` — Conta bloqueada
- **Wiring:** `packages/api/src/routers/users.ts:233`.
- **Gatilho:** `users.blockAccount` (`users.ts:218`) — `{ confirm: true, reason? }`; envia após o bloqueio e revogação de sessões estarem persistidos.
- **Destinatário:** o próprio utilizador (motivo incluído quando fornecido).

### 3.5 `sendAccountUnblocked` — Conta desbloqueada
- **Wiring:** `packages/api/src/routers/users.ts:249`.
- **Gatilho:** `users.unblockAccount` (`users.ts:246`) — apenas alcançável enquanto existir outra sessão.

### 3.6 `sendPermissionsChanged` — Permissões / papel atualizados
- **Wiring (dois pontos, mesma notificação):**
  - `packages/api/src/routers/members.ts:149` — `members.updateRole` (`members.ts:97`).
  - `packages/api/src/routers/users.ts:370` — `users.updateMemberRole` (`users.ts:321`).
- **Condição:** só envia se o membro tiver e-mail (`memberMeta?.user?.email`). Inclui o novo papel e a lista de permissões; link para a página do evento.

### 3.7 `sendBudgetChanged` — Orçamento atualizado
- **Wiring:** `packages/api/src/routers/budget.ts:173`.
- **Gatilho:** `budget.updateTarget` (`budget.ts:103`).
- **Condição:** só quando `plannedAmount` e/ou `reserveAmount` **mudam** (`plannedChanged || reserveChanged`) — alterar apenas notas não dispara.
- **Destinatários:** todos os membros **ativos** do evento **exceto o autor** da alteração.

### 3.8 `sendOwnershipChanged` — Propriedade do evento
- **Wiring:** `packages/api/src/routers/events.ts:684` (novo dono) e `:694` (antigo dono).
- **Gatilho:** `events.transferOwnership` (`events.ts:567`).
- **Destinatários:** o novo proprietário (`isNewOwner: true`) **e** o antigo (`isNewOwner: false`), desde que tenham e-mail. Copy distinta por papel.

### 3.9 `sendEventInvitation` — Convite para evento (RSVP)
- **Wiring:** `packages/api/src/routers/invitations.ts:422` (helper `sendPublishedInvitationEmails`, `invitations.ts:402`).
- **Gatilhos:**
  - `invitations.publish` (`invitations.ts:235`) — **apenas na transição** de não-publicado → publicado (`before?.publishedAt === null`); republicar não reenvia.
  - `invitations.publishBatch` (`invitations.ts:274`) — envia para os convites efetivamente publicados.
- **Destinatários:** todos os convidados **com e-mail** de cada convite; link para a página pública de RSVP.

### 3.10 `sendMemberInvitation` — Convite de membro (equipa)
- **Wiring:** `packages/api/src/modules/members/invitations.ts:232` (função `inviteMember`).
- **Gatilhos (todos passam por `inviteMember`):**
  - `members.add` (`packages/api/src/routers/members.ts:71`).
  - `users.inviteMember` (`packages/api/src/routers/users.ts:268`).
  - `MembersService` (`packages/api/src/modules/members/service.ts:26`).
- **Destinatário:** o e-mail convidado. Inclui botões aceitar/recusar; token válido 7 dias (`MEMBER_INVITATION_TTL_DAYS`). Além do e-mail, gera notificação in-app/realtime **se** o convidado já tiver conta.

---

## 4. Notas e comportamentos esperados

- **`/api/auth/send-verification-email` não envia para contas já verificadas.** É o comportamento por omissão do Better Auth (anti-enumeração + `{ status: true }` silencioso). Para o disparo acontecer, a conta tem de ter `emailVerified = false`. Os utilizadores semeados (`amilton.seed@…`, etc.) têm `emailVerified = true`, logo este endpoint **não** produz e-mail para eles.
- **Falha de SMTP não bloqueia o negócio.** Todos os disparos de negócio (exceto o de verificação por sessão) são *fire-and-forget*: `deliverMail` não lança. O pedido pode aguardar o resultado, mas o estado já foi persistido.
- **Nenhum log expõe credenciais.** `smtpErrorDetails()` registra apenas `code`, `responseCode`, `command`, `response`, `message`.

---

## 5. Índice de ficheiros

| Ficheiro | Papel |
|---|---|
| `packages/mail/src/services/mail-service.ts` | Fachada `MailService` (10 métodos) |
| `packages/mail/src/client/mailer.ts` | `deliverMail` — único `sendMail()` |
| `packages/mail/src/config/mailer-config.ts` | Transporte SMTP a partir de `MAIL_*` |
| `packages/auth/src/index.ts` | Wiring de verificação de e-mail e OTP |
| `packages/auth/src/email-verification.ts` | Política de confirmação de conta |
| `packages/auth/src/otp.ts` | Política de login por código |
| `packages/api/src/routers/users.ts` | Password, conta, papel de membro |
| `packages/api/src/routers/members.ts` | Convite de membro e mudança de papel |
| `packages/api/src/modules/members/invitations.ts` | `inviteMember` (e-mail de convite) |
| `packages/api/src/routers/budget.ts` | Notificação de orçamento |
| `packages/api/src/routers/events.ts` | Transferência de propriedade |
| `packages/api/src/routers/invitations.ts` | Publicação → e-mail de convite a convidados |

---

## 6. Testes de disparo e entrega

A cobertura é feita em duas camadas complementares, para cada um dos 10 tipos de e-mail:

### 6.1 Disparo (o gatilho de negócio chama o método certo)

Exercitam os procedimentos/endpoints **reais** (schemas + middleware) e afirmam *qual* e-mail
é enviado, *para quem* e com *qual conteúdo*:

| Disparo | Teste |
|---|---|
| Verificação de conta (registo + reenvio) | `packages/auth/src/email-verification.test.ts` |
| OTP | `packages/auth/src/otp.test.ts` |
| Palavra-passe / bloqueio / desbloqueio | `packages/api/src/routers/__tests__/users.test.ts` |
| Convite de membro, papel (members), orçamento, propriedade, convite de evento | `packages/api/src/routers/__tests__/mail-wiring.test.ts` |

`mail-wiring.test.ts` cobre `users.inviteMember`, `members.updateRole`, `users.updateMemberRole`,
`budget.updateTarget`, `events.transferOwnership`, `invitations.publish` e `invitations.publishBatch`.

### 6.2 Entrega real (o e-mail sai por SMTP e chega à caixa)

- **`packages/mail/src/mailbox-delivery.test.ts`** — exercita a pilha **real**
  `MailService` → `deliverMail` → Nodemailer contra um servidor SMTP em processo
  (`packages/mail/src/testing/smtp-capture.ts`) que faz de **caixa de correio do destinatário**.
  Cada um dos 10 métodos é enviado e a mensagem é recebida e analisada (`mailparser`):
  afirma-se o envelope (`from`/`to`) e o conteúdo descodificado (assunto, HTML e texto).
- Cobre também o contrato de resultado de `deliverMail` (`ok`, `accepted`, `rejected`, `messageId`).
- O transporte é redirecionado para uma porta efémera local (mock de `buildMailerConfig`);
  renderização, codificação MIME, diálogo SMTP e parsing são reais. Não contacta SMTP externo.

A camada de *transporte/segurança* (timeouts, STARTTLS, rejeição de destinatários, SMTP não
configurado) tem testes próprios em `packages/mail/src/client/mailer.test.ts` e
`packages/mail/src/config/mailer-config.test.ts`.

**Executar:**

```bash
pnpm --filter @muxima/mail test:run   # inclui a entrega real para a caixa
pnpm --filter @muxima/api test:run    # disparos de negócio
pnpm --filter @muxima/auth test:run   # verificação de conta + OTP
```
