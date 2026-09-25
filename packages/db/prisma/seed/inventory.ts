import {
	daysAgo,
	EVENTS,
	prisma,
	USER_ADMIN,
	USER_OWNER,
	USER_PARTNER,
} from "./helpers";

const now = new Date();

function inventoryItem(data: {
	id: string;
	eventId: string;
	name: string;
	category: "DRINK" | "FOOD" | "CAKE" | "DECORATION" | "OTHER";
	plannedQuantity: number;
	currentQuantity: number;
	unit:
		| "UNIT"
		| "BOX"
		| "CASE"
		| "BOTTLE"
		| "KG"
		| "LITER"
		| "PACKAGE"
		| "OTHER";
	vendorId?: string | null;
	notes?: string;
}) {
	return prisma.inventoryItem.upsert({
		where: { id: data.id },
		update: {},
		create: {
			id: data.id,
			eventId: data.eventId,
			name: data.name,
			category: data.category,
			plannedQuantity: data.plannedQuantity,
			currentQuantity: data.currentQuantity,
			unit: data.unit,
			vendorId: data.vendorId ?? null,
			notes: data.notes ?? null,
			createdAt: now,
			updatedAt: now,
		},
	});
}

function movement(data: {
	id: string;
	inventoryItemId: string;
	type: "PURCHASE" | "ADD" | "CONSUMPTION" | "ADJUSTMENT" | "LOSS" | "RETURN";
	quantity: number;
	reason?: string;
	createdBy: string;
	createdAt: Date;
}) {
	return prisma.inventoryMovement.upsert({
		where: { id: data.id },
		update: {},
		create: {
			id: data.id,
			inventoryItemId: data.inventoryItemId,
			type: data.type,
			quantity: data.quantity,
			reason: data.reason ?? null,
			createdBy: data.createdBy,
			createdAt: data.createdAt,
		},
	});
}

