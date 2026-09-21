import type { FastifyInstance } from "fastify";
import { listResponse, successResponse } from "../../shared/http/response";
import { getPaginationMeta, parsePagination } from "../../shared/utils/helpers";
import {
	VALID_EXPENSE_STATUSES,
	VALID_EXPENSE_TYPES,
	validateEnum,
} from "../../shared/utils/validate-enum";
import {
	createCategorySchema,
	createExpenseSchema,
	createPaymentSchema,
	updateCategorySchema,
	upsertBudgetSchema,
} from "./schemas";
import { BudgetService } from "./service";

export async function budgetRoutes(app: FastifyInstance) {
	app.get("/api/v1/events/:eventId/budget", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { eventId } = request.params as { eventId: string };
		const budget = await BudgetService.getByEventId(eventId, userId);
		return successResponse(budget);
	});

	app.put("/api/v1/events/:eventId/budget", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { eventId } = request.params as { eventId: string };
		const data = upsertBudgetSchema.parse(request.body);
		const budget = await BudgetService.upsert(eventId, userId, data);
		return successResponse(budget);
	});

	app.get("/api/v1/events/:eventId/expenses", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { eventId } = request.params as { eventId: string };
		const query = request.query as Record<string, string>;
		const { page, limit } = parsePagination(query);
		const filters = {
			search: query.search || undefined,
			status: validateEnum(query.status, VALID_EXPENSE_STATUSES),
			type: validateEnum(query.type, VALID_EXPENSE_TYPES),
			vendorId: query.vendorId || undefined,
		};
		const result = await BudgetService.getExpenses(
			eventId,
			{ page, limit },
			filters,
		);
		return listResponse(
			result.data,
			getPaginationMeta(result.total, page, limit),
		);
	});

	app.post("/api/v1/events/:eventId/expenses", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { eventId } = request.params as { eventId: string };
		const data = createExpenseSchema.parse(request.body);
		const expense = await BudgetService.createExpense(eventId, userId, data);
		return reply.status(201).send(successResponse(expense));
	});

	app.post("/api/v1/expenses/:expenseId/payments", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { expenseId } = request.params as { expenseId: string };
		const data = createPaymentSchema.parse(request.body);
		const payment = await BudgetService.createPayment(expenseId, userId, data);
		return reply.status(201).send(successResponse(payment));
	});

	app.post(
		"/api/v1/events/:eventId/budget/categories",
		async (request, reply) => {
			const userId = request.session?.user?.id;
			if (!userId)
				return reply
					.status(401)
					.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
			const { eventId } = request.params as { eventId: string };
			const data = createCategorySchema.parse(request.body);
			const category = await BudgetService.createCategory(eventId, data);
			return reply.status(201).send(successResponse(category));
		},
	);

	app.patch("/api/v1/budget-categories/:id", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { id } = request.params as { id: string };
		const data = updateCategorySchema.parse(request.body);
		const category = await BudgetService.updateCategory(id, data);
		return successResponse(category);
	});

	app.delete("/api/v1/budget-categories/:id", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { id } = request.params as { id: string };
		await BudgetService.deleteCategory(id);
		return reply.status(204).send();
	});
}
