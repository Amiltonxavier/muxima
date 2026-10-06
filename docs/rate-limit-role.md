Analisa e ajusta o Rate Limit existente sem reescrever desnecessariamente a implementação.

### Objectivo

Tornar o Rate Limit preciso e eficaz usando:

**IP/User ID + endpoint + método + nível de risco + janela.**

### Regras

* Endpoints públicos → limitar por **IP**.
* Endpoints autenticados → limitar por **User ID + IP**.
* O `key` deve identificar o contexto completo da operação.
* Não usar um limite global para todos os endpoints.
* Manter configuração centralizada.
* `429 Too Many Requests` + `Retry-After`.
* Limites mais restritivos para operações sensíveis.
* Adicionar proteção contra burst quando necessário.

### Limites base

```text
GET/listagens       → 120/min
GET pesado          → 30/min
POST/PATCH          → 30/min
DELETE              → 20/min
Login               → 5/min
Login falhado       → 10/15min
Password reset      → 3/15min
Email/OTP           → 5/15min
Bulk/Publish        → 10/min
Export PDF/XLSX     → 5/min
Upload              → 10/min
```

### Endpoints públicos actuais

Reavaliar:

```text
publicInvitationCodeLimiter
publicInvitationRespondLimiter
publicInvitationScheduleLimiter
publicInvitationExportLimiter
```

Não assumir que todos devem usar `30/10min`. Classificar cada endpoint pelo custo e risco.

Especialmente:

* `respond` → mais restritivo;
* `export` → mais restritivo devido ao custo de geração do PDF;
* `getByCode/schedule` → permitir maior volume;
* operações de escrita → limite inferior.

### Implementação

Manter o `createMemoryRateLimiter`, mas melhorar a API para suportar:

```ts
limit
windowMs
key
```

e, se necessário, múltiplas janelas:

```text
burst → 10/10s
normal → 100/1min
```

Não criar complexidade desnecessária.

Corrigir também a resposta de rate limit para incluir:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: <seconds>
```

Evitar duplicação de configuração e manter os limites facilmente ajustáveis.

### Validação

Testar:

1. requisições abaixo do limite;
2. exactamente no limite;
3. primeira requisição acima do limite;
4. expiração da janela;
5. isolamento entre IPs;
6. isolamento entre utilizadores;
7. endpoints com limites diferentes;
8. resposta `429` e `Retry-After`;
9. limpeza de entradas antigas.

Não alterar regras de negócio nem criar um novo sistema de rate limit paralelo.
