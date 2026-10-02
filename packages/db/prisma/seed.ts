/**
 * Prisma Seed Script — Muxima
 *
 * Deterministic, realistic dataset: exactly 30 events (24 weddings + 6
 * engagements) with full relational data across every module (members,
 * budget target, suppliers with payments and installments, guests with
 * companions and invitations, tables, tasks, schedules, inventory with
 * movements, food plan, checklist, notifications, audits, dedications).
 *
 * Idempotent: every existing row is deleted in FK-safe order and recreated,
 * so the seed can run repeatedly without leftovers or duplicates.
 *
 * Invariants (asserted before insert, so a violation fails loudly):
 *   - confirmed guests + confirmed companions <= event.capacity
 *   - every table's assigned guests <= table.capacity
 *   - DECLINED guests never have companions
 *   - money: suppliers + inventory <= budget.plannedAmount
 *
 * Login accounts are created exactly the way Better Auth persists them:
 * a `user` row plus a `credential` account whose password is scrypt
 * (N=16384, r=16, dkLen=64, NFKC) stored as `salt:key` hex — the same
 * format `verifyPassword` expects — with issuer `local:credential` and
 * accountId equal to the user id (see better-auth sign-in lookup).
 *
 * Run: pnpm db:seed (or npx tsx prisma/seed.ts)
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
	type DedicationStatus,
	type DedicationType,
	type EventStatus,
	type EventType,
	type FoodPlanCategory,
	type FoodPlanStatus,
	type FoodPlanUnit,
	type GuestStatus,
	type GuestType,
	type InventoryCategory,
	type InventoryStatus,
	type InventoryUnit,
	type MemberRole,
	type MemberStatus,
	type MovementType,
	type Prisma,
	PrismaClient,
	type RsvpStatus,
	type ScheduleStatus,
	type SupplierCategory,
	SupplierPaymentModel,
	type SupplierPaymentStatus,
	type SupplierStatus,
	type TaskCategory,
	type TaskPriority,
	type TaskStatus,
} from "../prisma/generated/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({
	// Overwrite nothing: an externally provided DATABASE_URL (CI/clean DB)
	// wins over the one baked into apps/server/.env.
	path: path.resolve(__dirname, "../../../apps/server/.env"),
	override: false,
});

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL não definida no ambiente.");
const prisma = new PrismaClient({
	adapter: new PrismaPg({ connectionString: databaseUrl }),
});

// ── Time helpers ────────────────────────────────────────────────────
const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);
const daysAhead = (d: number) => new Date(now.getTime() + d * 86_400_000);
const monthsAhead = (m: number) => {
	const d = new Date(now);
	d.setMonth(d.getMonth() + m);
	return d;
};
const monthsAgo = (m: number) => {
	const d = new Date(now);
	d.setMonth(d.getMonth() - m);
	return d;
};
const pad = (n: number, len = 3) => String(n).padStart(len, "0");

// ── Deterministic PRNG (mulberry32) ─────────────────────────────────
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

// ── Login accounts ──────────────────────────────────────────────────
// The exact users required for manual testing. Passwords are hashed with
// the same scrypt parameters Better Auth uses, so sign-in works right
// after seeding.
const SEED_USERS = [
	{
		name: "Amilton Xavier",
		email: "amilton.seed@muxima.test",
		password: "Muxima@2026Seed01",
	},
	{
		name: "Ana Manuel",
		email: "ana.seed@muxima.test",
		password: "Muxima@2026Seed02",
	},
	{
		name: "Carlos Domingos",
		email: "carlos.seed@muxima.test",
		password: "Muxima@2026Seed03",
	},
	{
		name: "Maria José",
		email: "maria.seed@muxima.test",
		password: "Muxima@2026Seed04",
	},
	{
		name: "João Pedro",
		email: "joao.seed@muxima.test",
		password: "Muxima@2026Seed05",
	},
	{
		name: "Isabel António",
		email: "isabel.seed@muxima.test",
		password: "Muxima@2026Seed06",
	},
] as const;

const USER_IDS = SEED_USERS.map((_, i) => `usr_seed_${pad(i + 1, 2)}`);

/** Indexed access under `noUncheckedIndexedAccess` needs an explicit guard. */
function userIdAt(index: number): string {
	const id = USER_IDS[index];
	if (!id) throw new Error(`No seed user defined for index ${index}`);
	return id;
}

/** scrypt with Better Auth's exact parameters (password.node.mjs). */
function scryptAsync(password: string, salt: string): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		nodeScrypt(
			password.normalize("NFKC"),
			salt,
			64,
			{
				N: 16384,
				r: 16,
				p: 1,
				maxmem: 128 * 16384 * 16 * 2,
			},
			(err, key) => (err ? reject(err) : resolve(key)),
		);
	});
}

async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16).toString("hex");
	const key = await scryptAsync(password, salt);
	return `${salt}:${key.toString("hex")}`;
}

// ── Event plan: 30 events, ~80% wedding / 20% engagement ────────────
// Exactly six engagements placed so that, together, both types cover every
// EventStatus (DRAFT 4, PLANNING 9, CONFIRMED 8, COMPLETED 6, CANCELLED 3).
// The remaining 24 indexes are weddings: 24/30 = 80%.
const ENGAGEMENT_INDEXES = new Set([3, 9, 11, 16, 20, 26]);
const EVENT_BLUEPRINT: ReadonlyArray<{
	status: EventStatus;
	fill: [number, number] | null; // confirmed/capacity range, null for DRAFT/CANCELLED
}> = [
	// 0-4
	{ status: "COMPLETED", fill: [0.9, 0.95] },
	{ status: "PLANNING", fill: [0.55, 0.7] },
	{ status: "CONFIRMED", fill: [0.75, 0.85] },
	{ status: "DRAFT", fill: null },
	{ status: "CANCELLED", fill: null },
	// 5-9
	{ status: "COMPLETED", fill: [0.86, 0.92] },
	{ status: "PLANNING", fill: [0.4, 0.6] },
	{ status: "CONFIRMED", fill: [0.62, 0.75] },
	{ status: "DRAFT", fill: null },
	{ status: "PLANNING", fill: [0.35, 0.5] },
	// 10-14
	{ status: "COMPLETED", fill: [0.88, 0.95] },
	{ status: "PLANNING", fill: [0.5, 0.65] },
	{ status: "CONFIRMED", fill: [0.7, 0.84] },
	{ status: "DRAFT", fill: null },
	{ status: "PLANNING", fill: [0.45, 0.6] },
	// 15-19
	{ status: "COMPLETED", fill: [0.86, 0.93] },
	{ status: "CANCELLED", fill: null },
	{ status: "COMPLETED", fill: [0.9, 0.95] },
	{ status: "CONFIRMED", fill: [0.65, 0.8] },
	{ status: "PLANNING", fill: [0.38, 0.55] },
	// 20-24
	{ status: "CONFIRMED", fill: [0.72, 0.85] },
	{ status: "COMPLETED", fill: [0.87, 0.94] },
	{ status: "PLANNING", fill: [0.5, 0.68] },
	{ status: "DRAFT", fill: null },
	{ status: "PLANNING", fill: [0.4, 0.58] },
	// 25-29
	{ status: "CONFIRMED", fill: [0.6, 0.78] },
	{ status: "COMPLETED", fill: [0.88, 0.95] },
	{ status: "CANCELLED", fill: null },
	{ status: "CONFIRMED", fill: [0.68, 0.8] },
	{ status: "PLANNING", fill: [0.35, 0.5] },
];

const WEDDING_CAPACITIES = [
	250, 180, 320, 140, 220, 400, 150, 280, 90, 350, 200, 260, 120, 300, 170, 380,
	230, 410, 160, 340, 250, 110, 290, 190, 420, 180, 320, 220, 260, 340,
] as const;

const ENGAGEMENT_CAPACITIES = [120, 80, 150, 100, 90, 140] as const;

interface EventPlan {
	index: number;
	id: string;
	type: EventType;
	status: EventStatus;
	capacity: number;
	confirmedGuests: number;
	fillRatio: number;
	ownerId: string;
	partnerId: string;
	eventDate: Date;
}

/** Reads a capacity by index, failing loudly instead of seeding without seats. */
function capacityAt(values: readonly number[], index: number): number {
	const value = values[index];
	if (value === undefined)
		throw new Error(`No capacity defined for index ${index}`);
	return value;
}

