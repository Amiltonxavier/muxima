import db from "@muxima/db";
import { z } from "zod";

import { protectedProcedure } from "../index";
import {
	getBudgetLines,
	getBudgetSnapshot,
} from "../modules/budget/repository";
import { requireEventAccess } from "../shared/auth/event-access";
import { centsToUnits, fromCents } from "../shared/finance/money";

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
			await requireEventAccess(context.session.user.id, input.eventId);
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
			await requireEventAccess(context.session.user.id, input.eventId);
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
			await requireEventAccess(context.session.user.id, input.eventId);
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
			await requireEventAccess(context.session.user.id, input.eventId);

			// The reserve is held back from the target, so it can never exceed it.
			const reserve = input.reserveAmount ?? 0;
			if (reserve > input.plannedAmount) {
				throw new Error("A reserva não pode ultrapassar o valor planeado.");
			}

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

			return {
				plannedAmount: Number(budget.plannedAmount),
				reserveAmount: Number(budget.reserveAmount ?? 0),
				notes: budget.notes,
			};
		}),

	/** Convenience read used by the event detail cards. */
	getStats: protectedProcedure
		.input(eventInput)
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			const { totals } = await getBudgetSnapshot(input.eventId);

			return {
				totalBudget: centsToUnits(totals.totalBudget),
				reserve: centsToUnits(totals.reserve),
				available: centsToUnits(totals.available),
				planned: centsToUnits(totals.planned),
				spent: centsToUnits(totals.spent),
				pending: centsToUnits(totals.pending),
				overdue: centsToUnits(totals.overdue),
				remaining: centsToUnits(totals.remaining),
				usagePercentage: totals.usagePercentage,
				paymentPercentage: totals.paymentPercentage,
				currency: totals.currency,
			};
		}),
};
