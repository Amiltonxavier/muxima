/**
 * One-off login smoke test for the seeded accounts. Runs the real Better Auth
 * instance from @muxima/auth against the seeded database, exercising the full
 * credential path: user lookup by email → credential account lookup
 * (providerId/issuer/accountId) → scrypt verification → session creation
 * (including the LOGIN activity-log database hook).
 *
 * The created session is deleted afterwards, so the test leaves no residue.
 *
 * Run: npx tsx packages/db/scripts/login-smoke-test.ts
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import { PrismaClient } from "../prisma/generated/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../apps/server/.env") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL não definida no ambiente.");
const prisma = new PrismaClient({
	adapter: new PrismaPg({ connectionString: databaseUrl }),
});

// @muxima/auth is not a dependency of @muxima/db, so the project's real
// Better Auth instance is loaded by path — dynamically, only after dotenv
// has populated the environment the `@muxima/env/server` schema validates.
const { auth } = await import("../../auth/src/index");

const ACCOUNTS = [
	{ email: "amilton.seed@muxima.test", password: "Muxima@2026Seed01" },
	{ email: "ana.seed@muxima.test", password: "Muxima@2026Seed02" },
	{ email: "carlos.seed@muxima.test", password: "Muxima@2026Seed03" },
	{ email: "maria.seed@muxima.test", password: "Muxima@2026Seed04" },
	{ email: "joao.seed@muxima.test", password: "Muxima@2026Seed05" },
	{ email: "isabel.seed@muxima.test", password: "Muxima@2026Seed06" },
];

async function main() {
	let failures = 0;
	for (const account of ACCOUNTS) {
		const result = await auth.api.signInEmail({
			body: { email: account.email, password: account.password },
		});

		if (!result?.user || !result.token) {
			console.error(`  ❌ ${account.email}: login failed`);
			failures += 1;
			continue;
		}

		console.log(
			`  ✅ ${account.email} → session ${result.token.slice(0, 8)}… (user ${result.user.id}, ${result.user.name})`,
		);
		// Leave no residue: the session (and its activity log row) is removed.
		await prisma.session.delete({ where: { token: result.token } });
		await prisma.activityLog.deleteMany({
			where: { userId: result.user.id, action: "LOGIN" },
		});
	}

	if (failures > 0) {
		throw new Error(`${failures} login(s) failed`);
	}
	console.log("\n🔐 Login test: OK (6/6)");
}

main()
	.catch((e) => {
		console.error("❌ Login smoke test failed:", e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