function buildEventPlans(): EventPlan[] {
	return EVENT_BLUEPRINT.map((blueprint, i) => {
		const type: EventType = ENGAGEMENT_INDEXES.has(i)
			? "ENGAGEMENT"
			: "WEDDING";
		let capacity: number;
		if (type === "WEDDING") {
			capacity = capacityAt(WEDDING_CAPACITIES, i);
		} else {
			// The k-th engagement reads the k-th engagement capacity.
			let k = 0;
			for (const index of ENGAGEMENT_INDEXES) {
				if (index === i) break;
				k += 1;
			}
			capacity = capacityAt(ENGAGEMENT_CAPACITIES, k);
		}
		const rng = mulberry32(1000 + i * 733);
		const confirmedGuests = blueprint.fill
			? Math.floor(
					capacity *
						(blueprint.fill[0] +
							rng() * (blueprint.fill[1] - blueprint.fill[0])),
				)
			: 0;

		const eventDate = (() => {
			switch (blueprint.status) {
				case "COMPLETED":
					return monthsAgo(randInt(rng, 1, 6));
				case "CONFIRMED":
					return daysAhead(randInt(rng, 15, 60));
				case "PLANNING":
					return monthsAhead(randInt(rng, 2, 12));
				case "CANCELLED":
					return daysAhead(randInt(rng, 20, 200));
				case "DRAFT":
					return monthsAhead(randInt(rng, 6, 18));
				case "ONGOING":
					return daysAhead(1);
			}
		})();

		return {
			index: i,
			id: `evt_seed_${pad(i + 1, 2)}`,
			type,
			status: blueprint.status,
			capacity,
			confirmedGuests,
			fillRatio: capacity > 0 ? confirmedGuests / capacity : 0,
			ownerId: userIdAt(i % USER_IDS.length),
			partnerId: userIdAt((i + 1) % USER_IDS.length),
			eventDate,
		};
	});
}

// ── Name pools (realistic PT / Angolan) ─────────────────────────────
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
	"Samuel",
	"Bernardo",
	"Garcia",
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
	"Rute",
	"Telma",
	"Verónica",
	"Yolanda",
	"Zulmira",
	"Vera",
] as const;

const ALL_FIRST_NAMES: readonly string[] = [...MALE_NAMES, ...FEMALE_NAMES];

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
	"Kiala",
	"Ndala",
] as const;

const personName = (rng: Rng) =>
	`${pick(rng, rng() > 0.5 ? MALE_NAMES : FEMALE_NAMES)} ${pick(rng, SURNAMES)}`;

const phone = (rng: Rng) =>
	`+244 ${randInt(rng, 910, 989)} ${pad(randInt(rng, 0, 999))} ${pad(randInt(rng, 0, 999))}`;

// ── Venues ──────────────────────────────────────────────────────────
const VENUES = [
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
		name: "Hotel Serra da Chela",
		address: "Rua do Governo",
		province: "Huíla",
		municipality: "Lubango",
		neighborhood: "Central",
		reference: "Miradouro da Tundavala",
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
] as const;

// ── Supplier business names per category ────────────────────────────
const SUPPLIER_NAMES: Record<SupplierCategory, readonly string[]> = {
	VENUE: [
		"Jardim das Flores",
		"Quinta do Mussulo",
		"Espaço Belas",
		"Palácio Central",
		"Quinta Vista Alegre",
	],
	DECORATION: [
		"Arte & Flor",
		"Decorações Kwanza",
		"Flor de Lótus",
		"Eventos Dourados",
		"Atelier das Flores",
	],
	FLORIST: [
		"Botânica Aura",
		"Flores do Kwanza",
		"Rosa d'Ouro",
		"Jardim Suspenso",
	],
	CATERING: [
		"Chef Ngola",
		"Sabores da Kanda",
		"Cozinha de Luanda",
		"Catering Kwanza Sul",
		"Bom Gosto",
	],
	CAKE: ["Doce Momento", "Bolos & Sonhos", "Casa do Bolo", "Confeitaria Vivi"],
	SWEETS_AND_SAVOURIES: [
		"Mesa Doce Kwanza",
		"Doces da Kanda",
		"Petiscos & Cia",
		"Tentação Doce",
	],
	PHOTOGRAPHER: [
		"Olhar Fotográfico",
		"Luz & Sombra",
		"Fotografia Horizonte",
		"Kiss Glow",
	],
	VIDEOGRAPHER: [
		"CineMuxima",
		"Vídeo Nota",
		"Filmes do Mussulo",
		"Câmara & História",
	],
	DJ: ["DJ Kamba", "DJ Som Luanda", "DJ Nzaji", "DJ Kizomba"],
	BAND: ["Banda Luar", "Semba Real", "Banda Kandengue", "Ritmo Vivo"],
	MUSIC: ["Som & Arte", "Kizomba Hits", "Áudio Prime", "Sonoplastia Total"],
	ENTERTAINMENT: [
		"Animação Total",
		"Foguetes Reais",
		"Show & Luzes",
		"Djambo Animação",
	],
	TRANSPORT: [
		"Transportes Reais",
		"Reis da Estrada",
		"Frota Kwanza",
		"Excelência Rides",
	],
	BEAUTY: [
		"Beleza Noiva",
		"Studio Kissange",
		"Magia & Make",
		"Cabelo & Glamour",
	],
	BRIDE_ATTIRE: [
		"Atelier Noiva Real",
		"Seda & Renda",
		"Casa da Noiva",
		"Véu & Grinalda",
	],
	GROOM_ATTIRE: ["Alfaiate Nobre", "Fato & Laço", "Elegância Masculina"],
	RINGS: ["Ouro & Prata", "Alianças do Sul", "Joalharia Kwanza"],
	WEDDING_PLANNER: ["Muxima Planner", "Eventos Perfeitos", "Dia Único"],
	OFFICIANT: [
		"Padre João Baptista",
		"Celebrante Unitário",
		"Pastor David Nzinga",
	],
	FAVOURS: ["Lembranças & Detalhes", "Recordar é Viver", "Mimos Muxima"],
	ACCOMMODATION: ["Hotel Alvorada", "Pousada da Serra", "Resort Mussulo"],
	SECURITY: ["Segurança Total", "Vigilância Kwanza", "Guardiões VIP"],
	OTHER: ["Papelaria Muxima", "Serviços de Apoio", "Eventos & Cia"],
};

