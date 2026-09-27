/**
 * Prisma Seed Script — Muxima
 *
 * Populates the database with a deterministic, realistic dataset:
 * exactly 40 events (30 weddings + 10 engagements) with full relational data
 * across every module (members, budget targets, suppliers with their payments
 * and installments, food plan, checklist, guests, tables, tasks, schedules,
 * inventory, documents, notifications, audits).
 *
 * Idempotent: deletes the seeded rows and recreates them — safe to re-run
 * without a `db reset` (or with `pnpm db:reset`, which forces a full wipe).
 *
 * Capacity invariants enforced:
 *   - confirmedGuests + confirmedCompanions <= event.capacity
 *   - sum(table.capacity) <= event.capacity
 *   - DECLINED guests never get companions
 *
 * Run: npx tsx packages/db/prisma/seed.ts
 */

import { scrypt as nodeScrypt, randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
// Prisma 7 does not re-export the enums through the `Prisma` namespace, so
// they are imported by name from the generated client.
import {
	type ChecklistStatus,
	type CompanionStatus,
	type FoodPlanCategory,
	type FoodPlanStatus,
	type FoodPlanUnit,
	type GuestInvitationStatus,
	type InventoryCategory,
	type InventoryStatus,
	type InventoryUnit,
	type MemberRole,
	type MemberStatus,
	type NotificationType,
	type Prisma,
	PrismaClient,
	type RsvpStatus,
	type ScheduleStatus,
	type SupplierCategory,
	SupplierPaymentModel,
	type SupplierPaymentStatus,
	type SupplierStatus,
	type TaskCategory,
	type TaskStatus,
} from "../prisma/generated/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({
	// Overwrite nothing: allow an externally provided DATABASE_URL (CI/clean
	// DB runs) to win over the one baked into apps/server/.env.
	path: path.resolve(__dirname, "../../../apps/server/.env"),
	override: false,
});

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL não definida no ambiente.");
const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

// ── Timestamps ──────────────────────────────────────────────────────
const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);
const daysAhead = (d: number) => new Date(now.getTime() + d * 86_400_000);
const monthsAgo = (m: number) => {
	const d = new Date(now);
	d.setMonth(d.getMonth() - m);
	return d;
};
const monthsAhead = (m: number) => {
	const d = new Date(now);
	d.setMonth(d.getMonth() + m);
	return d;
};
const pad = (n: number, len = 3) => String(n).padStart(len, "0");

// Marker used in generated ids so seeded rows are recognizable.
const SEED_PREFIX = "seed";

// Password partilhada por todos os utilizadores de seed (Better Auth,
// provider "credential"). O hash fica na tabela `account` (scrypt
// `salt:key` hex) — formato usado pelo `verifyPassword` do better-auth.
const SEED_PASSWORD = "Muxima@2024";

/**
 * The salt is the hex string stored in the credential, exactly like better-auth
 * builds it, so the salt is passed to scrypt as a string and not as bytes:
 * re-hashing the same password with the stored salt has to reproduce the key.
 */
function scryptAsync(
	password: string,
	salt: string,
	keylen: number,
): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		nodeScrypt(
			password,
			salt,
			keylen,
			{ N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 },
			(err, key) => (err ? reject(err) : resolve(key)),
		);
	});
}

async function hashSeedPassword(password: string) {
	const salt = randomBytes(16).toString("hex");
	const key = await scryptAsync(password.normalize("NFKC"), salt, 64);
	return `${salt}:${key.toString("hex")}`;
}

