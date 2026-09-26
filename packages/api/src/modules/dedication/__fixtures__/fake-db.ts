import { vi } from "vitest";

/**
 * Minimal in-memory stand-in for the slice of Prisma the dedication module
 * uses, so the authorization chain can be exercised end to end without a
 * database.
 *
 * It is a *test* double, not an ORM: it understands the exact `where` shapes
 * this module emits (equality, `in`, `not`, `contains`, `AND`/`OR`, and `some`
 * over hydrated relations) plus `orderBy`/`skip`/`take`/`groupBy`. `select`
 * and `include` are ignored — rows come back fully hydrated, which the service
 * maps field by field anyway. If the repository starts using a shape this fake
 * does not model, the fake will throw rather than silently return wrong data.
 */

type Row = Record<string, unknown> & { id: string };

type Where = Record<string, unknown>;

const TABLE_KEYS = [
	"user",
	"eventMember",
	"dedication",
	"dedicationViewer",
	"auditLog",
] as const;

type TableKey = (typeof TABLE_KEYS)[number];

type Tables = Record<TableKey, Row[]>;

/** Seed rows may omit `id` and the columns the schema fills in. */
export type SeedRow = Omit<Row, "id"> & { id?: string };

export type SeedTables = Record<TableKey, SeedRow[]>;

/** `groupBy` returns aggregate buckets, not rows. */
type GroupBucket = Record<string, unknown> & { _count: { _all: number } };

function compare(a: unknown, b: unknown): number {
	if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
	if (typeof a === "number" && typeof b === "number") return a - b;
	return String(a).localeCompare(String(b));
}

function matches(row: Row, where: Where | undefined): boolean {
	if (!where) return true;

	for (const [key, condition] of Object.entries(where)) {
		if (key === "AND") {
			const clauses = condition as Where[];
			if (!clauses.every((clause) => matches(row, clause))) return false;
			continue;
		}
		if (key === "OR") {
			const clauses = condition as Where[];
			if (!clauses.some((clause) => matches(row, clause))) return false;
			continue;
		}

		const value = row[key];

		// `some` / `none` / `every` over a hydrated relation list.
		if (
			condition &&
			typeof condition === "object" &&
			!Array.isArray(condition) &&
			Object.keys(condition).some((k) => ["some", "none", "every"].includes(k))
		) {
			const list = Array.isArray(value) ? value : [];
			if (
				"some" in condition &&
				!list.some((c) => matches(c, condition.some as Where))
			)
				return false;
			if (
				"none" in condition &&
				list.some((c) => matches(c, condition.none as Where))
			)
				return false;
			if (
				"every" in condition &&
				!list.every((c) => matches(c, condition.every as Where))
			)
				return false;
			continue;
		}

		// Nested filter on a to-one relation.
		if (
			value &&
			typeof value === "object" &&
			!Array.isArray(value) &&
			!(value instanceof Date) &&
			condition &&
			typeof condition === "object" &&
			!Array.isArray(condition)
		) {
			if (!matches(value as Row, condition as Where)) return false;
			continue;
		}

		if (
			condition &&
			typeof condition === "object" &&
			!Array.isArray(condition)
		) {
			const filter = condition as Record<string, unknown>;
			if ("in" in filter) {
				const list = filter.in as unknown[];
				if (!Array.isArray(list) || !list.includes(value)) return false;
				continue;
			}
			if ("not" in filter) {
				const negated = filter.not;
				if (Array.isArray(negated)) {
					if (negated.includes(value)) return false;
				} else if (value === negated) {
					return false;
				}
				continue;
			}
			if ("contains" in filter) {
				const needle = String(filter.contains);
				const haystack =
					typeof value === "string" ? value : String(value ?? "");
				const found =
					filter.mode === "insensitive"
						? haystack.toLowerCase().includes(needle.toLowerCase())
						: haystack.includes(needle);
				if (!found) return false;
				continue;
			}
			throw new Error(`fake-db: unsupported filter for "${key}"`);
		}

		if (value !== condition) return false;
	}

	return true;
}

function applyOrderBy(rows: Row[], orderBy: unknown): Row[] {
	if (!orderBy) return rows;
	const clauses = Array.isArray(orderBy) ? orderBy : [orderBy];
	return [...rows].sort((a, b) => {
		for (const clause of clauses) {
			const entries = Object.entries(clause as Record<string, string>);
			for (const [key, direction] of entries) {
				const result = compare(a[key], b[key]);
				if (result !== 0) return direction === "desc" ? -result : result;
			}
		}
		return 0;
	});
}

