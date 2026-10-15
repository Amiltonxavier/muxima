# Auditoria e Testes de Envio de E-mails — Muxima

**Data:** 2026-10-12
**Âmbito:** camada de e-mail transacional (`@muxima/mail`), *wiring* em `@muxima/api` e `@muxima/auth`, configuração SMTP e entrega real.
**Níveis de estado:** PASSOU · FALHOU · BLOQUEADO · NÃO VERIFICADO

---

## 1. Resumo executivo

A implementação de e-mail do Muxima (Nodemailer + SMTP orientado por variáveis de ambiente) está **funcional e corretamente ligada** aos fluxos de negócio. O envio **não chegava** ao destinatário por uma causa externa ao código:

> O servidor SMTP configurado (`smtp.office365.com`) devolve, na autenticação,
> `535 5.7.139 Authentication unsuccessful, SmtpClientAuthentication is disabled for the Mailbox`.
> A caixa `amiltonjose2024@outlook.com` é uma **conta pessoal Outlook.com** e a Microsoft
> desativou o SMTP AUTH (autenticação básica) para contas de consumidor, **sem qualquer
> opção de self-service para o utilizador reativar**. Isto aplica-se também ao endpoint
> `smtp-mail.outlook.com` e a OAuth2 (o bloqueio é ao nível da caixa, não do método).

Ou seja: DNS, TLS, handshake SMTP e a chamada `AUTH` funcionam; o servidor é que **recusa
a autenticação antes de aceitar qualquer mensagem**. Nenhuma alteração de código resolveria
este bloqueio — a correção é trocar de fornecedor (testes com **Ethereal**; produção
recomendada com **Resend**) ou usar Microsoft Graph.

Foi ainda confirmado, com um recetor SMTP controlado local e depois com um **envio real
via Ethereal** (`smtp.ethereal.email`, serviço SMTP do projeto Nodemailer), que **o
pipeline completo do Muxima entrega mensagens** (render → SMTP → receção) para os 4 fluxos
principais (confirmação de conta, OTP, convite de membro, convite de evento). No Ethereal o
servidor respondeu `250 Accepted` e a mensagem ficou disponível e legível no URL de
pré-visualização (ver §5.3).

---

## 2. Fluxo de envio atualmente implementado

```
Router/negócio (@muxima/api, @muxima/auth)
        │  MailService.send<Kind>(input)
        ▼
packages/mail/src/services/mail-service.ts   (fachada: 1 método tipado por tipo de e-mail)
        │  renderBaseEmail(...)  →  { html, text }
        ▼
packages/mail/src/client/mailer.ts::deliverMail(message)
        │  getTransporter()  (singleton lazy)
        │  transporter.sendMail({ from, to, subject, html, text })
        ▼
packages/mail/src/config/mailer-config.ts::buildMailerConfig()
        │  lê @muxima/env/server (MAIL_*)
        ▼
smtp.<provider>  (Nodemailer SMTP)
```

Destaques de arquitetura:
- **Um único** ponto de `sendMail()` no monorepo (`mailer.ts`).
- `deliverMail` **nunca lança**: devolve `MailDeliveryResult`; uma falha de e-mail nunca
  derruba uma operação de negócio.
- Transportador**singleton lazy**; `from` vem sempre do ambiente (`MAIL_FROM`).
- *Wiring* de negócio: `users`, `members`, `budget`, `events`, `invitations` (API) e
  `emailVerification` + plugin `emailOTP` (auth).

### Variáveis de ambiente (`@muxima/env/server`)
`MAIL_HOST`, `MAIL_PORT` (default `587`), `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM`,
`MAIL_SECURE`, `MAIL_REQUIRE_TLS`. `MAIL_HOST` ausente ⇒ mailer desativado
(`SMTP_NOT_CONFIGURED`), comportamento esperado em ambientes sem SMTP.

---

## 3. Falhas encontradas e causas

