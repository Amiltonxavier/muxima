import db from "@muxima/db";
import { toCents } from "../../shared/finance/money";
import { composeEndAt } from "../events/lifecycle";

/**
 * Gastos do evento ao longo do tempo.
 *
 * Tal como o resto do budget, isto é um read model: nenhuma soma acontece no
 * browser. As fontes são as duas mesmas do orçamento —
 *   - pagamentos a fornecedores (SupplierPayment.paymentDate), e
 *   - aquisições de inventário (InventoryMovement PURCHASE, createdAt),
 *
 * agregadas em SQL (`groupBy`) dentro do período do próprio evento, que o
 * backend determina automaticamente: de `createdAt` do evento até ao fim
 * efectivo (eventDate + endTime, via composeEndAt), ou "agora" enquanto o
 * evento não tiver data.
 *
 * Todos os montantes são cêntimos inteiros; o router converte para unidades.
 */

export type ExpenseSeriesPoint = { date: string; amount: number };
export type ExpenseMonthPoint = { month: string; amount: number };

export type ExpenseAnalyticsResult = {
	/** Período efectivamente agregado, para o cliente poder contextualizar. */
	period: { from: string; to: string };
	daily: ExpenseSeriesPoint[];
	monthly: ExpenseMonthPoint[];
};

/** `YYYY-MM-DD` em UTC. */
function dayKey(date: Date): string {
	return date.toISOString().slice(0, 10);
}

/** Total gasto por dia, entre `from` e `to`, incluindo ambos os extremos. */
async function loadDailySpend(
	eventId: string,
	from: Date,
	to: Date,
): Promise<ExpenseSeriesPoint[]> {
	const toExclusive = new Date(to.getTime());
	toExclusive.setDate(toExclusive.getDate() + 1);

	const [payments, purchases] = await Promise.all([
		db.supplierPayment.groupBy({
			by: ["paymentDate"],
			where: {
				supplier: { eventId },
				paymentDate: { gte: from, lt: toExclusive },
			},
			_sum: { amount: true },
		}),
		db.inventoryMovement.groupBy({
			by: ["createdAt"],
			where: {
				inventoryItem: { eventId },
				type: "PURCHASE",
				createdAt: { gte: from, lt: toExclusive },
				totalCost: { not: null },
			},
			_sum: { totalCost: true },
		}),
	]);

	// O groupBy devolve um balde por valor distinto da chave (instante exacto);
	// colapsar para o dia calendário em UTC, igual ao `monthKey` mensal.
	const byDay = new Map<string, number>();
	for (const row of payments) {
		const key = dayKey(row.paymentDate);
		byDay.set(key, (byDay.get(key) ?? 0) + toCents(row._sum.amount));
	}
	for (const row of purchases) {
		const key = dayKey(row.createdAt);
		byDay.set(key, (byDay.get(key) ?? 0) + toCents(row._sum.totalCost));
	}

	return [...byDay.entries()]
		.map(([date, amount]) => ({ date, amount }))
		.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Resolve o período automático do evento.
 *
 * Início: criação do evento (`createdAt`), base temporal de todo o historial
 * financeiro. Fim: fim efectivo do evento (eventDate + endTime); enquanto o
 * evento não tiver data, o fim é "agora", para as séries reflectirem a
 * actividade corrente.
 */
export function resolveExpensePeriod(
	event: {
		createdAt: Date;
		eventDate: Date | null;
		startTime: string | null;
		endTime: string | null;
	},
	now = new Date(),
): { from: Date; to: Date } {
	const from = event.createdAt;
	const endAt = composeEndAt(event);
	const to = endAt && endAt > from ? endAt : now;
	return { from, to };
}

/** Ponto de entrada: séries diária e mensal de gastos do evento. */
export async function getExpenseAnalytics(
	eventId: string,
	now = new Date(),
): Promise<ExpenseAnalyticsResult> {
	const event = await db.event.findUnique({
		where: { id: eventId },
		select: {
			createdAt: true,
			eventDate: true,
			startTime: true,
			endTime: true,
		},
	});
	if (!event) {
		throw new Error("Evento não encontrado");
	}

	const { from, to } = resolveExpensePeriod(event, now);
	const daily = await loadDailySpend(eventId, from, to);

	const byMonth = new Map<string, number>();
	for (const point of daily) {
		const month = point.date.slice(0, 7);
		byMonth.set(month, (byMonth.get(month) ?? 0) + point.amount);
	}
	const monthly: ExpenseMonthPoint[] = [...byMonth.entries()]
		.map(([month, amount]) => ({ month, amount }))
		.sort((a, b) => a.month.localeCompare(b.month));

	return {
		period: { from: dayKey(from), to: dayKey(to) },
		daily,
		monthly,
	};
}