const CATEGORY_LABEL: Partial<Record<SupplierCategory, string>> = {
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
	MUSIC: "Som",
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

// ── Task templates per category (every TaskCategory covered) ────────
const TASK_TEMPLATES: Record<TaskCategory, readonly string[]> = {
	VENUE: [
		"Confirmar contrato com o espaço",
		"Visitar o salão e verificar a acústica",
		"Reservar a mesa principal",
		"Alinhar o plano de montagem",
	],
	DECORATION: [
		"Escolher tema e cores",
		"Confirmar arranjos florais",
		"Montar corredor de flores",
		"Definir iluminação do salão",
	],
	GUESTS: [
		"Enviar convites digitais",
		"Confirmar presenças até à data limite",
		"Fechar lista de acompanhantes",
		"Ligar aos padrinhos para confirmação",
	],
	FINANCE: [
		"Fechar orçamento de fornecedores",
		"Pagar o sinal do espaço",
		"Reconciliar despesas do mês",
		"Actualizar plano de pagamentos",
	],
	FOOD: [
		"Encomendar o prato principal",
		"Confirmar o bolo e os doces",
		"Prova de menu com o chef",
		"Confirmar número final de refeições",
		"Alinhar dietas e alergias",
	],
	DRINKS: [
		"Fechar o bar aberto",
		"Encomendar água, sumos e refrigerantes",
		"Escolher vinho e espumante",
	],
	CEREMONY: [
		"Marcar o ensaio geral",
		"Confirmar liturgia e música sacra",
		"Alinhar o percurso da cerimónia",
	],
	DOCUMENTS: [
		"Reunir documentação do casamento civil",
		"Assinar contratos dos fornecedores",
		"Confirmar licenças do espaço",
	],
	CLOTHING: [
		"Prova final do vestido",
		"Ajuste do fato do noivo",
		"Definir o look dos padrinhos",
	],
	TRANSPORT: [
		"Reservar o carro decorado",
		"Confirmar rotas do cortejo",
		"Contratar transporte dos convidados",
	],
	OTHER: [
		"Preparar lembranças para os convidados",
		"Agendar tratamentos de beleza",
		"Organizar caixa de agradecimentos",
	],
};

// ── Schedule templates (coherent, non-overlapping) ──────────────────
const SCHEDULE_WEDDING = [
	{
		title: "Montagem da decoração",
		desc: "Equipa de decoração instala o salão",
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
		title: "Receção dos convidados",
		desc: "Acolhimento e cocktail",
		start: 14,
		end: 15,
		loc: "Entrada do salão",
	},
	{
		title: "Cerimónia",
		desc: "Casamento religioso / civil",
		start: 15,
		end: 16,
		loc: "Altar",
	},
	{
		title: "Sessão fotográfica",
		desc: "Casal e famílias",
		start: 16,
		end: 17,
		loc: "Jardim",
	},
	{
		title: "Entrada dos noivos",
		desc: "Aplausos e brinde de boas-vindas",
		start: 17,
		end: 17.5,
		loc: "Salão principal",
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
		title: "Primeira dança",
		desc: "Abertura da pista pelos noivos",
		start: 21.5,
		end: 22,
		loc: "Pista de dança",
	},
	{
		title: "Festa",
		desc: "DJ e banda ao vivo",
		start: 22,
		end: 25,
		loc: "Pista de dança",
	},
] as const;

const SCHEDULE_ENGAGEMENT = [
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
		title: "Jantar",
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
] as const;

// ── Inventory catalogues (unit prices inside the category norm) ─────
const INVENTORY_WEDDING: ReadonlyArray<{
	name: string;
	category: InventoryCategory;
	unit: InventoryUnit;
	min: number;
	max: number;
}> = [
	{
		name: "Vinho tinto reserva",
		category: "DRINK",
		unit: "BOTTLE",
		min: 6000,
		max: 12000,
	},
	{
		name: "Espumante brut",
		category: "DRINK",
		unit: "BOTTLE",
		min: 12000,
		max: 18000,
	},
	{
		name: "Água mineral 500 ml",
		category: "DRINK",
		unit: "BOTTLE",
		min: 200,
		max: 350,
	},
	{
		name: "Sumo natural de laranja",
		category: "DRINK",
		unit: "LITER",
		min: 2000,
		max: 3000,
	},
	{
		name: "Cerveja (caixa)",
		category: "DRINK",
		unit: "CASE",
		min: 7000,
		max: 9500,
	},
	{
		name: "Carne de vaca para grelhados",
		category: "MATERIAL",
		unit: "KG",
		min: 5500,
		max: 7500,
	},
	{
		name: "Frango para calulu",
		category: "MATERIAL",
		unit: "KG",
		min: 3500,
		max: 4800,
	},
	{
		name: "Arroz agulha",
		category: "MATERIAL",
		unit: "KG",
		min: 1200,
		max: 1800,
	},
	{
		name: "Bolo de noiva (andar)",
		category: "MATERIAL",
		unit: "UNIT",
		min: 60000,
		max: 90000,
	},
	{
		name: "Roses brancas (centro de mesa)",
		category: "MATERIAL",
		unit: "UNIT",
		min: 600,
		max: 1000,
	},
	{
		name: "Velas aromáticas",
		category: "MATERIAL",
		unit: "UNIT",
		min: 350,
		max: 700,
	},
	{
		name: "Organza branca (pacote)",
		category: "LINEN",
		unit: "PACKAGE",
		min: 12000,
		max: 18000,
	},
	{
		name: "Toalhas de mesa algodão (50 un.)",
		category: "LINEN",
		unit: "PACKAGE",
		min: 18000,
		max: 26000,
	},
	{
		name: "Cadeira Tiffany dourada",
		category: "FURNITURE",
		unit: "UNIT",
		min: 3500,
		max: 5000,
	},
	{
		name: "Mesa redonda 1,80 m",
		category: "FURNITURE",
		unit: "UNIT",
		min: 30000,
		max: 42000,
	},
	{
		name: "Microfone sem fios",
		category: "EQUIPMENT",
		unit: "UNIT",
		min: 80000,
		max: 110000,
	},
	{
		name: "Projetor 5000 lúmens",
		category: "EQUIPMENT",
		unit: "UNIT",
		min: 280000,
		max: 340000,
	},
	{
		name: "Gerador elétrico 5 kVA",
		category: "EQUIPMENT",
		unit: "UNIT",
		min: 400000,
		max: 480000,
	},
	{
		name: "Caixa de fogos de artifício",
		category: "OTHER",
		unit: "BOX",
		min: 38000,
		max: 52000,
	},
	{
		name: "Lembranças para convidados",
		category: "OTHER",
		unit: "UNIT",
		min: 800,
		max: 1500,
	},
];

const INVENTORY_ENGAGEMENT: ReadonlyArray<{
	name: string;
	category: InventoryCategory;
	unit: InventoryUnit;
	min: number;
	max: number;
}> = [
	{
		name: "Espumante",
		category: "DRINK",
		unit: "BOTTLE",
		min: 8000,
		max: 11000,
	},
	{
		name: "Água mineral 500 ml",
		category: "DRINK",
		unit: "BOTTLE",
		min: 200,
		max: 350,
	},
	{
		name: "Sangria de frutas",
		category: "DRINK",
		unit: "LITER",
		min: 2800,
		max: 3800,
	},
	{
		name: "Petiscos (empadas e folhados)",
		category: "MATERIAL",
		unit: "KG",
		min: 4500,
		max: 6000,
	},
	{
		name: "Canapés variados",
		category: "MATERIAL",
		unit: "KG",
		min: 3800,
		max: 5200,
	},
	{
		name: "Bolo de noivado",
		category: "MATERIAL",
		unit: "UNIT",
		min: 70000,
		max: 95000,
	},
	{
		name: "Balões dourados",
		category: "OTHER",
		unit: "UNIT",
		min: 900,
		max: 1500,
	},
	{
		name: "Toalhas de festa (pacote)",
		category: "LINEN",
		unit: "PACKAGE",
		min: 14000,
		max: 19000,
	},
];

// ── Food plan menu pool ─────────────────────────────────────────────
// No prices by design: catering money lives on the Supplier, so the same
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
		desc: "Fatias generosas.",
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
		desc: "Mesa de fruta.",
	},
	{
		name: "Sumos naturais",
		category: "OTHER",
		unit: "LITER",
		share: 0.5,
		desc: "Laranja, manga e maracujá.",
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

// ── Manual checklist items (never touched by the API) ───────────────
const CHECKLIST_TEMPLATES = [
	{
		title: "Fechar a lista de convidados",
		desc: "Confirmar presenças até dois dias antes.",
	},
	{
		title: "Enviar o mapa do salão ao decorador",
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
] as const;

// ── Guest groups per type ───────────────────────────────────────────
const GROUP_BY_TYPE: Record<GuestType, readonly string[]> = {
	FAMILY: ["Família da Noiva", "Família do Noivo", "Família dos Padrinhos"],
	FRIEND: ["Amigos da Universidade", "Amigos da Infância", "Amigos do Bairro"],
	COLLEAGUE: ["Trabalho — Empresa", "Colegas da Igreja", "Paróquia"],
	VIP: ["Padrinhos e Madrinhas", "Convidados VIP", "Bênçãos da Família"],
	OTHER: ["Vizinhos", "Comunidade", "Amigos da Família"],
};

// ── Invitation codes (same alphabet/shape the API uses: MUX-XXXX-XXXX) ──
const SEED_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function uniqueSeedInvitationCode(rng: Rng, used: Set<string>): string {
	const segment = () =>
		Array.from(
			{ length: 4 },
			() => SEED_CODE_ALPHABET[Math.floor(rng() * SEED_CODE_ALPHABET.length)],
		).join("");
	let code = `MUX-${segment()}-${segment()}`;
	while (used.has(code)) code = `MUX-${segment()}-${segment()}`;
	used.add(code);
	return code;
}

// ── Money helpers ───────────────────────────────────────────────────
/** Rounds to a clean Kz step so the numbers look hand-entered. */
const round5k = (n: number) => Math.max(5_000, Math.round(n / 5_000) * 5_000);

async function main() {
	console.log("🌱 Seeding database...");

	const plans = buildEventPlans();

	// ── 0. IDEMPOTENT CLEANUP (FK-safe order, no residue) ─────────────
	// Event-scoped children are also deleted here explicitly instead of
	// relying only on the event cascade, so partial re-runs can never leave
	// orphans behind.
	await prisma.dedicationViewer.deleteMany({});
	await prisma.dedication.deleteMany({});
	await prisma.activityLog.deleteMany({});
	await prisma.auditLog.deleteMany({});
	await prisma.notification.deleteMany({});
	await prisma.invitationGuest.deleteMany({});
	await prisma.guestInvitation.deleteMany({});
	await prisma.eventInvitation.deleteMany({});
	await prisma.guestCompanion.deleteMany({});
	await prisma.tableGuest.deleteMany({});
	await prisma.checklistItem.deleteMany({});
	await prisma.foodPlanItem.deleteMany({});
	await prisma.foodPlan.deleteMany({});
	await prisma.supplierInstallment.deleteMany({});
	await prisma.supplierPayment.deleteMany({});
	await prisma.supplier.deleteMany({});
	await prisma.inventoryMovement.deleteMany({});
	await prisma.inventoryItem.deleteMany({});
	await prisma.schedule.deleteMany({});
	await prisma.task.deleteMany({});
	await prisma.budget.deleteMany({});
	await prisma.table.deleteMany({});
	await prisma.guest.deleteMany({});
	await prisma.eventMember.deleteMany({});
	await prisma.event.deleteMany({});
	// Accounts and sessions last: users are recreated from scratch so a
	// re-run always produces the exact same login list.
	await prisma.session.deleteMany({});
	await prisma.account.deleteMany({});
	await prisma.user.deleteMany({});

	// ── 1. USERS + CREDENTIAL ACCOUNTS ────────────────────────────────
	// The account row is exactly what Better Auth's sign-in looks up:
	// providerId "credential", issuer "local:credential", accountId = user id,
	// scrypt password in the `salt:key` hex format verifyPassword expects.
	await prisma.user.createMany({
		data: SEED_USERS.map((user, i) => ({
			id: userIdAt(i),
			name: user.name,
			email: user.email,
			emailVerified: true,
			image: null,
			phone: `+244 923 ${pad(100 + i)} ${pad(i + 1, 3)}`,
		})),
	});
	const accountRecords = await Promise.all(
		SEED_USERS.map(async (user, i) => ({
			id: `acct_seed_${pad(i + 1, 2)}`,
			issuer: "local:credential",
			accountId: userIdAt(i),
			providerId: "credential",
			userId: userIdAt(i),
			password: await hashPassword(user.password),
		})),
	);
	await prisma.account.createMany({ data: accountRecords });
	console.log(`  ✅ Users (${SEED_USERS.length}) + credential accounts`);

	// ── 2. EVENTS ─────────────────────────────────────────────────────
	const eventRecords: Prisma.EventCreateManyInput[] = plans.map((plan) => {
		const rng = mulberry32(2000 + plan.index * 613);
		const venue = pick(rng, VENUES);
		const female = pick(rng, FEMALE_NAMES);
		const male = pick(rng, MALE_NAMES);
		const noun = plan.type === "WEDDING" ? "Casamento" : "Noivado";
		return {
			id: plan.id,
			ownerId: plan.ownerId,
			name: `${noun} ${female} & ${male}`,
			type: plan.type,
			status: plan.status,
			eventDate: plan.eventDate,
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
			limitGuestCapacity: true,
			currency: "AOA",
			description:
				plan.status === "CANCELLED"
					? "Evento cancelado por motivos da família."
					: plan.status === "DRAFT"
						? "Rascunho inicial — detalhes ainda a confirmar."
						: `${noun} com receção e celebração no ${venue.name}, ${venue.municipality}.`,
		};
	});
	await prisma.event.createMany({ data: eventRecords });
	console.log(`  ✅ Events (${eventRecords.length})`);

	// ── 3. EVENT MEMBERS + MEMBER INVITATIONS ─────────────────────────
	const memberRecords: Prisma.EventMemberCreateManyInput[] = [];
	const eventInvitationRecords: Prisma.EventInvitationCreateManyInput[] = [];
	const activeMemberIdsByEvent = new Map<string, string[]>();
	const memberUserIdsByEvent = new Map<string, string[]>();

	for (const plan of plans) {
		const rng = mulberry32(91 + plan.index * 149);
		const joined = (min: number, max: number) =>
			daysAgo(randInt(rng, min, max));
		// Users already used by this event's membership, in insertion order.
		const usedUsers: string[] = [plan.ownerId, plan.partnerId];
		const firstFree = (startAt: number): string => {
			const candidate = USER_IDS.find(
				(id) => !usedUsers.includes(id) && USER_IDS.indexOf(id) >= startAt,
			);
			// Wrap around when the tail is exhausted; 6 users never produce a
			// membership bigger than 5, so a candidate always exists.
			return (
				candidate ??
				USER_IDS.find((id) => !usedUsers.includes(id)) ??
				plan.partnerId
			);
		};

		const members: Array<{
			user: string;
			role: MemberRole;
			status: MemberStatus;
			joinedAt: Date | null;
		}> = [
			{
				user: plan.ownerId,
				role: "OWNER",
				status: "ACTIVE",
				joinedAt: joined(90, 240),
			},
			{
				user: plan.partnerId,
				role: "PARTNER",
				status: "ACTIVE",
				joinedAt: joined(60, 200),
			},
		];
		// Variety: some events carry an ADMIN, some an EDITOR, every 5th a
		// pending VIEWER invitation instead of a member.
		if (plan.index % 3 === 0 && plan.status !== "DRAFT") {
			const admin = firstFree(2);
			members.push({
				user: admin,
				role: "ADMIN",
				status: "ACTIVE",
				joinedAt: joined(20, 120),
			});
			usedUsers.push(admin);
		}
		if (plan.index % 5 === 2 && plan.status !== "DRAFT") {
			const editor = firstFree(2);
			members.push({
				user: editor,
				role: "EDITOR",
				status: "ACTIVE",
				joinedAt: joined(10, 60),
			});
			usedUsers.push(editor);
		}
		if (
			plan.index % 5 === 0 &&
			(plan.status === "CONFIRMED" || plan.status === "PLANNING")
		) {
			const invitee = firstFree(2);
			members.push({
				user: invitee,
				role: "VIEWER",
				status: "PENDING",
				joinedAt: null,
			});
			eventInvitationRecords.push({
				id: `evinv_seed_${pad(plan.index + 1)}`,
				eventId: plan.id,
				invitedBy: plan.ownerId,
				email: SEED_USERS[USER_IDS.indexOf(invitee)]?.email ?? null,
				role: "VIEWER",
				token: `tok_seed_${plan.index + 1}_${invitee.slice(-3)}`,
				status: "PENDING",
				expiresAt: monthsAhead(1),
			});
		}

		const activeIds: string[] = [];
		for (const m of members) {
			const id = `mem_${m.user}_${plan.id}`;
			if (m.status === "ACTIVE") activeIds.push(id);
			memberRecords.push({
				id,
				eventId: plan.id,
				userId: m.user,
				role: m.role,
				status: m.status,
				joinedAt: m.joinedAt,
			});
		}
		activeMemberIdsByEvent.set(plan.id, activeIds);
		memberUserIdsByEvent.set(
			plan.id,
			members.map((m) => m.user),
		);
	}
	await prisma.eventMember.createMany({ data: memberRecords });
	await prisma.eventInvitation.createMany({ data: eventInvitationRecords });
	console.log(
		`  ✅ Event Members (${memberRecords.length}) / Member Invitations (${eventInvitationRecords.length})`,
	);

	// ── 4. BUDGET TARGETS ─────────────────────────────────────────────
	// The Budget model is only a target: totalSpent/totalPaid are derived by
	// the API from suppliers + inventory, so both are sized to fit inside it.
	const budgetRecords: Prisma.BudgetCreateManyInput[] = plans.map((plan) => {
		const rng = mulberry32(311 + plan.index * 317);
		const perPerson =
			plan.type === "WEDDING"
				? Math.round(
						randInt(rng, 24, 46) *
							1000 *
							(plan.status === "DRAFT"
								? 0.8
								: plan.status === "COMPLETED"
									? 1.05
									: 1),
					)
				: randInt(rng, 14_000, 22_000);
		const plannedAmount = plan.capacity * perPerson;
		return {
			id: `bgt_seed_${pad(plan.index + 1)}`,
			eventId: plan.id,
			plannedAmount,
			reserveAmount: Math.round(plannedAmount * 0.08),
			notes:
				plan.status === "DRAFT"
					? "Orçamento preliminar — valores a confirmar."
					: "Alvo de planeamento; despesa real derivada de fornecedores e inventário.",
		};
	});
	await prisma.budget.createMany({ data: budgetRecords });
	console.log(`  ✅ Budgets (${budgetRecords.length})`);

	// ── 5. SUPPLIERS + PAYMENTS + INSTALLMENTS ────────────────────────
	const supplierRecords: Prisma.SupplierCreateManyInput[] = [];
	const supplierPaymentRecords: Prisma.SupplierPaymentCreateManyInput[] = [];
	const supplierInstallmentRecords: Prisma.SupplierInstallmentCreateManyInput[] =
		[];
	const cateringSupplierByEvent = new Map<string, string>();
	// Spend envelope per event: suppliers 62%, inventory 18%, reserve 10%
	// — the remaining 10% keeps the budget visibly not-overdrawn.
	const supplierSpendByEvent = new Map<string, number>();

	const WEDDING_SUPPLIER_CATS: readonly SupplierCategory[] = [
		"VENUE",
		"CATERING",
		"DECORATION",
		"MUSIC",
		"PHOTOGRAPHER",
		"VIDEOGRAPHER",
		"CAKE",
		"TRANSPORT",
		"BEAUTY",
		"ENTERTAINMENT",
	];
	const ENGAGEMENT_SUPPLIER_CATS: readonly SupplierCategory[] = [
		"VENUE",
		"CATERING",
		"DECORATION",
		"MUSIC",
		"PHOTOGRAPHER",
		"CAKE",
	];

	for (const plan of plans) {
		const rng = mulberry32(503 + plan.index * 271);
		const cats =
			plan.type === "WEDDING"
				? WEDDING_SUPPLIER_CATS
				: ENGAGEMENT_SUPPLIER_CATS;

		const count =
			plan.status === "DRAFT"
				? 2
				: plan.status === "CANCELLED"
					? 3
					: plan.status === "PLANNING"
						? Math.min(4, cats.length)
						: Math.min(cats.length, randInt(rng, 6, cats.length));

		const budgetRow = budgetRecords.find((b) => b.eventId === plan.id);
		let priceBudget = round5k(Number(budgetRow?.plannedAmount ?? 0) * 0.62);
		let spent = 0;

		for (let j = 0; j < count; j++) {
			const cat = cats[j % cats.length] as SupplierCategory;
			const rngV = mulberry32(607 + plan.index * 91 + j * 43);
			const business = pick(rngV, SUPPLIER_NAMES[cat]);
			const supplierId = `sup_seed_${pad(plan.index + 1)}_${j + 1}`;

			const status: SupplierStatus =
				plan.status === "COMPLETED"
					? "COMPLETED"
					: plan.status === "CANCELLED"
						? "CANCELLED"
						: plan.status === "DRAFT"
							? pick(rngV, ["PROSPECT", "CONTACTED"] as const)
							: plan.status === "PLANNING"
								? pick(rngV, ["CONTACTED", "NEGOTIATING", "CONFIRMED"] as const)
								: pick(rngV, [
										"NEGOTIATING",
										"CONFIRMED",
										"CONFIRMED",
									] as const);

			// Only committed suppliers carry an agreed price; the first takes a
			// larger share and the rest split what is left, so the sum of
			// prices never exceeds the suppliers slice of the budget.
			const isCommitted = status === "CONFIRMED" || status === "COMPLETED";
			const share = Math.max(1, count - j) / ((count * (count + 1)) / 2);
			const price = isCommitted
				? round5k(priceBudget * share * (0.85 + rngV() * 0.1))
				: 0;
			priceBudget -= price;

			const useInstallments = isCommitted && rngV() < 0.3;
			const installmentCount = useInstallments ? randInt(rngV, 2, 4) : 0;
			if (
				cat === "CATERING" &&
				isCommitted &&
				!cateringSupplierByEvent.has(plan.id)
			) {
				cateringSupplierByEvent.set(plan.id, supplierId);
			}

			supplierRecords.push({
				id: supplierId,
				eventId: plan.id,
				name: `${business} — ${CATEGORY_LABEL[cat] ?? "Serviços"}`,
				category: cat,
				phone: phone(rngV),
				email: `${business
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, "")
					.slice(0, 20)}@muxima.ao`,
				address: `${pick(rngV, VENUES).neighborhood}, ${pick(rngV, VENUES).province}`,
				status,
				description: `Serviço de ${(CATEGORY_LABEL[cat] ?? "apoio").toLowerCase()} para o evento.`,
				notes:
					status === "CONFIRMED"
						? "Contrato assinado e confirmado."
						: status === "COMPLETED"
							? "Serviço concluído com sucesso."
							: status === "CANCELLED"
								? "Contrato cancelado — sem encargos."
								: "Seguimento necessário.",
				price: price > 0 ? price : null,
				paymentModel: useInstallments
					? SupplierPaymentModel.INSTALLMENTS
					: SupplierPaymentModel.FULL,
				// Filled in below, once payments are known.
				paymentStatus: "PENDING",
				nextDueDate: null,
			});
			if (!isCommitted || price <= 0) continue;
			spent += price;

			// Installment schedule: equal parts, the last one absorbing the
			// rounding remainder so the parts always sum to the price. Dates
			// walk backwards from today, so a completed event has every
			// installment in the past.
			const installments: Array<{
				position: number;
				amount: number;
				dueDate: Date;
			}> = [];
			if (useInstallments) {
				const part = round5k(price / installmentCount);
				let running = 0;
				for (let k = 0; k < installmentCount; k++) {
					const amount = k === installmentCount - 1 ? price - running : part;
					running += amount;
					installments.push({
						position: k + 1,
						amount,
						dueDate: daysAgo(
							randInt(rngV, 3, 15) + (installmentCount - k) * 30,
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
						: pick(rngV, [0, 0, 0.35, 0.5, 0.75, 1]);
			let paid = 0;
			if (paidRatio > 0) {
				paid = paidRatio === 1 ? price : round5k(price * paidRatio);
				if (paid > 0) {
					supplierPaymentRecords.push({
						id: `spay_seed_${pad(plan.index + 1)}_${j + 1}`,
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
						reference: `TRF-${plan.eventDate.getFullYear()}-${pad(plan.index + 1)}-${j + 1}`,
						notes: paid === price ? "Pagamento integral" : "Adiantamento",
						createdBy: plan.ownerId,
					});
				}
			}

			// Installments are marked paid while cumulative payments cover
			// them, in due-date order — same rule the finance module applies.
			let covered = 0;
			for (const [k, installment] of installments.entries()) {
				const isPaid = paid - covered >= installment.amount;
				if (isPaid) covered += installment.amount;
				supplierInstallmentRecords.push({
					id: `sinst_seed_${pad(plan.index + 1)}_${j + 1}_${k + 1}`,
					supplierId,
					position: installment.position,
					amount: installment.amount,
					dueDate: installment.dueDate,
					status: isPaid ? "PAID" : "PENDING",
					paidAt: isPaid ? daysAgo(randInt(rngV, 1, 20)) : null,
					notes: isPaid ? "Parcela liquidada" : null,
				});
			}

			// Nearest installment not yet covered by payments.
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

			// Stored status, same precedence as the finance module.
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
		supplierSpendByEvent.set(plan.id, spent);
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
	const guestRecords: Prisma.GuestCreateManyInput[] = [];
	const companionRecords: Prisma.GuestCompanionCreateManyInput[] = [];
	const guestInvitationRecords: Prisma.GuestInvitationCreateManyInput[] = [];
	const invitationGuestRecords: Prisma.InvitationGuestCreateManyInput[] = [];
	const seededInvitationCodes = new Set<string>();
	const confirmedPeopleByEvent = new Map<string, number>();
	const guestIdsByEvent = new Map<string, string[]>();

	for (const plan of plans) {
		const rng = mulberry32(719 + plan.index * 353);
		const eventSlug = pad(plan.index + 1);
		const eventGuestIds: string[] = [];
		guestIdsByEvent.set(plan.id, eventGuestIds);
		// A guest is "active" when not declined/cancelled: only those can be
		// confirmed and occupy capacity.
		const addGuest = (
			n: number,
			data: {
				name: string;
				type: GuestType;
				status: GuestStatus;
				phone: string | null;
				companionsLimit: number;
				suffix: string;
			},
		) => {
			const id = `gst_seed_${eventSlug}_${pad(n, 4)}${data.suffix}`;
			eventGuestIds.push(id);
			guestRecords.push({
				id,
				eventId: plan.id,
				name: data.name,
				phone: data.phone,
				email:
					data.type === "VIP" || data.type === "COLLEAGUE"
						? `${data.name
								.toLowerCase()
								.replace(/[^a-z]+/g, ".")
								.slice(0, 24)}@mail.test`
						: null,
				group: pick(rng, GROUP_BY_TYPE[data.type]),
				type: data.type,
				status: data.status,
				// DECLINED guests never bring companions (they are not coming).
				companionsLimit: data.status === "DECLINED" ? 0 : data.companionsLimit,
			});
			return id;
		};

		if (plan.status === "DRAFT") {
			// A draft only has a handful of hand-added pending guests.
			const draftGuests = randInt(rng, 4, 8);
			for (let g = 0; g < draftGuests; g++) {
				const type = pick(rng, ["FAMILY", "FRIEND", "VIP"] as const);
				addGuest(g + 1, {
					name: personName(rng),
					type,
					status: "PENDING",
					phone: phone(rng),
					companionsLimit: 0,
					suffix: "",
				});
			}
			confirmedPeopleByEvent.set(plan.id, 0);
			continue;
		}

		if (plan.status === "CANCELLED") {
			// A cancelled event keeps the remnants of its guest list.
			for (let g = 0; g < 5; g++) {
				addGuest(g + 1, {
					name: personName(rng),
					type: pick(rng, ["FAMILY", "FRIEND", "OTHER"] as const),
					status: "PENDING",
					phone: phone(rng),
					companionsLimit: 0,
					suffix: "",
				});
			}
			confirmedPeopleByEvent.set(plan.id, 0);
			continue;
		}

		// Confirmed guests: fill the target, then spend the remaining seats
		// on companions so the event never crosses its capacity.
		let companionBudget = plan.capacity - plan.confirmedGuests;
		for (let g = 0; g < plan.confirmedGuests; g++) {
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
			const guestId = addGuest(g + 1, {
				name: personName(rng),
				type,
				status: "CONFIRMED",
				phone: phone(rng),
				companionsLimit,
				suffix: "",
			});

			// Companions are assigned only while the capacity budget lasts,
			// and never beyond the guest's own limit. A few stay PENDING to
			// exercise the confirmation flow (pending companions do not count
			// towards capacity).
			if (companionsLimit > 0 && companionBudget > 0) {
				const want = Math.min(
					companionsLimit,
					companionBudget,
					randInt(rng, 1, 2),
				);
				const allPending = rng() > 0.8;
				for (let c = 0; c < want; c++) {
					const companionStatus: CompanionStatus =
						allPending || rng() > 0.8 ? "PENDING" : "CONFIRMED";
					const role = c === 0 ? "Cônjuge" : "Acompanhante";
					companionRecords.push({
						id: `gcp_seed_${eventSlug}_${pad(g + 1, 4)}_${c + 1}`,
						guestId,
						name: `${role} ${pick(rng, ALL_FIRST_NAMES)}`,
						status: companionStatus,
					});
					if (companionStatus === "CONFIRMED") companionBudget -= 1;
				}
			}
		}

		// Non-confirmed guests: pending / declined / waiting, sized so the
		// lists look alive but never approach the capacity.
		const extras = Math.min(
			plan.capacity -
				plan.confirmedGuests -
				companionBudget +
				randInt(rng, 3, 10),
			Math.round(plan.capacity * 0.3),
		);
		for (let g = 0; g < Math.max(0, extras); g++) {
			const roll = rng();
			const status: GuestStatus =
				roll < 0.5 ? "PENDING" : roll < 0.78 ? "DECLINED" : "WAITING";
			addGuest(plan.confirmedGuests + g + 1, {
				name: personName(rng),
				type: pick(rng, [
					"FAMILY",
					"FRIEND",
					"COLLEAGUE",
					"VIP",
					"OTHER",
				] as const),
				status,
				phone: phone(rng),
				// A companion slot is only meaningful while hope remains.
				companionsLimit: status === "PENDING" ? randInt(rng, 0, 1) : 0,
				suffix: "_x",
			});
		}

		confirmedPeopleByEvent.set(plan.id, plan.confirmedGuests);
	}

	await prisma.guest.createMany({ data: guestRecords });
	await prisma.guestCompanion.createMany({ data: companionRecords });
	console.log(
		`  ✅ Guests (${guestRecords.length}) / Companions (${companionRecords.length})`,
	);

	// Guest invitations: one per event, linked to a few guests. Only live
	// (non-draft/cancelled) events carry codes.
	for (const plan of plans) {
		if (plan.status === "DRAFT" || plan.status === "CANCELLED") continue;
		const rng = mulberry32(853 + plan.index * 257);
		// Guest invitations: one per event, linked to every 4th guest. Only
		// live (non-draft/cancelled) events carry codes.
		const invitedGuestIds = (guestIdsByEvent.get(plan.id) ?? []).filter(
			(_, i) => i % 4 === 0,
		);
		if (invitedGuestIds.length === 0) continue;

		const invId = `ginv_seed_${pad(plan.index + 1)}`;
		const responded = plan.confirmedGuests > 0 && plan.status !== "PLANNING";
		guestInvitationRecords.push({
			id: invId,
			eventId: plan.id,
			code: uniqueSeedInvitationCode(rng, seededInvitationCodes),
			status: responded ? "RESPONDED" : pick(rng, ["SENT", "OPENED"] as const),
			rsvpStatus: (responded
				? plan.status === "COMPLETED"
					? "CONFIRMED"
					: pick(rng, ["CONFIRMED", "MAYBE"] as const)
				: "PENDING") as RsvpStatus,
			sentAt: daysAgo(randInt(rng, 20, 70)),
			openedAt: responded
				? daysAgo(randInt(rng, 15, 60))
				: rng() > 0.5
					? daysAgo(randInt(rng, 5, 15))
					: null,
			respondedAt: responded ? daysAgo(randInt(rng, 10, 50)) : null,
		});
		for (const guestId of invitedGuestIds) {
			invitationGuestRecords.push({
				id: `ig_seed_${pad(plan.index + 1)}_${guestId.slice(-6)}`,
				invitationId: invId,
				guestId,
			});
		}
	}
	await prisma.guestInvitation.createMany({ data: guestInvitationRecords });
	await prisma.invitationGuest.createMany({ data: invitationGuestRecords });
	console.log(
		`  ✅ Guest Invitations (${guestInvitationRecords.length}) / Links (${invitationGuestRecords.length})`,
	);

	// ── 7. TABLES + SEATING ───────────────────────────────────────────
	const tableRecords: Prisma.TableCreateManyInput[] = [];
	const tableGuestRecords: Prisma.TableGuestCreateManyInput[] = [];

	for (const plan of plans) {
		if (plan.status === "DRAFT" || plan.status === "CANCELLED") continue;
		const rng = mulberry32(823 + plan.index * 181);
		const confirmed = plan.confirmedGuests;
		if (confirmed <= 0) continue;

		// Table sizes sum exactly to the event capacity: 6-10 seat tables with
		// the last one absorbing the remainder. Free seats inside partially
		// filled tables provide the headroom, never an over-capacity layout.
		const caps: number[] = [];
		let covered = 0;
		while (plan.capacity - covered >= 12) {
			const size = Math.min(randInt(rng, 6, 10), plan.capacity - covered);
			caps.push(size);
			covered += size;
		}
		const rest = plan.capacity - covered;
		if (rest > 0) caps.push(rest);

		caps.forEach((cap, idx) => {
			tableRecords.push({
				id: `tbl_seed_${pad(plan.index + 1)}_${idx + 1}`,
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

		// Seat confirmed guests greedily (companions sit with their guest in
		// real life but are not seats here — the API only assigns guests).
		const seats: Array<{ table: number; slot: number }> = [];
		caps.forEach((cap, ti) => {
			for (let s = 0; s < cap; s++) seats.push({ table: ti, slot: s });
		});
		const seatingCount = Math.min(confirmed, seats.length);
		for (let k = 0; k < seatingCount; k++) {
			const seat = seats[k];
			if (!seat) continue;
			tableGuestRecords.push({
				id: `tg_seed_${pad(plan.index + 1)}_${seat.table + 1}_${seat.slot + 1}`,
				tableId: `tbl_seed_${pad(plan.index + 1)}_${seat.table + 1}`,
				guestId: `gst_seed_${pad(plan.index + 1)}_${pad(k + 1, 4)}`,
			});
		}
	}
	await prisma.table.createMany({ data: tableRecords });
	await prisma.tableGuest.createMany({ data: tableGuestRecords });
	console.log(
		`  ✅ Tables (${tableRecords.length}) / Table Guests (${tableGuestRecords.length})`,
	);

	// ── 8. TASKS + SCHEDULES ──────────────────────────────────────────
	const taskRecords: Prisma.TaskCreateManyInput[] = [];
	const scheduleRecords: Prisma.ScheduleCreateManyInput[] = [];
	const allCategories = Object.keys(TASK_TEMPLATES) as TaskCategory[];

	for (const plan of plans) {
		const rng = mulberry32(941 + plan.index * 271);

		const taskCount =
			plan.status === "DRAFT"
				? randInt(rng, 2, 5)
				: plan.status === "CANCELLED"
					? randInt(rng, 5, 8)
					: randInt(rng, 9, 14);
		for (let j = 0; j < taskCount; j++) {
			const cat = allCategories[j % allCategories.length] as TaskCategory;
			const template = pick(rng, TASK_TEMPLATES[cat]);
			const completed =
				plan.status === "COMPLETED"
					? rng() > 0.25
					: plan.status === "CANCELLED"
						? rng() > 0.7
						: rng() > 0.6;
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
				id: `tsk_seed_${pad(plan.index + 1)}_${j + 1}`,
				eventId: plan.id,
				title: template,
				description: `Tarefa de ${cat.toLowerCase()} para o planeamento do evento.`,
				category: cat,
				priority: pick(rng, [
					"LOW",
					"MEDIUM",
					"MEDIUM",
					"HIGH",
					"URGENT",
				] as const) as TaskPriority,
				status,
				assignedTo: plan.partnerId,
				dueDate,
				completedAt: completed ? daysAgo(randInt(rng, 1, 40)) : null,
				completedBy: completed ? plan.ownerId : null,
				createdBy: plan.ownerId,
			});
		}

		// Schedules follow the event date; COMPLETED events ran everything,
		// CANCELLED events keep the plan but flagged as cancelled.
		const template =
			plan.type === "WEDDING" ? SCHEDULE_WEDDING : SCHEDULE_ENGAGEMENT;
		const scheduleStatus: ScheduleStatus =
			plan.status === "COMPLETED"
				? "COMPLETED"
				: plan.status === "CANCELLED"
					? "CANCELLED"
					: "PENDING";
		template.forEach((s, si) => {
			const start = new Date(plan.eventDate);
			start.setHours(Math.floor(s.start), Math.round((s.start % 1) * 60), 0, 0);
			const end = new Date(plan.eventDate);
			// Hours >= 24 roll into the next day (end 25 → 01:00 next day).
			end.setHours(Math.floor(s.end), Math.round((s.end % 1) * 60), 0, 0);
			scheduleRecords.push({
				id: `sch_seed_${pad(plan.index + 1)}_${si + 1}`,
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

	// ── 9. INVENTORY + MOVEMENTS ──────────────────────────────────────
	const inventoryRecords: Prisma.InventoryItemCreateManyInput[] = [];
	const movementRecords: Prisma.InventoryMovementCreateManyInput[] = [];
	const inventorySpendByEvent = new Map<string, number>();

	for (const plan of plans) {
		const rng = mulberry32(1021 + plan.index * 149);
		const pool =
			plan.type === "WEDDING" ? INVENTORY_WEDDING : INVENTORY_ENGAGEMENT;
		const count =
			plan.status === "DRAFT"
				? 2
				: plan.status === "CANCELLED"
					? 3
					: Math.min(pool.length, randInt(rng, 7, pool.length));
		const chosen = [...pool].sort(() => rng() - 0.5).slice(0, count);

		// Quantities are normalised so sum(price × planned) equals the event's
		// inventory slice of the budget: the derived "totalSpent" the API
		// computes stays inside the planned amount.
		const slice = round5k(
			Number(
				budgetRecords.find((b) => b.eventId === plan.id)?.plannedAmount ?? 0,
			) * 0.18,
		);
		const weights = chosen.map(() => 1 + rng() * 12);
		const weightedCost = chosen.reduce(
			(sum, item, i) =>
				sum + randInt(rng, item.min, item.max) * (weights[i] ?? 1),
			0,
		);
		const scale = weightedCost > 0 ? slice / weightedCost : 0;
		let spent = 0;

		for (const [j, item] of chosen.entries()) {
			const unitPrice = randInt(rng, item.min, item.max);
			const plannedQuantity = Math.max(
				1,
				Math.round((weights[j] ?? 1) * scale),
			);
			const roll = rng();
			// A healthy mix of full, partial and not-yet-started items.
			const currentQuantity =
				plan.status === "COMPLETED"
					? plannedQuantity
					: roll < 0.2
						? 0
						: roll < 0.55
							? Math.max(1, Math.round(plannedQuantity * (0.2 + rng() * 0.4)))
							: plannedQuantity;
			const status: InventoryStatus =
				currentQuantity >= plannedQuantity
					? "COMPLETED"
					: currentQuantity > 0
						? "IN_PROGRESS"
						: "PENDING";
			const itemId = `inv_seed_${pad(plan.index + 1)}_${j + 1}`;

			inventoryRecords.push({
				id: itemId,
				eventId: plan.id,
				name: item.name,
				category: item.category,
				plannedQuantity,
				currentQuantity,
				status,
				unit: item.unit,
				unitPrice,
				notes:
					status === "PENDING"
						? "A aguardar entrega."
						: status === "IN_PROGRESS" && currentQuantity < plannedQuantity / 2
							? "Stock abaixo do esperado."
							: null,
			});
			spent += currentQuantity * unitPrice;

			if (currentQuantity > 0) {
				movementRecords.push({
					id: `mv_seed_${pad(plan.index + 1)}_${j + 1}_1`,
					inventoryItemId: itemId,
					type: "PURCHASE" as MovementType,
					quantity: currentQuantity,
					unitPrice,
					totalCost: currentQuantity * unitPrice,
					reason: "Compra inicial ao fornecedor",
					createdBy: plan.ownerId,
					createdAt: daysAgo(randInt(rng, 10, 90)),
				});
			}
			if (currentQuantity > 0 && rng() > 0.6) {
				movementRecords.push({
					id: `mv_seed_${pad(plan.index + 1)}_${j + 1}_2`,
					inventoryItemId: itemId,
					type: "CONSUMPTION" as MovementType,
					quantity: Math.max(
						1,
						Math.round(currentQuantity * (0.05 + rng() * 0.2)),
					),
					unitPrice,
					totalCost: 0,
					reason: "Consumo em ensaio/reunião de planeamento",
					createdBy: plan.partnerId,
					createdAt: daysAgo(randInt(rng, 1, 30)),
				});
			}
		}
		inventorySpendByEvent.set(plan.id, spent);
	}

	await prisma.inventoryItem.createMany({ data: inventoryRecords });
	await prisma.inventoryMovement.createMany({ data: movementRecords });
	console.log(
		`  ✅ Inventory (${inventoryRecords.length}) / Movements (${movementRecords.length})`,
	);

	// ── 10. FOOD PLAN + CHECKLIST ─────────────────────────────────────
	const foodPlanRecords: Prisma.FoodPlanCreateManyInput[] = [];
	const foodPlanItemRecords: Prisma.FoodPlanItemCreateManyInput[] = [];
	const checklistRecords: Prisma.ChecklistItemCreateManyInput[] = [];

	for (const plan of plans) {
		const rngF = mulberry32(911 + plan.index * 97);

		// One food plan per event, attached to the catering supplier when
		// the event has a committed one (the API allows at most one).
		const planId = `fpl_seed_${pad(plan.index + 1)}`;
		const cateringId = cateringSupplierByEvent.get(plan.id) ?? null;
		foodPlanRecords.push({
			id: planId,
			eventId: plan.id,
			supplierId: cateringId,
			notes:
				plan.status === "DRAFT"
					? "Menu por definir com o fornecedor."
					: plan.status === "CANCELLED"
						? "Menu suspenso — evento cancelado."
						: "Menu aprovado com o fornecedor.",
		});

		// Quantities are derived from the number of confirmed people, not
		// raw capacity, so the plan matches what the guest module reports.
		const diners = Math.max(1, confirmedPeopleByEvent.get(plan.id) ?? 0);
		const menuCount =
			plan.status === "DRAFT" ? randInt(rngF, 3, 5) : randInt(rngF, 6, 10);
		const menu = [...FOOD_PLAN_MENU].sort(() => rngF() - 0.5);
		for (const [j, dish] of menu.slice(0, menuCount).entries()) {
			const roll = rngF();
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
				id: `fpi_seed_${pad(plan.index + 1)}_${j + 1}`,
				eventId: plan.id,
				foodPlanId: planId,
				name: dish.name,
				category: dish.category,
				quantity: Math.max(
					1,
					Math.round(
						diners * (plan.status === "DRAFT" ? 0.15 : 1) * (dish.share ?? 1),
					),
				),
				unit: dish.unit,
				description: dish.desc,
				status,
				position: j + 1,
			});
		}

		// ── Checklist: API-derived + manual items ──
		// Statuses are derived exactly like the API derives them: a supplier
		// item is complete when the supplier is confirmed and fully paid; an
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
							: supplier.status === "COMPLETED"
								? "COMPLETED"
								: "PENDING";

			checklistRecords.push({
				id: `chk_seed_sup_${pad(plan.index + 1)}_${nextPosition()}`,
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
				id: `chk_seed_inv_${pad(plan.index + 1)}_${nextPosition()}`,
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

		const manual = [...CHECKLIST_TEMPLATES].sort(() => rngF() - 0.5);
		const manualCount =
			plan.status === "DRAFT" ? 1 : plan.status === "CANCELLED" ? 2 : 4;
		for (const [j, template] of manual.slice(0, manualCount).entries()) {
			const status: ChecklistStatus =
				plan.status === "COMPLETED"
					? "COMPLETED"
					: plan.status === "CANCELLED"
						? "CANCELLED"
						: plan.status === "DRAFT"
							? "PENDING"
							: pick(rngF, ["PENDING", "IN_PROGRESS", "COMPLETED"] as const);
			checklistRecords.push({
				id: `chk_seed_man_${pad(plan.index + 1)}_${j + 1}`,
				eventId: plan.id,
				title: template.title,
				description: template.desc,
				status,
				autoManaged: false,
				position: nextPosition(),
				dueDate:
					plan.status === "COMPLETED"
						? daysAgo(randInt(rngF, 20, 60))
						: daysAhead(randInt(rngF, 5, 60)),
				completedAt:
					status === "COMPLETED" ? daysAgo(randInt(rngF, 1, 20)) : null,
			});
		}
	}
	await prisma.foodPlan.createMany({ data: foodPlanRecords });
	await prisma.foodPlanItem.createMany({ data: foodPlanItemRecords });
	await prisma.checklistItem.createMany({ data: checklistRecords });
	console.log(
		`  ✅ Food Plans (${foodPlanRecords.length}) / Items (${foodPlanItemRecords.length}) / Checklist (${checklistRecords.length})`,
	);

	// ── 11. NOTIFICATIONS + AUDIT LOGS ────────────────────────────────
	const notificationRecords: Prisma.NotificationCreateManyInput[] = [];
	const auditRecords: Prisma.AuditLogCreateManyInput[] = [];

	for (const plan of plans) {
		const rng = mulberry32(1307 + plan.index * 179);
		const members = memberUserIdsByEvent.get(plan.id) ?? [plan.ownerId];
		const target = members[randInt(rng, 0, members.length - 1)] ?? plan.ownerId;

		const notificationTypes = [
			"FINANCE",
			"TASKS",
			"GUESTS",
			"INVENTORY",
			"EVENT",
		] as const;
		const nCount = plan.status === "DRAFT" ? 0 : randInt(rng, 1, 3);
		for (let n = 0; n < nCount; n++) {
			const type = pick(rng, notificationTypes);
			notificationRecords.push({
				id: `ntf_seed_${pad(plan.index + 1)}_${n + 1}`,
				userId: target,
				eventId: plan.id,
				type,
				title: `Atualização de ${type.toLowerCase()}`,
				message: `Existem novidades no evento: verifique a secção de ${type.toLowerCase()}.`,
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

		const aCount = plan.status === "DRAFT" ? 1 : 2;
		for (let a = 0; a < aCount; a++) {
			auditRecords.push({
				id: `audit_seed_${pad(plan.index + 1)}_${a + 1}`,
				eventId: plan.id,
				userId: target,
				action: a === 0 ? "CREATE" : "UPDATE",
				entity: pick(rng, ["Event", "Budget", "Supplier", "Guest", "Task"]),
				entityId: plan.id,
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

	// ── 12. DEDICATIONS ───────────────────────────────────────────────
	// Three examples exercising every visible state of the module:
	//   1. locked + NOT_STARTED → owner only, nothing written yet
	//   2. locked + DRAFT       → owner only, text in progress
	//   3. shared + READY       → explicit member grants, already opened once
	const dedicationRecords: Prisma.DedicationCreateManyInput[] = [];
	const dedicationViewerRecords: Prisma.DedicationViewerCreateManyInput[] = [];

	/** Tiptap-shaped document, mirroring what the editor actually stores. */
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

	const wedding = plans[0];
	if (!wedding) throw new Error("Event plan 0 missing");
	dedicationRecords.push(
		{
			id: "ded_seed_vows",
			eventId: wedding.id,
			ownerId: wedding.ownerId,
			title: "Os nossos votos",
			type: "WEDDING_VOW" as DedicationType,
			status: "NOT_STARTED" as DedicationStatus,
			content: doc(),
			isLocked: true,
			lastOpenedAt: null,
		},
		{
			id: "ded_seed_letter",
			eventId: wedding.id,
			ownerId: wedding.ownerId,
			title: "Carta para o grande dia",
			type: "DEDICATION" as DedicationType,
			status: "DRAFT" as DedicationStatus,
			content: doc(
				"Amor, ainda não sei escrever isto sem te rir a meio.",
				"Prometo-te todos os pequenos gestos de todos os dias.",
			),
			isLocked: true,
			lastOpenedAt: daysAgo(6),
		},
	);

	// The shared one lives on an engagement that is still being planned, so
	// the sharing flow can be exercised end to end. Grants always point at
	// active memberships; the owner is deliberately never granted.
	const shared = plans.find(
		(p) => p.type === "ENGAGEMENT" && p.status === "PLANNING",
	);
	if (!shared)
		throw new Error(
			"No planning engagement available for the shared dedication",
		);
	dedicationRecords.push({
		id: "ded_seed_shared",
		eventId: shared.id,
		ownerId: shared.ownerId,
		title: "Votos de noivado",
		type: "ENGAGEMENT_VOW" as DedicationType,
		status: "READY" as DedicationStatus,
		content: doc(
			"Escolhi-te num café cheio de gente e não voltei a olhar para outra.",
			"Obrigado por me fazeres rir primeiro.",
		),
		isLocked: false,
		lastOpenedAt: daysAgo(2),
	});

	const sharedMemberIds = (activeMemberIdsByEvent.get(shared.id) ?? []).filter(
		(memberId) => memberId !== `mem_${shared.ownerId}_${shared.id}`,
	);
	for (const [index, memberId] of sharedMemberIds.slice(0, 3).entries()) {
		dedicationViewerRecords.push({
			id: `ddv_seed_${index + 1}`,
			dedicationId: "ded_seed_shared",
			eventMemberId: memberId,
			lastOpenedAt: index === 0 ? daysAgo(2) : null,
		});
	}

	await prisma.dedication.createMany({ data: dedicationRecords });
	await prisma.dedicationViewer.createMany({ data: dedicationViewerRecords });
	console.log(
		`  ✅ Dedications (${dedicationRecords.length}) / Viewers (${dedicationViewerRecords.length})`,
	);

	// History for the shared dedication, so the audit tab has content.
	type HistoryEntry = {
		action: string;
		oldData?: Prisma.InputJsonValue;
		newData?: Prisma.InputJsonValue;
		createdAt: Date;
		userId?: string;
	};

	const sharedHistoryEntries: HistoryEntry[] = [
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
			newData: { eventMemberId: sharedMemberIds[0] },
			createdAt: daysAgo(3),
		},
		{ action: "OPENED", createdAt: daysAgo(2), userId: shared.partnerId },
	];

	const sharedHistory: Prisma.AuditLogCreateManyInput[] =
		sharedHistoryEntries.map((row, index) => ({
			id: `audit_seed_ded_${index + 1}`,
			eventId: shared.id,
			userId: row.userId ?? shared.ownerId,
			action: row.action,
			entity: "Dedication",
			entityId: "ded_seed_shared",
			// Nullable Json columns: omitting the key is how a SQL NULL is
			// written, so only real snapshots are listed.
			...(row.oldData !== undefined && { oldData: row.oldData }),
			...(row.newData !== undefined && { newData: row.newData }),
			createdAt: row.createdAt,
		}));
	await prisma.auditLog.createMany({ data: sharedHistory });
	console.log(`  ✅ Dedication Audit Logs (${sharedHistory.length})`);

	// ── FINAL VALIDATION (fails loudly, never seeds silently) ─────────
	let capacityViolations = 0;
	for (const plan of plans) {
		const confirmedCompanions = companionRecords.filter(
			(c) =>
				c.status === "CONFIRMED" &&
				guestRecords.find((g) => g.id === c.guestId)?.eventId === plan.id,
		).length;
		const total =
			(confirmedPeopleByEvent.get(plan.id) ?? 0) + confirmedCompanions;
		if (total > plan.capacity) {
			capacityViolations += 1;
			console.error(
				`  ❌ Capacity violation on ${plan.id}: ${total} > ${plan.capacity}`,
			);
		}
	}
	if (capacityViolations > 0)
		throw new Error(`${capacityViolations} capacity violation(s)`);

	const spendViolations = plans.filter((plan) => {
		const planned = Number(
			budgetRecords.find((b) => b.eventId === plan.id)?.plannedAmount ?? 0,
		);
		return (
			(supplierSpendByEvent.get(plan.id) ?? 0) +
				(inventorySpendByEvent.get(plan.id) ?? 0) >
			planned
		);
	});
	if (spendViolations.length > 0) {
		throw new Error(
			`Budget overrun on: ${spendViolations.map((p) => p.id).join(", ")}`,
		);
	}

	// ── DONE ──────────────────────────────────────────────────────────
	const weddings = plans.filter((p) => p.type === "WEDDING").length;
	const engagements = plans.filter((p) => p.type === "ENGAGEMENT").length;
	console.log("\n🎉 Seed completed successfully!");
	console.log(`   Users:          ${SEED_USERS.length}`);
	console.log(
		`   Events:         ${plans.length} (${weddings} weddings / ${engagements} engagements)`,
	);
	console.log(`   Members:        ${memberRecords.length}`);
	console.log(`   Budgets:        ${budgetRecords.length}`);
	console.log(`   Suppliers:      ${supplierRecords.length}`);
	console.log(`   Sup. Payments:  ${supplierPaymentRecords.length}`);
	console.log(`   Sup. Installs:  ${supplierInstallmentRecords.length}`);
	console.log(`   Guests:         ${guestRecords.length}`);
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
	console.log(`   Notifications:  ${notificationRecords.length}`);
	console.log(
		`   Audit Logs:     ${auditRecords.length + sharedHistory.length}`,
	);
	console.log(`   Dedications:    ${dedicationRecords.length}`);
	console.log("\n🔐 Credenciais de acesso (email / senha):");
	for (const user of SEED_USERS) {
		console.log(`   ${user.email}  /  ${user.password}`);
	}
}

main()
	.catch((e) => {
		console.error("❌ Seed failed:", e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