### F-01 — Autenticação recusada pelo fornecedor (causa raiz) — **BLOQUEADO**
- **Sintoma:** e-mails nunca chegam; `transporter.verify()` e `sendMail()` falham com `EAUTH`.
- **Resposta SMTP (real):**
  `535 5.7.139 Authentication unsuccessful, SmtpClientAuthentication is disabled for the Mailbox.`
- **Causa:** conta pessoal Outlook.com com SMTP AUTH desativado pela Microsoft. Não há
  `Set-CASMailbox`/Admin Center aplicável a contas de consumidor; a autenticação básica foi
  retirada (set/2024) e a via suportada é OAuth2/Graph.
- **Correção:** substituição do fornecedor. Para **testes/desenvolvimento** foi usada uma
  conta **Ethereal** (`smtp.ethereal.email`), que autentica e aceita as mensagens; para
  **produção** recomenda-se um provider transacional real (ex.: **Resend**). Ficheiro:
  `apps/server/.env`.

### F-02 — Ausência de timeouts SMTP — **FALHOU (corrigido)**
- `buildMailerConfig` não definia `connectionTimeout`/`greetingTimeout`/`socketTimeout`.
  Uma porta bloqueada ou um servidor que abre socket e não responde faria a chamada
  `deliverMail` (que promete *sempre* resolver) **pendurar indefinidamente**.
- **Correção:** timeouts finitos (`15s`/`10s`/`30s`) em `mailer-config.ts`.

### F-03 — STARTTLS não exigido — **FALHOU (corrigido)**
- Em porta não-segura (ex.: 587) não se exigia a subida para TLS: credenciais podiam ser
  enviadas em claro se o servidor não oferecesse STARTTLS.
- **Correção:** `requireTLS` (default `true` em portas não-secure; override por
  `MAIL_REQUIRE_TLS=false` para recetores locais) e `tls.minVersion: TLSv1.2`.

### F-04 — `sendMail()` resolvido tratado como sucesso — **FALHOU (corrigido)**
- `deliverMail` devolvia `{ ok: true }` só com base no `messageId`, **sem inspecionar
  `info.accepted`/`info.rejected`**. Um envio sem nenhum destinatário aceite era reportado
  como sucesso.
- **Correção:** novo código `SMTP_NO_RECIPIENTS` (falha quando `accepted` é vazio),
  `accepted`/`rejected` no resultado e *log* de aviso em rejeição parcial.

### F-05 — Logs de erro sem dados SMTP estruturados — **FALHOU (corrigido)**
- O erro era registado, mas sem `code`/`responseCode`/`command` no objeto estruturado,
  dificultando o diagnóstico (como o F-01).
- **Correção:** `smtpErrorDetails()` extrai `code`, `responseCode`, `command`, `response`,
  `message` (sem tocar em credenciais) e `logMail` suporta o nível `info` no sucesso.

### F-06 — `MAIL_FROM` com domínio não entregável por omissão — **NÃO VERIFICADO / risco**
- Quando `MAIL_HOST` existe mas `MAIL_FROM` não, o fallback é `no-reply@muxima.test`
  (`.test` não é entregável). Fica documentado como configuração obrigatória em produção.

---

## 4. Ficheiros e componentes afetados

| Ficheiro | Papel |
|---|---|
| `apps/server/.env` | Configuração SMTP (Office365 → Resend) |
| `packages/env/src/server.ts` | Schema/validação `MAIL_*` (+ `MAIL_REQUIRE_TLS`) |
| `packages/mail/src/config/mailer-config.ts` | Construção do transport (timeouts, TLS) |
| `packages/mail/src/client/mailer.ts` | `deliverMail`, `accepted/rejected`, logs |
| `packages/mail/src/types/mail.types.ts` | `MailDeliveryResult` / `MailFailureCode` |
| `packages/mail/src/config/mailer-config.test.ts` | **novo** — testes de transport/segurança |
| `packages/mail/src/client/mailer.test.ts` | Testes de envelope/rejeição |
| `packages/mail/src/services/mail-service.ts` | Fachada (sem alterações funcionais) |
| `packages/auth/src/index.ts`, `packages/api/src/**` | *Wiring* (sem alterações) |