export async function seedInventory() {
	console.log("  Seeding inventory...");

	// ── WEDDING (15 items) ──────────────────────────────────────────────
	await Promise.all([
		inventoryItem({
			id: "inv_wed_001",
			eventId: EVENTS.WEDDING,
			name: "Vinho Tinto Reserva",
			category: "DRINK",
			plannedQuantity: 40,
			currentQuantity: 30,
			unit: "BOTTLE",
			vendorId: null,
		}),
		inventoryItem({
			id: "inv_wed_002",
			eventId: EVENTS.WEDDING,
			name: "Champanhe Brut",
			category: "DRINK",
			plannedQuantity: 20,
			currentQuantity: 20,
			unit: "BOTTLE",
		}),
		inventoryItem({
			id: "inv_wed_003",
			eventId: EVENTS.WEDDING,
			name: "Água Mineral 500ml",
			category: "DRINK",
			plannedQuantity: 100,
			currentQuantity: 80,
			unit: "BOTTLE",
		}),
		inventoryItem({
			id: "inv_wed_004",
			eventId: EVENTS.WEDDING,
			name: "Sumo Natural (Laranja)",
			category: "DRINK",
			plannedQuantity: 30,
			currentQuantity: 0,
			unit: "LITER",
		}),
		inventoryItem({
			id: "inv_wed_005",
			eventId: EVENTS.WEDDING,
			name: "Cerveja Eza",
			category: "DRINK",
			plannedQuantity: 15,
			currentQuantity: 10,
			unit: "CASE",
		}),
		inventoryItem({
			id: "inv_wed_006",
			eventId: EVENTS.WEDDING,
			name: "Barriga de Porco Assada",
			category: "FOOD",
			plannedQuantity: 50,
			currentQuantity: 0,
			unit: "KG",
			vendorId: null,
		}),
		inventoryItem({
			id: "inv_wed_007",
			eventId: EVENTS.WEDDING,
			name: "Calulu de Frango",
			category: "FOOD",
			plannedQuantity: 40,
			currentQuantity: 0,
			unit: "KG",
			vendorId: null,
		}),
		inventoryItem({
			id: "inv_wed_008",
			eventId: EVENTS.WEDDING,
			name: "Arroz com Tomate",
			category: "FOOD",
			plannedQuantity: 30,
			currentQuantity: 0,
			unit: "KG",
		}),
		inventoryItem({
			id: "inv_wed_009",
			eventId: EVENTS.WEDDING,
			name: "Salada Tropical",
			category: "FOOD",
			plannedQuantity: 25,
			currentQuantity: 0,
			unit: "KG",
		}),
		inventoryItem({
			id: "inv_wed_010",
			eventId: EVENTS.WEDDING,
			name: "Bolo de Casamento 4 Andares",
			category: "CAKE",
			plannedQuantity: 1,
			currentQuantity: 0,
			unit: "UNIT",
		}),
		inventoryItem({
			id: "inv_wed_011",
			eventId: EVENTS.WEDDING,
			name: "Rosas Brancas (centro de mesa)",
			category: "DECORATION",
			plannedQuantity: 80,
			currentQuantity: 60,
			unit: "UNIT",
			vendorId: null,
		}),
		inventoryItem({
			id: "inv_wed_012",
			eventId: EVENTS.WEDDING,
			name: "Velas Aromáticas",
			category: "DECORATION",
			plannedQuantity: 50,
			currentQuantity: 50,
			unit: "UNIT",
		}),
		inventoryItem({
			id: "inv_wed_013",
			eventId: EVENTS.WEDDING,
			name: "Tecido Organza Branco",
			category: "DECORATION",
			plannedQuantity: 10,
			currentQuantity: 8,
			unit: "PACKAGE",
		}),
		inventoryItem({
			id: "inv_wed_014",
			eventId: EVENTS.WEDDING,
			name: "Leteus de Mesa",
			category: "DECORATION",
			plannedQuantity: 30,
			currentQuantity: 30,
			unit: "UNIT",
		}),
		inventoryItem({
			id: "inv_wed_015",
			eventId: EVENTS.WEDDING,
			name: "Caixa de Fogos de Artifício",
			category: "OTHER",
			plannedQuantity: 3,
			currentQuantity: 0,
			unit: "BOX",
		}),
	]);

	// ── ENGAGEMENT (8 items) ────────────────────────────────────────────
	await Promise.all([
		inventoryItem({
			id: "inv_eng_001",
			eventId: EVENTS.ENGAGEMENT,
			name: "Bolo de Noivado",
			category: "CAKE",
			plannedQuantity: 1,
			currentQuantity: 0,
			unit: "UNIT",
		}),
		inventoryItem({
			id: "inv_eng_002",
			eventId: EVENTS.ENGAGEMENT,
			name: "Vinho Rosé",
			category: "DRINK",
			plannedQuantity: 15,
			currentQuantity: 15,
			unit: "BOTTLE",
		}),
		inventoryItem({
			id: "inv_eng_003",
			eventId: EVENTS.ENGAGEMENT,
			name: "Água com Gás",
			category: "DRINK",
			plannedQuantity: 30,
			currentQuantity: 25,
			unit: "BOTTLE",
		}),
		inventoryItem({
			id: "inv_eng_004",
			eventId: EVENTS.ENGAGEMENT,
			name: "Canapés Variados",
			category: "FOOD",
			plannedQuantity: 100,
			currentQuantity: 0,
			unit: "UNIT",
		}),
		inventoryItem({
			id: "inv_eng_005",
			eventId: EVENTS.ENGAGEMENT,
			name: "Flores Misturadas",
			category: "DECORATION",
			plannedQuantity: 20,
			currentQuantity: 15,
			unit: "UNIT",
		}),
		inventoryItem({
			id: "inv_eng_006",
			eventId: EVENTS.ENGAGEMENT,
			name: "Velas Decorativas",
			category: "DECORATION",
			plannedQuantity: 30,
			currentQuantity: 30,
			unit: "UNIT",
		}),
		inventoryItem({
			id: "inv_eng_007",
			eventId: EVENTS.ENGAGEMENT,
			name: "Confetes e Pétalas",
			category: "DECORATION",
			plannedQuantity: 5,
			currentQuantity: 4,
			unit: "PACKAGE",
		}),
		inventoryItem({
			id: "inv_eng_008",
			eventId: EVENTS.ENGAGEMENT,
			name: "Guardanapos Dourados",
			category: "OTHER",
			plannedQuantity: 50,
			currentQuantity: 50,
			unit: "UNIT",
		}),
	]);

	// ── BIRTHDAY (5 items) ──────────────────────────────────────────────
	await Promise.all([
		inventoryItem({
			id: "inv_bir_001",
			eventId: EVENTS.BIRTHDAY,
			name: "Bolo de Aniversário",
			category: "CAKE",
			plannedQuantity: 1,
			currentQuantity: 1,
			unit: "UNIT",
		}),
		inventoryItem({
			id: "inv_bir_002",
			eventId: EVENTS.BIRTHDAY,
			name: "Cerveja",
			category: "DRINK",
			plannedQuantity: 10,
			currentQuantity: 8,
			unit: "CASE",
		}),
		inventoryItem({
			id: "inv_bir_003",
			eventId: EVENTS.BIRTHDAY,
			name: "Refrigerantes",
			category: "DRINK",
			plannedQuantity: 20,
			currentQuantity: 18,
			unit: "BOTTLE",
		}),
		inventoryItem({
			id: "inv_bir_004",
			eventId: EVENTS.BIRTHDAY,
			name: "Salgados Variados",
			category: "FOOD",
			plannedQuantity: 100,
			currentQuantity: 0,
			unit: "UNIT",
		}),
		inventoryItem({
			id: "inv_bir_005",
			eventId: EVENTS.BIRTHDAY,
			name: "Balões e Decoração",
			category: "DECORATION",
			plannedQuantity: 10,
			currentQuantity: 8,
			unit: "PACKAGE",
		}),
	]);

	// ── CONFERENCE (10 items) ───────────────────────────────────────────
	await Promise.all([
		inventoryItem({
			id: "inv_con_001",
			eventId: EVENTS.CONFERENCE,
			name: "Água para Participantes",
			category: "DRINK",
			plannedQuantity: 200,
			currentQuantity: 200,
			unit: "BOTTLE",
		}),
		inventoryItem({
			id: "inv_con_002",
			eventId: EVENTS.CONFERENCE,
			name: "Café e Chá",
			category: "DRINK",
			plannedQuantity: 50,
			currentQuantity: 50,
			unit: "PACKAGE",
		}),
		inventoryItem({
			id: "inv_con_003",
			eventId: EVENTS.CONFERENCE,
			name: "Sanduíches",
			category: "FOOD",
			plannedQuantity: 150,
			currentQuantity: 0,
			unit: "UNIT",
		}),
		inventoryItem({
			id: "inv_con_004",
			eventId: EVENTS.CONFERENCE,
			name: "Fruta",
			category: "FOOD",
			plannedQuantity: 30,
			currentQuantity: 30,
			unit: "KG",
		}),
		inventoryItem({
			id: "inv_con_005",
			eventId: EVENTS.CONFERENCE,
			name: "Pastéis Variados",
			category: "FOOD",
			plannedQuantity: 100,
			currentQuantity: 0,
			unit: "UNIT",
		}),
		inventoryItem({
			id: "inv_con_006",
			eventId: EVENTS.CONFERENCE,
			name: "Materiais Impressos",
			category: "OTHER",
			plannedQuantity: 200,
			currentQuantity: 200,
			unit: "UNIT",
		}),
		inventoryItem({
			id: "inv_con_007",
			eventId: EVENTS.CONFERENCE,
			name: "Credenciais",
			category: "OTHER",
			plannedQuantity: 200,
			currentQuantity: 200,
			unit: "UNIT",
		}),
		inventoryItem({
			id: "inv_con_008",
			eventId: EVENTS.CONFERENCE,
			name: "Welcome Kits",
			category: "OTHER",
			plannedQuantity: 150,
			currentQuantity: 150,
			unit: "UNIT",
		}),
		inventoryItem({
			id: "inv_con_009",
			eventId: EVENTS.CONFERENCE,
			name: "Banners e Roll-ups",
			category: "DECORATION",
			plannedQuantity: 10,
			currentQuantity: 10,
			unit: "UNIT",
		}),
		inventoryItem({
			id: "inv_con_010",
			eventId: EVENTS.CONFERENCE,
			name: "Extensões Eléctricas",
			category: "OTHER",
			plannedQuantity: 15,
			currentQuantity: 15,
			unit: "UNIT",
		}),
	]);

	// ── WEDDING_CANCELLED (5 items) ─────────────────────────────────────
	await Promise.all([
		inventoryItem({
			id: "inv_wcx_001",
			eventId: EVENTS.WEDDING_CANCELLED,
			name: "Vinho",
			category: "DRINK",
			plannedQuantity: 20,
			currentQuantity: 10,
			unit: "BOTTLE",
		}),
		inventoryItem({
			id: "inv_wcx_002",
			eventId: EVENTS.WEDDING_CANCELLED,
			name: "Toalhas Brancas",
			category: "DECORATION",
			plannedQuantity: 30,
			currentQuantity: 30,
			unit: "UNIT",
		}),
		inventoryItem({
			id: "inv_wcx_003",
			eventId: EVENTS.WEDDING_CANCELLED,
			name: "Lugares de Bolo",
			category: "CAKE",
			plannedQuantity: 150,
			currentQuantity: 0,
			unit: "UNIT",
		}),
		inventoryItem({
			id: "inv_wcx_004",
			eventId: EVENTS.WEDDING_CANCELLED,
			name: "Napkins",
			category: "OTHER",
			plannedQuantity: 200,
			currentQuantity: 200,
			unit: "UNIT",
		}),
		inventoryItem({
			id: "inv_wcx_005",
			eventId: EVENTS.WEDDING_CANCELLED,
			name: "Enfeites",
			category: "DECORATION",
			plannedQuantity: 20,
			currentQuantity: 15,
			unit: "UNIT",
		}),
	]);

	// ── CORPORATE (5 items) ─────────────────────────────────────────────
	await Promise.all([
		inventoryItem({
			id: "inv_cor_001",
			eventId: EVENTS.CORPORATE,
			name: "Água mineral",
			category: "DRINK",
			plannedQuantity: 80,
			currentQuantity: 80,
			unit: "BOTTLE",
		}),
		inventoryItem({
			id: "inv_cor_002",
			eventId: EVENTS.CORPORATE,
			name: "Vinho doce",
			category: "DRINK",
			plannedQuantity: 10,
			currentQuantity: 10,
			unit: "BOTTLE",
		}),
		inventoryItem({
			id: "inv_cor_003",
			eventId: EVENTS.CORPORATE,
			name: "Petiscos executivos",
			category: "FOOD",
			plannedQuantity: 60,
			currentQuantity: 0,
			unit: "UNIT",
		}),
		inventoryItem({
			id: "inv_cor_004",
			eventId: EVENTS.CORPORATE,
			name: "Materiais de apresentação",
			category: "OTHER",
			plannedQuantity: 80,
			currentQuantity: 80,
			unit: "UNIT",
		}),
		inventoryItem({
			id: "inv_cor_005",
			eventId: EVENTS.CORPORATE,
			name: "Laptop e projetor",
			category: "OTHER",
			plannedQuantity: 2,
			currentQuantity: 2,
			unit: "UNIT",
		}),
	]);

	// ── WORKSHOP (3 items) ──────────────────────────────────────────────
	await Promise.all([
		inventoryItem({
			id: "inv_wor_001",
			eventId: EVENTS.WORKSHOP,
			name: "Café e biscoitos",
			category: "DRINK",
			plannedQuantity: 40,
			currentQuantity: 40,
			unit: "PACKAGE",
		}),
		inventoryItem({
			id: "inv_wor_002",
			eventId: EVENTS.WORKSHOP,
			name: "Material de escritório",
			category: "OTHER",
			plannedQuantity: 50,
			currentQuantity: 50,
			unit: "UNIT",
		}),
		inventoryItem({
			id: "inv_wor_003",
			eventId: EVENTS.WORKSHOP,
			name: "Quadros e markers",
			category: "OTHER",
			plannedQuantity: 20,
			currentQuantity: 20,
			unit: "UNIT",
		}),
	]);

	// ── BABY_SHOWER (3 items) ───────────────────────────────────────────
	await Promise.all([
		inventoryItem({
			id: "inv_bab_001",
			eventId: EVENTS.BABY_SHOWER,
			name: "Bolo de embalar",
			category: "CAKE",
			plannedQuantity: 1,
			currentQuantity: 1,
			unit: "UNIT",
		}),
		inventoryItem({
			id: "inv_bab_002",
			eventId: EVENTS.BABY_SHOWER,
			name: "Lembranças",
			category: "OTHER",
			plannedQuantity: 30,
			currentQuantity: 25,
			unit: "UNIT",
		}),
		inventoryItem({
			id: "inv_bab_003",
			eventId: EVENTS.BABY_SHOWER,
			name: "Balões rosa e branco",
			category: "DECORATION",
			plannedQuantity: 50,
			currentQuantity: 50,
			unit: "UNIT",
		}),
	]);

	// ── CEREMONY (8 items) ──────────────────────────────────────────────
	await Promise.all([
		inventoryItem({
			id: "inv_cer_001",
			eventId: EVENTS.CEREMONY,
			name: "Vinho sacramental",
			category: "DRINK",
			plannedQuantity: 5,
			currentQuantity: 5,
			unit: "BOTTLE",
		}),
		inventoryItem({
			id: "inv_cer_002",
			eventId: EVENTS.CEREMONY,
			name: "Pão",
			category: "FOOD",
			plannedQuantity: 10,
			currentQuantity: 0,
			unit: "UNIT",
		}),
		inventoryItem({
			id: "inv_cer_003",
			eventId: EVENTS.CEREMONY,
			name: "Flores para a igreja",
			category: "DECORATION",
			plannedQuantity: 30,
			currentQuantity: 0,
			unit: "UNIT",
		}),
		inventoryItem({
			id: "inv_cer_004",
			eventId: EVENTS.CEREMONY,
			name: "Velas cerimoniais",
			category: "DECORATION",
			plannedQuantity: 20,
			currentQuantity: 20,
			unit: "UNIT",
		}),
		inventoryItem({
			id: "inv_cer_005",
			eventId: EVENTS.CEREMONY,
			name: "Hinos impressos",
			category: "OTHER",
			plannedQuantity: 200,
			currentQuantity: 0,
			unit: "UNIT",
		}),
		inventoryItem({
			id: "inv_cer_006",
			eventId: EVENTS.CEREMONY,
			name: "Coroas de flores",
			category: "DECORATION",
			plannedQuantity: 10,
			currentQuantity: 5,
			unit: "UNIT",
		}),
		inventoryItem({
			id: "inv_cer_007",
			eventId: EVENTS.CEREMONY,
			name: "Almofadas para alianças",
			category: "OTHER",
			plannedQuantity: 2,
			currentQuantity: 2,
			unit: "UNIT",
		}),
		inventoryItem({
			id: "inv_cer_008",
			eventId: EVENTS.CEREMONY,
			name: "Bolo de recepção",
			category: "CAKE",
			plannedQuantity: 1,
			currentQuantity: 0,
			unit: "UNIT",
		}),
	]);

	// ── INVENTORY MOVEMENTS ─────────────────────────────────────────────

	// ── WEDDING (8 movements) ───────────────────────────────────────────
	await Promise.all([
		movement({
			id: "mov_001",
			inventoryItemId: "inv_wed_001",
			type: "PURCHASE",
			quantity: 40,
			reason: "Aquisição inicial de vinhos tinto reserva",
			createdBy: USER_OWNER,
			createdAt: daysAgo(30),
		}),
		movement({
			id: "mov_002",
			inventoryItemId: "inv_wed_001",
			type: "CONSUMPTION",
			quantity: 10,
			reason: "Prova de vinhos para o casal e padrinhos",
			createdBy: USER_ADMIN,
			createdAt: daysAgo(5),
		}),
		movement({
			id: "mov_003",
			inventoryItemId: "inv_wed_002",
			type: "PURCHASE",
			quantity: 20,
			reason: "Encomenda de champanhe para brinde",
			createdBy: USER_OWNER,
			createdAt: daysAgo(25),
		}),
		movement({
			id: "mov_004",
			inventoryItemId: "inv_wed_003",
			type: "PURCHASE",
			quantity: 100,
			reason: "Águas minerais para o evento",
			createdBy: USER_ADMIN,
			createdAt: daysAgo(20),
		}),
		movement({
			id: "mov_005",
			inventoryItemId: "inv_wed_003",
			type: "CONSUMPTION",
			quantity: 20,
			reason: "Águas utilizadas no ensaio geral",
			createdBy: USER_PARTNER,
			createdAt: daysAgo(3),
		}),
		movement({
			id: "mov_006",
			inventoryItemId: "inv_wed_005",
			type: "PURCHASE",
			quantity: 15,
			reason: "Caixas de cerveja para o bar",
			createdBy: USER_OWNER,
			createdAt: daysAgo(18),
		}),
		movement({
			id: "mov_007",
			inventoryItemId: "inv_wed_005",
			type: "CONSUMPTION",
			quantity: 5,
			reason: "Degustação e teste do bar aberto",
			createdBy: USER_ADMIN,
			createdAt: daysAgo(2),
		}),
		movement({
			id: "mov_008",
			inventoryItemId: "inv_wed_011",
			type: "PURCHASE",
			quantity: 80,
			reason: "Rosas brancas para centros de mesa",
			createdBy: USER_PARTNER,
			createdAt: daysAgo(15),
		}),
	]);

	// ── ENGAGEMENT (6 movements) ────────────────────────────────────────
	await Promise.all([
		movement({
			id: "mov_009",
			inventoryItemId: "inv_eng_001",
			type: "PURCHASE",
			quantity: 1,
			reason: "Bolo de noivado encomendado",
			createdBy: USER_OWNER,
			createdAt: daysAgo(20),
		}),
		movement({
			id: "mov_010",
			inventoryItemId: "inv_eng_002",
			type: "PURCHASE",
			quantity: 15,
			reason: "Rosé para o brinde de noivado",
			createdBy: USER_OWNER,
			createdAt: daysAgo(18),
		}),
		movement({
			id: "mov_011",
			inventoryItemId: "inv_eng_003",
			type: "PURCHASE",
			quantity: 30,
			reason: "Águas com gás para o evento",
			createdBy: USER_ADMIN,
			createdAt: daysAgo(15),
		}),
		movement({
			id: "mov_012",
			inventoryItemId: "inv_eng_003",
			type: "CONSUMPTION",
			quantity: 5,
			reason: "Degustação no provador com o casal",
			createdBy: USER_PARTNER,
			createdAt: daysAgo(5),
		}),
		movement({
			id: "mov_013",
			inventoryItemId: "inv_eng_005",
			type: "PURCHASE",
			quantity: 20,
			reason: "Flores para decoração do espaço",
			createdBy: USER_PARTNER,
			createdAt: daysAgo(10),
		}),
		movement({
			id: "mov_014",
			inventoryItemId: "inv_eng_008",
			type: "PURCHASE",
			quantity: 50,
			reason: "Guardanapos dourados para as mesas",
			createdBy: USER_ADMIN,
			createdAt: daysAgo(10),
		}),
	]);

	// ── BIRTHDAY (4 movements) ──────────────────────────────────────────
	await Promise.all([
		movement({
			id: "mov_015",
			inventoryItemId: "inv_bir_001",
			type: "PURCHASE",
			quantity: 1,
			reason: "Bolo de aniversário encomendado",
			createdBy: USER_OWNER,
			createdAt: daysAgo(10),
		}),
		movement({
			id: "mov_016",
			inventoryItemId: "inv_bir_002",
			type: "PURCHASE",
			quantity: 10,
			reason: "Caixas de cerveja para a festa",
			createdBy: USER_ADMIN,
			createdAt: daysAgo(8),
		}),
		movement({
			id: "mov_017",
			inventoryItemId: "inv_bir_003",
			type: "PURCHASE",
			quantity: 20,
			reason: "Refrigerantes variados para convidados",
			createdBy: USER_PARTNER,
			createdAt: daysAgo(7),
		}),
		movement({
			id: "mov_018",
			inventoryItemId: "inv_bir_005",
			type: "PURCHASE",
			quantity: 10,
			reason: "Pacotes de balões e decoração",
			createdBy: USER_OWNER,
			createdAt: daysAgo(5),
		}),
	]);

	// ── CONFERENCE (7 movements) ────────────────────────────────────────
	await Promise.all([
		movement({
			id: "mov_019",
			inventoryItemId: "inv_con_001",
			type: "PURCHASE",
			quantity: 200,
			reason: "Águas para todos os participantes",
			createdBy: USER_OWNER,
			createdAt: daysAgo(60),
		}),
		movement({
			id: "mov_020",
			inventoryItemId: "inv_con_002",
			type: "PURCHASE",
			quantity: 50,
			reason: "Cafés e chás para coffee breaks",
			createdBy: USER_ADMIN,
			createdAt: daysAgo(55),
		}),
		movement({
			id: "mov_021",
			inventoryItemId: "inv_con_003",
			type: "PURCHASE",
			quantity: 150,
			reason: "Sanduíches para o almoço dos participantes",
			createdBy: USER_PARTNER,
			createdAt: daysAgo(30),
		}),
		movement({
			id: "mov_022",
			inventoryItemId: "inv_con_006",
			type: "PURCHASE",
			quantity: 200,
			reason: "Materiais impressos para os participantes",
			createdBy: USER_OWNER,
			createdAt: daysAgo(50),
		}),
		movement({
			id: "mov_023",
			inventoryItemId: "inv_con_008",
			type: "PURCHASE",
			quantity: 150,
			reason: "Welcome kits para os participantes",
			createdBy: USER_PARTNER,
			createdAt: daysAgo(25),
		}),
		movement({
			id: "mov_024",
			inventoryItemId: "inv_con_009",
			type: "PURCHASE",
			quantity: 10,
			reason: "Banners e roll-ups para o espaço do evento",
			createdBy: USER_OWNER,
			createdAt: daysAgo(45),
		}),
		movement({
			id: "mov_025",
			inventoryItemId: "inv_con_010",
			type: "PURCHASE",
			quantity: 15,
			reason: "Extensões eléctricas para equipamentos",
			createdBy: USER_PARTNER,
			createdAt: daysAgo(40),
		}),
	]);

	// ── WEDDING_CANCELLED (4 movements) ─────────────────────────────────
	await Promise.all([
		movement({
			id: "mov_026",
			inventoryItemId: "inv_wcx_001",
			type: "PURCHASE",
			quantity: 20,
			reason: "Vinhos adquiridos para o casamento",
			createdBy: USER_OWNER,
			createdAt: daysAgo(40),
		}),
		movement({
			id: "mov_027",
			inventoryItemId: "inv_wcx_001",
			type: "CONSUMPTION",
			quantity: 10,
			reason: "Parcialmente consumido antes do cancelamento",
			createdBy: USER_ADMIN,
			createdAt: daysAgo(20),
		}),
		movement({
			id: "mov_028",
			inventoryItemId: "inv_wcx_002",
			type: "PURCHASE",
			quantity: 30,
			reason: "Toalhas brancas para as mesas",
			createdBy: USER_PARTNER,
			createdAt: daysAgo(35),
		}),
		movement({
			id: "mov_029",
			inventoryItemId: "inv_wcx_005",
			type: "PURCHASE",
			quantity: 20,
			reason: "Enfeites para decoração",
			createdBy: USER_OWNER,
			createdAt: daysAgo(30),
		}),
	]);

	// ── CORPORATE (5 movements) ─────────────────────────────────────────
	await Promise.all([
		movement({
			id: "mov_030",
			inventoryItemId: "inv_cor_001",
			type: "PURCHASE",
			quantity: 80,
			reason: "Águas minerais para o evento corporativo",
			createdBy: USER_OWNER,
			createdAt: daysAgo(12),
		}),
		movement({
			id: "mov_031",
			inventoryItemId: "inv_cor_002",
			type: "PURCHASE",
			quantity: 10,
			reason: "Vinhos doces para brinde executivo",
			createdBy: USER_ADMIN,
			createdAt: daysAgo(10),
		}),
		movement({
			id: "mov_032",
			inventoryItemId: "inv_cor_003",
			type: "PURCHASE",
			quantity: 60,
			reason: "Petiscos executivos para coquetel",
			createdBy: USER_PARTNER,
			createdAt: daysAgo(9),
		}),
		movement({
			id: "mov_033",
			inventoryItemId: "inv_cor_004",
			type: "PURCHASE",
			quantity: 80,
			reason: "Materiais de apresentação para participantes",
			createdBy: USER_OWNER,
			createdAt: daysAgo(8),
		}),
		movement({
			id: "mov_034",
			inventoryItemId: "inv_cor_005",
			type: "PURCHASE",
			quantity: 2,
			reason: "Laptop e projetor para apresentações",
			createdBy: USER_ADMIN,
			createdAt: daysAgo(7),
		}),
	]);

	// ── WORKSHOP (3 movements) ──────────────────────────────────────────
	await Promise.all([
		movement({
			id: "mov_035",
			inventoryItemId: "inv_wor_001",
			type: "PURCHASE",
			quantity: 40,
			reason: "Cafés e biscoitos para coffee breaks",
			createdBy: USER_OWNER,
			createdAt: daysAgo(14),
		}),
		movement({
			id: "mov_036",
			inventoryItemId: "inv_wor_002",
			type: "PURCHASE",
			quantity: 50,
			reason: "Material de escritório para os participantes",
			createdBy: USER_ADMIN,
			createdAt: daysAgo(12),
		}),
		movement({
			id: "mov_037",
			inventoryItemId: "inv_wor_003",
			type: "PURCHASE",
			quantity: 20,
			reason: "Quadros e marcadores para actividades práticas",
			createdBy: USER_PARTNER,
			createdAt: daysAgo(10),
		}),
	]);

	// ── BABY_SHOWER (4 movements) ───────────────────────────────────────
	await Promise.all([
		movement({
			id: "mov_038",
			inventoryItemId: "inv_bab_001",
			type: "PURCHASE",
			quantity: 1,
			reason: "Bolo de embalar encomendado",
			createdBy: USER_OWNER,
			createdAt: daysAgo(25),
		}),
		movement({
			id: "mov_039",
			inventoryItemId: "inv_bab_002",
			type: "PURCHASE",
			quantity: 30,
			reason: "Lembranças para os convidados",
			createdBy: USER_PARTNER,
			createdAt: daysAgo(20),
		}),
		movement({
			id: "mov_040",
			inventoryItemId: "inv_bab_002",
			type: "LOSS",
			quantity: 5,
			reason: "Lembranças danificadas no armazenamento",
			createdBy: USER_ADMIN,
			createdAt: daysAgo(10),
		}),
		movement({
			id: "mov_041",
			inventoryItemId: "inv_bab_003",
			type: "PURCHASE",
			quantity: 50,
			reason: "Balões rosa e branco para decoração",
			createdBy: USER_OWNER,
			createdAt: daysAgo(18),
		}),
	]);

	// ── CEREMONY (6 movements) ──────────────────────────────────────────
	await Promise.all([
		movement({
			id: "mov_042",
			inventoryItemId: "inv_cer_001",
			type: "PURCHASE",
			quantity: 5,
			reason: "Vinho sacramental para a cerimónia",
			createdBy: USER_OWNER,
			createdAt: daysAgo(30),
		}),
		movement({
			id: "mov_043",
			inventoryItemId: "inv_cer_003",
			type: "PURCHASE",
			quantity: 30,
			reason: "Flores encomendadas para a igreja",
			createdBy: USER_ADMIN,
			createdAt: daysAgo(15),
		}),
		movement({
			id: "mov_044",
			inventoryItemId: "inv_cer_003",
			type: "LOSS",
			quantity: 30,
			reason: "Flores danificadas antes do transporte para a igreja",
			createdBy: USER_PARTNER,
			createdAt: daysAgo(5),
		}),
		movement({
			id: "mov_045",
			inventoryItemId: "inv_cer_004",
			type: "PURCHASE",
			quantity: 20,
			reason: "Velas cerimoniais para a cerimónia religiosa",
			createdBy: USER_OWNER,
			createdAt: daysAgo(25),
		}),
		movement({
			id: "mov_046",
			inventoryItemId: "inv_cer_005",
			type: "PURCHASE",
			quantity: 200,
			reason: "Hinos impressos para os fiéis",
			createdBy: USER_ADMIN,
			createdAt: daysAgo(22),
		}),
		movement({
			id: "mov_047",
			inventoryItemId: "inv_cer_007",
			type: "PURCHASE",
			quantity: 2,
			reason: "Almofadas para a entrega das alianças",
			createdBy: USER_PARTNER,
			createdAt: daysAgo(20),
		}),
		movement({
			id: "mov_048",
			inventoryItemId: "inv_cer_008",
			type: "PURCHASE",
			quantity: 1,
			reason: "Bolo de recepção encomendado",
			createdBy: USER_OWNER,
			createdAt: daysAgo(15),
		}),
	]);

	// ── EXTRA MOVEMENTS for items with currentQuantity=0 ────────────────
	await Promise.all([
		movement({
			id: "mov_049",
			inventoryItemId: "inv_wed_006",
			type: "PURCHASE",
			quantity: 50,
			reason: "Barriga de porco assada para o menu principal",
			createdBy: USER_ADMIN,
			createdAt: daysAgo(20),
		}),
		movement({
			id: "mov_050",
			inventoryItemId: "inv_wed_007",
			type: "PURCHASE",
			quantity: 40,
			reason: "Calulu de frango para o menu principal",
			createdBy: USER_ADMIN,
			createdAt: daysAgo(18),
		}),
	]);

	const count = await prisma.inventoryItem.count();
	console.log(`  Inventory seeded ✓ (${count} items)`);
	return count;
}
