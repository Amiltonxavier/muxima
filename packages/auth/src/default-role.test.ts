import { ROLE_DESCRIPTIONS } from "@muxima/permissions";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createUserCreateHook,
	ensureDefaultRole,
	roleIdAdditionalField,
} from "./default-role";

/**
 * Sign-up assigns the default role.
 *
 * The bug this covers: registration only wrote `user` + `account`, and every
 * role in the system was event-scoped (`EventMember`), so a brand-new user had
 * no role at all until they created their first event. These tests exercise
 * the REAL hook through a REAL Better Auth sign-up (in-memory adapter — the
 * same code path production uses, minus Prisma and SMTP) and then assert the
 * production instance in `./index` is actually wired to it.
 */

const EMAIL = "ana@muxima.test";
const PASSWORD = "SenhaForte123";

/** Role store double, shared with the `@muxima/db` mock below. */
const { roleUpsert, prisma } = vi.hoisted(() => {
	const roleUpsert = vi.fn(
		async (args: {
			where: { name: string };
			update: unknown;
			create: { name: string; description: string };
		}) => ({
			id: `rol_${args.where.name}`,
			name: args.where.name,
			description: args.create.description,
		}),
	);
	const roleStore = { role: { upsert: roleUpsert } };
	return { roleUpsert, prisma: roleStore };
});

// The module under test only touches the database through the client it is
// given — the same instance `createAuth()` passes in production.
vi.mock("@muxima/db", () => ({
	createPrismaClient: () => prisma,
	default: prisma,
}));

type UserRow = {
	id: string;
	name: string;
	email: string;
	roleId?: string | null;
};

function createWorld() {
	const db: Record<string, unknown[]> = {
		user: [],
		session: [],
		account: [],
		verification: [],
	};

	const auth = betterAuth({
		baseURL: "http://localhost:3000",
		secret: "test-secret-test-secret-test-secret-32",
		database: memoryAdapter(db),
		emailAndPassword: { enabled: true },
		user: { additionalFields: { ...roleIdAdditionalField } },
		databaseHooks: {
			user: { create: { before: createUserCreateHook(prisma as never) } },
		},
	});

	return {
		auth,
		/** Read lazily: Better Auth initialises its tables on first write. */
		get users() {
			return db.user as UserRow[];
		},
		signUp: (overrides: Record<string, string> = {}) =>
			auth.api.signUpEmail({
				body: {
					name: "Ana",
					email: EMAIL,
					password: PASSWORD,
					...overrides,
				} as never,
			}),
	};
}

beforeEach(() => {
	roleUpsert.mockClear();
});

describe("default role at sign-up", () => {
	it("assigns and persists the USER role on the created user row", async () => {
		const world = createWorld();

		await world.signUp();

		expect(world.users).toHaveLength(1);
		expect(world.users[0]?.roleId).toBe("rol_USER");
		expect(roleUpsert).toHaveBeenCalledWith({
			where: { name: "USER" },
			// Idempotent: the hot path must never rewrite an existing row.
			update: {},
			create: { name: "USER", description: ROLE_DESCRIPTIONS.USER },
		});
	});

	it("never lets the client choose the role", async () => {
		// `input: false` makes Better Auth REJECT the field outright: the
		// payload never reaches the hook, let alone the database, so a client
		// asking for `rol_OWNER` gets a 400 instead of a privilege.
		const world = createWorld();

		await expect(world.signUp({ roleId: "rol_OWNER" })).rejects.toThrow(
			/roleId is not allowed to be set/,
		);
		expect(world.users).toHaveLength(0);
	});

	it("resolves the role through an idempotent upsert", async () => {
		// An unseeded database must not race into a P2002 on the first two
		// sign-ups: `role.name` is unique and Prisma's upsert is the
		// database's `ON CONFLICT` on PostgreSQL.
		const role = await ensureDefaultRole(prisma as never);

		expect(role.id).toBe("rol_USER");
		expect(roleUpsert).toHaveBeenCalledWith(
			expect.objectContaining({ where: { name: "USER" } }),
		);
	});
});

describe("createAuth() wiring", () => {
	it("registers the read-only roleId field and the user.create hook", async () => {
		const { auth } = await import("./index");
		const options = (
			auth as unknown as {
				options: {
					user?: {
						additionalFields?: Record<
							string,
							{ input?: boolean; required?: boolean }
						>;
					};
					databaseHooks?: {
						user?: {
							create?: {
								before?: (
									user: Record<string, unknown>,
									context: null,
								) => Promise<{ data: Record<string, unknown> }>;
							};
						};
					};
				};
			}
		).options;

		expect(options.user?.additionalFields?.roleId).toMatchObject({
			input: false,
			required: false,
		});

		const before = options.databaseHooks?.user?.create?.before;
		expect(before).toBeTypeOf("function");

		// The REAL hook, taken from the production instance, must attach the
		// default role's id to the row being created.
		const result = await before?.(
			{
				id: "usr_new",
				name: "Novo",
				email: "novo@muxima.test",
				emailVerified: false,
			},
			null,
		);

		expect(result).toMatchObject({ data: { roleId: "rol_USER" } });
	});
});