---

## 5. Testes executados e resultados

### 5.1 Conectividade (rede/TLS) — **PASSOU**
- DNS: `smtp.office365.com` resolve; `smtp.resend.com` resolve (IPv4).
- TCP `smtp.office365.com:587` **aberto**; `:465` inacessível (só publicação IPv6).
- TCP `smtp.resend.com:465` **aberto**.
- Handshake TLS e `AUTH` alcançados em ambos os fornecedores (a falha é só credenciais).

### 5.2 `transporter.verify()` — **PASSOU (Ethereal) / FALHOU (Office365, causa F-01)**
- Office365 em `:587` e `smtp-mail.outlook.com:587`: `EAUTH 535 5.7.139` (mailbox).
- **Ethereal** em `smtp.ethereal.email:587` (STARTTLS) com as credenciais de teste:
  **`verify()` = PASSOU**.
- Resend em `:465` com chave *placeholder*: `EAUTH 535 Authentication credentials invalid`
  (esperado — prova que TLS/AUTH funcionam; falta a chave real).

### 5.3 Envio real de e-mails — **PASSOU**

**(a) Recetor SMTP controlado local (Mailpit)** — `MailService` real, env apontado ao recetor.
4 fluxos executados e **todos aceites e recebidos**:

| Fluxo | Resultado | `messageId` | Aceites | Rejeitados |
|---|---|---|---|---|
| `sendEmailVerification` | `ok:true` | `<8974…@muxima.test>` | 1 | 0 |
| `sendOtp` | `ok:true` | `<7faa…@muxima.test>` | 1 | 0 |
| `sendMemberInvitation` | `ok:true` | `<6040…@muxima.test>` | 1 | 0 |
| `sendEventInvitation` | `ok:true` | `<0dff…@muxima.test>` | 1 | 0 |

Confirmação de **recepção** (API do recetor): `total=4`; para cada mensagem `From`,
`To`, `Subject`, `Date` e `MessageID` corretos; HTML (≈4.477 bytes) + texto (≈280 bytes).

**(b) Envio real via Ethereal** (`smtp.ethereal.email:587`, STARTTLS) — `MailService` real:

| Fluxo | Resultado | Aceites | Rejeitados |
|---|---|---|---|
| `sendEmailVerification` | `ok:true` | `["<recipient>"]` | `[]` |
| `sendOtp` | `ok:true` | `["<recipient>"]` | `[]` |
| `sendMemberInvitation` | `ok:true` | `["<recipient>"]` | `[]` |
| `sendEventInvitation` | `ok:true` | `["<recipient>"]` | `[]` |
| envio direto (verificação) | `ok:true` | `["<recipient>"]` | `[]` |

- Resposta do servidor SMTP: `250 Accepted [STATUS=new MSGID=…]`.
- **Recepção confirmada:** o URL de pré-visualização
  `https://ethereal.email/message/as0LDxCIb4I3uVvias0LsZ0L.yTpA.Z3AAAABlD96NjtyYonHS5SOWFisYU`
  devolveu **HTTP 200**, com o `<title>` e o corpo da mensagem corretos (texto/HTML).

### 5.4 Regressão (automática) — **PASSOU**
- `@muxima/mail`: **36/36** testes (4 ficheiros) — inclui novos testes de config e envelope.
- `@muxima/api`: **580/580** testes (41 ficheiros) — inclui `mail-wiring`.
- `@muxima/auth`: **28/28** testes (3 ficheiros).
- `check-types` (`mail`, `api`): limpo. `biome check` nos ficheiros alterados: limpo.

---

## 6. Correções realizadas

