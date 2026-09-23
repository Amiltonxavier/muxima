/**
 * Prisma Seed Script — Muxima
 *
 * Populates the database with realistic data for a wedding/engagement planning app.
 * Run: npx tsx packages/db/prisma/seed.ts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import { PrismaClient } from "../prisma/generated/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../apps/server/.env") });

const adapter = new PrismaPg({
	connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

// ── IDs (fixed so relations are deterministic) ──────────────────────
const USER_OWNER = "usr_owner_001";
const USER_PARTNER = "usr_partner_002";
const USER_ADMIN = "usr_admin_003";

const EVENT_WEDDING = "evt_wedding_001";
const EVENT_ENGAGEMENT = "evt_engagement_002";

// ── Timestamps ──────────────────────────────────────────────────────
const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);
const daysAhead = (d: number) => new Date(now.getTime() + d * 86_400_000);
const monthsAhead = (m: number) => {
	const d = new Date(now);
	d.setMonth(d.getMonth() + m);
	return d;
};

async function main() {
	console.log("🌱 Seeding database...");

	// ================================================================
	// 1. USERS (Better Auth schema)
	// ================================================================
	const users = [
		{
			id: USER_OWNER,
			name: "Ana Fernandes",
			email: "ana@muxima.ao",
			emailVerified: true,
			image: null,
		},
		{
			id: USER_PARTNER,
			name: "Carlos Mendes",
			email: "carlos@muxima.ao",
			emailVerified: true,
			image: null,
		},
		{
			id: USER_ADMIN,
			name: "Sofia Neto",
			email: "sofia@muxima.ao",
			emailVerified: false,
			image: null,
		},
	];

	for (const u of users) {
		await prisma.user.upsert({
			where: { id: u.id },
			update: {},
			create: u,
		});
	}
	console.log("  ✅ Users");

	// ================================================================
	// 2. EVENTS
	// ================================================================
	await prisma.event.upsert({
		where: { id: EVENT_WEDDING },
		update: {},
		create: {
			id: EVENT_WEDDING,
			ownerId: USER_OWNER,
			name: "Casamento Ana & Carlos",
			type: "WEDDING",
			status: "PLANNING",
			eventDate: monthsAhead(4),
			startTime: "15:00",
			endTime: "02:00",
			venueName: "Convento de São Francisco",
			address: "Rua Major Kanhangulo",
			province: "Luanda",
			municipality: "Luanda",
			neighborhood: "Maianga",
			reference: "Próximo ao Hospital Central",
			capacity: 250,
			limitGuestCapacity: true,
			currency: "AOA",
			description:
				"Casamento civil e religioso com recepção no jardim do convento.",
		},
	});

	await prisma.event.upsert({
		where: { id: EVENT_ENGAGEMENT },
		update: {},
		create: {
			id: EVENT_ENGAGEMENT,
			ownerId: USER_PARTNER,
			name: "Noivado Beatriz & David",
			type: "ENGAGEMENT",
			status: "CONFIRMED",
			eventDate: monthsAhead(1),
			startTime: "18:00",
			endTime: "23:00",
			venueName: "Clube Mineiro",
			address: "Rua dos Enganos",
			province: "Luanda",
			municipality: "Luanda",
			neighborhood: "Miramar",
			capacity: 120,
			limitGuestCapacity: false,
			currency: "AOA",
			description:
				"Festa de noivado intimista com familiares e amigos próximos.",
		},
	});
	console.log("  ✅ Events");

	// ================================================================
	// 3. EVENT MEMBERS
	// ================================================================
	const memberData = [
		{
			eventId: EVENT_WEDDING,
			userId: USER_OWNER,
			role: "OWNER" as const,
			status: "ACTIVE" as const,
			joinedAt: daysAgo(90),
		},
		{
			eventId: EVENT_WEDDING,
			userId: USER_PARTNER,
			role: "PARTNER" as const,
			status: "ACTIVE" as const,
			joinedAt: daysAgo(85),
		},
		{
			eventId: EVENT_WEDDING,
			userId: USER_ADMIN,
			role: "ADMIN" as const,
			status: "ACTIVE" as const,
			joinedAt: daysAgo(80),
		},
		{
			eventId: EVENT_ENGAGEMENT,
			userId: USER_PARTNER,
			role: "OWNER" as const,
			status: "ACTIVE" as const,
			joinedAt: daysAgo(45),
		},
		{
			eventId: EVENT_ENGAGEMENT,
			userId: USER_OWNER,
			role: "PARTNER" as const,
			status: "ACTIVE" as const,
			joinedAt: daysAgo(40),
		},
	];

	for (const m of memberData) {
		await prisma.eventMember.upsert({
			where: { eventId_userId: { eventId: m.eventId, userId: m.userId } },
			update: {},
			create: {
				...m,
				id: `mem_${m.userId}_${m.eventId}`,
			},
		});
	}
	console.log("  ✅ Event Members");

	// ================================================================
	// 4. BUDGETS
	// ================================================================
	await prisma.budget.upsert({
		where: { eventId: EVENT_WEDDING },
		update: {},
		create: {
			eventId: EVENT_WEDDING,
			plannedAmount: 8_500_000,
			reserveAmount: 500_000,
			notes: "Orçamento baseado em cotações de 3 fornecedores.",
		},
	});

	await prisma.budget.upsert({
		where: { eventId: EVENT_ENGAGEMENT },
		update: {},
		create: {
			eventId: EVENT_ENGAGEMENT,
			plannedAmount: 2_200_000,
			reserveAmount: 200_000,
			notes: "Evento mais reduzido — foco em experiência.",
		},
	});
	console.log("  ✅ Budgets");

	// ================================================================
	// 5. BUDGET CATEGORIES
	// ================================================================
	const weddingCategories = [
		{
			name: "Espaço & Decoração",
			description: "Aluguer do venue e enfeites",
			plannedAmount: 2_500_000,
		},
		{
			name: "Catering & Bebidas",
			description: "Buffet e bar aberto",
			plannedAmount: 2_200_000,
		},
		{
			name: "Música & Entretenimento",
			description: "DJ, banda e animação",
			plannedAmount: 1_200_000,
		},
		{
			name: "Fotografia & Vídeo",
			description: "Cobertura completa do evento",
			plannedAmount: 900_000,
		},
		{
			name: "Vestuário & Beleza",
			description: "Vestido, terno, maquilhagem",
			plannedAmount: 1_000_000,
		},
		{
			name: "Transporte & Logística",
			description: "Decoração de carros e transportes",
			plannedAmount: 400_000,
		},
		{
			name: "Convites & Papelaria",
			description: "Convites, menus, cartões",
			plannedAmount: 300_000,
		},
	];

	const budgetCatIds: Record<string, string> = {};

	for (let i = 0; i < weddingCategories.length; i++) {
		const cat = weddingCategories[i];
		const id = `bcat_wed_${i + 1}`;
		budgetCatIds[cat.name] = id;
		await prisma.budgetCategory.upsert({
			where: { id },
			update: {},
			create: {
				id,
				eventId: EVENT_WEDDING,
				...cat,
			},
		});
	}

	const engagementCategories = [
		{
			name: "Espaço & Decoração",
			description: "Decoração do jardim",
			plannedAmount: 600_000,
		},
		{
			name: "Catering",
			description: "Petiscos e bebidas leves",
			plannedAmount: 500_000,
		},
		{
			name: "Música",
			description: "DJ e som ambiente",
			plannedAmount: 350_000,
		},
		{
			name: "Fotografia",
			description: "Sessão fotográfica do evento",
			plannedAmount: 400_000,
		},
	];

	for (let i = 0; i < engagementCategories.length; i++) {
		const cat = engagementCategories[i];
		const id = `bcat_eng_${i + 1}`;
		await prisma.budgetCategory.upsert({
			where: { id },
			update: {},
			create: {
				id,
				eventId: EVENT_ENGAGEMENT,
				...cat,
			},
		});
	}
	console.log("  ✅ Budget Categories");

	// ================================================================
	// 6. VENDORS
	// ================================================================
	const vendorData = [
		{
			id: "vnd_001",
			eventId: EVENT_WEDDING,
			name: "Jardim das Flores — Decoração",
			category: "DECORATION" as const,
			phone: "+244 923 456 789",
			email: "contato@jardimdasflores.ao",
			address: "Rua da Missão, Luanda",
			status: "CONTRACTED" as const,
			description: "Empresas especializada em decoração de eventos casamentos.",
			notes: "Preferência por flores naturais e tons pastel.",
		},
		{
			id: "vnd_002",
			eventId: EVENT_WEDDING,
			name: "Chef Ngola — Catering",
			category: "CATERING" as const,
			phone: "+244 912 345 678",
			email: "reservas@chefngola.ao",
			address: "Via Fidelidade, Luanda",
			status: "CONTRACTED" as const,
			description: "Catering premium com cozinha angolana e internacional.",
			notes: "Menu a confirmar: barriga de porco, calulu, bacalhau.",
		},
		{
			id: "vnd_003",
			eventId: EVENT_WEDDING,
			name: "Som & Arte — DJ e Banda",
			category: "MUSIC" as const,
			phone: "+244 934 567 890",
			email: "booking@somarte.ao",
			address: "Viana, Luanda",
			status: "NEGOTIATING" as const,
			description: "DJ residencial e banda ao vivo de kizomba e semba.",
			notes: "Orçamento pendente — pedir referências.",
		},
		{
			id: "vnd_004",
			eventId: EVENT_WEDDING,
			name: "Olhar Fotográfico",
			category: "PHOTOGRAPHY" as const,
			phone: "+244 945 678 901",
			email: "info@olharfotografico.ao",
			address: "Talatona, Luanda",
			status: "CONTRACTED" as const,
			description: "Fotógrafo e videógrafo profissional.",
			notes: "Pacote inclui drone e edited highlights.",
		},
		{
			id: "vnd_005",
			eventId: EVENT_WEDDING,
			name: "Belleza Noiva — Beleza",
			category: "BEAUTY" as const,
			phone: "+244 956 789 012",
			email: "agendamento@bellezanoiva.ao",
			address: "Kinaxixi, Luanda",
			status: "CONTACTED" as const,
			description: "Maquilhagem, penteados e tratamentos para noivas.",
			notes: "Agendar provas 2 meses antes.",
		},
		{
			id: "vnd_006",
			eventId: EVENT_WEDDING,
			name: "Transportes Reais",
			category: "TRANSPORT" as const,
			phone: "+244 967 890 123",
			email: "reservas@transportesreais.ao",
			address: "Marginal, Luanda",
			status: "PROSPECT" as const,
			description: "Aluguer de veículos decorados para o cortejo.",
			notes: "Verificar disponibilidade para a data.",
		},
		{
			id: "vnd_007",
			eventId: EVENT_ENGAGEMENT,
			name: "Doce Momento — Pastelaria",
			category: "CAKE" as const,
			phone: "+244 978 901 234",
			email: "encomendas@docemomento.ao",
			address: "Miramar, Luanda",
			status: "CONTRACTED" as const,
			description: "Bolos de noivado, doces e sweet table.",
			notes: "Tema: dourado e branco.",
		},
		{
			id: "vnd_008",
			eventId: EVENT_ENGAGEMENT,
			name: "Som Ambiente — Eventos",
			category: "ENTERTAINMENT" as const,
			phone: "+244 989 012 345",
			email: "eventos@sombiente.ao",
			address: "Ilha de Luanda",
			status: "CONTRACTED" as const,
			description: "Som, iluminação e projectores para eventos.",
			notes: "Inclui ecrã de projectação.",
		},
	];

	for (const v of vendorData) {
		await prisma.vendor.upsert({
			where: { id: v.id },
			update: {},
			create: v,
		});
	}
	console.log("  ✅ Vendors");

	// ================================================================
	// 7. VENDOR CONTRACTS
	// ================================================================
	const contractData = [
		{
			id: "ctr_001",
			eventId: EVENT_WEDDING,
			vendorId: "vnd_001",
			number: "CT-2026-001",
			startDate: daysAgo(30),
			endDate: monthsAhead(4),
			amount: 1_800_000,
			status: "ACTIVE" as const,
			notes: "Pagamento: 50% adiantado, 50% no dia.",
		},
		{
			id: "ctr_002",
			eventId: EVENT_WEDDING,
			vendorId: "vnd_002",
			number: "CT-2026-002",
			startDate: daysAgo(20),
			endDate: monthsAhead(4),
			amount: 2_200_000,
			status: "ACTIVE" as const,
			notes: "IncluiServiço de garçons e louça.",
		},
		{
			id: "ctr_003",
			eventId: EVENT_WEDDING,
			vendorId: "vnd_004",
			number: "CT-2026-003",
			startDate: daysAgo(15),
			endDate: monthsAhead(5),
			amount: 850_000,
			status: "DRAFT" as const,
			notes: "Aguardar assinatura.",
		},
	];

	for (const c of contractData) {
		await prisma.vendorContract.upsert({
			where: { id: c.id },
			update: {},
			create: c,
		});
	}
	console.log("  ✅ Vendor Contracts");

	// ================================================================
	// 8. GUESTS (Wedding)
	// ================================================================
	const weddingGuests = [
		{
			name: "Dr. António Fernandes",
			type: "FAMILY" as const,
			status: "CONFIRMED" as const,
			phone: "+244 912 111 001",
			group: "Família da Noiva",
			companionsLimit: 1,
		},
		{
			name: "D. Maria Fernandes",
			type: "FAMILY" as const,
			status: "CONFIRMED" as const,
			phone: "+244 912 111 002",
			group: "Família da Noiva",
			companionsLimit: 0,
		},
		{
			name: "Pedro Fernandes",
			type: "FAMILY" as const,
			status: "CONFIRMED" as const,
			phone: "+244 912 111 003",
			group: "Família da Noiva",
			companionsLimit: 1,
		},
		{
			name: "Inês Fernandes",
			type: "FAMILY" as const,
			status: "CONFIRMED" as const,
			phone: "+244 912 111 004",
			group: "Família da Noiva",
			companionsLimit: 1,
		},
		{
			name: "Eng. Rui Mendes",
			type: "FAMILY" as const,
			status: "CONFIRMED" as const,
			phone: "+244 923 222 001",
			group: "Família do Noivo",
			companionsLimit: 1,
		},
		{
			name: "D. Teresa Mendes",
			type: "FAMILY" as const,
			status: "CONFIRMED" as const,
			phone: "+244 923 222 002",
			group: "Família do Noivo",
			companionsLimit: 0,
		},
		{
			name: "João Mendes",
			type: "FAMILY" as const,
			status: "PENDING" as const,
			phone: "+244 923 222 003",
			group: "Família do Noivo",
			companionsLimit: 1,
		},
		{
			name: "Ricardo Mendes",
			type: "FAMILY" as const,
			status: "CONFIRMED" as const,
			phone: "+244 923 222 004",
			group: "Família do Noivo",
			companionsLimit: 2,
		},
		{
			name: "Dr. Paulo Almeida",
			type: "FRIEND" as const,
			status: "CONFIRMED" as const,
			phone: "+244 934 333 001",
			group: "Amigos da Universidade",
			companionsLimit: 1,
		},
		{
			name: "Marta Santos",
			type: "FRIEND" as const,
			status: "CONFIRMED" as const,
			phone: "+244 934 333 002",
			group: "Amigos da Universidade",
			companionsLimit: 1,
		},
		{
			name: "Beatriz Costa",
			type: "FRIEND" as const,
			status: "CONFIRMED" as const,
			phone: "+244 934 333 003",
			group: "Amigos da Universidade",
			companionsLimit: 0,
		},
		{
			name: "Fernando Gomes",
			type: "FRIEND" as const,
			status: "DECLINED" as const,
			phone: "+244 934 333 004",
			group: "Amigos da Universidade",
			companionsLimit: 1,
		},
		{
			name: "Lucas Silva",
			type: "COLLEAGUE" as const,
			status: "PENDING" as const,
			phone: "+244 945 444 001",
			group: "Trabalho — Banco",
			companionsLimit: 1,
		},
		{
			name: "Raquel Tomás",
			type: "COLLEAGUE" as const,
			status: "CONFIRMED" as const,
			phone: "+244 945 444 002",
			group: "Trabalho — Banco",
			companionsLimit: 0,
		},
		{
			name: "D. Conceição",
			type: "VIP" as const,
			status: "CONFIRMED" as const,
			phone: "+244 956 555 001",
			group: "Padrinho e Madrinha",
			companionsLimit: 1,
		},
		{
			name: "Eng. Manuel Baptista",
			type: "VIP" as const,
			status: "CONFIRMED" as const,
			phone: "+244 956 555 002",
			group: "Padrinho e Madrinha",
			companionsLimit: 1,
		},
		{
			name: "Vizinha Dona Graça",
			type: "OTHER" as const,
			status: "PENDING" as const,
			phone: "+244 967 666 001",
			group: "Vizinhos",
			companionsLimit: 1,
		},
		{
			name: "Primo Sérgio",
			type: "FAMILY" as const,
			status: "WAITING" as const,
			phone: "+244 978 777 001",
			group: "Família da Noiva",
			companionsLimit: 2,
		},
		{
			name: "Tia Leonor",
			type: "FAMILY" as const,
			status: "CONFIRMED" as const,
			phone: "+244 989 888 001",
			group: "Família do Noivo",
			companionsLimit: 1,
		},
		{
			name: "Amigo Carlos Neto",
			type: "FRIEND" as const,
			status: "PENDING" as const,
			phone: "+244 990 999 001",
			group: "Amigos da Universidade",
			companionsLimit: 1,
		},
	];

	const weddingGuestIds: string[] = [];
	for (let i = 0; i < weddingGuests.length; i++) {
		const id = `gst_wed_${String(i + 1).padStart(3, "0")}`;
		weddingGuestIds.push(id);
		await prisma.guest.upsert({
			where: { id },
			update: {},
			create: {
				id,
				eventId: EVENT_WEDDING,
				...weddingGuests[i],
			},
		});
	}

	// Engagement guests (fewer)
	const engagementGuests = [
		{
			name: "Família Ribeiro",
			type: "FAMILY" as const,
			status: "CONFIRMED" as const,
			group: "Família",
			companionsLimit: 2,
		},
		{
			name: "Amigos do Trabalho",
			type: "COLLEAGUE" as const,
			status: "CONFIRMED" as const,
			group: "Trabalho",
			companionsLimit: 0,
		},
		{
			name: "Padrinho Tomás",
			type: "VIP" as const,
			status: "CONFIRMED" as const,
			group: "Padrinho",
			companionsLimit: 1,
		},
		{
			name: "Madrinha Luísa",
			type: "VIP" as const,
			status: "CONFIRMED" as const,
			group: "Madrinha",
			companionsLimit: 1,
		},
		{
			name: "Vizinhos do Miramar",
			type: "OTHER" as const,
			status: "PENDING" as const,
			group: "Vizinhos",
			companionsLimit: 1,
		},
	];

	const engagementGuestIds: string[] = [];
	for (let i = 0; i < engagementGuests.length; i++) {
		const id = `gst_eng_${String(i + 1).padStart(3, "0")}`;
		engagementGuestIds.push(id);
		await prisma.guest.upsert({
			where: { id },
			update: {},
			create: {
				id,
				eventId: EVENT_ENGAGEMENT,
				...engagementGuests[i],
			},
		});
	}
	console.log("  ✅ Guests");

	// ================================================================
	// 9. GUEST COMPANIONS
	// ================================================================
	const companionData = [
		{
			guestId: "gst_wed_001",
			name: "D. Ana Paula (esposa)",
			status: "CONFIRMED" as const,
		},
		{
			guestId: "gst_wed_003",
			name: "Filho Tiago",
			status: "CONFIRMED" as const,
		},
		{
			guestId: "gst_wed_004",
			name: "Filho Miguel",
			status: "PENDING" as const,
		},
		{
			guestId: "gst_wed_005",
			name: "Esposa Dona Lurdes",
			status: "CONFIRMED" as const,
		},
		{
			guestId: "gst_wed_007",
			name: "Esposa Filipa",
			status: "PENDING" as const,
		},
		{
			guestId: "gst_wed_008",
			name: "Esposa Carminda",
			status: "CONFIRMED" as const,
		},
		{
			guestId: "gst_wed_008",
			name: "Filho André",
			status: "CONFIRMED" as const,
		},
		{
			guestId: "gst_wed_009",
			name: "Esposa Diana",
			status: "CONFIRMED" as const,
		},
		{
			guestId: "gst_wed_010",
			name: "Esposa Teresa",
			status: "DECLINED" as const,
		},
		{
			guestId: "gst_wed_015",
			name: "Marido Dr. Baptista",
			status: "CONFIRMED" as const,
		},
		{
			guestId: "gst_wed_016",
			name: "Esposa Dona Fátima",
			status: "CONFIRMED" as const,
		},
		{
			guestId: "gst_wed_019",
			name: "Esposa Dona Célia",
			status: "CONFIRMED" as const,
		},
		{
			guestId: "gst_wed_020",
			name: "Filho Eduardo",
			status: "PENDING" as const,
		},
	];

	for (let i = 0; i < companionData.length; i++) {
		await prisma.guestCompanion.upsert({
			where: { id: `gc_${String(i + 1).padStart(3, "0")}` },
			update: {},
			create: {
				id: `gc_${String(i + 1).padStart(3, "0")}`,
				...companionData[i],
			},
		});
	}
	console.log("  ✅ Guest Companions");

	// ================================================================
	// 10. GUEST INVITATIONS (uses InvitationGuest junction table)
	// ================================================================
	for (let i = 0; i < weddingGuestIds.length; i++) {
		const statuses = [
			"SENT",
			"SENT",
			"OPENED",
			"RESPONDED",
			"CREATED",
		] as const;
		const status = statuses[i % statuses.length];
		const invId = `gi_wed_${String(i + 1).padStart(3, "0")}`;
		await prisma.guestInvitation.upsert({
			where: { id: invId },
			update: {},
			create: {
				id: invId,
				eventId: EVENT_WEDDING,
				code: `MUX-${String(1000 + i)}`,
				status,
				sentAt: status !== "CREATED" ? daysAgo(60 - i * 2) : null,
				openedAt:
					status === "OPENED" || status === "RESPONDED"
						? daysAgo(55 - i * 2)
						: null,
				respondedAt: status === "RESPONDED" ? daysAgo(50 - i * 2) : null,
			},
		});

		// Create junction table record
		await prisma.invitationGuest.upsert({
			where: {
				invitationId_guestId: {
					invitationId: invId,
					guestId: weddingGuestIds[i],
				},
			},
			update: {},
			create: {
				id: `ig_${String(i + 1).padStart(3, "0")}`,
				invitationId: invId,
				guestId: weddingGuestIds[i],
			},
		});
	}
	console.log("  ✅ Guest Invitations");

	// ================================================================
	// 11. TABLES (Wedding)
	// ================================================================
	const weddingTables = [
		{
			name: "Mesa da Família Noiva",
			number: 1,
			capacity: 8,
			location: "Ao lado do palco",
		},
		{
			name: "Mesa da Família Noivo",
			number: 2,
			capacity: 8,
			location: "Ao lado do palco",
		},
		{
			name: "Mesa Padrinhos",
			number: 3,
			capacity: 6,
			location: "Frente ao altar",
		},
		{
			name: "Mesa Amigos da Universidade",
			number: 4,
			capacity: 10,
			location: "Zona central",
		},
		{
			name: "Mesa Trabalho Banco",
			number: 5,
			capacity: 8,
			location: "Zona lateral",
		},
		{
			name: "Mesa VIP",
			number: 6,
			capacity: 6,
			location: "Ao lado da mesa principal",
		},
		{
			name: "Mesa Vizinhos",
			number: 7,
			capacity: 8,
			location: "Zona traseira",
		},
		{
			name: "Mesa Reserva",
			number: 8,
			capacity: 10,
			location: "Zona traseira",
		},
	];

	const weddingTableIds: string[] = [];
	for (let i = 0; i < weddingTables.length; i++) {
		const id = `tbl_wed_${String(i + 1).padStart(3, "0")}`;
		weddingTableIds.push(id);
		await prisma.table.upsert({
			where: { id },
			update: {},
			create: {
				id,
				eventId: EVENT_WEDDING,
				...weddingTables[i],
			},
		});
	}
	console.log("  ✅ Tables");

	// ================================================================
	// 12. TABLE-GUEST ASSIGNMENTS
	// ================================================================
	const tableAssignments = [
		// Mesa Família Noiva
		{ tableId: weddingTableIds[0], guestId: weddingGuestIds[0] }, // Dr. António
		{ tableId: weddingTableIds[0], guestId: weddingGuestIds[1] }, // D. Maria
		{ tableId: weddingTableIds[0], guestId: weddingGuestIds[2] }, // Pedro
		{ tableId: weddingTableIds[0], guestId: weddingGuestIds[3] }, // Inês
		{ tableId: weddingTableIds[0], guestId: weddingGuestIds[17] }, // Primo Sérgio
		{ tableId: weddingTableIds[0], guestId: weddingGuestIds[18] }, // Tia Leonor
		// Mesa Família Noivo
		{ tableId: weddingTableIds[1], guestId: weddingGuestIds[4] }, // Eng. Rui
		{ tableId: weddingTableIds[1], guestId: weddingGuestIds[5] }, // D. Teresa
		{ tableId: weddingTableIds[1], guestId: weddingGuestIds[6] }, // João
		{ tableId: weddingTableIds[1], guestId: weddingGuestIds[7] }, // Ricardo
		// Mesa Padrinhos
		{ tableId: weddingTableIds[2], guestId: weddingGuestIds[14] }, // D. Conceição
		{ tableId: weddingTableIds[2], guestId: weddingGuestIds[15] }, // Eng. Manuel
		// Mesa Amigos
		{ tableId: weddingTableIds[3], guestId: weddingGuestIds[8] }, // Dr. Paulo
		{ tableId: weddingTableIds[3], guestId: weddingGuestIds[9] }, // Marta
		{ tableId: weddingTableIds[3], guestId: weddingGuestIds[10] }, // Beatriz
		{ tableId: weddingTableIds[3], guestId: weddingGuestIds[11] }, // Fernando
		{ tableId: weddingTableIds[3], guestId: weddingGuestIds[19] }, // Amigo Carlos
		// Mesa Trabalho
		{ tableId: weddingTableIds[4], guestId: weddingGuestIds[12] }, // Lucas
		{ tableId: weddingTableIds[4], guestId: weddingGuestIds[13] }, // Raquel
		// Mesa VIP
		{ tableId: weddingTableIds[5], guestId: weddingGuestIds[14] },
		// Mesa Vizinhos
		{ tableId: weddingTableIds[6], guestId: weddingGuestIds[16] }, // Dona Graça
	];

	for (let i = 0; i < tableAssignments.length; i++) {
		const assignment = tableAssignments[i];
		if (weddingGuestIds.includes(assignment.guestId)) {
			await prisma.tableGuest.upsert({
				where: {
					tableId_guestId: {
						tableId: assignment.tableId,
						guestId: assignment.guestId,
					},
				},
				update: {},
				create: {
					id: `tg_${String(i + 1).padStart(3, "0")}`,
					...assignment,
				},
			});
		}
	}
	console.log("  ✅ Table-Guest Assignments");

	// ================================================================
	// 13. TASKS (Wedding)
	// ================================================================
	const taskData = [
		{
			title: "Confirmar contrato com decoração",
			category: "DECORATION" as const,
			priority: "HIGH" as const,
			status: "COMPLETED" as const,
			dueDate: daysAgo(30),
		},
		{
			title: "Envio de convites",
			category: "DOCUMENTS" as const,
			priority: "HIGH" as const,
			status: "IN_PROGRESS" as const,
			dueDate: daysAhead(15),
		},
		{
			title: "Prova de menu com Chef Ngola",
			category: "FOOD" as const,
			priority: "MEDIUM" as const,
			status: "TODO" as const,
			dueDate: daysAhead(20),
		},
		{
			title: "Escolher música de entrada da noiva",
			category: "CEREMONY" as const,
			priority: "HIGH" as const,
			status: "TODO" as const,
			dueDate: daysAhead(30),
		},
		{
			title: "Reservar carro decorado",
			category: "TRANSPORT" as const,
			priority: "MEDIUM" as const,
			status: "TODO" as const,
			dueDate: daysAhead(45),
		},
		{
			title: "Agendar maquilhagem de provas",
			category: "OTHER" as const,
			priority: "LOW" as const,
			status: "TODO" as const,
			dueDate: daysAhead(60),
		},
		{
			title: "Confirmar lista de fornecedores",
			category: "VENUE" as const,
			priority: "MEDIUM" as const,
			status: "COMPLETED" as const,
			dueDate: daysAgo(45),
		},
		{
			title: "Definir assentos dos convidados VIP",
			category: "GUESTS" as const,
			priority: "URGENT" as const,
			status: "TODO" as const,
			dueDate: daysAhead(10),
		},
		{
			title: "Pagamento adiantado decoração — 50%",
			category: "FINANCE" as const,
			priority: "HIGH" as const,
			status: "COMPLETED" as const,
			dueDate: daysAgo(15),
		},
		{
			title: "Verificar licenças e alvarás do venue",
			category: "DOCUMENTS" as const,
			priority: "URGENT" as const,
			status: "IN_PROGRESS" as const,
			dueDate: daysAhead(5),
		},
		{
			title: "Ensaio geral da cerimónia",
			category: "CEREMONY" as const,
			priority: "HIGH" as const,
			status: "TODO" as const,
			dueDate: daysAhead(3),
		},
		{
			title: "Fechar bar aberto — definir drinks",
			category: "DRINKS" as const,
			priority: "MEDIUM" as const,
			status: "TODO" as const,
			dueDate: daysAhead(25),
		},
		{
			title: "Comprar lembranças para convidados",
			category: "OTHER" as const,
			priority: "LOW" as const,
			status: "CANCELLED" as const,
			dueDate: daysAgo(10),
		},
		{
			title: "Ensaio deDJ e banda",
			category: "OTHER" as const,
			priority: "MEDIUM" as const,
			status: "TODO" as const,
			dueDate: daysAhead(35),
		},
		{
			title: "Confirmar presença dos padrinhos",
			category: "GUESTS" as const,
			priority: "HIGH" as const,
			status: "IN_PROGRESS" as const,
			dueDate: daysAhead(7),
		},
	];

	for (let i = 0; i < taskData.length; i++) {
		const task = taskData[i];
		await prisma.task.upsert({
			where: { id: `tsk_${String(i + 1).padStart(3, "0")}` },
			update: {},
			create: {
				id: `tsk_${String(i + 1).padStart(3, "0")}`,
				eventId: EVENT_WEDDING,
				title: task.title,
				category: task.category,
				priority: task.priority,
				status: task.status,
				dueDate: task.dueDate,
				createdBy: USER_OWNER,
				completedAt: task.status === "COMPLETED" ? daysAgo(30 - i * 5) : null,
				completedBy: task.status === "COMPLETED" ? USER_OWNER : null,
			},
		});
	}

	// Engagement tasks
	const engagementTasks = [
		{
			title: "Confirmar espaço no Clube Mineiro",
			category: "VENUE" as const,
			priority: "HIGH" as const,
			status: "COMPLETED" as const,
			dueDate: daysAgo(20),
		},
		{
			title: "Enviar convites de noivado",
			category: "GUESTS" as const,
			priority: "HIGH" as const,
			status: "IN_PROGRESS" as const,
			dueDate: daysAhead(10),
		},
		{
			title: "Encomendar bolo de noivado",
			category: "FOOD" as const,
			priority: "MEDIUM" as const,
			status: "TODO" as const,
			dueDate: daysAhead(25),
		},
		{
			title: "Definir tema e cores do evento",
			category: "DECORATION" as const,
			priority: "MEDIUM" as const,
			status: "COMPLETED" as const,
			dueDate: daysAgo(15),
		},
	];

	for (let i = 0; i < engagementTasks.length; i++) {
		const task = engagementTasks[i];
		await prisma.task.upsert({
			where: { id: `tsk_eng_${String(i + 1).padStart(3, "0")}` },
			update: {},
			create: {
				id: `tsk_eng_${String(i + 1).padStart(3, "0")}`,
				eventId: EVENT_ENGAGEMENT,
				title: task.title,
				category: task.category,
				priority: task.priority,
				status: task.status,
				dueDate: task.dueDate,
				createdBy: USER_PARTNER,
				completedAt: task.status === "COMPLETED" ? daysAgo(15) : null,
				completedBy: task.status === "COMPLETED" ? USER_PARTNER : null,
			},
		});
	}
	console.log("  ✅ Tasks");

	// ================================================================
	// 14. SCHEDULES (Wedding Day)
	// ================================================================
	const scheduleData = [
		{
			title: "Montagem da decoração",
			description: "Equipe de decoração instala-se no venue",
			startAt: "09:00",
			endAt: "13:00",
			location: "Convento de São Francisco",
		},
		{
			title: "Ensaio da cerimónia",
			description: "Ensaiar entrada e discursos",
			startAt: "13:00",
			endAt: "14:00",
			location: "Capela do Convento",
		},
		{
			title: "Preparação da noiva",
			description: "Maquilhagem, penteado e vestido",
			startAt: "14:00",
			endAt: "15:00",
			location: "Sala de preparação",
		},
		{
			title: "Cerimónia religiosa",
			description: "Cerimónia de casamento",
			startAt: "15:00",
			endAt: "16:00",
			location: "Capela do Convento",
		},
		{
			title: "Sessão fotográfica",
			description: "Fotos da família e casal no jardim",
			startAt: "16:00",
			endAt: "17:00",
			location: "Jardim do Convento",
		},
		{
			title: "Recepção — Cocktail",
			description: "Aperitivos e drinks de boas-vindas",
			startAt: "17:00",
			endAt: "18:00",
			location: "Salão Principal",
		},
		{
			title: "Jantar",
			description: "Serviço de buffet e discurso dos padrinhos",
			startAt: "18:00",
			endAt: "20:00",
			location: "Salão Principal",
		},
		{
			title: "Corte do bolo",
			description: "Corte do bolo de casamento e brinde",
			startAt: "20:00",
			endAt: "20:30",
			location: "Salão Principal",
		},
		{
			title: "Pista de dança",
			description: "DJ e banda ao vivo",
			startAt: "20:30",
			endAt: "01:30",
			location: "Pista de Dança",
		},
		{
			title: "Fogos de artifício",
			description: "Show de fogos de artifício",
			startAt: "01:30",
			endAt: "01:45",
			location: "Jardim",
		},
	];

	for (let i = 0; i < scheduleData.length; i++) {
		const s = scheduleData[i];
		const baseDate = monthsAhead(4);
		const [sh, sm] = s.startAt.split(":").map(Number);
		const [eh, em] = s.endAt.split(":").map(Number);
		const startDate = new Date(baseDate);
		startDate.setHours(sh, sm, 0, 0);
		const endDate = new Date(baseDate);
		endDate.setHours(eh, em, 0, 0);
		// Handle midnight wrap
		if (eh < sh) endDate.setDate(endDate.getDate() + 1);

		await prisma.schedule.upsert({
			where: { id: `sch_${String(i + 1).padStart(3, "0")}` },
			update: {},
			create: {
				id: `sch_${String(i + 1).padStart(3, "0")}`,
				eventId: EVENT_WEDDING,
				title: s.title,
				description: s.description,
				startAt: startDate,
				endAt: endDate,
				location: s.location,
				responsible:
					i < 2
						? "Equipe de montagem"
						: i < 4
							? "Coordenador"
							: i < 6
								? "Photographer"
								: "DJ / Banda",
				status: i < 3 ? "PENDING" : "PENDING",
			},
		});
	}

	// Engagement schedules
	const engagementScheduleData = [
		{
			title: "Montagem do espaço",
			description: "Instalar decoração e som",
			startAt: "15:00",
			endAt: "17:30",
			location: "Clube Mineiro",
		},
		{
			title: "Recepção dos convidados",
			description: "Aperitivos e drinks",
			startAt: "18:00",
			endAt: "19:00",
			location: "Jardim do Clube",
		},
		{
			title: "Discurso do noivo",
			description: "Declaração de amor e brinde",
			startAt: "19:00",
			endAt: "19:30",
			location: "Palco",
		},
		{
			title: "Corte do bolo",
			description: "Bolo de noivado e fotografia",
			startAt: "19:30",
			endAt: "20:00",
			location: "Mesa principal",
		},
		{
			title: "Festa e dança",
			description: "Música e convívio",
			startAt: "20:00",
			endAt: "23:00",
			location: "Pista de dança",
		},
	];

	for (let i = 0; i < engagementScheduleData.length; i++) {
		const s = engagementScheduleData[i];
		const baseDate = monthsAhead(1);
		const [sh, sm] = s.startAt.split(":").map(Number);
		const [eh, em] = s.endAt.split(":").map(Number);
		const startDate = new Date(baseDate);
		startDate.setHours(sh, sm, 0, 0);
		const endDate = new Date(baseDate);
		endDate.setHours(eh, em, 0, 0);

		await prisma.schedule.upsert({
			where: { id: `sch_eng_${String(i + 1).padStart(3, "0")}` },
			update: {},
			create: {
				id: `sch_eng_${String(i + 1).padStart(3, "0")}`,
				eventId: EVENT_ENGAGEMENT,
				title: s.title,
				description: s.description,
				startAt: startDate,
				endAt: endDate,
				location: s.location,
				status: "PENDING",
			},
		});
	}
	console.log("  ✅ Schedules");

	// ================================================================
	// 15. INVENTORY ITEMS (Wedding)
	// ================================================================
	const inventoryData = [
		{
			name: "Vinho Tinto Reserva",
			category: "DRINK" as const,
			unit: "BOTTLE" as const,
			plannedQuantity: 40,
			currentQuantity: 29,
			venueQuantity: 30,
			status: "IN_PROGRESS" as const,
			unitPrice: 12_000,
			vendorId: null,
		},
		{
			name: "Champanhe Brut",
			category: "DRINK" as const,
			unit: "BOTTLE" as const,
			plannedQuantity: 20,
			currentQuantity: 20,
			unitPrice: 18_000,
			venueQuantity: 20,
			status: "COMPLETED" as const,
			vendorId: null,
		},
		{
			name: "Água Mineral 500ml",
			category: "DRINK" as const,
			unit: "BOTTLE" as const,
			plannedQuantity: 100,
			currentQuantity: 80,
			unitPrice: 300,
			venueQuantity: 80,
			status: "IN_PROGRESS" as const,
			vendorId: null,
		},
		{
			name: "Sumo Natural (Laranja)",
			category: "DRINK" as const,
			unit: "LITER" as const,
			plannedQuantity: 30,
			currentQuantity: 0,
			unitPrice: 2_500,
			venueQuantity: 30,
			status: "PENDING" as const,
			vendorId: null,
		},
		{
			name: "Cerveja Eza",
			category: "DRINK" as const,
			unit: "CASE" as const,
			plannedQuantity: 15,
			currentQuantity: 10,
			unitPrice: 8_000,
			venueQuantity: 15,
			status: "IN_PROGRESS" as const,
			vendorId: null,
		},
		{
			name: "Barriga de Porco Assada",
			category: "FOOD" as const,
			unit: "KG" as const,
			plannedQuantity: 50,
			currentQuantity: 0,
			unitPrice: 6_500,
			venueQuantity: 50,
			status: "PENDING" as const,
			vendorId: "vnd_002",
		},
		{
			name: "Calulu de Frango",
			category: "FOOD" as const,
			unit: "KG" as const,
			plannedQuantity: 40,
			currentQuantity: 0,
			unitPrice: 4_000,
			venueQuantity: 40,
			status: "PENDING" as const,
			vendorId: "vnd_002",
		},
		{
			name: "Arroz com Tomate",
			category: "FOOD" as const,
			unit: "KG" as const,
			plannedQuantity: 30,
			currentQuantity: 0,
			unitPrice: 1_500,
			venueQuantity: 30,
			status: "PENDING" as const,
			vendorId: "vnd_002",
		},
		{
			name: "Salada Tropical",
			category: "FOOD" as const,
			unit: "KG" as const,
			plannedQuantity: 25,
			currentQuantity: 0,
			unitPrice: 3_000,
			venueQuantity: 25,
			status: "PENDING" as const,
			vendorId: "vnd_002",
		},
		{
			name: "Bolo de Casamento 4 Andares",
			category: "CAKE" as const,
			unit: "UNIT" as const,
			plannedQuantity: 1,
			currentQuantity: 0,
			unitPrice: 250_000,
			venueQuantity: 1,
			status: "PENDING" as const,
			vendorId: null,
		},
		{
			name: "Rosas Brancas (centro de mesa)",
			category: "DECORATION" as const,
			unit: "UNIT" as const,
			plannedQuantity: 80,
			currentQuantity: 60,
			unitPrice: 800,
			venueQuantity: 80,
			status: "IN_PROGRESS" as const,
			vendorId: "vnd_001",
		},
		{
			name: "Velas Aromáticas",
			category: "DECORATION" as const,
			unit: "UNIT" as const,
			plannedQuantity: 50,
			currentQuantity: 50,
			unitPrice: 500,
			venueQuantity: 50,
			status: "COMPLETED" as const,
			vendorId: "vnd_001",
		},
		{
			name: "Tecido Organza Branco",
			category: "DECORATION" as const,
			unit: "PACKAGE" as const,
			plannedQuantity: 10,
			currentQuantity: 8,
			unitPrice: 15_000,
			venueQuantity: 10,
			status: "IN_PROGRESS" as const,
			vendorId: "vnd_001",
		},
		{
			name: "Leteus de Mesa",
			category: "DECORATION" as const,
			unit: "UNIT" as const,
			plannedQuantity: 30,
			currentQuantity: 30,
			unitPrice: 2_000,
			venueQuantity: 30,
			status: "COMPLETED" as const,
			vendorId: "vnd_001",
		},
		{
			name: "Caixa de Fogos de Artifício",
			category: "OTHER" as const,
			unit: "BOX" as const,
			plannedQuantity: 3,
			currentQuantity: 0,
			unitPrice: 45_000,
			venueQuantity: 3,
			status: "PENDING" as const,
			vendorId: null,
		},
	];

	const inventoryItemIds: string[] = [];
	for (let i = 0; i < inventoryData.length; i++) {
		const id = `inv_${String(i + 1).padStart(3, "0")}`;
		inventoryItemIds.push(id);
		const item = inventoryData[i];
		await prisma.inventoryItem.upsert({
			where: { id },
			update: {},
			create: {
				id,
				eventId: EVENT_WEDDING,
				...item,
			},
		});
	}
	console.log("  ✅ Inventory Items");

	// ================================================================
	// 16. INVENTORY MOVEMENTS
	// ================================================================
	const movementData = [
		{
			inventoryItemId: inventoryItemIds[0],
			type: "PURCHASE" as const,
			quantity: 20,
			unitPrice: 12_000,
			totalCost: 240_000,
			reason: "Compra inicial ao fornecedor",
			createdBy: USER_ADMIN,
		},
		{
			inventoryItemId: inventoryItemIds[0],
			type: "PURCHASE" as const,
			quantity: 10,
			unitPrice: 12_000,
			totalCost: 120_000,
			reason: "Segunda compra — completar stock",
			createdBy: USER_ADMIN,
		},
		{
			inventoryItemId: inventoryItemIds[1],
			type: "PURCHASE" as const,
			quantity: 20,
			unitPrice: 18_000,
			totalCost: 360_000,
			reason: "Compra de champanhe para brinde",
			createdBy: USER_OWNER,
		},
		{
			inventoryItemId: inventoryItemIds[2],
			type: "PURCHASE" as const,
			quantity: 100,
			unitPrice: 300,
			totalCost: 30_000,
			reason: "Compra de águas",
			createdBy: USER_ADMIN,
		},
		{
			inventoryItemId: inventoryItemIds[2],
			type: "CONSUMPTION" as const,
			quantity: 20,
			unitPrice: 300,
			totalCost: 6_000,
			reason: "Teste de menu com fornecedor",
			createdBy: USER_OWNER,
		},
		{
			inventoryItemId: inventoryItemIds[4],
			type: "PURCHASE" as const,
			quantity: 15,
			unitPrice: 8_000,
			totalCost: 120_000,
			reason: "Compra de cerveja Eza",
			createdBy: USER_ADMIN,
		},
		{
			inventoryItemId: inventoryItemIds[4],
			type: "CONSUMPTION" as const,
			quantity: 5,
			unitPrice: 8_000,
			totalCost: 40_000,
			reason: "Reunião de planeamento",
			createdBy: USER_PARTNER,
		},
		{
			inventoryItemId: inventoryItemIds[10],
			type: "PURCHASE" as const,
			quantity: 60,
			unitPrice: 800,
			totalCost: 48_000,
			reason: "Rosas para centros de mesa",
			createdBy: USER_OWNER,
		},
		{
			inventoryItemId: inventoryItemIds[11],
			type: "PURCHASE" as const,
			quantity: 50,
			unitPrice: 500,
			totalCost: 25_000,
			reason: "Velas aromáticas para mesas",
			createdBy: USER_OWNER,
		},
		{
			inventoryItemId: inventoryItemIds[12],
			type: "PURCHASE" as const,
			quantity: 8,
			unitPrice: 15_000,
			totalCost: 120_000,
			reason: "Tecido organza para decoração",
			createdBy: USER_OWNER,
		},
		{
			inventoryItemId: inventoryItemIds[13],
			type: "PURCHASE" as const,
			quantity: 30,
			unitPrice: 2_000,
			totalCost: 60_000,
			reason: "Leteus para decoração de mesas",
			createdBy: USER_OWNER,
		},
		{
			inventoryItemId: inventoryItemIds[0],
			type: "LOSS" as const,
			quantity: 1,
			unitPrice: 12_000,
			totalCost: 12_000,
			reason: "Garrafa quebrada durante transporte",
			createdBy: USER_ADMIN,
		},
	];

	for (let i = 0; i < movementData.length; i++) {
		const m = movementData[i];
		await prisma.inventoryMovement.upsert({
			where: { id: `mov_${String(i + 1).padStart(3, "0")}` },
			update: {},
			create: {
				id: `mov_${String(i + 1).padStart(3, "0")}`,
				...m,
				createdAt: daysAgo(60 - i * 5),
			},
		});
	}
	console.log("  ✅ Inventory Movements");

	// ================================================================
	// 17. EXPENSES (Wedding)
	// ================================================================
	const expenseData = [
		{
			description: "Anticipo decoração — Jardim das Flores",
			totalAmount: 900_000,
			status: "PAID" as const,
			vendorId: "vnd_001",
			budgetCategoryId: budgetCatIds["Espaço & Decoração"],
			dueDate: daysAgo(15),
		},
		{
			description: "Anticipo catering — Chef Ngola",
			totalAmount: 1_100_000,
			status: "PAID" as const,
			vendorId: "vnd_002",
			budgetCategoryId: budgetCatIds["Catering & Bebidas"],
			dueDate: daysAgo(10),
		},
		{
			description: "Ensaio fotográfico — Olhar Fotográfico",
			totalAmount: 200_000,
			status: "PARTIALLY_PAID" as const,
			vendorId: "vnd_004",
			budgetCategoryId: budgetCatIds["Fotografia & Vídeo"],
			dueDate: daysAhead(5),
		},
		{
			description: "Compra de vinho e champanhe",
			totalAmount: 780_000,
			status: "PAID" as const,
			vendorId: null,
			budgetCategoryId: budgetCatIds["Catering & Bebidas"],
			dueDate: daysAgo(5),
		},
		{
			description: "Transporte — Aluguer de 3 carros",
			totalAmount: 250_000,
			status: "PLANNED" as const,
			vendorId: "vnd_006",
			budgetCategoryId: budgetCatIds["Transporte & Logística"],
			dueDate: daysAhead(30),
		},
		{
			description: "Fogos de artifício",
			totalAmount: 135_000,
			status: "PLANNED" as const,
			vendorId: null,
			budgetCategoryId: budgetCatIds["Transporte & Logística"],
			dueDate: daysAhead(20),
		},
		{
			description: "Vestido da noiva — Atelier",
			totalAmount: 650_000,
			status: "PAID" as const,
			vendorId: null,
			budgetCategoryId: budgetCatIds["Vestuário & Beleza"],
			dueDate: daysAgo(45),
		},
		{
			description: "Maquilhagem e penteados",
			totalAmount: 180_000,
			status: "PLANNED" as const,
			vendorId: "vnd_005",
			budgetCategoryId: budgetCatIds["Vestuário & Beleza"],
			dueDate: daysAhead(25),
		},
		{
			description: "Convites impressos — 200 unidades",
			totalAmount: 85_000,
			status: "PAID" as const,
			vendorId: null,
			budgetCategoryId: budgetCatIds["Convites & Papelaria"],
			dueDate: daysAgo(30),
		},
		{
			description: "DJ e som — Som & Arte",
			totalAmount: 400_000,
			status: "PLANNED" as const,
			vendorId: "vnd_003",
			budgetCategoryId: budgetCatIds["Música & Entretenimento"],
			dueDate: daysAhead(35),
		},
		{
			description: "Banda ao vivo — Som & Arte",
			totalAmount: 500_000,
			status: "PLANNED" as const,
			vendorId: "vnd_003",
			budgetCategoryId: budgetCatIds["Música & Entretenimento"],
			dueDate: daysAhead(35),
		},
		{
			description: "Aluguer do Convento de São Francisco",
			totalAmount: 1_500_000,
			status: "PAID" as const,
			vendorId: null,
			budgetCategoryId: budgetCatIds["Espaço & Decoração"],
			dueDate: daysAgo(60),
		},
	];

	const expenseIds: string[] = [];
	for (let i = 0; i < expenseData.length; i++) {
		const id = `exp_${String(i + 1).padStart(3, "0")}`;
		expenseIds.push(id);
		const e = expenseData[i];
		await prisma.expense.upsert({
			where: { id },
			update: {},
			create: {
				id,
				eventId: EVENT_WEDDING,
				description: e.description,
				totalAmount: e.totalAmount,
				status: e.status,
				vendorId: e.vendorId,
				budgetCategoryId: e.budgetCategoryId,
				dueDate: e.dueDate,
				createdBy: i % 2 === 0 ? USER_OWNER : USER_ADMIN,
			},
		});
	}
	console.log("  ✅ Expenses");

	// ── Expenses linked to inventory items (Dispensa ↔ Inventory) ──
	await prisma.expense.update({
		where: { id: "exp_004" },
		data: { inventoryItemId: "inv_001" },
	});
	await prisma.expense.update({
		where: { id: "exp_006" },
		data: { inventoryItemId: "inv_015" },
	});

	// ================================================================
	// 18. PAYMENTS
	// ================================================================
	const paymentData = [
		{
			expenseId: expenseIds[0],
			amount: 900_000,
			method: "BANK_TRANSFER" as const,
			reference: "TRF-2026-001",
			notes: "Anticipo 50% decoração",
			paymentDate: daysAgo(15),
		},
		{
			expenseId: expenseIds[1],
			amount: 1_100_000,
			method: "BANK_TRANSFER" as const,
			reference: "TRF-2026-002",
			notes: "Anticipo 50% catering",
			paymentDate: daysAgo(10),
		},
		{
			expenseId: expenseIds[2],
			amount: 100_000,
			method: "MOBILE_PAYMENT" as const,
			reference: "MP-2026-001",
			notes: "Adiantamento ensaio fotográfico",
			paymentDate: daysAgo(7),
		},
		{
			expenseId: expenseIds[3],
			amount: 780_000,
			method: "CASH" as const,
			reference: null,
			notes: "Pagamento em numerário",
			paymentDate: daysAgo(5),
		},
		{
			expenseId: expenseIds[6],
			amount: 650_000,
			method: "BANK_TRANSFER" as const,
			reference: "TRF-2026-003",
			notes: "Pagamento integral do vestido",
			paymentDate: daysAgo(45),
		},
		{
			expenseId: expenseIds[8],
			amount: 85_000,
			method: "CARD" as const,
			reference: "CARD-2026-001",
			notes: "Compra online de convites",
			paymentDate: daysAgo(30),
		},
		{
			expenseId: expenseIds[11],
			amount: 1_500_000,
			method: "BANK_TRANSFER" as const,
			reference: "TRF-2026-004",
			notes: "Pagamento integral venue",
			paymentDate: daysAgo(60),
		},
	];

	for (let i = 0; i < paymentData.length; i++) {
		const p = paymentData[i];
		await prisma.payment.upsert({
			where: { id: `pay_${String(i + 1).padStart(3, "0")}` },
			update: {},
			create: {
				id: `pay_${String(i + 1).padStart(3, "0")}`,
				...p,
				createdBy: i % 2 === 0 ? USER_OWNER : USER_ADMIN,
			},
		});
	}
	console.log("  ✅ Payments");

	// ================================================================
	// 19. DOCUMENTS
	// ================================================================
	const documentData = [
		{
			eventId: EVENT_WEDDING,
			name: "Contrato de Decoração — Jardim das Flores",
			type: "CONTRACT" as const,
			vendorId: "vnd_001",
			reference: "CT-2026-001",
			expenseId: expenseIds[0],
		},
		{
			eventId: EVENT_WEDDING,
			name: "Contrato de Catering — Chef Ngola",
			type: "CONTRACT" as const,
			vendorId: "vnd_002",
			reference: "CT-2026-002",
			expenseId: expenseIds[1],
		},
		{
			eventId: EVENT_WEDDING,
			name: "Fatura Vestido da Noiva",
			type: "RECEIPT" as const,
			vendorId: null,
			reference: "FAT-2026-010",
			expenseId: expenseIds[6],
		},
		{
			eventId: EVENT_WEDDING,
			name: "Orçamento — Som & Arte",
			type: "QUOTE" as const,
			vendorId: "vnd_003",
			reference: "ORC-2026-001",
			expenseId: null,
		},
		{
			eventId: EVENT_WEDDING,
			name: "Contrato de Fotografia — Olhar Fotográfico",
			type: "CONTRACT" as const,
			vendorId: "vnd_004",
			reference: "CT-2026-003",
			expenseId: expenseIds[2],
		},
		{
			eventId: EVENT_WEDDING,
			name: "Licença de Evento — Municipalidade",
			type: "OTHER" as const,
			vendorId: null,
			reference: "LIC-2026-001",
			expenseId: null,
		},
		{
			eventId: EVENT_WEDDING,
			name: "Comprovativo de Pagamento Venue",
			type: "RECEIPT" as const,
			vendorId: null,
			reference: "TRF-2026-004",
			expenseId: expenseIds[11],
		},
		{
			eventId: EVENT_ENGAGEMENT,
			name: "Orçamento — Doce Momento",
			type: "QUOTE" as const,
			vendorId: "vnd_007",
			reference: "ORC-2026-002",
			expenseId: null,
		},
	];

	for (let i = 0; i < documentData.length; i++) {
		const d = documentData[i];
		await prisma.document.upsert({
			where: { id: `doc_${String(i + 1).padStart(3, "0")}` },
			update: {},
			create: {
				id: `doc_${String(i + 1).padStart(3, "0")}`,
				...d,
				createdBy: i < 5 ? USER_OWNER : USER_ADMIN,
			},
		});
	}
	console.log("  ✅ Documents");

	// ================================================================
	// 20. NOTIFICATIONS
	// ================================================================
	const notificationData = [
		{
			userId: USER_OWNER,
			eventId: EVENT_WEDDING,
			type: "FINANCE" as const,
			title: "Pagamento confirmado",
			message: "Anticipo de decoração de Kz 900.000 processado com sucesso.",
			priority: "INFO" as const,
			readAt: daysAgo(14),
		},
		{
			userId: USER_OWNER,
			eventId: EVENT_WEDDING,
			type: "TASKS" as const,
			title: "Tarefa urgente pendente",
			message: "Verificar licenças e alvarás do venue — prazo em 5 dias.",
			priority: "CRITICAL" as const,
			readAt: null,
		},
		{
			userId: USER_OWNER,
			eventId: EVENT_WEDDING,
			type: "GUESTS" as const,
			title: "12 convidados confirmaram presença",
			message: "12 dos 20 convidados de casamento confirmaram.",
			priority: "INFO" as const,
			readAt: daysAgo(3),
		},
		{
			userId: USER_OWNER,
			eventId: EVENT_WEDDING,
			type: "INVENTORY" as const,
			title: "Stock de vinho baixo",
			message: "Restam 10 garrafas de cerveja Eza por reabastecer.",
			priority: "WARNING" as const,
			readAt: null,
		},
		{
			userId: USER_ADMIN,
			eventId: EVENT_WEDDING,
			type: "EVENT" as const,
			title: "Novo evento criado",
			message:
				"O evento 'Casamento Ana & Carlos' foi criado e está em planeamento.",
			priority: "INFO" as const,
			readAt: daysAgo(90),
		},
		{
			userId: USER_PARTNER,
			eventId: EVENT_WEDDING,
			type: "TASKS" as const,
			title: "Ensaio da cerimónia amanhã",
			message: "Lembrete: ensaio da cerimónia de casamento amanhã às 13:00.",
			priority: "IMPORTANT" as const,
			readAt: null,
		},
		{
			userId: USER_OWNER,
			eventId: EVENT_WEDDING,
			type: "FINANCE" as const,
			title: "Despesa próxima do vencimento",
			message: "Ensaio fotográfico — Kz 100.000 restantes — vence em 5 dias.",
			priority: "WARNING" as const,
			readAt: null,
		},
		{
			userId: USER_PARTNER,
			eventId: EVENT_ENGAGEMENT,
			type: "GUESTS" as const,
			title: "Convites de noivado em envio",
			message: "5 convites de noivado estão a ser processados.",
			priority: "INFO" as const,
			readAt: null,
		},
		{
			userId: USER_OWNER,
			eventId: EVENT_WEDDING,
			type: "TASKS" as const,
			title: "Confirmar presença dos padrinhos",
			message: "Ainda aguardando confirmação de D. Conceição e Eng. Manuel.",
			priority: "IMPORTANT" as const,
			readAt: null,
		},
		{
			userId: USER_ADMIN,
			eventId: EVENT_WEDDING,
			type: "INVENTORY" as const,
			title: "Novo item de inventário",
			message: "Caixa de fogos de artifício adicionada ao inventário.",
			priority: "INFO" as const,
			readAt: daysAgo(2),
		},
	];

	for (let i = 0; i < notificationData.length; i++) {
		await prisma.notification.upsert({
			where: { id: `notif_${String(i + 1).padStart(3, "0")}` },
			update: {},
			create: {
				id: `notif_${String(i + 1).padStart(3, "0")}`,
				...notificationData[i],
				createdAt: daysAgo(15 - i),
			},
		});
	}
	console.log("  ✅ Notifications");

	// ================================================================
	// 21. AUDIT LOGS
	// ================================================================
	const auditData = [
		{
			eventId: EVENT_WEDDING,
			userId: USER_OWNER,
			action: "CREATE",
			entity: "Event",
			entityId: EVENT_WEDDING,
			newData: { name: "Casamento Ana & Carlos" },
		},
		{
			eventId: EVENT_WEDDING,
			userId: USER_OWNER,
			action: "CREATE",
			entity: "Budget",
			newData: { plannedAmount: 8_500_000 },
		},
		{
			eventId: EVENT_WEDDING,
			userId: USER_ADMIN,
			action: "CREATE",
			entity: "Vendor",
			entityId: "vnd_001",
			newData: { name: "Jardim das Flores", category: "DECORATION" },
		},
		{
			eventId: EVENT_WEDDING,
			userId: USER_OWNER,
			action: "UPDATE",
			entity: "Event",
			entityId: EVENT_WEDDING,
			oldData: { status: "DRAFT" },
			newData: { status: "PLANNING" },
		},
		{
			eventId: EVENT_WEDDING,
			userId: USER_OWNER,
			action: "CREATE",
			entity: "Expense",
			entityId: expenseIds[0],
			newData: { description: "Anticipo decoração", totalAmount: 900_000 },
		},
		{
			eventId: EVENT_WEDDING,
			userId: USER_ADMIN,
			action: "CREATE",
			entity: "Guest",
			entityId: "gst_wed_001",
			newData: { name: "Dr. António Fernandes", type: "FAMILY" },
		},
		{
			eventId: EVENT_WEDDING,
			userId: USER_OWNER,
			action: "UPDATE",
			entity: "Expense",
			entityId: expenseIds[0],
			oldData: { status: "PLANNED" },
			newData: { status: "PAID" },
		},
		{
			eventId: EVENT_ENGAGEMENT,
			userId: USER_PARTNER,
			action: "CREATE",
			entity: "Event",
			entityId: EVENT_ENGAGEMENT,
			newData: { name: "Noivado Beatriz & David" },
		},
	];

	for (let i = 0; i < auditData.length; i++) {
		await prisma.auditLog.upsert({
			where: { id: `audit_${String(i + 1).padStart(3, "0")}` },
			update: {},
			create: {
				id: `audit_${String(i + 1).padStart(3, "0")}`,
				...auditData[i],
				createdAt: daysAgo(90 - i * 10),
			},
		});
	}
	console.log("  ✅ Audit Logs");

	// ================================================================
	// DONE
	// ================================================================
	console.log("\n🎉 Seed completed successfully!");
	console.log(`   Users:          ${users.length}`);
	console.log("   Events:         2");
	console.log(`   Event Members:  ${memberData.length}`);
	console.log("   Budgets:        2");
	console.log(
		`   Categories:     ${weddingCategories.length + engagementCategories.length}`,
	);
	console.log(`   Vendors:        ${vendorData.length}`);
	console.log(`   Contracts:      ${contractData.length}`);
	console.log(
		`   Guests:         ${weddingGuestIds.length + engagementGuestIds.length}`,
	);
	console.log(`   Companions:     ${companionData.length}`);
	console.log(`   Invitations:    ${weddingGuestIds.length}`);
	console.log(`   Tables:         ${weddingTables.length}`);
	console.log(`   Tasks:          ${taskData.length + engagementTasks.length}`);
	console.log(
		`   Schedules:      ${scheduleData.length + engagementScheduleData.length}`,
	);
	console.log(`   Inventory:      ${inventoryData.length}`);
	console.log(`   Movements:      ${movementData.length}`);
	console.log(`   Expenses:       ${expenseData.length}`);
	console.log(`   Payments:       ${paymentData.length}`);
	console.log(`   Documents:      ${documentData.length}`);
	console.log(`   Notifications:  ${notificationData.length}`);
	console.log(`   Audit Logs:     ${auditData.length}`);
}

main()
	.catch((e) => {
		console.error("❌ Seed failed:", e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
