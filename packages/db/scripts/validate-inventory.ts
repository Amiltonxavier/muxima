/**
 * Validates the inventory module end-to-end against the database in
 * DATABASE_URL: list (pagination/filters/search/empty), getStats, CRUD,
 * movements/history and mapping of REAL Prisma errors (P2025/P2002).
 *
 * Run: pnpm exec tsx scripts/validate-inventory.ts
 * A temporary event is created and removed (cascade) — dev data is untouched.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import { PrismaClient } from "../prisma/generated/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({
	path: path.resolve(__dirname, "../../../apps/server/.env"),
	// never override an externally provided DATABASE_URL (clean-DB runs)
	override: false,
});

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const { InventoryService } = await import(
	"../../api/src/modules/inventory/service"
);
const { mapError } = await import("../../api/src/shared/errors/map-error");

let failures = 0;
function check(label: string, condition: boolean, extra?: unknown) {
	if (condition) {
		console.log(`  ✅ ${label}`);
	} else {
		failures++;
		console.error(`  ❌ ${label}`, extra ?? "");
	}
}

// ── 1. list on an event WITH data ─────────────────────────────────
console.log("\n1) inventory/list (evento com dados)");
const seededItem = await db.inventoryItem.findFirst();
const eventWithItems = seededItem?.eventId ?? null;

if (eventWithItems) {
	const page1 = await InventoryService.list(db, eventWithItems, {
		page: 1,
		limit: 2,
	});
	check("retorna itens sem P2022", page1.data.length > 0 && page1.total > 0);
	const first = page1.data[0];
	check(
		"mapeia venueQuantity/status no DTO",
		first !== undefined && "venueQuantity" in first && "status" in first,
	);
	check("limit respeitado", page1.data.length <= 2);

	const filtered = await InventoryService.list(
		db,
		eventWithItems,
		{
			page: 1,
			limit: 10,
		},
		{ search: "a" },
	);
	check("filtros/search não lançam erro", Array.isArray(filtered.data));

	const statusFiltered = await InventoryService.list(
		db,
		eventWithItems,
		{
			page: 1,
			limit: 10,
		},
		{ status: "PENDING" },
	);
	check("filtro por status funciona", Array.isArray(statusFiltered.data));
} else {
	console.log("  (sem itens no seed — a continuar)");
}

// ── 2. list on an event WITHOUT data (resposta vazia) ─────────────
console.log("\n2) inventory/list (resposta vazia)");
const empty = await InventoryService.list(db, "evt_does_not_exist", {
	page: 1,
	limit: 20,
});
check("data=[] e total=0", empty.data.length === 0 && empty.total === 0);

// ── 3. getStats ───────────────────────────────────────────────────
console.log("\n3) inventory/getStats");
if (eventWithItems) {
	const stats = await InventoryService.getStats(db, eventWithItems);
	check(
		"estatísticas calculadas no backend",
		stats.totalItems > 0 &&
			typeof stats.completionPercentage === "number" &&
			typeof stats.totalValue === "number" &&
			typeof stats.totalVenue === "number",
		stats,
	);
	const metrics = await db.inventoryItem.findMany({
		where: { eventId: eventWithItems },
		select: { status: true, venueQuantity: true },
	});
	check(
		"colunas status/venueQuantity legíveis no banco",
		metrics.every((m) => typeof m.status === "string"),
	);
}
const emptyStats = await InventoryService.getStats(db, "evt_does_not_exist");
check(
	"evento sem inventory devolve zeros",
	emptyStats.totalItems === 0 &&
		emptyStats.totalValue === 0 &&
		emptyStats.completionPercentage === 0,
);

// ── 4. CRUD completo ──────────────────────────────────────────────
console.log("\n4) inventory CRUD");
const owner = await db.user.findFirst();
if (!owner) throw new Error("Sem utilizador na base para o teste");

const testEvent = await db.event.create({
	data: {
		id: "evt_validate_tmp",
		ownerId: owner.id,
		name: "Validação temporária (removido automaticamente)",
		type: "PARTY",
	},
});

try {
	const created = await InventoryService.create(db, testEvent.id, owner.id, {
		name: "Item de validação",
		category: "DRINK",
		unit: "BOTTLE",
		plannedQuantity: 10,
		currentQuantity: 4,
		venueQuantity: 3,
		unitPrice: 1000,
	});
	check(
		"create devolve DTO completo",
		created.status === "IN_PROGRESS" &&
			created.venueQuantity === 3 &&
			created.completionPercentage === 40,
		created,
	);
	check(
		"movimento inicial registado",
		(await db.inventoryMovement.count({
			where: { inventoryItemId: created.id },
		})) === 1,
	);

	const fetched = await InventoryService.getById(db, created.id);
	check("getById funciona", fetched.id === created.id);

	const updated = await InventoryService.update(db, created.id, {
		plannedQuantity: 10,
		venueQuantity: 5,
	});
	check("update funciona", updated.venueQuantity === 5);

	const movement = await InventoryService.addMovement(
		db,
		created.id,
		owner.id,
		{
			type: "ADD",
			quantity: 6,
		},
	);
	check("addMovement atualiza quantidade", movement.quantity === 6);

	const itemAfter = await InventoryService.getById(db, created.id);
	check(
		"status recalculado para COMPLETED",
		itemAfter.currentQuantity === 10 && itemAfter.status === "COMPLETED",
		itemAfter,
	);

	const history = await InventoryService.getHistory(db, created.id);
	check(
		"histórico calculado no backend",
		history.movements.length === 2 && history.totals.totalEntered === 10,
		history.totals,
	);

	const listed = await InventoryService.list(db, testEvent.id, {
		page: 1,
		limit: 10,
	});
	check("list do evento de teste", listed.total === 1);

	await InventoryService.delete(db, created.id);
	check(
		"delete remove o item",
		(await db.inventoryItem.count({
			where: { id: created.id },
		})) === 0,
	);
} finally {
	await db.event.delete({ where: { id: testEvent.id } }).catch(() => undefined);
	check(
		"evento temporário removido",
		(await db.event.findUnique({ where: { id: testEvent.id } })) === null,
	);
}

// ── 5. Mapeamento de erros Prisma REAIS ───────────────────────────
console.log("\n5) tratamento centralizado de erros Prisma");

// P2025 — update de registo inexistente
try {
	await db.inventoryItem.update({
		where: { id: "inv_nonexistent_xyz" },
		data: { name: "x" },
	});
	check("P2025 lançado", false);
} catch (error) {
	const mapped = mapError(error);
	check(
		"P2025 → 404 NOT_FOUND seguro",
		mapped.statusCode === 404 &&
			mapped.code === "NOT_FOUND" &&
			!mapped.message.includes("inventory_item"),
		mapped,
	);
}

// P2002 — violação de unique (email do utilizador)
try {
	await db.user.create({
		data: {
			id: "usr_validate_tmp",
			name: "Duplicado",
			email: (await db.user.findFirstOrThrow()).email,
		},
	});
	check("P2002 lançado", false);
} catch (error) {
	const mapped = mapError(error);
	check(
		"P2002 → 409 CONFLICT sem expor o campo",
		mapped.statusCode === 409 &&
			mapped.code === "CONFLICT" &&
			!mapped.message.includes("email"),
		mapped,
	);
}

// P2022 — mensagem friendly sem detalhes internos (simulado no unit test,
// aqui validamos que o mapper devolve o texto exigido para o código):
const fakeP2022 = Object.assign(
	new Error("The column `inventory_item.venueQuantity` does not exist"),
	{ name: "PrismaClientKnownRequestError", code: "P2022" },
);
const mapped2022 = mapError(fakeP2022);
check(
	"P2022 → 500 com mensagem amigável (sem colunas/paths)",
	mapped2022.statusCode === 500 &&
		mapped2022.message ===
			"Não foi possível carregar os dados devido a um problema de configuração. Tente novamente ou contacte o administrador." &&
		!mapped2022.message.includes("venueQuantity"),
);

// NotFoundError do serviço passa tal e qual
const { NotFoundError } = await import("../../api/src/shared/errors/app-error");
const nf = new NotFoundError("Item de inventário não encontrado");
check("AppError preservada", mapError(nf) === nf);

await db.$disconnect();

if (failures > 0) {
	console.error(`\n❌ ${failures} verificação(ões) falharam`);
	process.exit(1);
}
console.log("\n✅ Todas as verificações passaram");
