import { buildPaidExpenses, type PaidExpense } from "./breakdown";
import { getBudgetLines } from "./repository";

/**
 * Despesas efectivamente pagas do evento, sejam serviços ou inventário.
 *
 * Reutiliza as mesmas linhas do orçamento (`getBudgetLines`), a fonte única de
 * verdade financeira: o inventário adquirido entra pelo seu valor gasto
 * (`unitPrice x currentQuantity`) e cada fornecedor pelo total já pago, com os
 * pagamentos parciais somados pelo `resolveSupplierMoney`. Valores pendentes,
 * previstos ou por pagar ficam de fora e nada é calculado no cliente; este
 * módulo devolve a série já agregada, em cêntimos.
 */

export type { PaidExpense } from "./breakdown";

export async function getPaidExpenses(
	eventId: string,
	now = new Date(),
): Promise<PaidExpense[]> {
	const lines = await getBudgetLines(eventId, {}, now);
	return buildPaidExpenses(lines);
}