1. **Configuração SMTP ativa para testes: Ethereal** (`apps/server/.env`):
   `MAIL_HOST=smtp.ethereal.email`, `MAIL_PORT=587`, `MAIL_SECURE=false`,
   `MAIL_USER=<conta de teste>`, `MAIL_PASSWORD=<password de teste>`,
   `MAIL_FROM="Muxima <conta de teste>"`. A configuração Office365 anterior foi removida
   (deixou de ser viável para conta pessoal).
2. `buildMailerConfig`: **timeouts** finitos, `requireTLS` (com override
   `MAIL_REQUIRE_TLS`), `tls.minVersion=TLSv1.2`.
3. `deliverMail`: trata `accepted`/`rejected`; **`SMTP_NO_RECIPIENTS`** quando nada é
   aceite; *log* de sucesso (`info`) e de rejeição parcial (`warn`).
4. `smtpErrorDetails()`: *logs* com `code`/`responseCode`/`command`/`response`.
5. Novos testes: `mailer-config.test.ts` + casos de envelope em `mailer.test.ts`.

### Estado de confirmação da entrega
- **Pipeline da aplicação:** PASSOU (recepção confirmada em recetor controlado e no Ethereal).
- **Envio real via Ethereal:** PASSOU (`250 Accepted` + pré-visualização HTTP 200).
- **Produção:** pendente de um provider transacional real (ex.: Resend) com **API key
  válida** e **domínio verificado** — passos na secção 8. O Ethereal **não** entrega em
  inbox de utilizadores reais, pelo que não substitui um provider de produção.

---

## 7. Evidências técnicas (sem segredos)

- Resposta do fornecedor (Office365):
  `535 5.7.139 Authentication unsuccessful, SmtpClientAuthentication is disabled for the Mailbox.`
- **Ethereal:** `verify()` = PASSOU; `sendMail()` = `250 Accepted [STATUS=new MSGID=…]`;
  `accepted=["<recipient>"]`, `rejected=[]`; pré-visualização HTTP 200 com título/corpo.
- `verify()` Resend com chave inválida: `EAUTH 535 Authentication credentials invalid`
  (confirma TLS + AUTH, falha apenas na credencial).
- `observed mailer config` (valores não-secretos):
  `{ host, port, secure, connectionTimeout:15000, greetingTimeout:10000, socketTimeout:30000, requireTLS, tls:{minVersion:"TLSv1.2"} }`.
- Nenhuma password, token, OTP ou API key é registada nos *logs* ou neste relatório.

---

## 8. Problemas pendentes e próximos passos

1. **Produção — escolher um provider transacional real** e preencher `apps/server/.env`:
   - **Resend** (recomendado): `MAIL_HOST=smtp.resend.com`, `MAIL_PORT=465`,
     `MAIL_SECURE=true`, `MAIL_USER=resend`, `MAIL_PASSWORD=<API key>`,
     `MAIL_FROM="Muxima <no-reply@dominio-verificado>"`.
   - **Verificar o domínio remetente** em <https://resend.com/domains>. Sem domínio
     verificado, a Resend rejeita remetentes não autorizados (para teste pontual aceita
     `onboarding@resend.dev`).
2. **Confirmar receção numa inbox real** (fora do Ethereal): executar um registo/OTP real
   e verificar caixa de entrada + spam. Sugestão:
   ```bash
   pnpm --filter server dev   # e disparar registo / pedido de OTP
   ```
3. **Registos DNS do domínio remetente** (quando aplicável): SPF, DKIM (fornecidos pela
   Resend) e DMARC no domínio. Enquanto se usar `ethereal.email`/`resend.dev`, a
   autenticação é gerida pelo fornecedor.
4. **Produção:** garantir `MAIL_FROM` explícito (o fallback `*.test` não é entregável) e
   credenciais por ambiente (nunca comitar `.env`).
5. **Ethereal:** as credenciais de teste atualmente no `.env` servem apenas para
   desenvolvimento; as mensagens não chegam a inboxes reais.

### Nota de segurança
Nenhuma credencial foi alterada no lado do fornecedor nem copiada para os *logs*; os
registos DNS e a API key de produção são ações do proprietário da conta.
