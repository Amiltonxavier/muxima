/**
 * Prisma Seed Script — Muxima
 *
 * Populates the database with a deterministic, realistic dataset:
 * exactly 40 events (30 weddings + 10 engagements) with full relational data
 * across every module (members, budgets, vendors, guests, tables, tasks,
 * schedules, inventory, expenses, payments, documents, notifications, audits).
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
import { type Prisma, PrismaClient } from "../prisma/generated/client";

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

function scryptAsync(password: string, salt: Buffer, keylen: number) {
	return new Promise<Buffer>((resolve, reject) => {
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
const VENDOR_NAMES: Record<string, readonly string[]> = {
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
	PHOTOGRAPHY: [
		"Olhar Fotográfico",
		"Luz & Sombra",
		"Fotografia Horizonte",
		"Kiss Glow",
		"Lente Mágica",
	],
	VIDEO: ["CineMuxima", "Vídeo Nota", "Filmes do Mussulo", "Câmara & História"],
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
	DRINKS: [
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
	MUSIC: "Música",
	PHOTOGRAPHY: "Fotografia",
	VIDEO: "Vídeo",
	CATERING: "Catering",
	CAKE: "Bolo",
	DRINKS: "Bebidas",
	TRANSPORT: "Transportes",
	BEAUTY: "Beleza",
	SECURITY: "Segurança",
	ENTERTAINMENT: "Animação",
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

function buildEventPlans(): EventPlan[] {
	return EVENT_STATUSES.map((status, i) => {
		const type = i < 30 ? "WEDDING" : "ENGAGEMENT";
		const capacity =
			type === "WEDDING"
				? WEDDING_CAPACITIES[i]
				: ENGAGEMENT_CAPACITIES[i - 30];
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

interface GuestSeed {
	record: Prisma.GuestCreateManyInput;
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
	{ name: "Barriga de Porco Assada", cat: "FOOD", unit: "KG", price: 6500 },
	{ name: "Calulu de Frango", cat: "FOOD", unit: "KG", price: 4000 },
	{ name: "Arroz com Tomate", cat: "FOOD", unit: "KG", price: 1500 },
	{ name: "Salada Tropical", cat: "FOOD", unit: "KG", price: 3000 },
	{
		name: "Bolo de Casamento 4 Andares",
		cat: "CAKE",
		unit: "UNIT",
		price: 250000,
	},
	{
		name: "Rosas Brancas (centro de mesa)",
		cat: "DECORATION",
		unit: "UNIT",
		price: 800,
	},
	{ name: "Velas Aromáticas", cat: "DECORATION", unit: "UNIT", price: 500 },
	{
		name: "Tecido Organza Branco",
		cat: "DECORATION",
		unit: "PACKAGE",
		price: 15000,
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
		cat: "FOOD",
		unit: "KG",
		price: 5500,
	},
	{ name: "Canapés de Queijo", cat: "FOOD", unit: "KG", price: 4800 },
	{ name: "Bolo de Noivado", cat: "CAKE", unit: "UNIT", price: 120000 },
	{ name: "Balões Dourados", cat: "DECORATION", unit: "UNIT", price: 1200 },
] as const;

const EXPENSE_TEMPLATES: Record<
	string,
	readonly { desc: string; share: number }[]
> = {
	VENUE: [
		{ desc: "Aluguer do espaço", share: 1 },
		{ desc: "Caução e licença do espaço", share: 0.12 },
	],
	DECORATION: [
		{ desc: "Arranjos florais", share: 0.5 },
		{ desc: "Decoração e iluminação", share: 0.5 },
	],
	MUSIC: [
		{ desc: "DJ e som", share: 0.6 },
		{ desc: "Banda ao vivo", share: 0.4 },
	],
	PHOTOGRAPHY: [{ desc: "Fotografia e vídeo", share: 1 }],
	VIDEO: [{ desc: "Edição de vídeo", share: 1 }],
	CATERING: [{ desc: "Catering completo", share: 1 }],
	CAKE: [{ desc: "Bolo e doces", share: 1 }],
	DRINKS: [{ desc: "Bebidas e bar", share: 1 }],
	TRANSPORT: [{ desc: "Transporte e cortejo", share: 1 }],
	BEAUTY: [{ desc: "Maquilhagem, penteado e cuidados", share: 1 }],
	SECURITY: [{ desc: "Segurança do evento", share: 1 }],
	ENTERTAINMENT: [{ desc: "Animação e efeitos", share: 1 }],
	OTHER: [{ desc: "Papelaria e lembranças", share: 1 }],
};

async function main() {
	console.log("🌱 Seeding database...");

	const plans = buildEventPlans();

	// ── Idempotent cleanup (cascades from events) ─────────────────────
	await prisma.guestInvitation.deleteMany({});
	await prisma.eventInvitation.deleteMany({});
	await prisma.invitationGuest.deleteMany({});
	await prisma.guestCompanion.deleteMany({});
	await prisma.tableGuest.deleteMany({});
	await prisma.$executeRaw`TRUNCATE TABLE "audit_log", "notification", "document", "payment", "expense", "inventory_movement", "inventory_item", "schedule", "task", "table_guest", "guest_companion", "invitation_guest", "guest_invitation", "event_invitation", "guest", "vendor_contract", "vendor", "budget_category", "budget", "table", "event_member", "event" CASCADE`;
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
			role: Prisma.MemberRole;
			status: Prisma.MemberStatus;
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

	// ── 4. BUDGETS + CATEGORIES ────────────────────────────────────────
	const budgetRecords: Prisma.BudgetCreateManyInput[] = [];
	const budgetCatRecords: Prisma.BudgetCategoryCreateManyInput[] = [];

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
					: "Orçamento distribuído por categorias de fornecedores.",
		});

		const cats =
			plan.type === "WEDDING"
				? [
						"Espaço & Decoração",
						"Catering & Bebidas",
						"Música & Entretenimento",
						"Fotografia & Vídeo",
						"Vestuário & Beleza",
						"Transporte & Logística",
						"Convites & Papelaria",
					]
				: [
						"Espaço & Decoração",
						"Catering & Bebidas",
						"Música & Entretenimento",
						"Fotografia & Vídeo",
					];

		let remaining = Math.round(plannedAmount * 0.92);
		cats.forEach((cat, j) => {
			const isLast = j === cats.length - 1;
			const amount = isLast
				? remaining
				: Math.round(remaining * (0.08 + rng() * 0.22));
			remaining -= amount;
			budgetCatRecords.push({
				id: `bcat_${pad(plan.index + 1)}_${j + 1}_${SEED_PREFIX}`,
				eventId: plan.id,
				name: cat,
				description: `Despesas de ${cat.toLowerCase()}`,
				plannedAmount: amount,
			});
		});
	}
	await prisma.budget.createMany({ data: budgetRecords });
	await prisma.budgetCategory.createMany({ data: budgetCatRecords });
	console.log(
		`  ✅ Budgets (${budgetRecords.length}) / Categories (${budgetCatRecords.length})`,
	);

	// ── 5. VENDORS + CONTRACTS ─────────────────────────────────────────
	const vendorRecords: Prisma.VendorCreateManyInput[] = [];
	const contractRecords: Prisma.VendorContractCreateManyInput[] = [];

	const WEDDING_VENDOR_CATS = [
		"VENUE",
		"DECORATION",
		"CATERING",
		"MUSIC",
		"PHOTOGRAPHY",
		"TRANSPORT",
		"BEAUTY",
		"ENTERTAINMENT",
	] as const;
	const ENGAGEMENT_VENDOR_CATS = [
		"VENUE",
		"DECORATION",
		"CATERING",
		"MUSIC",
		"PHOTOGRAPHY",
		"CAKE",
	] as const;

	for (const plan of plans) {
		const rng = mulberry32(503 + plan.index * 271);
		const cats: readonly string[] =
			plan.type === "WEDDING" ? WEDDING_VENDOR_CATS : ENGAGEMENT_VENDOR_CATS;

		const count =
			plan.status === "DRAFT"
				? 2
				: plan.status === "CANCELLED"
					? 3
					: Math.min(cats.length, randInt(rng, 5, cats.length));
		const usedCats: string[] = [];

		for (let j = 0; j < count; j++) {
			let cat = pick(rng, cats);
			if (usedCats.includes(cat))
				cat = cats.find((c) => !usedCats.includes(c)) ?? cat;
			usedCats.push(cat);
			const rngV = mulberry32(607 + plan.index * 91 + j * 43);
			const business = pick(
				rngV,
				VENDOR_NAMES[cat] ?? (["Muxima Serviços"] as const),
			);
			const status: Prisma.VendorStatus =
				plan.status === "COMPLETED"
					? "COMPLETED"
					: plan.status === "CANCELLED"
						? "CANCELLED"
						: plan.status === "DRAFT"
							? "PROSPECT"
							: pick(rngV, ["CONTACTED", "NEGOTIATING", "CONTRACTED"] as const);

			vendorRecords.push({
				id: `vnd_${pad(plan.index + 1)}_${j + 1}_${SEED_PREFIX}`,
				eventId: plan.id,
				name: `${business} — ${CATEGORY_LABEL[cat] ?? "Serviços"}`,
				category: cat as Prisma.VendorCategory,
				phone: `+244 ${randInt(rngV, 910, 989)} ${pad(randInt(rngV, 0, 999))} ${pad(randInt(rngV, 0, 999))}`,
				email: `${business.toLowerCase().replace(/[^a-z0-9]+/g, "")}@muxima.ao`,
				address: `${pick(rngV, VENUES).neighborhood}, ${pick(rngV, VENUES).province}`,
				status,
				description: `Serviço de ${CATEGORY_LABEL[cat]?.toLowerCase() ?? "apoio"} para o evento.`,
				notes:
					status === "CONTRACTED"
						? "Contrato assinado e confirmado."
						: status === "COMPLETED"
							? "Serviço concluído com sucesso."
							: "Seguimento necessário.",
			});

			// Contract for contracted/completed vendors.
			if (
				(status === "CONTRACTED" || status === "COMPLETED") &&
				rngV() > 0.35
			) {
				contractRecords.push({
					id: `ctr_${pad(plan.index + 1)}_${j + 1}_${SEED_PREFIX}`,
					eventId: plan.id,
					vendorId: `vnd_${pad(plan.index + 1)}_${j + 1}_${SEED_PREFIX}`,
					number: `CT-2026-${pad(plan.index + 1)}-${j + 1}`,
					startDate: daysAgo(randInt(rngV, 5, 60)),
					endDate: daysAhead(randInt(rngV, 30, 200)),
					amount:
						Math.round((plan.capacity * randInt(rngV, 4000, 12000)) / 500) *
						500,
					status: plan.status === "COMPLETED" ? "COMPLETED" : "ACTIVE",
					notes: "Pagamento por etapas conforme contrato.",
				});
			}
		}
	}
	await prisma.vendor.createMany({ data: vendorRecords });
	await prisma.vendorContract.createMany({ data: contractRecords });
	console.log(
		`  ✅ Vendors (${vendorRecords.length}) / Contracts (${contractRecords.length})`,
	);

	// ── 6. GUESTS + COMPANIONS + INVITATIONS ──────────────────────────
	const guestRecords: Prisma.GuestCreateManyInput[] = [];
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
						const companionStatus: Prisma.CompanionStatus = pending
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

			const invStatus: Prisma.GuestInvitationStatus =
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
									: randInt(rng, 0, 1) === 0
										? "SENT"
										: "OPENED";
			const rsvp: Prisma.RsvpStatus =
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
	const uniqueGuests: Prisma.GuestCreateManyInput[] = [];
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
			const status: Prisma.TaskStatus = completed
				? "COMPLETED"
				: overdue
					? "IN_PROGRESS"
					: pick(rng, ["TODO", "IN_PROGRESS"] as const);

			taskRecords.push({
				id: `tsk_${pad(plan.index + 1)}_${j + 1}`,
				eventId: plan.id,
				title: template,
				description: `Tarefa de ${cat.toLowerCase()} para o planeamento do evento.`,
				category: cat as Prisma.TaskCategory,
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
		const scheduleStatus: Prisma.ScheduleStatus =
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

		for (const [j, item] of selected.slice(0, count).entries()) {
			const plannedQuantity = randInt(rng, 5, 120);
			const roll = rng();
			// Some items full, some low, some zero — analytics friendly.
			const currentQuantity =
				roll < 0.2
					? 0
					: roll < 0.5
						? Math.round(plannedQuantity * (0.1 + rng() * 0.4))
						: plannedQuantity;
			const status: Prisma.InventoryStatus =
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
				category: item.cat as Prisma.InventoryCategory,
				plannedQuantity,
				currentQuantity,
				venueQuantity:
					status === "COMPLETED" ? plannedQuantity : currentQuantity,
				status,
				unit: item.unit as Prisma.InventoryUnit,
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

	// ── 10. EXPENSES + PAYMENTS + DOCUMENTS ────────────────────────────
	const expenseRecords: Prisma.ExpenseCreateManyInput[] = [];
	const paymentRecords: Prisma.PaymentCreateManyInput[] = [];
	const documentRecords: Prisma.DocumentCreateManyInput[] = [];

	const budgetCatIndex = new Map<string, number>();
	budgetCatRecords.forEach((c, ci) => {
		budgetCatIndex.set(c.eventId, ci);
	});

	for (const plan of plans) {
		const rng = mulberry32(1117 + plan.index * 211);
		const cats = budgetCatRecords.filter((c) => c.eventId === plan.id);
		const totalPlanned =
			budgetRecords.find((b) => b.eventId === plan.id)?.plannedAmount ?? 0;
		// Utilization varies: completed ~ full, drafts near zero, others 30-75%.
		const utilization =
			plan.status === "COMPLETED"
				? 0.9 + rng() * 0.18
				: plan.status === "CANCELLED"
					? 0.1 + rng() * 0.15
					: plan.status === "DRAFT"
						? 0 + rng() * 0.05
						: plan.status === "CONFIRMED"
							? 0.45 + rng() * 0.3
							: randInt(rng, 25, 60) / 100;
		const spendTarget = Math.round(Number(totalPlanned) * utilization);

		let spent = 0;
		for (const [ci, cat] of cats.entries()) {
			const share = 0.1 + rng() * 0.35;
			const expCount = randInt(rng, 1, 2);
			const templates =
				EXPENSE_TEMPLATES[cat.name.split(" & ")[0] as string] ??
				EXPENSE_TEMPLATES.OTHER ??
				[];
			for (let e = 0; e < expCount; e++) {
				const expId = `exp_${pad(plan.index + 1)}_${ci + 1}_${e + 1}`;
				const isLast = ci === cats.length - 1 && e === expCount - 1;
				const amount = isLast
					? Math.max(0, spendTarget - spent)
					: Math.round((spendTarget * share) / expCount / 500) * 500;
				spent += amount;
				const vendor = vendorRecords.find(
					(v) =>
						v.eventId === plan.id &&
						(v.category as string) === (cat.name.split(" & ")[0] ?? ""),
				);
				const tpl = templates[e % templates.length] ??
					templates[0] ?? { desc: "Serviço", share: 1 };
				const paidShare =
					plan.status === "COMPLETED"
						? 1
						: plan.status === "CANCELLED"
							? 0
							: rng();
				const status: Prisma.ExpenseStatus =
					plan.status === "CANCELLED"
						? "CANCELLED"
						: plan.status === "COMPLETED"
							? "PAID"
							: paidShare > 0.7
								? "PAID"
								: paidShare > 0.4
									? "PARTIALLY_PAID"
									: rng() > 0.5
										? "PLANNED"
										: "OVERDUE";
				const paidPercentage =
					status === "PAID"
						? 100
						: status === "PARTIALLY_PAID"
							? randInt(rng, 30, 60)
							: 0;

				expenseRecords.push({
					id: expId,
					eventId: plan.id,
					budgetCategoryId: cat.id,
					vendorId: vendor?.id ?? null,
					description: `${tpl.desc} — ${cat.name}`,
					type: "EXPENSE",
					totalAmount: amount,
					dueDate:
						status === "OVERDUE"
							? daysAgo(randInt(rng, 1, 10))
							: daysAhead(randInt(rng, 5, 90)),
					status,
					paidPercentage,
					notes:
						status === "PAID"
							? "Pagamento concluído."
							: status === "OVERDUE"
								? "Pagamento em atraso."
								: null,
					createdBy: plan.ownerId,
					inventoryItemId: null,
				});

				// Payments consistent with paidPercentage.
				const paidAmount =
					Math.round((Number(amount) * paidPercentage) / 100 / 500) * 500;
				if (paidAmount > 0) {
					paymentRecords.push({
						id: `pay_${pad(plan.index + 1)}_${ci + 1}_${e + 1}`,
						expenseId: expId,
						amount: paidAmount,
						paymentDate: daysAgo(randInt(rng, 1, 40)),
						method: pick(rng, [
							"CASH",
							"BANK_TRANSFER",
							"ATM",
							"CARD",
							"MOBILE_PAYMENT",
						] as const),
						reference:
							status === "PAID"
								? `TRF-2026-${pad(plan.index + 1)}-${ci + 1}-${e + 1}`
								: null,
						notes: status === "PAID" ? "Pagamento integral" : "Adiantamento",
						createdBy: plan.ownerId,
					});
				}

				// Documents for major expenses (only when a payment row exists).
				if (paidAmount > 0 && status === "PAID" && rng() > 0.6) {
					documentRecords.push({
						id: `doc_${pad(plan.index + 1)}_${ci + 1}_${e + 1}`,
						eventId: plan.id,
						name: `Fatura — ${tpl.desc} (${cat.name})`,
						type: "RECEIPT",
						reference: `FAT-2026-${pad(plan.index + 1)}-${ci + 1}-${e + 1}`,
						vendorId: vendor?.id ?? null,
						expenseId: expId,
						paymentId: `pay_${pad(plan.index + 1)}_${ci + 1}_${e + 1}`,
						status: "ACTIVE",
						createdBy: plan.ownerId,
					});
				}
			}
		}
	}
	await prisma.expense.createMany({ data: expenseRecords });
	await prisma.payment.createMany({ data: paymentRecords });
	await prisma.document.createMany({ data: documentRecords });
	console.log(
		`  ✅ Expenses (${expenseRecords.length}) / Payments (${paymentRecords.length}) / Documents (${documentRecords.length})`,
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

		const notificationTypes: Prisma.NotificationType[] = [
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
			"Vendor",
			"Expense",
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
				entityId: `${pick(rng, ["evt", "bgt", "vnd", "exp", "gst", "tsk"])}_${plan.index + 1}`,
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

	// ── DONE ───────────────────────────────────────────────────────────
	console.log("\n🎉 Seed completed successfully!");
	console.log(`   Users:          ${SEED_USERS.length}`);
	console.log(`   Events:         ${eventRecords.length}`);
	console.log(`   Event Members:  ${memberRecords.length}`);
	console.log(`   Budgets:        ${budgetRecords.length}`);
	console.log(`   Budget Cats:    ${budgetCatRecords.length}`);
	console.log(`   Vendors:        ${vendorRecords.length}`);
	console.log(`   Contracts:      ${contractRecords.length}`);
	console.log(`   Guests:         ${uniqueGuests.length}`);
	console.log(`   Companions:     ${companionRecords.length}`);
	console.log(`   Invitations:    ${guestInvitationRecords.length}`);
	console.log(`   Tables:         ${tableRecords.length}`);
	console.log(`   Table Guests:   ${tableGuestRecords.length}`);
	console.log(`   Tasks:          ${taskRecords.length}`);
	console.log(`   Schedules:      ${scheduleRecords.length}`);
	console.log(`   Inventory:      ${inventoryRecords.length}`);
	console.log(`   Movements:      ${movementRecords.length}`);
	console.log(`   Expenses:       ${expenseRecords.length}`);
	console.log(`   Payments:       ${paymentRecords.length}`);
	console.log(`   Documents:      ${documentRecords.length}`);
	console.log(`   Notifications:  ${notificationRecords.length}`);
	console.log(`   Audit Logs:     ${auditRecords.length}`);
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