/** Columns the schema fills in for every row, so seeded rows match created ones. */
const ROW_DEFAULTS: Record<string, unknown> = {
	createdAt: new Date(),
	updatedAt: new Date(),
	lastOpenedAt: null,
};

let autoId = 0;
let transactionDepth = 0;

export function createFakeDb(seed: Partial<SeedTables> = {}) {
	const normalize = (row: SeedRow): Row => {
		const id = row.id ?? `seed_${++autoId}`;
		return { ...ROW_DEFAULTS, ...row, id } as Row;
	};
	const tables: Tables = {
		user: (seed.user ?? []).map(normalize),
		eventMember: (seed.eventMember ?? []).map(normalize),
		dedication: (seed.dedication ?? []).map(normalize),
		dedicationViewer: (seed.dedicationViewer ?? []).map(normalize),
		auditLog: (seed.auditLog ?? []).map(normalize),
	};

	/**
	 * Attaches the related rows the `where` clauses traverse. Filtering happens
	 * on hydrated rows, so relation predicates such as
	 * `viewers: { some: { eventMember: { userId } } }` resolve to real data.
	 */
	function hydrate(table: TableKey, row: Row): Row {
		const out = { ...row };
		if (table === "dedication") {
			out.owner = tables.user.find((u) => u.id === row.ownerId) ?? null;
			out.viewers = tables.dedicationViewer
				.filter((v) => v.dedicationId === row.id)
				.map((v) => hydrate("dedicationViewer", v));
		}
		if (table === "dedicationViewer") {
			const member = tables.eventMember.find((m) => m.id === row.eventMemberId);
			out.eventMember = member ? hydrate("eventMember", member) : null;
			const dedication = tables.dedication.find(
				(d) => d.id === row.dedicationId,
			);
			// Shallow on purpose: the full relation graph is cyclic
			// (dedication → viewers → dedication) and the only consumer of this
			// back-reference just needs the owning event id.
			out.dedication = dedication
				? { id: dedication.id, eventId: dedication.eventId }
				: null;
		}
		if (table === "eventMember") {
			out.user = tables.user.find((u) => u.id === row.userId) ?? null;
		}
		if (table === "auditLog") {
			out.user = tables.user.find((u) => u.id === row.userId) ?? null;
		}
		return out;
	}

	function find(table: TableKey, where?: Where): Row[] {
		return tables[table]
			.map((row) => hydrate(table, row))
			.filter((row) => matches(row, where));
	}

	function findOne(table: TableKey, where?: Where): Row | null {
		return find(table, where)[0] ?? null;
	}

	function insert(table: TableKey, data: Partial<Row>): Row {
		autoId += 1;
		const row: Row = normalize({
			...data,
			id: (data.id as string) ?? `${table}_${autoId}`,
		});
		tables[table].push(row);
		return hydrate(table, row);
	}

	/**
	 * Mirrors the schema's `onDelete: Cascade` foreign keys, so tests can assert
	 * that deleting a dedication also revokes its viewer grants.
	 */
	const CASCADES: Partial<Record<TableKey, { table: TableKey; fk: string }[]>> =
		{
			dedication: [{ table: "dedicationViewer", fk: "dedicationId" }],
			dedicationViewer: [],
			eventMember: [{ table: "dedicationViewer", fk: "eventMemberId" }],
		};

	function applyCascades(table: TableKey, id: string) {
		for (const cascade of CASCADES[table] ?? []) {
			tables[cascade.table] = tables[cascade.table].filter(
				(row) => row[cascade.fk] !== id,
			);
		}
	}

	function patch(table: TableKey, where: Where, data: Partial<Row>): Row {
		const row = tables[table].find((candidate) => matches(candidate, where));
		if (!row)
			throw new Error(`fake-db: no ${table} matches ${JSON.stringify(where)}`);
		Object.assign(row, data, { updatedAt: new Date() });
		return hydrate(table, row);
	}

	function remove(table: TableKey, where: Where): Row {
		const index = tables[table].findIndex((candidate) =>
			matches(candidate, where),
		);
		if (index === -1)
			throw new Error(`fake-db: no ${table} matches ${JSON.stringify(where)}`);
		const [row] = tables[table].splice(index, 1);
		applyCascades(table, (row as Row).id);
		return hydrate(table, row as Row);
	}

	function page(rows: Row[], args: { skip?: number; take?: number }): Row[] {
		const skip = args.skip ?? 0;
		return rows.slice(skip, args.take ? skip + args.take : undefined);
	}

	const db = {
		/**
		 * Real `TransactionClient` has no `$transaction`, so nesting is a runtime
		 * crash in production. Recursion here would silently mask that class of bug,
		 * so it is rejected loudly instead.
		 */
		$transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
			transactionDepth += 1;
			if (transactionDepth > 1) {
				// Balance the counter before throwing, otherwise the depth leaks and
				// every later test fails for an unrelated reason.
				transactionDepth -= 1;
				throw new Error(
					"fake-db: nested $transaction — Prisma TransactionClient cannot open one",
				);
			}
			try {
				return await fn(db);
			} finally {
				transactionDepth -= 1;
			}
		}),

		user: {
			findMany: vi.fn(async (args: { where?: Where } = {}) =>
				find("user", args.where),
			),
			findUnique: vi.fn(async (args: { where: Where }) =>
				findOne("user", args.where),
			),
		},

		eventMember: {
			findMany: vi.fn(
				async (
					args: {
						where?: Where;
						orderBy?: unknown;
						skip?: number;
						take?: number;
					} = {},
				) =>
					page(
						applyOrderBy(find("eventMember", args.where), args.orderBy),
						args,
					),
			),
			findFirst: vi.fn(async (args: { where?: Where } = {}) =>
				findOne("eventMember", args.where),
			),
			findUnique: vi.fn(async (args: { where: Where }) =>
				findOne("eventMember", args.where),
			),
		},

		dedication: {
			findMany: vi.fn(
				async (
					args: {
						where?: Where;
						orderBy?: unknown;
						skip?: number;
						take?: number;
					} = {},
				) =>
					page(
						applyOrderBy(find("dedication", args.where), args.orderBy),
						args,
					),
			),
			findFirst: vi.fn(async (args: { where?: Where } = {}) =>
				findOne("dedication", args.where),
			),
			count: vi.fn(
				async (args: { where?: Where } = {}) =>
					find("dedication", args.where).length,
			),
			groupBy: vi.fn(async (args: { by: string[]; where?: Where }) => {
				const buckets = new Map<string, GroupBucket>();
				for (const row of find("dedication", args.where)) {
					const key = args.by.map((field) => String(row[field])).join("|");
					const existing = buckets.get(key);
					if (existing) {
						existing._count = { _all: existing._count._all + 1 };
					} else {
						buckets.set(key, {
							...Object.fromEntries(args.by.map((f) => [f, row[f]])),
							_count: { _all: 1 },
						});
					}
				}
				return [...buckets.values()];
			}),
			create: vi.fn(async (args: { data: Partial<Row> }) =>
				insert("dedication", args.data),
			),
			update: vi.fn(async (args: { where: Where; data: Partial<Row> }) =>
				patch("dedication", args.where, args.data),
			),
			delete: vi.fn(async (args: { where: Where }) =>
				remove("dedication", args.where),
			),
		},

		dedicationViewer: {
			findMany: vi.fn(async (args: { where?: Where; orderBy?: unknown } = {}) =>
				applyOrderBy(find("dedicationViewer", args.where), args.orderBy),
			),
			findFirst: vi.fn(async (args: { where?: Where } = {}) =>
				findOne("dedicationViewer", args.where),
			),
			create: vi.fn(async (args: { data: Partial<Row> }) =>
				insert("dedicationViewer", args.data),
			),
			update: vi.fn(async (args: { where: Where; data: Partial<Row> }) =>
				patch("dedicationViewer", args.where, args.data),
			),
			delete: vi.fn(async (args: { where: Where }) =>
				remove("dedicationViewer", args.where),
			),
			deleteMany: vi.fn(async (args: { where?: Where } = {}) => {
				const doomed = find("dedicationViewer", args.where);
				tables.dedicationViewer = tables.dedicationViewer.filter(
					(row) => !doomed.some((d) => d.id === row.id),
				);
				return { count: doomed.length };
			}),
		},

		auditLog: {
			findMany: vi.fn(
				async (
					args: { where?: Where; orderBy?: unknown; take?: number } = {},
				) => {
					const rows = applyOrderBy(find("auditLog", args.where), args.orderBy);
					return args.take ? rows.slice(0, args.take) : rows;
				},
			),
			create: vi.fn(async (args: { data: Partial<Row> }) =>
				insert("auditLog", { oldData: null, newData: null, ...args.data }),
			),
		},
	};

	return { db, tables };
}
