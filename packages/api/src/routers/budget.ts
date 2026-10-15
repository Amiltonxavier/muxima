import db from "@muxima/db";
import { MailService } from "@muxima/mail";
import { PERMISSIONS } from "@muxima/permissions";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { getBudgetAnalytics } from "../modules/budget/analytics";
import { getExpenseAnalytics } from "../modules/budget/expense-analytics";
import { getPaidExpenses } from "../modules/budget/paid-expenses";
import {
	getBudgetLines,
	getBudgetSnapshot,
} from "../modules/budget/repository";
import {
	requireEventPermission,
	requireEventPermissionMutable,
} from "../shared/auth/authorization";

import { ValidationError } from "../shared/errors/app-error";
import { centsToUnits, fromCents, toCents } from "../shared/finance/money";
import { eventBudgetPageUrl } from "../shared/mail";

/**
 * The budget is a read model. There is no expense CRUD any more: the API only
 * exposes the target the user is planning against, plus the aggregates the API
 * derives from Inventory and Suppliers. Every figure below is computed on the
 * server so no client ever has to sum money itself.
 */

const moneyInput = z.coerce
	.number()
	.nonnegative()
	.refine((v) => Number.isFinite(v), "Valor inválido")
	.transform((v) => Math.round(v * 100));

const eventInput = z.object({ eventId: z.string() });

export const budgetRouter = {
	/** Target + reserve + every derived total. */
	getByEventId: protectedProcedure
		.input(eventInput)
		.handler(async ({ context, input }) => {
			await requireEventPermission(
				context.session.user.id,
				input.eventId,
				PERMISSIONS.BUDGET_READ,
			);
			const snapshot = await getBudgetSnapshot(input.eventId);

			return {
				id: null as string | null,
				plannedAmount: centsToUnits(snapshot.totals.totalBudget),
				reserveAmount: centsToUnits(snapshot.totals.reserve),
				notes: null as string | null,
				totals: snapshot.totals,
				breakdown: snapshot.breakdown,
				hasTarget: snapshot.hasTarget,
			};
		}),

	/** Drill-down behind the totals: one line per inventory item and supplier. */
	getLines: protectedProcedure
		.input(
			eventInput.extend({
				source: z.enum(["INVENTORY", "SUPPLIER"]).optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			await requireEventPermission(
				context.session.user.id,
				input.eventId,
				PERMISSIONS.BUDGET_READ,
			);
			const lines = await getBudgetLines(input.eventId);
			const filtered = input.source
				? lines.filter((line) => line.source === input.source)
				: lines;

			return {
				data: filtered.map((line) => ({
					...line,
					planned: centsToUnits(line.planned),
					paid: centsToUnits(line.paid),
					pending: centsToUnits(line.pending),
				})),
				meta: { total: filtered.length },
			};
		}),

	/** Totals + breakdown + analytics, shaped for the dashboard cards. */
	getSummary: protectedProcedure
		.input(eventInput)
		.handler(async ({ context, input }) => {
			await requireEventPermission(
				context.session.user.id,
				input.eventId,
				PERMISSIONS.BUDGET_READ,
			);
			const snapshot = await getBudgetSnapshot(input.eventId);
			return snapshot;
		}),

	/** The planning target. This is the only writable part of the budget. */
	updateTarget: protectedProcedure
		.input(
			eventInput.extend({
				plannedAmount: moneyInput,
				reserveAmount: moneyInput.optional(),
				notes: z.string().trim().optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			await requireEventPermissionMutable(
				context.session.user.id,
				input.eventId,
				PERMISSIONS.BUDGET_UPDATE,
			);

			// The reserve is held back from the target, so it can never exceed it.
			const reserve = input.reserveAmount ?? 0;
			if (reserve > input.plannedAmount) {
				throw new ValidationError(
					"A reserva não pode ultrapassar o valor planeado.",
				);
			}

			const existing = await db.budget.findUnique({
				where: { eventId: input.eventId },
				select: { plannedAmount: true, reserveAmount: true },
			});

			const plannedChanged =
				!existing || toCents(existing.plannedAmount) !== input.plannedAmount;
			const reserveChanged =
				!existing || toCents(existing.reserveAmount) !== reserve;

			const budget = await db.budget.upsert({
				where: { eventId: input.eventId },
				create: {
					eventId: input.eventId,
					plannedAmount: fromCents(input.plannedAmount),
					reserveAmount: fromCents(reserve),
					notes: input.notes,
				},
				update: {
					plannedAmount: fromCents(input.plannedAmount),
					reserveAmount: fromCents(reserve),
					notes: input.notes,
				},
			});

			// Notify every active team member (never the actor) only when the
			// numbers actually changed — updating notes alone is not an action.
			if (plannedChanged || reserveChanged) {
				const [eventMeta, members] = await Promise.all([
					db.event.findUnique({
						where: { id: input.eventId },
						select: { name: true },
					}),
					db.eventMember.findMany({
						where: {
							eventId: input.eventId,
							status: "ACTIVE",
							userId: { not: context.session.user.id },
						},
						select: { user: { select: { email: true, name: true } } },
					}),
				]);

				await Promise.all(
					members
						.filter((member) => member.user.email)
						.map((member) =>
							MailService.sendBudgetChanged({
								to: member.user.email,
								eventName: eventMeta?.name ?? "evento",
								actorName: context.session.user.name,
								plannedCents: input.plannedAmount,
								reserveCents: reserve,
								budgetUrl: eventBudgetPageUrl(input.eventId),
							}),
						),
				);
			}

			return {
				plannedAmount: Number(budget.plannedAmount),
				reserveAmount: Number(budget.reserveAmount ?? 0),
				notes: budget.notes,
			};
		}),

	/**
	 * Gastos do evento ao longo do tempo (dia/mês), agregados no servidor
	 * dentro do período automático do evento. Ver `expense-analytics.ts`.
	 */
	getExpenseAnalytics: protectedProcedure
		.input(eventInput)
		.handler(async ({ context, input }) => {
			await requireEventPermission(
				context.session.user.id,
				input.eventId,
				PERMISSIONS.BUDGET_READ,
			);
			const result = await getExpenseAnalytics(input.eventId);

			return {
				period: result.period,
				daily: result.daily.map((point) => ({
					date: point.date,
					amount: centsToUnits(point.amount),
				})),
				monthly: result.monthly.map((point) => ({
					month: point.month,
					amount: centsToUnits(point.amount),
				})),
			};
		}),

	/**
	 * Saídas financeiras do evento: só os valores efectivamente pagos, agrupados
	 * por serviço/despesa. A série já vem agregada do backend, pronta a grafar.
	 */
	getPaidExpenses: protectedProcedure
		.input(eventInput)
		.handler(async ({ context, input }) => {
			await requireEventPermission(
				context.session.user.id,
				input.eventId,
				PERMISSIONS.BUDGET_READ,
			);
			const expenses = await getPaidExpenses(input.eventId);

			return expenses.map((expense) => ({
				label: expense.label,
				value: centsToUnits(expense.value),
			}));
		}),

	/** Convenience read used by the event detail cards. */
	getStats: protectedProcedure
		.input(eventInput)
		.handler(async ({ context, input }) => {
			await requireEventPermission(
				context.session.user.id,
				input.eventId,
				PERMISSIONS.BUDGET_READ,
			);
			return getBudgetAnalytics(db, input.eventId);
		}),
};
