/**
 * Set (reset) a user's credential password directly in the database.
 *
 * The new hash uses Better Auth's exact scrypt parameters
 * (N=16384, r=16, p=1, dkLen=64, NFKC) stored as `salt:key` hex — the same
 * format `verifyPassword` expects — so sign-in works immediately.
 *
 * Run: npx tsx packages/db/scripts/set-user-password.ts <email> <new-password>
 */
import { scrypt as nodeScrypt, randomBytes } from "node:crypto";
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

function scryptAsync(password: string, salt: string): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		nodeScrypt(
			password.normalize("NFKC"),
			salt,
			64,
			{ N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 },
			(err, key) => (err ? reject(err) : resolve(key)),
		);
	});
}

async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16).toString("hex");
	const key = await scryptAsync(password, salt);
	return `${salt}:${key.toString("hex")}`;
}

async function main() {
	const [email, newPassword] = process.argv.slice(2);
	if (!email || !newPassword) {
		throw new Error(
			"Uso: npx tsx packages/db/scripts/set-user-password.ts <email> <nova-senha>",
		);
	}

	const user = await prisma.user.findUnique({ where: { email } });
	if (!user) throw new Error(`Utilizador não encontrado: ${email}`);

	const password = await hashPassword(newPassword);
	const account = await prisma.account.updateMany({
		where: { userId: user.id, providerId: "credential" },
		data: { password },
	});

	if (account.count === 0) {
		// No credential account yet (e.g. the row was pruned): recreate it
		// exactly as Better Auth stores it — issuer `local:credential`,
		// accountId = user id — so sign-in works right away.
		await prisma.account.create({
			data: {
				id: `acct_${randomBytes(12).toString("hex")}`,
				issuer: "local:credential",
				accountId: user.id,
				providerId: "credential",
				userId: user.id,
				password,
			},
		});
		console.log(`✅ Conta de credenciais criada e senha de ${email} definida.`);
	} else {
		console.log(`✅ Senha de ${email} (${user.id}) atualizada.`);
	}
}

main()
	.catch((e) => {
		console.error("❌ Falha ao trocar a senha:", e.message ?? e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
