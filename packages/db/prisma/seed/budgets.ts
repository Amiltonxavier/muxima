import { EVENTS, prisma } from "./helpers";

export async function seedBudgets() {
	const budgets = [
		{
			eventId: EVENTS.WEDDING,
			plannedAmount: 8_500_000,
			reserveAmount: 500_000,
			notes: "Orçamento baseado em cotações de 3 fornecedores.",
		},
		{
			eventId: EVENTS.ENGAGEMENT,
			plannedAmount: 2_200_000,
			reserveAmount: 200_000,
			notes: "Evento mais reduzido — foco em experiência.",
		},
		{
			eventId: EVENTS.BIRTHDAY,
			plannedAmount: 800_000,
			reserveAmount: 50_000,
			notes: "Festa de aniversário intimista.",
		},
		{
			eventId: EVENTS.CONFERENCE,
			plannedAmount: 15_000_000,
			reserveAmount: 1_000_000,
			notes: "Conferência anual de tecnologia e inovação.",
		},
		{
			eventId: EVENTS.WEDDING_CANCELLED,
			plannedAmount: 6_000_000,
			reserveAmount: 300_000,
			notes: "Casamento cancelado — verificar reembolsos.",
		},
		{
			eventId: EVENTS.CORPORATE,
			plannedAmount: 3_500_000,
			reserveAmount: 300_000,
			notes: "Jantar corporativo de confraternização.",
		},
		{
			eventId: EVENTS.WORKSHOP,
			plannedAmount: 1_200_000,
			reserveAmount: 100_000,
			notes: "Workshop intensivo de criatividade.",
		},
		{
			eventId: EVENTS.BABY_SHOWER,
			plannedAmount: 500_000,
			reserveAmount: 50_000,
			notes: "Festa de embalar — tema rosa e branco.",
		},
		{
			eventId: EVENTS.CEREMONY,
			plannedAmount: 10_000_000,
			reserveAmount: 800_000,
			notes: "Cerimónia religiosa solene com recepção.",
		},
	];

	for (const b of budgets) {
		await prisma.budget.upsert({
			where: { eventId: b.eventId },
			update: {},
			create: b,
		});
	}

	const categories = [
		// ── WEDDING ──────────────────────────────────────────────────────
		{
			id: "bcat_wed_001",
			eventId: EVENTS.WEDDING,
			name: "Espaço & Decoração",
			description: "Aluguer do venue e decoração completa",
			plannedAmount: 2_500_000,
		},
		{
			id: "bcat_wed_002",
			eventId: EVENTS.WEDDING,
			name: "Catering & Bebidas",
			description: "Buffet completo e bar aberto",
			plannedAmount: 2_200_000,
		},
		{
			id: "bcat_wed_003",
			eventId: EVENTS.WEDDING,
			name: "Música & Entretenimento",
			description: "DJ, banda ao vivo e animação",
			plannedAmount: 1_200_000,
		},
		{
			id: "bcat_wed_004",
			eventId: EVENTS.WEDDING,
			name: "Fotografia & Vídeo",
			description: "Cobertura fotográfica e videográfica completa",
			plannedAmount: 900_000,
		},
		{
			id: "bcat_wed_005",
			eventId: EVENTS.WEDDING,
			name: "Vestuário & Beleza",
			description: "Vestido, ternos, maquilhagem e penteados",
			plannedAmount: 1_000_000,
		},
		{
			id: "bcat_wed_006",
			eventId: EVENTS.WEDDING,
			name: "Transporte & Logística",
			description: "Veículos decorados e logística do dia",
			plannedAmount: 400_000,
		},
		{
			id: "bcat_wed_007",
			eventId: EVENTS.WEDDING,
			name: "Convites & Papelaria",
			description: "Convites, menus e cartões de place",
			plannedAmount: 300_000,
		},

		// ── ENGAGEMENT ───────────────────────────────────────────────────
		{
			id: "bcat_eng_001",
			eventId: EVENTS.ENGAGEMENT,
			name: "Espaço & Decoração",
			description: "Decoração do jardim e espaço",
			plannedAmount: 600_000,
		},
		{
			id: "bcat_eng_002",
			eventId: EVENTS.ENGAGEMENT,
			name: "Catering",
			description: "Petiscos e bebidas leves",
			plannedAmount: 500_000,
		},
		{
			id: "bcat_eng_003",
			eventId: EVENTS.ENGAGEMENT,
			name: "Música",
			description: "DJ e som ambiente",
			plannedAmount: 350_000,
		},
		{
			id: "bcat_eng_004",
			eventId: EVENTS.ENGAGEMENT,
			name: "Fotografia",
			description: "Sessão fotográfica do evento",
			plannedAmount: 400_000,
		},

		// ── BIRTHDAY ─────────────────────────────────────────────────────
		{
			id: "bcat_bth_001",
			eventId: EVENTS.BIRTHDAY,
			name: "Restaurante",
			description: "Aluguer do espaço e serviço",
			plannedAmount: 400_000,
		},
		{
			id: "bcat_bth_002",
			eventId: EVENTS.BIRTHDAY,
			name: "Decoração & Bolo",
			description: "Enfeites e bolo de aniversário",
			plannedAmount: 250_000,
		},
		{
			id: "bcat_bth_003",
			eventId: EVENTS.BIRTHDAY,
			name: "Música & Entretenimento",
			description: "Som e animação",
			plannedAmount: 150_000,
		},

		// ── CONFERENCE ───────────────────────────────────────────────────
		{
			id: "bcat_conf_001",
			eventId: EVENTS.CONFERENCE,
			name: "Espaço & Equipamentos",
			description: "Aluguer do centro de convenções e equipamentos AV",
			plannedAmount: 5_000_000,
		},
		{
			id: "bcat_conf_002",
			eventId: EVENTS.CONFERENCE,
			name: "Catering",
			description: "Coffee breaks e almoço dos participantes",
			plannedAmount: 4_000_000,
		},
		{
			id: "bcat_conf_003",
			eventId: EVENTS.CONFERENCE,
			name: "Palestrantes",
			description: "Honorários e despesas de palestrantes",
			plannedAmount: 3_000_000,
		},
		{
			id: "bcat_conf_004",
			eventId: EVENTS.CONFERENCE,
			name: "Materiais & Papelaria",
			description: "Materiais impressos e acessórios",
			plannedAmount: 1_500_000,
		},
		{
			id: "bcat_conf_005",
			eventId: EVENTS.CONFERENCE,
			name: "Logística",
			description: "Segurança, transporte e organização",
			plannedAmount: 1_500_000,
		},

		// ── WEDDING_CANCELLED ────────────────────────────────────────────
		{
			id: "bcat_wcanc_001",
			eventId: EVENTS.WEDDING_CANCELLED,
			name: "Espaço",
			description: "Aluguer do espaço do casamento",
			plannedAmount: 2_000_000,
		},
		{
			id: "bcat_wcanc_002",
			eventId: EVENTS.WEDDING_CANCELLED,
			name: "Decoração",
			description: "Decoração contratada",
			plannedAmount: 1_500_000,
		},
		{
			id: "bcat_wcanc_003",
			eventId: EVENTS.WEDDING_CANCELLED,
			name: "Catering",
			description: "Catering reservado",
			plannedAmount: 1_500_000,
		},
		{
			id: "bcat_wcanc_004",
			eventId: EVENTS.WEDDING_CANCELLED,
			name: "Outros",
			description: "Serviços diversos contratados",
			plannedAmount: 1_000_000,
		},

		// ── CORPORATE ────────────────────────────────────────────────────
		{
			id: "bcat_corp_001",
			eventId: EVENTS.CORPORATE,
			name: "Hotel & Espaço",
			description: "Aluguer do salão do hotel",
			plannedAmount: 1_500_000,
		},
		{
			id: "bcat_corp_002",
			eventId: EVENTS.CORPORATE,
			name: "Catering",
			description: "Jantar e bebidas",
			plannedAmount: 1_200_000,
		},
		{
			id: "bcat_corp_003",
			eventId: EVENTS.CORPORATE,
			name: "Entretenimento",
			description: "Música e animação",
			plannedAmount: 800_000,
		},

		// ── WORKSHOP ─────────────────────────────────────────────────────
		{
			id: "bcat_work_001",
			eventId: EVENTS.WORKSHOP,
			name: "Espaço & Equipamentos",
			description: "Aluguer do hub e equipamentos",
			plannedAmount: 700_000,
		},
		{
			id: "bcat_work_002",
			eventId: EVENTS.WORKSHOP,
			name: "Coffee Break & Almoço",
			description: "Refeições e lanches dos participantes",
			plannedAmount: 500_000,
		},

		// ── BABY_SHOWER ──────────────────────────────────────────────────
		{
			id: "bcat_baby_001",
			eventId: EVENTS.BABY_SHOWER,
			name: "Espaço & Decoração",
			description: "Decoração do jardim e espaço",
			plannedAmount: 250_000,
		},
		{
			id: "bcat_baby_002",
			eventId: EVENTS.BABY_SHOWER,
			name: "Bolo & Lembranças",
			description: "Bolo temático e lembranças para convidadas",
			plannedAmount: 250_000,
		},

		// ── CEREMONY ─────────────────────────────────────────────────────
		{
			id: "bcat_cer_001",
			eventId: EVENTS.CEREMONY,
			name: "Igreja & Paróquia",
			description: "Taxas e contribuições à igreja",
			plannedAmount: 2_000_000,
		},
		{
			id: "bcat_cer_002",
			eventId: EVENTS.CEREMONY,
			name: "Decoração",
			description: "Decoração da igreja e salão paroquial",
			plannedAmount: 2_500_000,
		},
		{
			id: "bcat_cer_003",
			eventId: EVENTS.CEREMONY,
			name: "Catering Recepção",
			description: "Recepção no salão paroquial",
			plannedAmount: 3_000_000,
		},
		{
			id: "bcat_cer_004",
			eventId: EVENTS.CEREMONY,
			name: "Fotografia & Vídeo",
			description: "Registo fotográfico e videográfico",
			plannedAmount: 1_500_000,
		},
		{
			id: "bcat_cer_005",
			eventId: EVENTS.CEREMONY,
			name: "Transporte",
			description: "Transporte dos participantes",
			plannedAmount: 1_000_000,
		},
	];

	for (const c of categories) {
		await prisma.budgetCategory.upsert({
			where: { id: c.id },
			update: {},
			create: c,
		});
	}

	console.log("  ✅ Budgets & Budget Categories");
}