// ── Deterministic PRNG (mulberry32) ────────────────────────────────
type Rng = () => number;
function mulberry32(seed: number): Rng {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
const pick = <T>(rng: Rng, arr: readonly T[]): T =>
	arr[Math.floor(rng() * arr.length)] as T;
const randInt = (rng: Rng, min: number, max: number) =>
	Math.floor(rng() * (max - min + 1)) + min;

// ── Name pools (realistic PT / Angolan) ────────────────────────────
const MALE_NAMES = [
	"António",
	"Carlos",
	"João",
	"José",
	"Manuel",
	"Francisco",
	"Pedro",
	"Miguel",
	"Rui",
	"Paulo",
	"André",
	"Tiago",
	"Bruno",
	"Ricardo",
	"Jorge",
	"Nuno",
	"David",
	"Diogo",
	"Fábio",
	"Hélder",
	"Domingos",
	"Eduardo",
	"Wilson",
	"Nelson",
	"Valter",
	"Adilson",
	"Edson",
	"Cláudio",
	"Délcio",
	"Katito",
	"Mavungo",
	"Samuel",
	"Bernardo",
	"Garcia",
	"Nelo",
] as const;

const FEMALE_NAMES = [
	"Ana",
	"Maria",
	"Beatriz",
	"Carlota",
	"Catarina",
	"Inês",
	"Sofia",
	"Mariana",
	"Leonor",
	"Teresa",
	"Madalena",
	"Isabel",
	"Joana",
	"Rita",
	"Marisa",
	"Lúcia",
	"Filomena",
	"Esperança",
	"Graça",
	"Fátima",
	"Amélia",
	"Cecília",
	"Domingas",
	"Felismina",
	"Lurdes",
	"Neusa",
	"Quissola",
	"Rute",
	"Telma",
	"Verónica",
	"Yolanda",
	"Zulmira",
	"Etelvina",
	"Vera",
] as const;

const SURNAMES = [
	"Fernandes",
	"Mendes",
	"Santos",
	"Costa",
	"Almeida",
	"Silva",
	"Ferreira",
	"Oliveira",
	"Rodrigues",
	"Martins",
	"Pereira",
	"Lopes",
	"Sousa",
	"Nascimento",
	"Tavares",
	"Moreira",
	"Correia",
	"Miranda",
	"Monteiro",
	"Cardoso",
	"Carvalho",
	"Baptista",
	"Gomes",
	"Domingos",
	"João",
	"Manuel",
	"Kiala",
	"Luemba",
	"Sousa Júnior",
	"Ndala",
	"Cahy",
] as const;

// ── Venues ─────────────────────────────────────────────────────────
interface Venue {
	name: string;
	address: string;
	province: string;
	municipality: string;
	neighborhood: string;
	reference: string;
	lat: number;
	lng: number;
}

const VENUES: Venue[] = [
	{
		name: "Convento de São Francisco",
		address: "Rua Major Kanhangulo",
		province: "Luanda",
		municipality: "Luanda",
		neighborhood: "Maianga",
		reference: "Próximo ao Hospital Central",
		lat: -8.8399,
		lng: 13.2894,
	},
	{
		name: "Clube Mineiro",
		address: "Rua dos Enganos",
		province: "Luanda",
		municipality: "Luanda",
		neighborhood: "Miramar",
		reference: "Vista para a Baía de Luanda",
		lat: -8.8087,
		lng: 13.2236,
	},
	{
		name: "Quinta do Mussulo",
		address: "Estrada da Samba",
		province: "Luanda",
		municipality: "Belas",
		neighborhood: "Benfica",
		reference: "Santuário São João Batista",
		lat: -8.9187,
		lng: 13.1331,
	},
	{
		name: "Espaço Belas Clube",
		address: "Avenida 21 de Janeiro",
		province: "Luanda",
		municipality: "Belas",
		neighborhood: "Talatona",
		reference: "Ao lado da Igreja N. S. da Paz",
		lat: -8.9043,
		lng: 13.2012,
	},
	{
		name: "Palácio da Ferrovia",
		address: "Rotunda do Maculusso",
		province: "Luanda",
		municipality: "Luanda",
		neighborhood: "Maculusso",
		reference: "Junto ao Kinaxixi",
		lat: -8.8231,
		lng: 13.2369,
	},
	{
		name: "Jardim dos Namorados",
		address: "Avenida Marginal",
		province: "Luanda",
		municipality: "Luanda",
		neighborhood: "Ilha de Luanda",
		reference: "Praia dos Namorados",
		lat: -8.7983,
		lng: 13.2263,
	},
	{
		name: "Clube Ferroviário do Lobito",
		address: "Rua do Comércio",
		province: "Benguela",
		municipality: "Lobito",
		neighborhood: "Companhia",
		reference: "Marginal do Lobito",
		lat: -12.3644,
		lng: 13.536,
	},
	{
		name: "Hotel Tropical Benguela",
		address: "Rua da Praia",
		province: "Benguela",
		municipality: "Benguela",
		neighborhood: "Praia Morena",
		reference: "Centro da cidade",
		lat: -12.5763,
		lng: 13.4056,
	},
	{
		name: "Chotter Residence",
		address: "Estrada da Caponte",
		province: "Benguela",
		municipality: "Benguela",
		neighborhood: "Caponte",
		reference: "Vila Paciência",
		lat: -12.5661,
		lng: 13.4101,
	},
	{
		name: "Espaço Kwanza Sul",
		address: "Rua da Canata",
		province: "Huambo",
		municipality: "Huambo",
		neighborhood: "Calumbo",
		reference: "Saída para o Bailundo",
		lat: -12.7761,
		lng: 15.7392,
	},
	{
		name: "Quinta Vista Alegre",
		address: "Bairro Cambiore",
		province: "Huambo",
		municipality: "Huambo",
		neighborhood: "Cambiore",
		reference: "Estrada do Aeroporto",
		lat: -12.8111,
		lng: 15.7314,
	},
	{
		name: "Hotel Serra da Chela",
		address: "Rua do Governo",
		province: "Huíla",
		municipality: "Lubango",
		neighborhood: "Central",
		reference: "Miradouro da Lua",
		lat: -14.917,
		lng: 13.492,
	},
	{
		name: "Espaço Christo Rei",
		address: "Estrada da Tundavala",
		province: "Huíla",
		municipality: "Lubango",
		neighborhood: "Tundavala",
		reference: "Miradouro da Tundavala",
		lat: -14.837,
		lng: 13.3793,
	},
	{
		name: "Salão Cabinda",
		address: "Rua das Margaridas",
		province: "Cabinda",
		municipality: "Cabinda",
		neighborhood: "Chinganji",
		reference: "Junto ao Estádio",
		lat: -5.55,
		lng: 12.2,
	},
	{
		name: "Complexo da Praia Chiloango",
		address: "Marginal de Cabinda",
		province: "Cabinda",
		municipality: "Cabinda",
		neighborhood: "Fútila",
		reference: "Vista para o mar",
		lat: -5.5533,
		lng: 12.1925,
	},
	{
		name: "Quinta Ferrovia",
		address: "Rua da Estação",
		province: "Malange",
		municipality: "Malange",
		neighborhood: "Missão",
		reference: "Centro de Malange",
		lat: -9.5401,
		lng: 16.341,
	},
	{
		name: "Espaço do Rangel",
		address: "Rua Amílcar Cabral",
		province: "Luanda",
		municipality: "Luanda",
		neighborhood: "Rangel",
		reference: "Próximo à Praça do Aeroporto",
		lat: -8.8372,
		lng: 13.2845,
	},
	{
		name: "Quinta Sanguengue",
		address: "Estrada da Catete",
		province: "Luanda",
		municipality: "Viana",
		neighborhood: "Sanguengue",
		reference: "Via Expressa",
		lat: -8.8981,
		lng: 13.4019,
	},
	{
		name: "Espaço Vila N'Gola",
		address: "Rua da Missão",
		province: "Luanda",
		municipality: "Cacuaco",
		neighborhood: "Cacuaco Velho",
		reference: "Junto ao Mercado",
		lat: -8.7874,
		lng: 13.3759,
	},
	{
		name: "Complexo Kamati",
		address: "Avenida Fidel Castro",
		province: "Luanda",
		municipality: "Talatona",
		neighborhood: "Camama",
		reference: "Cidade Universitária",
		lat: -8.894,
		lng: 13.2506,
	},
	{
		name: "Salão do Namibe",
		address: "Rua da Praia Amélia",
		province: "Namibe",
		municipality: "Moçâmedes",
		neighborhood: "Central",
		reference: "Beira-mar",
		lat: -15.1961,
		lng: 12.1522,
	},
	{
		name: "Espaço Kuito",
		address: "Rua da Circular",
		province: "Bié",
		municipality: "Kuito",
		neighborhood: "Zona Baixa",
		reference: "Centro do Kuito",
		lat: -12.3842,
		lng: 16.9397,
	},
] as const;

// ── Vendor business names per category ─────────────────────────────
const SUPPLIER_NAMES: Record<string, readonly string[]> = {
	VENUE: [
		"Jardim das Flores",
		"Quinta do Mussulo",
		"Espaço Belas",
		"Palácio Central",
		"Quinta Vista Alegre",
		"Complexo Ferrovia",
	],
	DECORATION: [
		"Arte & Flor",
		"Decorações Kwanza",
		"Flor de Lótus",
		"Eventos Dourados",
		"Atelier das Flores",
		"Mãos Criativas",
	],
	MUSIC: [
		"Som & Arte",
		"Kizomba Hits",
		"DJ Kamba",
		"Banda Luar",
		"Ritmo Vivo",
		"Afro Fusion",
	],
	PHOTOGRAPHER: [
		"Olhar Fotográfico",
		"Luz & Sombra",
		"Fotografia Horizonte",
		"Kiss Glow",
		"Lente Mágica",
	],
	VIDEOGRAPHER: [
		"CineMuxima",
		"Vídeo Nota",
		"Filmes do Mussulo",
		"Câmara & História",
	],
	CATERING: [
		"Chef Ngola",
		"Sabores da Kanda",
		"Cozinha de Luanda",
		"Catering Kwanza Sul",
		"Bom Gosto",
	],
	CAKE: [
		"Doce Momento",
		"Bolos & Sonhos",
		"Casa do Bolo",
		"Confeitaria Vivi",
		"Doçaria Real",
	],
	SWEETS_AND_SAVOURIES: [
		"Bebidas Kwanza",
		"Sommelier Luanda",
		"Bar Central",
		"Águas do Bengo",
		"Vinho & Prosa",
	],
	TRANSPORT: [
		"Transportes Reais",
		"Reis da Estrada",
		"Frota Kwanza",
		"Excelência Rides",
		"Carros de Luxo",
	],
	BEAUTY: [
		"Beleza Noiva",
		"Studio Kissange",
		"Magia & Make",
		"Cabelo & Glamour",
		"Toque de Rainha",
	],
	SECURITY: [
		"Segurança Total",
		"Vigilância Kwanza",
		"Guardiões VIP",
		"Proteção Real",
	],
	ENTERTAINMENT: [
		"Animação Total",
		"Foguetes Reais",
		"Entretenimento Kizomba",
		"Show & Luzes",
		"Djambo Animação",
	],
	OTHER: [
		"Papelaria Muxima",
		"Lembranças & Detalhes",
		"Eventos & Cia",
		"Serviços de Apoio",
	],
} as const;

const CATEGORY_LABEL: Record<string, string> = {
	VENUE: "Espaço",
	DECORATION: "Decoração",
	FLORIST: "Flores",
	CATERING: "Catering",
	CAKE: "Bolo",
	SWEETS_AND_SAVOURIES: "Doces e salgados",
	PHOTOGRAPHER: "Fotografia",
	VIDEOGRAPHER: "Vídeo",
	DJ: "DJ",
	BAND: "Banda",
	MUSIC: "Música",
	ENTERTAINMENT: "Animação",
	TRANSPORT: "Transportes",
	BEAUTY: "Beleza",
	BRIDE_ATTIRE: "Vestido da noiva",
	GROOM_ATTIRE: "Traje do noivo",
	RINGS: "Alianças",
	WEDDING_PLANNER: "Planeamento",
	OFFICIANT: "Celebrante",
	FAVOURS: "Lembranças",
	ACCOMMODATION: "Alojamento",
	SECURITY: "Segurança",
	OTHER: "Serviços",
};
// ── Seed users (Better Auth schema) ────────────────────────────────
const SEED_USERS: Prisma.UserCreateManyInput[] = [
	{
		id: "usr_owner_001",
		name: "Ana Fernandes",
		email: "ana@muxima.ao",
		emailVerified: true,
		image: null,
		phone: "+244 923 100 001",
	},
	{
		id: "usr_partner_002",
		name: "Carlos Mendes",
		email: "carlos@muxima.ao",
		emailVerified: true,
		image: null,
		phone: "+244 923 100 002",
	},
	{
		id: "usr_admin_003",
		name: "Sofia Neto",
		email: "sofia@muxima.ao",
		emailVerified: true,
		image: null,
		phone: "+244 923 100 003",
	},
	{
		id: "usr_editor_004",
		name: "Miguel Tavares",
		email: "miguel@muxima.ao",
		emailVerified: true,
		image: null,
		phone: "+244 923 100 004",
	},
	{
		id: "usr_viewer_005",
		name: "Laura Simões",
		email: "laura@muxima.ao",
		emailVerified: false,
		image: null,
		phone: "+244 923 100 005",
	},
	{
		id: "usr_friend_006",
		name: "Diogo Inocêncio",
		email: "diogo@muxima.ao",
		emailVerified: true,
		image: null,
		phone: "+244 923 100 006",
	},
	{
		id: "usr_friend_007",
		name: "Marisa Cabral",
		email: "marisa@muxima.ao",
		emailVerified: true,
		image: null,
		phone: "+244 923 100 007",
	},
	{
		id: "usr_padrinho_008",
		name: "Nuno Pires",
		email: "nuno@muxima.ao",
		emailVerified: true,
		image: null,
		phone: "+244 923 100 008",
	},
];

const USER_IDS = SEED_USERS.map((u) => u.id);

// ── Event distribution (exactly 40) ────────────────────────────────
// 30 WEDDING (indices 0-29) + 10 ENGAGEMENT (indices 30-39).
// PLANNING 14 · CONFIRMED 10 · COMPLETED 9 · DRAFT 4 · CANCELLED 3.
const EVENT_STATUSES = [
	// 0-9
	"COMPLETED",
	"PLANNING",
	"CONFIRMED",
	"COMPLETED",
	"PLANNING",
	"DRAFT",
	"CONFIRMED",
	"PLANNING",
	"COMPLETED",
	"CANCELLED",
	// 10-19
	"PLANNING",
	"CONFIRMED",
	"PLANNING",
	"COMPLETED",
	"PLANNING",
	"DRAFT",
	"CONFIRMED",
	"COMPLETED",
	"PLANNING",
	"CONFIRMED",
	// 20-29
	"PLANNING",
	"COMPLETED",
	"CONFIRMED",
	"PLANNING",
	"CONFIRMED",
	"DRAFT",
	"COMPLETED",
	"PLANNING",
	"CONFIRMED",
	"CANCELLED",
	// 30-39 (engagements)
	"PLANNING",
	"CONFIRMED",
	"COMPLETED",
	"PLANNING",
	"DRAFT",
	"CONFIRMED",
	"COMPLETED",
	"PLANNING",
	"PLANNING",
	"CANCELLED",
] as const;

const WEDDING_CAPACITIES = [
	250, 180, 320, 140, 220, 400, 150, 280, 90, 350, 200, 260, 120, 300, 170, 380,
	230, 410, 160, 340, 250, 110, 290, 190, 420, 180, 320, 220, 260, 340,
] as const;

const ENGAGEMENT_CAPACITIES = [
	120, 80, 150, 100, 90, 140, 110, 70, 160, 130,
] as const;

interface EventPlan {
	index: number;
	id: string;
	type: "WEDDING" | "ENGAGEMENT";
	status: (typeof EVENT_STATUSES)[number];
	capacity: number;
	limitGuestCapacity: boolean;
	fillRatio: number;
	ownerId: string;
	partnerId: string;
}

/**
 * Reads a capacity by index, failing loudly when the plan grows past the
 * capacity tables instead of silently creating an event with no seats.
 */
function capacityAt(values: readonly number[], index: number): number {
	const value = values[index];
	if (value === undefined) {
		throw new Error(`No capacity defined for event index ${index}`);
	}
	return value;
}

function buildEventPlans(): EventPlan[] {
	return EVENT_STATUSES.map((status, i) => {
		const type = i < 30 ? "WEDDING" : "ENGAGEMENT";
		const capacity = capacityAt(
			type === "WEDDING" ? WEDDING_CAPACITIES : ENGAGEMENT_CAPACITIES,
			type === "WEDDING" ? i : i - 30,
		);
		const rng = mulberry32(1337 + i * 977);

		// fillRatio = confirmed guests / capacity. Confirmed must always fit.
		let fillRatio: number;
		switch (status) {
			case "COMPLETED":
				fillRatio = 0.9 + rng() * 0.1;
				break;
			case "CONFIRMED":
				fillRatio = 0.75 + rng() * 0.22;
				break;
			case "PLANNING":
				fillRatio = 0.4 + rng() * 0.35;
				break;
			case "DRAFT":
				fillRatio = 0.05 + rng() * 0.15;
				break;
			case "CANCELLED":
				fillRatio = 0.05 + rng() * 0.2;
				break;
		}

		// Enforcement of real-world "near vs far from capacity" variety.
		if (i === 0) fillRatio = 0.83; // hero wedding: slightly below cap for funnel headroom
		if (i === 2) fillRatio = 0.99; // near-full
		if (i === 21) fillRatio = 0.5; // far from capacity

		const limitGuestCapacity = fillRatio >= 0.55 || type === "WEDDING";

		const owner = pick(rng, USER_IDS);
		let partner = pick(rng, USER_IDS);
		while (partner === owner) partner = pick(rng, USER_IDS);

		return {
			index: i,
			id:
				i === 0
					? "evt_wedding_001"
					: i === 1
						? "evt_engagement_002"
						: `evt_${pad(i + 1, 3)}`,
			type,
			status,
			capacity,
			limitGuestCapacity,
			fillRatio,
			ownerId: owner,
			partnerId: partner,
		};
	});
}

// ── Group labels ───────────────────────────────────────────────────
const FAMILY_GROUPS = [
	"Família da Noiva",
	"Família do Noivo",
	"Família dos Padrinhos",
];
const FRIEND_GROUPS = [
	"Amigos da Universidade",
	"Amigos da Infância",
	"Amigos do Bairro",
];
const WORK_GROUPS = ["Trabalho — Empresa", "Colegas da Igreja", "Paróquia"];
const VIP_GROUPS = [
	"Padrinhos e Madrinhas",
	"Convidados VIP",
	"Bênçãos da Família",
];
const OTHER_GROUPS = ["Vizinhos", "Comunidade", "Amigos da Família"];

/**
 * `createManyInput` types the id as optional; the seed always assigns a stable
 * one so the companion and invitation rows can point at it.
 */
type SeededGuest = Prisma.GuestCreateManyInput & { id: string };

interface GuestSeed {
	record: SeededGuest;
	confirmed: boolean;
	status:
		| "CONFIRMED"
		| "PENDING"
		| "DECLINED"
		| "WAITING"
		| "MAYBE"
		| "CANCELLED";
	companionsLimit: number;
}

// ── Task templates per category ────────────────────────────────────
const TASKS_BY_CATEGORY: Record<string, readonly string[]> = {
	VENUE: [
		"Confirmar contrato com o espaço",
		"Visitar o salão e verificar acústica",
		"Reservar mesa principal",
		"Alinhar plano de evacuação",
	],
	DECORATION: [
		"Escolher tema e cores",
		"Confirmar arranjos florais",
		"Montar corredor de flores",
		"Definir iluminação e candeeiros",
	],

	GUESTS: [
		"Enviar convites digitais",
		"Confirmar presenças até à data limite",
		"Definir lista de acompanhantes",
		"Ligação de confirmação aos padrinhos",
	],
	FINANCE: [
		"Fechar orçamento de fornecedores",
		"Emitir pagamento de sinal",
		"Reconciliar despesas",
		"Abrir conta poupança para o evento",
	],
	FOOD: [
		"Encomendar entradas e prato principal",
		"Confirmar o bolo e os doces",
		"Encomendar gelo e bebidas",
		"Prova de menu com o chef",
		"Confirmar número final de refeições",
		"Alinhar dietas e alergias",
		"Definir serviço de mesa",
	],
	DRINKS: [
		"Fechar bar aberto",
		"Encomendar água, sumos e refrigerantes",
		"Escolher vinho e champanhe",
	],
	CEREMONY: [
		"Marcar ensaio geral",
		"Confirmar liturgia e música sacra",
		"Alinhar o percurso da cerimónia",
	],
	DOCUMENTS: [
		"Reunir documentação do casamento civil",
		"Assinar contratos dos fornecedores",
		"Autocarro e licenças do espaço",
	],
	CLOTHING: [
		"Prova final do vestido",
		"Ajuste do fato do noivo",
		"Definir look dos padrinhos",
	],
	TRANSPORT: [
		"Reservar carro decorado",
		"Confirmar rotas do cortejo",
		"Contratar transporte dos convidados",
	],
	OTHER: [
		"Lembranças para convidados",
		"Cuidados e tratamentos de beleza",
		"Caixa de agradecimentos",
	],
};

const SCHEDULES_WEDDING = [
	{
		title: "Montagem da decoração",
		desc: "Equipa de decoração instala-se no espaço",
		start: 8,
		end: 12,
		loc: "Salão principal",
	},
	{
		title: "Preparação da noiva",
		desc: "Maquilhagem, penteado e vestido",
		start: 12,
		end: 14,
		loc: "Sala de preparação",
	},
	{
		title: "Ensaio rápido",
		desc: "Passo final com o celebrante",
		start: 14,
		end: 14.5,
		loc: "Capela / altar",
	},
	{
		title: "Cerimónia religiosa",
		desc: "Casamento religioso",
		start: 15,
		end: 16,
		loc: "Igreja",
	},
	{
		title: "Receção de boas-vindas",
		desc: "Cocktail de boas-vindas",
		start: 16,
		end: 17,
		loc: "Entrada do salão",
	},
	{
		title: "Sessão fotográfica",
		desc: "Fotografias do casal e família",
		start: 17,
		end: 18,
		loc: "Jardim",
	},
	{
		title: "Jantar",
		desc: "Serviço de jantar completo",
		start: 18,
		end: 21,
		loc: "Salão principal",
	},
	{
		title: "Corte do bolo",
		desc: "Corte do bolo e brinde",
		start: 21,
		end: 21.5,
		loc: "Mesa principal",
	},
	{
		title: "Discurso dos padrinhos",
		desc: "Brindes e palavra dos padrinhos",
		start: 21.5,
		end: 22,
		loc: "Palco",
	},
	{
		title: "Pista de dança",
		desc: "DJ e banda ao vivo",
		start: 22,
		end: 25,
		loc: "Pista de dança",
	},
];

const SCHEDULES_ENGAGEMENT = [
	{
		title: "Montagem do espaço",
		desc: "Decoração e som",
		start: 14,
		end: 17,
		loc: "Jardim",
	},
	{
		title: "Receção dos convidados",
		desc: "Bem-vindos e fotos",
		start: 17,
		end: 18,
		loc: "Entrada",
	},
	{
		title: "Discurso do casal",
		desc: "Brinde e declaração de noivado",
		start: 18,
		end: 18.5,
		loc: "Palco",
	},
	{
		title: "Jantar de gala",
		desc: "Jantar servido",
		start: 18.5,
		end: 21,
		loc: "Salão principal",
	},
	{
		title: "Corte do bolo",
		desc: "Bolo de noivado",
		start: 21,
		end: 21.5,
		loc: "Mesa principal",
	},
	{
		title: "Festa",
		desc: "Música e dança",
		start: 21.5,
		end: 24,
		loc: "Pista de dança",
	},
];

const INVENTORY_WEDDING = [
	{ name: "Vinho Tinto Reserva", cat: "DRINK", unit: "BOTTLE", price: 12000 },
	{ name: "Champanhe Brut", cat: "DRINK", unit: "BOTTLE", price: 18000 },
	{ name: "Água Mineral 500ml", cat: "DRINK", unit: "BOTTLE", price: 300 },
	{ name: "Sumo Natural (Laranja)", cat: "DRINK", unit: "LITER", price: 2500 },
	{ name: "Cerveja Eza", cat: "DRINK", unit: "CASE", price: 8000 },
	{ name: "Barriga de Porco Assada", cat: "MATERIAL", unit: "KG", price: 6500 },
	{ name: "Calulu de Frango", cat: "MATERIAL", unit: "KG", price: 4000 },
	{ name: "Arroz com Tomate", cat: "MATERIAL", unit: "KG", price: 1500 },
	{ name: "Salada Tropical", cat: "MATERIAL", unit: "KG", price: 3000 },
	{
		name: "Bolo de Casamento 4 Andares",
		cat: "MATERIAL",
		unit: "UNIT",
		price: 250000,
	},
	{
		name: "Rosas Brancas (centro de mesa)",
		cat: "MATERIAL",
		unit: "UNIT",
		price: 800,
	},
	{ name: "Velas Aromáticas", cat: "MATERIAL", unit: "UNIT", price: 500 },
	{
		name: "Tecido Organza Branco",
		cat: "LINEN",
		unit: "PACKAGE",
		price: 15000,
	},
	{
		name: "Toalha de Mesa Algodão (50 un.)",
		cat: "LINEN",
		unit: "PACKAGE",
		price: 22000,
	},
	{
		name: "Cadeira Tiffany Dourada",
		cat: "FURNITURE",
		unit: "UNIT",
		price: 4500,
	},
	{ name: "Mesa Redonda 1,80 m", cat: "FURNITURE", unit: "UNIT", price: 38000 },
	{
		name: "M-microfone Sem Fios",
		cat: "EQUIPMENT",
		unit: "UNIT",
		price: 95000,
	},
	{
		name: "Projetor 5000 lumens",
		cat: "EQUIPMENT",
		unit: "UNIT",
		price: 320000,
	},
	{
		name: "Gerador Elétrico 5 kVA",
		cat: "EQUIPMENT",
		unit: "UNIT",
		price: 450000,
	},
	{
		name: "Caixa de Fogos de Artifício",
		cat: "OTHER",
		unit: "BOX",
		price: 45000,
	},
] as const;

const INVENTORY_ENGAGEMENT = [
	{ name: "Espumante de Nuvem", cat: "DRINK", unit: "BOTTLE", price: 9000 },
	{ name: "Água Mineral 500ml", cat: "DRINK", unit: "BOTTLE", price: 300 },
	{ name: "Sangria de Frutas", cat: "DRINK", unit: "LITER", price: 3500 },
	{
		name: "Petiscos (Empadas e Folhados)",
		cat: "MATERIAL",
		unit: "KG",
		price: 5500,
	},
	{ name: "Canapés de Queijo", cat: "MATERIAL", unit: "KG", price: 4800 },
	{ name: "Bolo de Noivado", cat: "MATERIAL", unit: "UNIT", price: 120000 },
	{ name: "Balões Dourados", cat: "MATERIAL", unit: "UNIT", price: 1200 },
] as const;

// ── Food plan menu pool ─────────────────────────────────────────────
// No prices on purpose: catering money belongs to the supplier, so the same
// spend is never counted twice in the budget.
const FOOD_PLAN_MENU: ReadonlyArray<{
	name: string;
	category: FoodPlanCategory;
	unit: FoodPlanUnit;
	share?: number;
	desc: string;
}> = [
	{
		name: "Entradas frias (queijo, fiambre, fumados)",
		category: "STARTER",
		unit: "PLATE",
		share: 0.8,
		desc: "Mesa de frios com opções vegetarianas.",
	},
	{
		name: "Entradas quentes (croquetes, pastéis)",
		category: "STARTER",
		unit: "PLATE",
		share: 0.8,
		desc: "Servidos à mesa durante a receção.",
	},
	{
		name: "Sopa da estação",
		category: "STARTER",
		unit: "PORTION",
		desc: "Caldo servido como entrada.",
	},
	{
		name: "Peito de frango grelhado com arroz",
		category: "MAIN_COURSE",
		unit: "PLATE",
		share: 0.7,
		desc: "Acompanhamento: arroz, salada e legumes.",
	},
	{
		name: "Peixe grelhado do dia",
		category: "MAIN_COURSE",
		unit: "PLATE",
		share: 0.2,
		desc: "Disponível para 20% dos convidados.",
	},
	{
		name: "Massa ao molho de tomate",
		category: "MAIN_COURSE",
		unit: "PLATE",
		share: 0.2,
		desc: "Opção vegetariana.",
	},
	{
		name: "Arroz de frango",
		category: "MAIN_COURSE",
		unit: "PLATE",
		share: 0.1,
		desc: "Prato tradicional, por encomenda.",
	},
	{
		name: "Batatas fritas",
		category: "SIDE_DISH",
		unit: "PORTION",
		share: 0.8,
		desc: "Acompanhamento do prato principal.",
	},
	{
		name: "Salada verde temperada",
		category: "SIDE_DISH",
		unit: "PLATE",
		share: 0.6,
		desc: "Com molho da casa.",
	},
	{
		name: "Legumes salteados",
		category: "SIDE_DISH",
		unit: "PLATE",
		share: 0.5,
		desc: "Vegetariano.",
	},
	{
		name: "Bolo de noiva",
		category: "DESSERT",
		unit: "PORTION",
		desc: "Fatias Generosas.",
	},
	{
		name: "Trufas e doces finos",
		category: "DESSERT",
		unit: "PORTION",
		share: 0.8,
		desc: "Mesas de doces.",
	},
	{
		name: "Mousse de chocolate",
		category: "DESSERT",
		unit: "PORTION",
		share: 0.6,
		desc: "Porções individuais.",
	},
	{
		name: "Fruta da estação",
		category: "FRUIT",
		unit: "PLATE",
		share: 0.8,
		desc: "Mesa de fruta e mingau.",
	},
	{
		name: "Sumos naturais",
		category: "OTHER",
		unit: "LITER",
		share: 0.5,
		desc: "Laranja, Manga e Maracujá.",
	},
	{
		name: "Água e refrigerantes",
		category: "OTHER",
		unit: "BOTTLE",
		share: 0.7,
		desc: "Consumo durante a festa.",
	},
	{
		name: "Café e chá",
		category: "OTHER",
		unit: "PORTION",
		share: 0.8,
		desc: "Servido no fim da recepção.",
	},
];

// ── Manual checklist items (never touched by the API) ──────────────
const CHECKLIST_TEMPLATES = [
	{
		title: "Fechar a lista de convidados",
		desc: "Confirmar presenças até dois dias antes.",
	},
	{
		title: "Enviar o mapa do salão ao decorator",
		desc: "Indicativo de mesas e zonas de serviço.",
	},
	{ title: "Testar o sistema de som", desc: "Microfones, colunas e gerador." },
	{
		title: "Confirmar o horário dos fornecedores",
		desc: "Hora de chegada e de montagem de cada serviço.",
	},
	{
		title: "Definir o plano de chuva",
		desc: "Espaço alternativo e cobertura.",
	},
	{
		title: "Preparar a mesa dos presentes",
		desc: "Livro de mensagens e cartão de agradecimento.",
	},
	{
		title: "Rever o contrato com o fotógrafo",
		desc: "Direitos de imagem e prazo de entrega.",
	},
	{
		title: "Organizar o cortejo",
		desc: "Carros, ordem de entrada e condutores.",
	},
];

async function main() {
	console.log("🌱 Seeding database...");

	const plans = buildEventPlans();

	// ── Idempotent cleanup (cascades from events) ─────────────────────
	await prisma.guestInvitation.deleteMany({});
	await prisma.eventInvitation.deleteMany({});
	await prisma.invitationGuest.deleteMany({});
	await prisma.guestCompanion.deleteMany({});
	await prisma.tableGuest.deleteMany({});
	await prisma.$executeRaw`TRUNCATE TABLE "audit_log", "notification", "document", "checklist_item", "food_plan_item", "food_plan", "supplier_installment", "supplier_payment", "supplier", "inventory_movement", "inventory_item", "schedule", "task", "table_guest", "guest_companion", "invitation_guest", "guest_invitation", "event_invitation", "guest", "budget", "table", "dedication_viewer", "dedication", "event_member", "event" CASCADE`;
	await prisma.user.deleteMany({ where: { id: { in: USER_IDS } } });

	// ── 1. USERS + CREDENTIALS ────────────────────────────────────────
	await prisma.user.createMany({ data: SEED_USERS });
	const passwordHash = await hashSeedPassword(SEED_PASSWORD);
	await prisma.account.createMany({
		data: SEED_USERS.map((user) => ({
			id: `acct_credential_${user.id}`,
			issuer: "local:credential",
			accountId: user.id,
			providerId: "credential",
			userId: user.id,
			password: passwordHash,
		})),
	});
	console.log(
		`  ✅ Users (${SEED_USERS.length}) / Credentials (${SEED_USERS.length})`,
	);

	// ── 2. EVENTS ──────────────────────────────────────────────────────
	const eventRecords: Prisma.EventCreateManyInput[] = [];
	for (const plan of plans) {
		const rng = mulberry32(2024 + plan.index * 613);
		const venue = pick(rng, VENUES);
		let eventDate: Date;
		switch (plan.status) {
			case "COMPLETED":
				eventDate = monthsAgo(randInt(rng, 1, 6));
				break;
			case "CONFIRMED":
				eventDate = daysAhead(randInt(rng, 15, 60));
				break;
			case "PLANNING":
				eventDate = monthsAhead(randInt(rng, 2, 12));
				break;
			case "CANCELLED":
				eventDate = daysAhead(randInt(rng, 20, 200));
				break;
			case "DRAFT":
				eventDate = monthsAhead(randInt(rng, 6, 18));
				break;
		}

		const female = pick(rng, FEMALE_NAMES);
		const male = pick(rng, MALE_NAMES);
		const name =
			plan.type === "WEDDING"
				? `Casamento ${female} & ${male}`
				: `Noivado ${female} & ${male}`;

		eventRecords.push({
			id: plan.id,
			ownerId: plan.ownerId,
			name,
			type: plan.type,
			status: plan.status,
			eventDate,
			startTime: plan.type === "WEDDING" ? "15:00" : "17:00",
			endTime: plan.type === "WEDDING" ? "02:00" : "23:00",
			venueName: venue.name,
			address: venue.address,
			province: venue.province,
			municipality: venue.municipality,
			neighborhood: venue.neighborhood,
			reference: venue.reference,
			latitude: venue.lat,
			longitude: venue.lng,
			capacity: plan.capacity,
			limitGuestCapacity: plan.limitGuestCapacity,
			currency: "AOA",
			description:
				plan.status === "CANCELLED"
					? "Evento cancelado por motivos da família."
					: plan.status === "DRAFT"
						? "Rascunho do evento — detalhes a confirmar."
						: `${plan.type === "WEDDING" ? "Casamento" : "Festa de noivado"} com receção e celebração no ${venue.name}.`,
		});
	}
	await prisma.event.createMany({ data: eventRecords });
	console.log(`  ✅ Events (${eventRecords.length})`);

	// ── 3. EVENT MEMBERS + MEMBER INVITATIONS ─────────────────────────
	const memberRecords: Prisma.EventMemberCreateManyInput[] = [];
	const eventInvitationRecords: Prisma.EventInvitationCreateManyInput[] = [];

	for (const plan of plans) {
		const rng = mulberry32(91 + plan.index * 149);
		const members: {
			user: string;
			role: MemberRole;
			status: MemberStatus;
			joined: Date | null;
		}[] = [
			{
				user: plan.ownerId,
				role: "OWNER",
				status: "ACTIVE",
				joined: daysAgo(randInt(rng, 60, 200)),
			},
			{
				user: plan.partnerId,
				role: "PARTNER",
				status: "ACTIVE",
				joined: daysAgo(randInt(rng, 40, 180)),
			},
		];

		if (rng() > 0.4) {
			let third = pick(rng, USER_IDS);
			while (members.some((m) => m.user === third)) third = pick(rng, USER_IDS);
			members.push({
				user: third,
				role: "ADMIN",
				status: "ACTIVE",
				joined: daysAgo(randInt(rng, 20, 120)),
			});
		}
		if (rng() > 0.75) {
			let fourth = pick(rng, USER_IDS);
			while (members.some((m) => m.user === fourth))
				fourth = pick(rng, USER_IDS);
			members.push({
				user: fourth,
				role: "EDITOR",
				status: "ACTIVE",
				joined: daysAgo(randInt(rng, 10, 60)),
			});
		}
		// A pending invitation for realism.
		if (rng() > 0.6) {
			let invitee = pick(rng, USER_IDS);
			while (members.some((m) => m.user === invitee))
				invitee = pick(rng, USER_IDS);
			if (
				["CONFIRMED", "PLANNING"].includes(plan.status) &&
				plan.type === "WEDDING"
			) {
				members.push({
					user: invitee,
					role: "VIEWER",
					status: "PENDING",
					joined: null,
				});
				eventInvitationRecords.push({
					id: `evinv_${plan.index}_${invitee}`,
					eventId: plan.id,
					invitedBy: plan.ownerId,
					email: `${invitee.replace("usr_", "")}@muxima.ao`,
					role: "VIEWER",
					token: `tok_${plan.index}_${invitee.slice(-4)}`,
					status: "PENDING",
					expiresAt: monthsAhead(1),
				});
			}
		}

		for (const m of members) {
			memberRecords.push({
				id: `mem_${m.user}_${plan.id}`,
				eventId: plan.id,
				userId: m.user,
				role: m.role,
				status: m.status,
				joinedAt: m.joined,
			});
		}
	}
	await prisma.eventMember.createMany({ data: memberRecords });
	await prisma.eventInvitation.createMany({ data: eventInvitationRecords });
	console.log(
		`  ✅ Event Members (${memberRecords.length}) / Invitations (${eventInvitationRecords.length})`,
	);

	// ── 4. BUDGET TARGETS ─────────────────────────────────────────────
	// The budget is only a target: the spend is derived from the suppliers and
	// the inventory, so there are no budget categories to keep in sync.
	const budgetRecords: Prisma.BudgetCreateManyInput[] = [];

	for (const plan of plans) {
		const rng = mulberry32(311 + plan.index * 317);
		const perPerson =
			plan.type === "WEDDING"
				? randInt(rng, 28000, 46000)
				: randInt(rng, 14000, 22000);
		const plannedAmount = plan.capacity * perPerson;
		const reserveAmount = Math.round(plannedAmount * 0.08);
		budgetRecords.push({
			id: `bgt_${pad(plan.index + 1)}_${SEED_PREFIX}`,
			eventId: plan.id,
			plannedAmount,
			reserveAmount,
			notes:
				plan.status === "DRAFT"
					? "Orçamento preliminar — valores a confirmar."
					: "Orçamento derivado dos fornecedores e do inventário.",
		});
	}
	await prisma.budget.createMany({ data: budgetRecords });
	console.log(`  ✅ Budgets (${budgetRecords.length})`);

	// ── 5. SUPPLIERS + PAYMENTS + INSTALLMENTS ───────────────────────
	// Money lives here now: every supplier carries an agreed price, the
	// payments made against it and, when it is paid in stages, the schedule.
	const supplierRecords: Prisma.SupplierCreateManyInput[] = [];
	const supplierPaymentRecords: Prisma.SupplierPaymentCreateManyInput[] = [];
	const supplierInstallmentRecords: Prisma.SupplierInstallmentCreateManyInput[] =
		[];

	const WEDDING_SUPPLIER_CATS = [
		"VENUE",
		"DECORATION",
		"CATERING",
		"MUSIC",
		"PHOTOGRAPHER",
		"TRANSPORT",
		"BEAUTY",
		"ENTERTAINMENT",
	] as const;
	const ENGAGEMENT_SUPPLIER_CATS = [
		"VENUE",
		"DECORATION",
		"CATERING",
		"MUSIC",
		"PHOTOGRAPHER",
		"CAKE",
	] as const;

	for (const plan of plans) {
		const rng = mulberry32(503 + plan.index * 271);
		const cats: readonly string[] =
			plan.type === "WEDDING"
				? WEDDING_SUPPLIER_CATS
				: ENGAGEMENT_SUPPLIER_CATS;

		const count =
			plan.status === "DRAFT"
				? 2
				: plan.status === "CANCELLED"
					? 3
					: Math.min(cats.length, randInt(rng, 5, cats.length));
		const usedCats: string[] = [];
		// The agreed prices have to stay inside the target, otherwise the seeded
		// budget would look broken on the very first load.
		let priceBudget = Math.round(
			Number(
				budgetRecords.find((b) => b.eventId === plan.id)?.plannedAmount ?? 0,
			) * 0.62,
		);

		for (let j = 0; j < count; j++) {
			let cat = pick(rng, cats);
			if (usedCats.includes(cat))
				cat = cats.find((c) => !usedCats.includes(c)) ?? cat;
			usedCats.push(cat);
			const rngV = mulberry32(607 + plan.index * 91 + j * 43);
			const business = pick(
				rngV,
				SUPPLIER_NAMES[cat] ?? (["Muxima Serviços"] as const),
			);
			const supplierId = `sup_${pad(plan.index + 1)}_${j + 1}_${SEED_PREFIX}`;
			const status: SupplierStatus =
				plan.status === "COMPLETED"
					? "COMPLETED"
					: plan.status === "CANCELLED"
						? "CANCELLED"
						: plan.status === "DRAFT"
							? "PROSPECT"
							: pick(rngV, ["CONTACTED", "NEGOTIATING", "CONFIRMED"] as const);

			// Only committed suppliers have a price. The first supplier takes a
			// larger share, the rest share what is left.
			const isCommitted = status === "CONFIRMED" || status === "COMPLETED";
			const share = Math.max(1, count - j) / ((count * (count + 1)) / 2);
			const price = isCommitted
				? Math.max(50_000, Math.round((priceBudget * share) / 5_000) * 5_000)
				: 0;
			priceBudget -= price;

			// A quarter of the committed suppliers pay in stages.
			const useInstallments = isCommitted && rngV() < 0.25;
			const installmentCount = useInstallments ? randInt(rngV, 2, 4) : 0;

			supplierRecords.push({
				id: supplierId,
				eventId: plan.id,
				name: `${business} — ${CATEGORY_LABEL[cat] ?? "Serviços"}`,
				category: cat as SupplierCategory,
				phone: `+244 ${randInt(rngV, 910, 989)} ${pad(randInt(rngV, 0, 999))} ${pad(randInt(rngV, 0, 999))}`,
				email: `${business.toLowerCase().replace(/[^a-z0-9]+/g, "")}@muxima.ao`,
				address: `${pick(rngV, VENUES).neighborhood}, ${pick(rngV, VENUES).province}`,
				status,
				description: `Serviço de ${CATEGORY_LABEL[cat]?.toLowerCase() ?? "apoio"} para o evento.`,
				notes:
					status === "CONFIRMED"
						? "Contrato assinado e confirmado."
						: status === "COMPLETED"
							? "Serviço concluído com sucesso."
							: status === "CANCELLED"
								? "Contrato cancelado."
								: "Seguimento necessário.",
				price: price > 0 ? price : null,
				paymentModel: useInstallments
					? SupplierPaymentModel.INSTALLMENTS
					: SupplierPaymentModel.FULL,
				// Filled in below, once the payments are known.
				paymentStatus: "PENDING",
				nextDueDate: null,
			});

			if (!isCommitted || price <= 0) continue;

			// Installment schedule: equal parts, the last one absorbing the
			// rounding remainder so the parts always add up to the price.
			const installments: Array<{
				position: number;
				amount: number;
				dueDate: Date;
			}> = [];
			if (useInstallments) {
				const part = Math.round(price / installmentCount / 5_000) * 5_000;
				let running = 0;
				for (let k = 0; k < installmentCount; k++) {
					const amount = k === installmentCount - 1 ? price - running : part;
					running += amount;
					installments.push({
						position: k + 1,
						amount,
						// Spaced from today towards the event, so a completed
						// event has every date in the past.
						dueDate: daysAgo(
							randInt(rngV, 5, 20) + (installmentCount - k) * 45,
						),
					});
				}
			}

			// How much was already paid, mirroring the rules the API applies.
			const paidRatio =
				plan.status === "COMPLETED"
					? 1
					: plan.status === "CANCELLED"
						? 0
						: pick(rngV, [0, 0.25, 0.5, 0.75, 1]);
			let paid = 0;
			if (paidRatio > 0) {
				paid = Math.round((price * paidRatio) / 5_000) * 5_000;
				if (paidRatio === 1) paid = price;
				if (paid > 0) {
					supplierPaymentRecords.push({
						id: `spay_${pad(plan.index + 1)}_${j + 1}_${SEED_PREFIX}`,
						supplierId,
						amount: paid,
						paymentDate: daysAgo(randInt(rngV, 1, 40)),
						method: pick(rngV, [
							"CASH",
							"BANK_TRANSFER",
							"ATM",
							"CARD",
							"MOBILE_PAYMENT",
						] as const),
						reference: `TRF-2026-${pad(plan.index + 1)}-${j + 1}`,
						notes: paidRatio === 1 ? "Pagamento integral" : "Adiantamento",
						createdBy: plan.ownerId,
					});
				}
			}

			// A schedule is only stored for suppliers that really have one, and
			// each installment is marked paid once the payments cover it: a
			// payment settles the schedule from the earliest due date onwards.
			let covered = 0;
			for (const [k, installment] of installments.entries()) {
				const isPaid = paid - covered >= installment.amount;
				if (isPaid) covered += installment.amount;
				supplierInstallmentRecords.push({
					id: `sinst_${pad(plan.index + 1)}_${j + 1}_${k + 1}_${SEED_PREFIX}`,
					supplierId,
					position: installment.position,
					amount: installment.amount,
					dueDate: installment.dueDate,
					status: isPaid ? "PAID" : "PENDING",
					paidAt: isPaid ? daysAgo(randInt(rngV, 1, 20)) : null,
					notes: isPaid ? "Parcela liquidada" : null,
				});
			}

			// Nearest installment the payments do not cover yet.
			let accumulated = 0;
			const nextDueDate = installments
				.filter((installment) => {
					if (paid < accumulated + installment.amount) return true;
					accumulated += installment.amount;
					return false;
				})
				.map((installment) => installment.dueDate)
				.sort((a, b) => a.getTime() - b.getTime())[0];
			const isOverdue =
				nextDueDate !== undefined && nextDueDate.getTime() < now.getTime();

			// Stored status, using the same precedence as the finance module.
			// A cancelled supplier never reaches this point: it is not committed,
			// so it has no price and no money to report.
			const paymentStatus: SupplierPaymentStatus = isOverdue
				? "OVERDUE"
				: paid >= price
					? "PAID"
					: paid > 0
						? "INSTALLMENTS"
						: "PENDING";

			const row = supplierRecords[supplierRecords.length - 1];
			if (row) {
				row.paymentStatus = paymentStatus;
				row.nextDueDate = nextDueDate ?? null;
			}
		}
	}
	await prisma.supplier.createMany({ data: supplierRecords });
	await prisma.supplierPayment.createMany({ data: supplierPaymentRecords });
	await prisma.supplierInstallment.createMany({
		data: supplierInstallmentRecords,
	});
	console.log(
		`  ✅ Suppliers (${supplierRecords.length}) / Payments (${supplierPaymentRecords.length}) / Installments (${supplierInstallmentRecords.length})`,
	);

	// ── 6. GUESTS + COMPANIONS + INVITATIONS ──────────────────────────
	const guestRecords: SeededGuest[] = [];
	const companionRecords: Prisma.GuestCompanionCreateManyInput[] = [];
	const guestInvitationRecords: Prisma.GuestInvitationCreateManyInput[] = [];
	const invitationGuestRecords: Prisma.InvitationGuestCreateManyInput[] = [];

	for (const plan of plans) {
		const rng = mulberry32(719 + plan.index * 353);
		const guests: GuestSeed[] = [];

		if (plan.status !== "CANCELLED" && plan.status !== "DRAFT") {
			const confirmed = Math.floor(plan.capacity * plan.fillRatio);

			// Confirmed guests (all fit — companions budget = remaining seats).
			let companionBudget = plan.capacity - confirmed;
			for (let g = 0; g < confirmed; g++) {
				const companionsLimit = randInt(rng, 0, 2);
				const type = pick(rng, [
					"FAMILY",
					"FAMILY",
					"FRIEND",
					"FRIEND",
					"COLLEAGUE",
					"VIP",
					"OTHER",
				] as const);
				const group = pick(
					rng,
					type === "FAMILY"
						? FAMILY_GROUPS
						: type === "FRIEND"
							? FRIEND_GROUPS
							: type === "COLLEAGUE"
								? WORK_GROUPS
								: type === "VIP"
									? VIP_GROUPS
									: OTHER_GROUPS,
				);
				const isMale = rng() > 0.5;
				const fullName = `${isMale ? pick(rng, MALE_NAMES) : pick(rng, FEMALE_NAMES)} ${pick(rng, SURNAMES)}`;
				const guestSeed: GuestSeed = {
					record: {
						id: `gst_${pad(plan.index + 1)}_${pad(g + 1, 4)}`,
						eventId: plan.id,
						name: fullName,
						phone: `+244 ${randInt(rng, 910, 989)} ${pad(randInt(rng, 0, 999))} ${pad(randInt(rng, 0, 999))}`,
						group,
						type,
						status: "CONFIRMED",
						companionsLimit,
					},
					confirmed: true,
					status: "CONFIRMED",
					companionsLimit,
				};
				guests.push(guestSeed);
				// Realistic companion assignment (some pending to feed capacity metrics).
				if (companionsLimit > 0 && companionBudget > 0) {
					const wantCompanions = Math.min(companionsLimit, companionBudget);
					const pending = rng() > 0.7;
					guestRecords.push(guestSeed.record);
					for (let c = 0; c < wantCompanions; c++) {
						const companionStatus: CompanionStatus = pending
							? "PENDING"
							: "CONFIRMED";
						const role =
							c === 0 ? (isMale ? "Esposa" : "Marido") : "Acompanhante";
						const cName = `${role} ${pick(rng, isMale ? FEMALE_NAMES : MALE_NAMES)}`;
						companionRecords.push({
							id: `gcp_${pad(plan.index + 1)}_${pad(g + 1, 4)}_${c + 1}`,
							guestId: guestSeed.record.id,
							name: cName,
							status: companionStatus,
						});
						if (companionStatus === "CONFIRMED") companionBudget -= 1;
					}
				}
			}

			// Additional non-confirmed guests: pending/declined/waiting/maybe/cancelled.
			const extras = Math.round(plan.capacity * (0.1 + rng() * 0.25));
			for (let g = 0; g < extras; g++) {
				const roll = rng();
				const status: GuestSeed["status"] =
					roll < 0.45
						? "PENDING"
						: roll < 0.68
							? "DECLINED"
							: roll < 0.82
								? "WAITING"
								: roll < 0.9
									? "MAYBE"
									: "CANCELLED";
				const type = pick(rng, [
					"FAMILY",
					"FRIEND",
					"COLLEAGUE",
					"VIP",
					"OTHER",
				] as const);
				const group = pick(
					rng,
					type === "FAMILY"
						? FAMILY_GROUPS
						: type === "FRIEND"
							? FRIEND_GROUPS
							: type === "COLLEAGUE"
								? WORK_GROUPS
								: type === "VIP"
									? VIP_GROUPS
									: OTHER_GROUPS,
				);
				const isMale = rng() > 0.5;
				guests.push({
					record: {
						id: `gst_${pad(plan.index + 1)}_${pad(guestRecords.length + 1, 4)}_x`,
						eventId: plan.id,
						name: `${isMale ? pick(rng, MALE_NAMES) : pick(rng, FEMALE_NAMES)} ${pick(rng, SURNAMES)}`,
						phone: `+244 ${randInt(rng, 910, 989)} ${pad(randInt(rng, 0, 999))} ${pad(randInt(rng, 0, 999))}`,
						group,
						type,
						status,
						companionsLimit: status === "DECLINED" ? 0 : randInt(rng, 0, 1),
					},
					confirmed: false,
					status,
					companionsLimit: 0,
				});
			}
		}

		// DRAFT events: handful of pending guests.
		if (plan.status === "DRAFT") {
			for (let g = 0; g < randInt(rng, 3, 8); g++) {
				guests.push({
					record: {
						id: `gst_${pad(plan.index + 1)}_${pad(guestRecords.length + 1, 4)}_d`,
						eventId: plan.id,
						name: `${pick(rng, MALE_NAMES)} ${pick(rng, SURNAMES)}`,
						type: "FAMILY",
						group: "Família",
						status: "PENDING",
						companionsLimit: 0,
					},
					confirmed: false,
					status: "PENDING",
					companionsLimit: 0,
				});
			}
		}

		// Persist guests (track ids already in records), invitations + junction.
		for (const g of guests) {
			if (!g.record.id.includes("_x") && !g.record.id.includes("_d")) {
				continue; // already pushed for companions path
			}
			guestRecords.push(g.record);
		}
		// fix duplicate padding: recompute stable global guest ids now.
		const guestIdMap = new Map<string, string>();
		guests.forEach((g, gi) => {
			const stable = `gst_${pad(plan.index + 1)}_${pad(gi + 1, 4)}`;
			guestIdMap.set(g.record.id, stable);
			g.record.id = stable;
		});
		// Restore companion guest FKs to stable ids.
		for (const c of companionRecords) {
			const stable = guestIdMap.get(c.guestId);
			if (stable) c.guestId = stable;
		}

		for (const [gi, g] of guests.entries()) {
			const guestId = `gst_${pad(plan.index + 1)}_${pad(gi + 1, 4)}`;
			if (!guestRecords.some((r) => r.id === guestId))
				guestRecords.push({ ...g.record, id: guestId });

			const invStatus: GuestInvitationStatus =
				g.status === "CONFIRMED"
					? "RESPONDED"
					: g.status === "DECLINED"
						? "RESPONDED"
						: g.status === "MAYBE"
							? "RESPONDED"
							: g.status === "CANCELLED"
								? "CANCELLED"
								: g.status === "WAITING"
									? "OPENED"
									: rng() < 0.2
										? "CREATED"
										: randInt(rng, 0, 1) === 0
											? "SENT"
											: "OPENED";
			const rsvp: RsvpStatus =
				g.status === "CONFIRMED"
					? "CONFIRMED"
					: g.status === "DECLINED"
						? "DECLINED"
						: g.status === "MAYBE"
							? "MAYBE"
							: "PENDING";
			const invId = `gi_${pad(plan.index + 1)}_${pad(gi + 1, 4)}`;
			guestInvitationRecords.push({
				id: invId,
				eventId: plan.id,
				code: `MUX-${pad(plan.index + 1)}-${pad(gi + 1, 3)}`,
				status: invStatus,
				rsvpStatus: rsvp,
				sentAt: invStatus === "CREATED" ? null : daysAgo(randInt(rng, 20, 70)),
				openedAt:
					invStatus === "RESPONDED" || invStatus === "OPENED"
						? daysAgo(randInt(rng, 15, 60))
						: null,
				respondedAt:
					invStatus === "RESPONDED" ? daysAgo(randInt(rng, 10, 50)) : null,
			});
			invitationGuestRecords.push({
				id: `ig_${pad(plan.index + 1)}_${pad(gi + 1, 4)}`,
				invitationId: invId,
				guestId,
			});
		}
	}
	// De-duplicate pending guest records pushed twice.
	const seen = new Set<string>();
	const uniqueGuests: SeededGuest[] = [];
	for (const r of guestRecords) {
		if (!seen.has(r.id)) {
			seen.add(r.id);
			uniqueGuests.push(r);
		}
	}

	await prisma.guest.createMany({ data: uniqueGuests });
	await prisma.guestCompanion.createMany({ data: companionRecords });
	await prisma.guestInvitation.createMany({ data: guestInvitationRecords });
	await prisma.invitationGuest.createMany({ data: invitationGuestRecords });
	console.log(
		`  ✅ Guests (${uniqueGuests.length}) / Companions (${companionRecords.length}) / Invitations (${guestInvitationRecords.length})`,
	);

	// ── 7. TABLES + SEATING ────────────────────────────────────────────
	const tableRecords: Prisma.TableCreateManyInput[] = [];
	const tableGuestRecords: Prisma.TableGuestCreateManyInput[] = [];

	for (const plan of plans) {
		if (plan.status === "CANCELLED" || plan.status === "DRAFT") continue;
		const rng = mulberry32(823 + plan.index * 181);
		const confirmedCount = Math.floor(plan.capacity * plan.fillRatio);
		if (confirmedCount <= 0) continue;

		// Table capacity pool must sum to <= event.capacity.
		let tableCapacity = 0;
		const caps: number[] = [];
		while (tableCapacity + 10 <= plan.capacity) {
			const size = randInt(rng, 6, 10);
			caps.push(size);
			tableCapacity += size;
		}
		// Remainder (0-9 seats) to reach capacity, only when it makes a usable table.
		const rest = plan.capacity - tableCapacity;
		if (rest > 0 && (rest >= 6 || caps.length >= 4)) {
			caps.push(rest);
			tableCapacity = plan.capacity;
		}
		// One spare empty table sometimes, kept within capacity.
		const spare =
			caps.length >= 4 && rng() > 0.6 && tableCapacity + 8 <= plan.capacity;
		if (spare) {
			caps.push(8);
			tableCapacity += 8;
		}

		caps.forEach((cap, idx) => {
			tableRecords.push({
				id: `tbl_${pad(plan.index + 1)}_${idx + 1}`,
				eventId: plan.id,
				name: `Mesa ${idx + 1}`,
				number: idx + 1,
				capacity: cap,
				location: pick(rng, [
					"Frente ao palco",
					"Zona central",
					"Zona lateral",
					"Zona traseira",
					"Zona de janela",
				]),
			});
		});

		// Seat guests greedily; the spare table stays empty, and no table is
		// over-subscribed beyond its capacity.
		const seatableCaps = spare ? caps.slice(0, -1) : caps;
		const seatsAvailable = seatableCaps.reduce((a, b) => a + b, 0);
		const seatingCount = Math.min(confirmedCount, seatsAvailable);
		const seats: { table: number; slot: number }[] = [];
		seatableCaps.forEach((cap, ti) => {
			for (let s = 0; s < cap; s++) seats.push({ table: ti, slot: s });
		});
		const placed = seats.slice(0, seatingCount);
		for (const [p, guestId] of placed.map(
			(s, k) => [s, `gst_${pad(plan.index + 1)}_${pad(k + 1, 4)}`] as const,
		)) {
			tableGuestRecords.push({
				id: `tg_${pad(plan.index + 1)}_${p.slot + 1}_${p.table + 1}`,
				tableId: `tbl_${pad(plan.index + 1)}_${p.table + 1}`,
				guestId,
			});
		}
	}
	await prisma.table.createMany({ data: tableRecords });
	await prisma.tableGuest.createMany({ data: tableGuestRecords });
	console.log(
		`  ✅ Tables (${tableRecords.length}) / Seats (${tableGuestRecords.length})`,
	);

	// ── 8. TASKS + SCHEDULES ───────────────────────────────────────────
	const taskRecords: Prisma.TaskCreateManyInput[] = [];
	const scheduleRecords: Prisma.ScheduleCreateManyInput[] = [];

	for (const plan of plans) {
		const rng = mulberry32(941 + plan.index * 271);
		const cats = Object.keys(TASKS_BY_CATEGORY);
		const count =
			plan.status === "DRAFT"
				? randInt(rng, 2, 4)
				: plan.status === "CANCELLED"
					? randInt(rng, 3, 6)
					: randInt(rng, 10, 16);
		const pickedCats = new Set<string>();

		for (let j = 0; j < count; j++) {
			let cat = pick(rng, cats);
			if (pickedCats.has(cat))
				cat = cats.find((c) => !pickedCats.has(c)) ?? cat;
			pickedCats.add(cat);
			const template = pick(
				rng,
				TASKS_BY_CATEGORY[cat] ?? TASKS_BY_CATEGORY.OTHER ?? [""],
			);
			const completed =
				plan.status === "COMPLETED"
					? rng() > 0.3
					: plan.status === "CANCELLED"
						? rng() > 0.6
						: rng() > 0.65;
			const overdue = !completed && plan.status === "PLANNING" && rng() > 0.7;
			const dueDate = completed
				? daysAgo(randInt(rng, 5, 60))
				: overdue
					? daysAgo(randInt(rng, 1, 7))
					: daysAhead(randInt(rng, 5, 120));
			const status: TaskStatus = completed
				? "COMPLETED"
				: overdue
					? "IN_PROGRESS"
					: pick(rng, ["TODO", "IN_PROGRESS"] as const);

			taskRecords.push({
				id: `tsk_${pad(plan.index + 1)}_${j + 1}`,
				eventId: plan.id,
				title: template,
				description: `Tarefa de ${cat.toLowerCase()} para o planeamento do evento.`,
				category: cat as TaskCategory,
				priority: pick(rng, ["LOW", "MEDIUM", "HIGH", "URGENT"] as const),
				status,
				assignedTo: plan.partnerId,
				dueDate,
				completedAt: completed ? daysAgo(randInt(rng, 1, 40)) : null,
				completedBy: completed ? plan.ownerId : null,
				createdBy: plan.ownerId,
			});
		}

		// Schedules
		const template =
			plan.type === "WEDDING" ? SCHEDULES_WEDDING : SCHEDULES_ENGAGEMENT;
		const eventDate =
			(budgetRecords.find((b) => b.eventId === plan.id)?.id
				? eventRecords.find((e) => e.id === plan.id)?.eventDate
				: null) ?? monthsAhead(2);
		const baseDate = new Date(eventDate);
		const scheduleStatus: ScheduleStatus =
			plan.status === "COMPLETED"
				? "COMPLETED"
				: plan.status === "CANCELLED"
					? "CANCELLED"
					: "PENDING";
		template.forEach((s, si) => {
			const start = new Date(baseDate);
			start.setHours(Math.floor(s.start), Math.round((s.start % 1) * 60), 0, 0);
			const end = new Date(baseDate);
			end.setHours(Math.floor(s.end), Math.round((s.end % 1) * 60), 0, 0);
			if (s.end < s.start) end.setDate(end.getDate() + 1);
			scheduleRecords.push({
				id: `sch_${pad(plan.index + 1)}_${si + 1}`,
				eventId: plan.id,
				title: s.title,
				description: s.desc,
				startAt: start,
				endAt: end,
				location: s.loc,
				responsible: plan.partnerId,
				status: scheduleStatus,
			});
		});
	}
	await prisma.task.createMany({ data: taskRecords });
	await prisma.schedule.createMany({ data: scheduleRecords });
	console.log(
		`  ✅ Tasks (${taskRecords.length}) / Schedules (${scheduleRecords.length})`,
	);

	// ── 9. INVENTORY + MOVEMENTS ───────────────────────────────────────
	const inventoryRecords: Prisma.InventoryItemCreateManyInput[] = [];
	const movementRecords: Prisma.InventoryMovementCreateManyInput[] = [];

	for (const plan of plans) {
		const rng = mulberry32(1021 + plan.index * 149);
		const pool =
			plan.type === "WEDDING" ? INVENTORY_WEDDING : INVENTORY_ENGAGEMENT;
		const count =
			plan.status === "DRAFT"
				? 2
				: Math.min(pool.length, randInt(rng, 6, pool.length));
		const selected = [...pool];
		selected.sort(() => rng() - 0.5);
		const chosen = selected.slice(0, count);

		// The budget is now derived from the inventory and the suppliers, so the
		// quantities have to stay inside the target instead of being random:
		// each item gets a share of the inventory slice of the budget, weighted
		// so a case of water and a generator both appear in a sensible amount.
		const inventorySlice = Math.round(
			Number(
				budgetRecords.find((b) => b.eventId === plan.id)?.plannedAmount ?? 0,
			) * 0.18,
		);
		const weights = chosen.map(() => 1 + rng() * 14);
		const weightedCost = chosen.reduce(
			(sum, item, i) => sum + item.price * (weights[i] ?? 1),
			0,
		);
		const scale = weightedCost > 0 ? inventorySlice / weightedCost : 0;

		for (const [j, item] of chosen.entries()) {
			// Quantity proportional to the weight, normalised so the total
			// planned value of the slice matches the inventory share of the
			// budget: sum(price x quantity) = inventorySlice.
			const plannedQuantity = Math.max(
				1,
				Math.round((weights[j] ?? 1) * scale),
			);
			const roll = rng();
			// Some items full, some low, some zero — analytics friendly.
			const currentQuantity =
				roll < 0.2
					? 0
					: roll < 0.5
						? Math.round(plannedQuantity * (0.1 + rng() * 0.4))
						: plannedQuantity;
			const status: InventoryStatus =
				plan.status === "COMPLETED"
					? "COMPLETED"
					: currentQuantity >= plannedQuantity
						? "COMPLETED"
						: currentQuantity > 0
							? "IN_PROGRESS"
							: "PENDING";
			inventoryRecords.push({
				id: `inv_${pad(plan.index + 1)}_${j + 1}`,
				eventId: plan.id,
				name: item.name,
				category: item.cat as InventoryCategory,
				plannedQuantity,
				currentQuantity,
				status,
				unit: item.unit as InventoryUnit,
				unitPrice: item.price,
				notes:
					status === "PENDING"
						? "A aguardar entrega."
						: status === "IN_PROGRESS" && currentQuantity < plannedQuantity / 2
							? "Stock abaixo do esperado."
							: null,
			});

			// Movements
			if (currentQuantity > 0) {
				movementRecords.push({
					id: `mv_${pad(plan.index + 1)}_${j + 1}_1`,
					inventoryItemId: `inv_${pad(plan.index + 1)}_${j + 1}`,
					type: "PURCHASE",
					quantity: currentQuantity,
					unitPrice: item.price,
					totalCost: Math.round(currentQuantity * item.price),
					reason: "Compra inicial ao fornecedor",
					createdBy: plan.ownerId,
					createdAt: daysAgo(randInt(rng, 10, 90)),
				});
			}
			if (rng() > 0.6) {
				movementRecords.push({
					id: `mv_${pad(plan.index + 1)}_${j + 1}_2`,
					inventoryItemId: `inv_${pad(plan.index + 1)}_${j + 1}`,
					type: "CONSUMPTION",
					quantity: Math.max(
						1,
						Math.round(plannedQuantity * (0.05 + rng() * 0.3)),
					),
					unitPrice: item.price,
					totalCost: 0,
					reason: "Consumo em ensaio/reunião de planeamento",
					createdBy: plan.partnerId,
					createdAt: daysAgo(randInt(rng, 1, 30)),
				});
			}
		}
	}
	await prisma.inventoryItem.createMany({ data: inventoryRecords });
	await prisma.inventoryMovement.createMany({ data: movementRecords });
	console.log(
		`  ✅ Inventory (${inventoryRecords.length}) / Movements (${movementRecords.length})`,
	);

	// ── 10. FOOD PLAN + CHECKLIST + DOCUMENTS ──────────────────────────
	const foodPlanRecords: Prisma.FoodPlanCreateManyInput[] = [];
	const foodPlanItemRecords: Prisma.FoodPlanItemCreateManyInput[] = [];
	const checklistRecords: Prisma.ChecklistItemCreateManyInput[] = [];
	const documentRecords: Prisma.DocumentCreateManyInput[] = [];

	for (const plan of plans) {
		// ── Food plan: one per event, at most one catering supplier ──
		const rngF = mulberry32(911 + plan.index * 97);
		// The catering supplier, when the event has one, is the plan's supplier.
		const catering = supplierRecords.find(
			(s) => s.eventId === plan.id && s.category === "CATERING",
		);
		const planId = `fpl_${pad(plan.index + 1)}_${SEED_PREFIX}`;
		foodPlanRecords.push({
			id: planId,
			eventId: plan.id,
			supplierId: catering?.id ?? null,
			notes:
				plan.status === "DRAFT"
					? "Menu por definir com o fornecedor."
					: "Menu aprovado com o fornecedor.",
		});

		const menuCount =
			plan.status === "DRAFT" ? randInt(rngF, 3, 5) : randInt(rngF, 6, 10);
		const menu = [...FOOD_PLAN_MENU].sort(() => rngF() - 0.5);
		for (const [j, dish] of menu.slice(0, menuCount).entries()) {
			const roll = rngF();
			// Completed events have everything prepared, drafts barely anything.
			const status: FoodPlanStatus =
				plan.status === "COMPLETED"
					? "COMPLETED"
					: plan.status === "CANCELLED"
						? "PENDING"
						: roll < 0.3
							? "COMPLETED"
							: roll < 0.7
								? "IN_PROGRESS"
								: "PENDING";
			foodPlanItemRecords.push({
				id: `fpi_${pad(plan.index + 1)}_${j + 1}_${SEED_PREFIX}`,
				eventId: plan.id,
				foodPlanId: planId,
				name: dish.name,
				category: dish.category,
				quantity: Math.round(plan.capacity * (dish.share ?? 1)),
				unit: dish.unit,
				description: dish.desc,
				status,
				position: j + 1,
			});
		}

		// ── Checklist ───────────────────────────────────────────────
		// The status is derived, exactly as the API derives it: a supplier item
		// is complete when the supplier is confirmed and fully paid, an
		// inventory item when the planned quantity was reached.
		let position = 0;
		const nextPosition = () => (position += 1);

		for (const supplier of supplierRecords.filter(
			(s) => s.eventId === plan.id,
		)) {
			const paid = supplierPaymentRecords
				.filter((pay) => pay.supplierId === supplier.id)
				.reduce((sum, pay) => sum + Number(pay.amount), 0);
			const price = Number(supplier.price ?? 0);
			const fullyPaid = price > 0 ? paid >= price : paid > 0;

			const status: ChecklistStatus =
				supplier.status === "CANCELLED"
					? "CANCELLED"
					: supplier.status === "CONFIRMED" && fullyPaid
						? "COMPLETED"
						: supplier.status === "CONFIRMED"
							? "IN_PROGRESS"
							: "PENDING";

			checklistRecords.push({
				id: `chk_sup_${pad(plan.index + 1)}_${nextPosition()}`,
				eventId: plan.id,
				title: `Contratar ${supplier.name}`,
				description: "Estado e pagamento do fornecedor.",
				status,
				supplierId: supplier.id,
				autoManaged: true,
				position: nextPosition(),
				completedAt:
					status === "COMPLETED" ? daysAgo(randInt(rngF, 1, 30)) : null,
			});
		}

		for (const item of inventoryRecords.filter((i) => i.eventId === plan.id)) {
			const planned = Number(item.plannedQuantity);
			const current = Number(item.currentQuantity);
			const status: ChecklistStatus =
				item.status === "COMPLETED" || (planned > 0 && current >= planned)
					? "COMPLETED"
					: item.status === "IN_PROGRESS"
						? "IN_PROGRESS"
						: "PENDING";

			checklistRecords.push({
				id: `chk_inv_${pad(plan.index + 1)}_${nextPosition()}`,
				eventId: plan.id,
				title: `Adquirir ${item.name}`,
				description: "Aquisição e conferência do inventário.",
				status,
				inventoryItemId: item.id,
				autoManaged: true,
				position: nextPosition(),
				completedAt:
					status === "COMPLETED" ? daysAgo(randInt(rngF, 1, 30)) : null,
			});
		}

		// A few manual items, which the API never touches.
		const manual = [...CHECKLIST_TEMPLATES].sort(() => rngF() - 0.5);
		const manualCount = plan.status === "DRAFT" ? 1 : 3;
		for (const [j, template] of manual.slice(0, manualCount).entries()) {
			const status: ChecklistStatus =
				plan.status === "COMPLETED"
					? "COMPLETED"
					: plan.status === "DRAFT"
						? "PENDING"
						: pick(rngF, ["PENDING", "IN_PROGRESS", "COMPLETED"] as const);
			checklistRecords.push({
				id: `chk_man_${pad(plan.index + 1)}_${j + 1}`,
				eventId: plan.id,
				title: template.title,
				description: template.desc,
				status,
				autoManaged: false,
				position: nextPosition(),
				dueDate: daysAhead(randInt(rngF, 5, 60)),
				completedAt:
					status === "COMPLETED" ? daysAgo(randInt(rngF, 1, 20)) : null,
			});
		}

		// ── Documents: contracts and receipts, attached to the supplier ──
		const rngD = mulberry32(1201 + plan.index * 167);
		const eventSuppliers = supplierRecords
			.map((supplier, supplierIndex) => ({ supplier, supplierIndex }))
			.filter(
				({ supplier }) =>
					supplier.eventId === plan.id && supplier.status !== "PROSPECT",
			);
		for (const { supplier, supplierIndex } of eventSuppliers) {
			const payment = supplierPaymentRecords.find(
				(pay) => pay.supplierId === supplier.id,
			);
			if (!payment) continue;
			if (rngD() > 0.55) continue;

			const isReceipt = supplier.paymentStatus === "PAID";
			documentRecords.push({
				id: `doc_${pad(plan.index + 1)}_${supplierIndex + 1}_${SEED_PREFIX}`,
				eventId: plan.id,
				supplierId: supplier.id,
				supplierPaymentId: isReceipt ? (payment.id ?? null) : null,
				name: isReceipt
					? `Recibo — ${supplier.name}`
					: `Contrato — ${supplier.name}`,
				type: isReceipt ? "RECEIPT" : "CONTRACT",
				reference: `${isReceipt ? "REC" : "CT"}-2026-${pad(plan.index + 1)}-${pad(supplierIndex + 1)}`,
				url: `https://documentos.muxima.ao/${plan.id}/${supplierIndex + 1}/${isReceipt ? "recibo" : "contrato"}.pdf`,
				mimeType: "application/pdf",
				status: "ACTIVE",
				createdBy: plan.ownerId,
			});
		}
	}
	await prisma.foodPlan.createMany({ data: foodPlanRecords });
	await prisma.foodPlanItem.createMany({ data: foodPlanItemRecords });
	await prisma.checklistItem.createMany({ data: checklistRecords });
	await prisma.document.createMany({ data: documentRecords });
	console.log(
		`  ✅ Food Plans (${foodPlanRecords.length}) / Items (${foodPlanItemRecords.length}) / Checklist (${checklistRecords.length}) / Documents (${documentRecords.length})`,
	);

	// ── 11. NOTIFICATIONS + AUDIT LOGS ─────────────────────────────────
	const notificationRecords: Prisma.NotificationCreateManyInput[] = [];
	const auditRecords: Prisma.AuditLogCreateManyInput[] = [];

	for (const plan of plans) {
		const rng = mulberry32(1307 + plan.index * 179);
		const members = memberRecords.filter(
			(m) => m.eventId === plan.id && m.status === "ACTIVE",
		);
		const target =
			members[randInt(rng, 0, Math.max(0, members.length - 1))]?.userId ??
			plan.ownerId;

		const notificationTypes: NotificationType[] = [
			"FINANCE",
			"TASKS",
			"GUESTS",
			"INVENTORY",
			"EVENT",
		];
		const nCount = plan.status === "DRAFT" ? 0 : randInt(rng, 1, 3);
		for (let n = 0; n < nCount; n++) {
			const type = pick(rng, notificationTypes);
			notificationRecords.push({
				id: `ntf_${pad(plan.index + 1)}_${n + 1}`,
				userId: target,
				eventId: plan.id,
				type,
				title: `Atualização de ${type.toLowerCase()} — ${plan.id}`,
				message: `Existem novidades no evento ${plan.id}: verifique a secção de ${type.toLowerCase()}.`,
				priority: pick(rng, [
					"INFO",
					"INFO",
					"WARNING",
					"IMPORTANT",
					"CRITICAL",
				] as const),
				readAt: rng() > 0.5 ? daysAgo(randInt(rng, 1, 20)) : null,
				createdAt: daysAgo(randInt(rng, 1, 30)),
			});
		}

		const entities = [
			"Event",
			"Budget",
			"Supplier",
			"FoodPlan",
			"ChecklistItem",
			"Guest",
			"Task",
			"InventoryItem",
		];
		const aCount = plan.status === "DRAFT" ? 1 : 2;
		for (let a = 0; a < aCount; a++) {
			auditRecords.push({
				id: `audit_${pad(plan.index + 1)}_${a + 1}`,
				eventId: plan.id,
				userId: target,
				action: (["CREATE", "UPDATE"] as const)[a % 2] ?? "CREATE",
				entity: pick(rng, entities),
				entityId: `${pick(rng, ["evt", "bgt", "sup", "fpl", "chk", "gst", "tsk"])}_${plan.index + 1}`,
				newData: { note: "atualizado no âmbito do seed" },
				createdAt: daysAgo(randInt(rng, 1, 40)),
			});
		}
	}
	await prisma.notification.createMany({ data: notificationRecords });
	await prisma.auditLog.createMany({ data: auditRecords });
	console.log(
		`  ✅ Notifications (${notificationRecords.length}) / Audit Logs (${auditRecords.length})`,
	);

	// ── 12. DEDICATIONS ────────────────────────────────────────────────
	// Three examples that exercise every visible state of the module, so the
	// list, the stats cards and the access rules can all be checked in dev:
	//   1. locked + NOT_STARTED → owner only, nothing written yet
	//   2. locked + DRAFT       → owner only, text in progress
	//   3. shared + READY       → explicit member grants, already opened once
	const dedicationRecords: Prisma.DedicationCreateManyInput[] = [];
	const dedicationViewerRecords: Prisma.DedicationViewerCreateManyInput[] = [];

	/** Active members of a plan, so a grant never points at a stale membership. */
	const activeMembersOf = (plan: EventPlan) =>
		memberRecords.filter(
			(m): m is typeof m & { id: string } =>
				m.eventId === plan.id &&
				m.status === "ACTIVE" &&
				typeof m.id === "string",
		);

	/**
	 * Tiptap-shaped document, mirroring what the editor actually stores. An
	 * empty document is `{ doc, [paragraph] }` — the same canonical shape the
	 * backend's `EMPTY_RICH_TEXT` uses, never `{ doc, content: [] }`.
	 */
	const doc = (...paragraphs: string[]): Prisma.InputJsonValue => ({
		type: "doc",
		content:
			paragraphs.length > 0
				? paragraphs.map((text) => ({
						type: "paragraph",
						content: [{ type: "text", text }],
					}))
				: [{ type: "paragraph" }],
	});

	// The partner always exists and is always ACTIVE, which makes them the safe
	// viewer to grant. The owner is deliberately never granted.
	const wedding: EventPlan = plans[0] as EventPlan;
	const engagement: EventPlan = plans[1] as EventPlan;
	const partnerMember = (plan: EventPlan) => `mem_${plan.partnerId}_${plan.id}`;

	dedicationRecords.push(
		{
			id: `ded_vow_${SEED_PREFIX}`,
			eventId: wedding.id,
			ownerId: wedding.ownerId,
			title: "Os nossos votos",
			type: "WEDDING_VOW",
			status: "NOT_STARTED",
			content: doc(),
			isLocked: true,
			lastOpenedAt: null,
		},
		{
			id: `ded_vow_${SEED_PREFIX}_2`,
			eventId: wedding.id,
			ownerId: wedding.ownerId,
			title: "Carta à minha noiva",
			type: "DEDICATION",
			status: "DRAFT",
			content: doc(
				"Amor, ainda não sei escrever isto sem te rir de mim a meio.",
				"Prometo-te todos os pequenos gestos de todos os dias.",
			),
			isLocked: true,
			lastOpenedAt: daysAgo(6),
		},
		{
			id: `ded_vow_${SEED_PREFIX}_3`,
			eventId: engagement.id,
			ownerId: engagement.ownerId,
			title: "Votos de noivado",
			type: "ENGAGEMENT_VOW",
			status: "READY",
			content: doc(
				"Escolhi-te num café cheio de gente e não voltei a olhar para outra.",
				"Obrigado por me fazeres rir primeiro.",
			),
			// Shared: access is only ever granted through explicit membership.
			isLocked: false,
			lastOpenedAt: daysAgo(2),
		},
	);

	// Grant the partner on the shared one, plus an admin/editor when the plan
	// happens to have one, so the "who can see this" column has >1 row.
	const sharedPlanMembers = activeMembersOf(engagement).filter(
		(m) => m.userId !== engagement.ownerId,
	);
	for (const [index, member] of sharedPlanMembers.entries()) {
		dedicationViewerRecords.push({
			id: `ddv_${SEED_PREFIX}_${index + 1}`,
			dedicationId: `ded_vow_${SEED_PREFIX}_3`,
			eventMemberId: member.id,
			// The first viewer has already read it; the rest have not.
			lastOpenedAt: index === 0 ? daysAgo(2) : null,
		});
	}

	await prisma.dedication.createMany({ data: dedicationRecords });
	await prisma.dedicationViewer.createMany({ data: dedicationViewerRecords });
	console.log(
		`  ✅ Dedications (${dedicationRecords.length}) / Viewers (${dedicationViewerRecords.length})`,
	);

	// A short history for the shared dedication, so the audit tab has content.
	// `oldData`/`newData` are nullable Json columns: leaving them out of the
	// input is how a SQL NULL is written, so only real snapshots are listed.
	const historyPlan: EventPlan = engagement;
	const historyEntityId = `ded_vow_${SEED_PREFIX}_3`;
	const historyViewerMember = partnerMember(historyPlan);

	type DedicationAuditInput = {
		action: string;
		oldData?: Prisma.InputJsonValue;
		newData?: Prisma.InputJsonValue;
		createdAt: Date;
		userId?: string;
	};

	const historySeed: Prisma.AuditLogCreateManyInput[] = (
		[
			{
				action: "CREATED",
				newData: {
					title: "Votos de noivado",
					type: "ENGAGEMENT_VOW",
					status: "NOT_STARTED",
				},
				createdAt: daysAgo(9),
			},
			{
				action: "UPDATED",
				newData: { note: "revisão do texto" },
				createdAt: daysAgo(5),
			},
			{
				action: "STATUS_CHANGED",
				oldData: { status: "DRAFT" },
				newData: { status: "READY" },
				createdAt: daysAgo(4),
			},
			{
				action: "UNLOCKED",
				oldData: { isLocked: true },
				newData: { isLocked: false },
				createdAt: daysAgo(3),
			},
			{
				action: "VIEWER_ADDED",
				newData: { eventMemberId: historyViewerMember },
				createdAt: daysAgo(3),
			},
			// Attributed to the partner, so the history shows a viewer action and
			// the "opened by me" stat has something to count.
			{
				action: "OPENED",
				createdAt: daysAgo(2),
				userId: historyPlan.partnerId,
			},
		] satisfies DedicationAuditInput[]
	).map((row, index) => ({
		id: `audit_ded_${SEED_PREFIX}_${index + 1}`,
		eventId: historyPlan.id,
		userId: row.userId ?? historyPlan.ownerId,
		action: row.action,
		entity: "Dedication",
		entityId: historyEntityId,
		oldData: row.oldData,
		newData: row.newData,
		createdAt: row.createdAt,
	}));

	await prisma.auditLog.createMany({ data: historySeed });
	console.log(`  ✅ Dedication Audit Logs (${historySeed.length})`);

	// ── DONE ───────────────────────────────────────────────────────────
	console.log("\n🎉 Seed completed successfully!");
	console.log(`   Users:          ${SEED_USERS.length}`);
	console.log(`   Events:         ${eventRecords.length}`);
	console.log(`   Event Members:  ${memberRecords.length}`);
	console.log(`   Budgets:        ${budgetRecords.length}`);
	console.log(`   Suppliers:      ${supplierRecords.length}`);
	console.log(`   Sup. Payments:  ${supplierPaymentRecords.length}`);
	console.log(`   Sup. Installs:  ${supplierInstallmentRecords.length}`);
	console.log(`   Guests:         ${uniqueGuests.length}`);
	console.log(`   Companions:     ${companionRecords.length}`);
	console.log(`   Invitations:    ${guestInvitationRecords.length}`);
	console.log(`   Tables:         ${tableRecords.length}`);
	console.log(`   Table Guests:   ${tableGuestRecords.length}`);
	console.log(`   Tasks:          ${taskRecords.length}`);
	console.log(`   Schedules:      ${scheduleRecords.length}`);
	console.log(`   Inventory:      ${inventoryRecords.length}`);
	console.log(`   Movements:      ${movementRecords.length}`);
	console.log(`   Food Plans:     ${foodPlanRecords.length}`);
	console.log(`   Food Plan Items:${foodPlanItemRecords.length}`);
	console.log(`   Checklist:      ${checklistRecords.length}`);
	console.log(`   Documents:      ${documentRecords.length}`);
	console.log(`   Notifications:  ${notificationRecords.length}`);
	console.log(`   Audit Logs:     ${auditRecords.length}`);
	console.log(`   Dedications:    ${dedicationRecords.length}`);
	console.log(`   Ded. Viewers:   ${dedicationViewerRecords.length}`);
	console.log("\n🔐 Credenciais de acesso (email / senha):");
	for (const u of SEED_USERS) console.log(`   ${u.email}  /  ${SEED_PASSWORD}`);
}

main()
	.catch((e) => {
		console.error("❌ Seed failed:", e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
