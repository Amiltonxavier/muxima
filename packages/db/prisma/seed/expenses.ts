import { prisma, EVENTS, USER_OWNER, USER_ADMIN, USER_PARTNER, daysAgo, daysAhead, monthsAhead, monthsAgo } from "./helpers";

export async function seedExpenses() {
	// ── Vendors ────────────────────────────────────────────────────────
	const vendors = [
		// ── WEDDING ──
		{ id: "vnd_wed_001", eventId: EVENTS.WEDDING, name: "Jardim das Flores — Decoração", category: "DECORATION" as const, phone: "+244 923 456 789", email: "contato@jardimdasflores.ao", status: "CONTRACTED" as const, description: "Decoração de eventos e casamentos." },
		{ id: "vnd_wed_002", eventId: EVENTS.WEDDING, name: "Chef Ngola — Catering", category: "CATERING" as const, phone: "+244 912 345 678", email: "reservas@chefngola.ao", status: "CONTRACTED" as const, description: "Catering premium com cozinha angolana e internacional." },
		{ id: "vnd_wed_003", eventId: EVENTS.WEDDING, name: "Som & Arte — DJ e Banda", category: "MUSIC" as const, phone: "+244 934 567 890", email: "booking@somarte.ao", status: "NEGOTIATING" as const, description: "DJ residencial e banda ao vivo." },
		{ id: "vnd_wed_004", eventId: EVENTS.WEDDING, name: "Olhar Fotográfico", category: "PHOTOGRAPHY" as const, phone: "+244 945 678 901", email: "info@olharfotografico.ao", status: "CONTRACTED" as const, description: "Fotógrafo e videógrafo profissional." },
		{ id: "vnd_wed_005", eventId: EVENTS.WEDDING, name: "Belleza Noiva — Beleza", category: "BEAUTY" as const, phone: "+244 956 789 012", email: "agendamento@bellezanoiva.ao", status: "CONTACTED" as const, description: "Maquilhagem e penteados para noivas." },
		{ id: "vnd_wed_006", eventId: EVENTS.WEDDING, name: "Transportes Reais", category: "TRANSPORT" as const, phone: "+244 967 890 123", email: "reservas@transportesreais.ao", status: "PROSPECT" as const, description: "Aluguer de veículos decorados." },

		// ── ENGAGEMENT ──
		{ id: "vnd_eng_001", eventId: EVENTS.ENGAGEMENT, name: "Clube Mineiro — Espaço", category: "VENUE" as const, phone: "+244 911 222 333", email: "eventos@clubemineiro.ao", status: "CONTRACTED" as const, description: "Aluguer do jardim e salão." },
		{ id: "vnd_eng_002", eventId: EVENTS.ENGAGEMENT, name: "Doce Momento — Pastelaria", category: "CAKE" as const, phone: "+244 978 901 234", email: "encomendas@docemomento.ao", status: "CONTRACTED" as const, description: "Bolos de noivado e sweet table." },
		{ id: "vnd_eng_003", eventId: EVENTS.ENGAGEMENT, name: "Som Ambiente — Eventos", category: "ENTERTAINMENT" as const, phone: "+244 989 012 345", email: "eventos@sombiente.ao", status: "CONTRACTED" as const, description: "Som e iluminação para eventos." },

		// ── BIRTHDAY ──
		{ id: "vnd_bth_001", eventId: EVENTS.BIRTHDAY, name: "Restaurante O Cantinho", category: "VENUE" as const, phone: "+244 922 333 444", email: "reservas@ocantinho.ao", status: "CONTRACTED" as const, description: "Restaurante com espaço para festas." },
		{ id: "vnd_bth_002", eventId: EVENTS.BIRTHDAY, name: "Flores & Festas", category: "DECORATION" as const, phone: "+244 933 444 555", email: "festas@floresfestas.ao", status: "CONTRACTED" as const, description: "Decoração para aniversários e festas." },

		// ── CONFERENCE ──
		{ id: "vnd_conf_001", eventId: EVENTS.CONFERENCE, name: "Centro de Convenções de Luanda", category: "VENUE" as const, phone: "+244 944 555 666", email: "reservas@ccaluanda.ao", status: "CONTRACTED" as const, description: "Aluguer de salas e auditórios." },
		{ id: "vnd_conf_002", eventId: EVENTS.CONFERENCE, name: "TechCatering", category: "CATERING" as const, phone: "+244 955 666 777", email: "eventos@techcatering.ao", status: "CONTRACTED" as const, description: "Catering para eventos corporativos." },
		{ id: "vnd_conf_003", eventId: EVENTS.CONFERENCE, name: "Prof. Carlos Santos", category: "OTHER" as const, phone: "+244 966 777 888", email: "carlos@santos.ao", status: "CONTRACTED" as const, description: "Palestrante internacional de tecnologia." },
		{ id: "vnd_conf_004", eventId: EVENTS.CONFERENCE, name: "Segurança Total", category: "SECURITY" as const, phone: "+244 977 888 999", email: "eventos@segurancatotal.ao", status: "CONTRACTED" as const, description: "Serviços de segurança para eventos." },

		// ── WEDDING_CANCELLED ──
		{ id: "vnd_wcanc_001", eventId: EVENTS.WEDDING_CANCELLED, name: "Palácio da Facunda", category: "VENUE" as const, phone: "+244 988 999 000", email: "reservas@palaciodafacunda.ao", status: "CONTRACTED" as const, description: "Espaço para casamentos e eventos." },
		{ id: "vnd_wcanc_002", eventId: EVENTS.WEDDING_CANCELLED, name: "DecorLux", category: "DECORATION" as const, phone: "+244 999 000 111", email: "contato@decorlux.ao", status: "CONTRACTED" as const, description: "Decoração de luxo para casamentos." },

		// ── CORPORATE ──
		{ id: "vnd_corp_001", eventId: EVENTS.CORPORATE, name: "Hotel Epic Sana", category: "VENUE" as const, phone: "+244 910 111 222", email: "eventos@epicsana.ao", status: "CONTRACTED" as const, description: "Salão de eventos do hotel." },
		{ id: "vnd_corp_002", eventId: EVENTS.CORPORATE, name: "Gourmet Corporate", category: "CATERING" as const, phone: "+244 920 222 333", email: "corporate@gourmet.ao", status: "NEGOTIATING" as const, description: "Catering para jantares corporativos." },
		{ id: "vnd_corp_003", eventId: EVENTS.CORPORATE, name: "BandShow", category: "ENTERTAINMENT" as const, phone: "+244 930 333 444", email: "bookings@bandshow.ao", status: "CONTACTED" as const, description: "Bandas e DJs para eventos corporativos." },

		// ── WORKSHOP ──
		{ id: "vnd_work_001", eventId: EVENTS.WORKSHOP, name: "Hub de Criatividade", category: "VENUE" as const, phone: "+244 940 444 555", email: "reservas@hubcriatividade.ao", status: "CONTRACTED" as const, description: "Espaço de coworking e eventos." },
		{ id: "vnd_work_002", eventId: EVENTS.WORKSHOP, name: "Coffee & Co", category: "CATERING" as const, phone: "+244 950 555 666", email: "eventos@coffeeandco.ao", status: "CONTRACTED" as const, description: "Coffee breaks e lanches para eventos." },

		// ── BABY_SHOWER ──
		{ id: "vnd_baby_001", eventId: EVENTS.BABY_SHOWER, name: "Jardim da Tia Graça", category: "VENUE" as const, phone: "+244 960 666 777", email: "festas@jardimdagraça.ao", status: "CONTRACTED" as const, description: "Espaço ao ar livre para festas." },
		{ id: "vnd_baby_002", eventId: EVENTS.BABY_SHOWER, name: "Doce Esperança", category: "CAKE" as const, phone: "+244 970 777 888", email: "encomendas@doceesperanca.ao", status: "CONTRACTED" as const, description: "Bolos temáticos e doces." },

		// ── CEREMONY ──
		{ id: "vnd_cer_001", eventId: EVENTS.CEREMONY, name: "Igreja de São Pedro", category: "VENUE" as const, phone: "+244 980 888 999", email: "paroquia@saopedro.ao", status: "CONTRACTED" as const, description: "Igreja para cerimónias religiosas." },
		{ id: "vnd_cer_002", eventId: EVENTS.CEREMONY, name: "Cerimonial Events", category: "DECORATION" as const, phone: "+244 990 999 000", email: "eventos@cerimonial.ao", status: "NEGOTIATING" as const, description: "Decoração para cerimónias religiosas." },
		{ id: "vnd_cer_003", eventId: EVENTS.CEREMONY, name: "FotoMomento", category: "PHOTOGRAPHY" as const, phone: "+244 901 000 111", email: "info@fotomomento.ao", status: "CONTACTED" as const, description: "Fotografia e vídeo para cerimónias." },
	];

	for (const v of vendors) {
		await prisma.vendor.upsert({
			where: { id: v.id },
			update: {},
			create: v,
		});
	}

	// ── Expenses ───────────────────────────────────────────────────────
	interface ExpenseData {
		id: string;
		eventId: string;
		description: string;
		type: "EXPENSE" | "INCOME";
		totalAmount: number;
		budgetCategoryId: string | null;
		vendorId: string | null;
		status: "PAID" | "PARTIALLY_PAID" | "PLANNED" | "OVERDUE" | "CANCELLED";
		paidPercentage: number;
		dueDate: Date | null;
		createdBy: string;
	}

	const expenses: ExpenseData[] = [
		// ════════════════════════════════════════════════════════════════
		// WEDDING (12 expenses) — monthsAhead(4), PLANNING
		// ════════════════════════════════════════════════════════════════
		{ id: "exp_wed_001", eventId: EVENTS.WEDDING, description: "Aluguer do Convento de São Francisco", type: "EXPENSE", totalAmount: 1_500_000, budgetCategoryId: "bcat_wed_001", vendorId: null, status: "PAID", paidPercentage: 100, dueDate: daysAgo(60), createdBy: USER_OWNER },
		{ id: "exp_wed_002", eventId: EVENTS.WEDDING, description: "Anticipo decoração — Jardim das Flores", type: "EXPENSE", totalAmount: 1_000_000, budgetCategoryId: "bcat_wed_001", vendorId: "vnd_wed_001", status: "PAID", paidPercentage: 100, dueDate: daysAgo(30), createdBy: USER_OWNER },
		{ id: "exp_wed_003", eventId: EVENTS.WEDDING, description: "Anticipo catering — Chef Ngola", type: "EXPENSE", totalAmount: 1_100_000, budgetCategoryId: "bcat_wed_002", vendorId: "vnd_wed_002", status: "PAID", paidPercentage: 100, dueDate: daysAgo(20), createdBy: USER_ADMIN },
		{ id: "exp_wed_004", eventId: EVENTS.WEDDING, description: "Compra de vinho e champanhe", type: "EXPENSE", totalAmount: 780_000, budgetCategoryId: "bcat_wed_002", vendorId: null, status: "PAID", paidPercentage: 100, dueDate: daysAgo(10), createdBy: USER_OWNER },
		{ id: "exp_wed_005", eventId: EVENTS.WEDDING, description: "DJ e som — Som & Arte", type: "EXPENSE", totalAmount: 500_000, budgetCategoryId: "bcat_wed_003", vendorId: "vnd_wed_003", status: "PLANNED", paidPercentage: 0, dueDate: daysAhead(30), createdBy: USER_ADMIN },
		{ id: "exp_wed_006", eventId: EVENTS.WEDDING, description: "Banda ao vivo — Som & Arte", type: "EXPENSE", totalAmount: 700_000, budgetCategoryId: "bcat_wed_003", vendorId: "vnd_wed_003", status: "PARTIALLY_PAID", paidPercentage: 50, dueDate: daysAhead(30), createdBy: USER_ADMIN },
		{ id: "exp_wed_007", eventId: EVENTS.WEDDING, description: "Pacote fotográfico e vídeo — Olhar Fotográfico", type: "EXPENSE", totalAmount: 500_000, budgetCategoryId: "bcat_wed_004", vendorId: "vnd_wed_004", status: "PARTIALLY_PAID", paidPercentage: 40, dueDate: daysAhead(5), createdBy: USER_OWNER },
		{ id: "exp_wed_008", eventId: EVENTS.WEDDING, description: "Videogravoção do evento", type: "EXPENSE", totalAmount: 400_000, budgetCategoryId: "bcat_wed_004", vendorId: "vnd_wed_004", status: "PLANNED", paidPercentage: 0, dueDate: daysAhead(5), createdBy: USER_OWNER },
		{ id: "exp_wed_009", eventId: EVENTS.WEDDING, description: "Vestido da noiva — Atelier", type: "EXPENSE", totalAmount: 650_000, budgetCategoryId: "bcat_wed_005", vendorId: null, status: "PAID", paidPercentage: 100, dueDate: daysAgo(45), createdBy: USER_OWNER },
		{ id: "exp_wed_010", eventId: EVENTS.WEDDING, description: "Maquilhagem e penteados — Belleza Noiva", type: "EXPENSE", totalAmount: 180_000, budgetCategoryId: "bcat_wed_005", vendorId: "vnd_wed_005", status: "PLANNED", paidPercentage: 0, dueDate: daysAhead(25), createdBy: USER_ADMIN },
		{ id: "exp_wed_011", eventId: EVENTS.WEDDING, description: "Aluguer de 3 carros decorados", type: "EXPENSE", totalAmount: 250_000, budgetCategoryId: "bcat_wed_006", vendorId: "vnd_wed_006", status: "PLANNED", paidPercentage: 0, dueDate: daysAhead(20), createdBy: USER_PARTNER },
		{ id: "exp_wed_012", eventId: EVENTS.WEDDING, description: "Convites impressos — 200 unidades", type: "EXPENSE", totalAmount: 85_000, budgetCategoryId: "bcat_wed_007", vendorId: null, status: "PAID", paidPercentage: 100, dueDate: daysAgo(30), createdBy: USER_ADMIN },

		// ════════════════════════════════════════════════════════════════
		// ENGAGEMENT (8 expenses) — monthsAhead(1), CONFIRMED
		// ════════════════════════════════════════════════════════════════
		{ id: "exp_eng_001", eventId: EVENTS.ENGAGEMENT, description: "Aluguer do Clube Mineiro", type: "EXPENSE", totalAmount: 500_000, budgetCategoryId: "bcat_eng_001", vendorId: "vnd_eng_001", status: "PAID", paidPercentage: 100, dueDate: daysAgo(20), createdBy: USER_PARTNER },
		{ id: "exp_eng_002", eventId: EVENTS.ENGAGEMENT, description: "Decoração do jardim", type: "EXPENSE", totalAmount: 350_000, budgetCategoryId: "bcat_eng_001", vendorId: "vnd_eng_001", status: "PAID", paidPercentage: 100, dueDate: daysAgo(15), createdBy: USER_PARTNER },
		{ id: "exp_eng_003", eventId: EVENTS.ENGAGEMENT, description: "Petiscos e bebidas leves", type: "EXPENSE", totalAmount: 400_000, budgetCategoryId: "bcat_eng_002", vendorId: null, status: "PARTIALLY_PAID", paidPercentage: 50, dueDate: daysAhead(10), createdBy: USER_PARTNER },
		{ id: "exp_eng_004", eventId: EVENTS.ENGAGEMENT, description: "Bolo de noivado — Doce Momento", type: "EXPENSE", totalAmount: 150_000, budgetCategoryId: "bcat_eng_002", vendorId: "vnd_eng_002", status: "PLANNED", paidPercentage: 0, dueDate: daysAhead(15), createdBy: USER_OWNER },
		{ id: "exp_eng_005", eventId: EVENTS.ENGAGEMENT, description: "DJ e som ambiente", type: "EXPENSE", totalAmount: 300_000, budgetCategoryId: "bcat_eng_003", vendorId: "vnd_eng_003", status: "PLANNED", paidPercentage: 0, dueDate: daysAhead(10), createdBy: USER_PARTNER },
		{ id: "exp_eng_006", eventId: EVENTS.ENGAGEMENT, description: "Sessão fotográfica", type: "EXPENSE", totalAmount: 350_000, budgetCategoryId: "bcat_eng_004", vendorId: null, status: "PARTIALLY_PAID", paidPercentage: 40, dueDate: daysAhead(5), createdBy: USER_OWNER },
		{ id: "exp_eng_007", eventId: EVENTS.ENGAGEMENT, description: "Contribuição dos convidados", type: "INCOME", totalAmount: 200_000, budgetCategoryId: null, vendorId: null, status: "PAID", paidPercentage: 100, dueDate: daysAgo(5), createdBy: USER_PARTNER },
		{ id: "exp_eng_008", eventId: EVENTS.ENGAGEMENT, description: "Lembranças de noivado", type: "EXPENSE", totalAmount: 80_000, budgetCategoryId: "bcat_eng_001", vendorId: null, status: "PLANNED", paidPercentage: 0, dueDate: daysAhead(20), createdBy: USER_PARTNER },

		// ════════════════════════════════════════════════════════════════
		// BIRTHDAY (7 expenses) — today, CONFIRMED
		// ════════════════════════════════════════════════════════════════
		{ id: "exp_bth_001", eventId: EVENTS.BIRTHDAY, description: "Reserva do Restaurante O Cantinho", type: "EXPENSE", totalAmount: 350_000, budgetCategoryId: "bcat_bth_001", vendorId: "vnd_bth_001", status: "PAID", paidPercentage: 100, dueDate: daysAgo(15), createdBy: USER_OWNER },
		{ id: "exp_bth_002", eventId: EVENTS.BIRTHDAY, description: "Decoração e enfeites", type: "EXPENSE", totalAmount: 150_000, budgetCategoryId: "bcat_bth_002", vendorId: "vnd_bth_002", status: "PAID", paidPercentage: 100, dueDate: daysAgo(10), createdBy: USER_OWNER },
		{ id: "exp_bth_003", eventId: EVENTS.BIRTHDAY, description: "Bolo de aniversário", type: "EXPENSE", totalAmount: 80_000, budgetCategoryId: "bcat_bth_002", vendorId: null, status: "PLANNED", paidPercentage: 0, dueDate: daysAgo(5), createdBy: USER_OWNER },
		{ id: "exp_bth_004", eventId: EVENTS.BIRTHDAY, description: "Som e animação", type: "EXPENSE", totalAmount: 120_000, budgetCategoryId: "bcat_bth_003", vendorId: null, status: "PARTIALLY_PAID", paidPercentage: 60, dueDate: daysAgo(3), createdBy: USER_ADMIN },
		{ id: "exp_bth_005", eventId: EVENTS.BIRTHDAY, description: "Presente especial", type: "EXPENSE", totalAmount: 50_000, budgetCategoryId: null, vendorId: null, status: "PLANNED", paidPercentage: 0, dueDate: new Date(), createdBy: USER_OWNER },
		{ id: "exp_bth_006", eventId: EVENTS.BIRTHDAY, description: "Contribuição dos amigos", type: "INCOME", totalAmount: 200_000, budgetCategoryId: null, vendorId: null, status: "PAID", paidPercentage: 100, dueDate: daysAgo(2), createdBy: USER_OWNER },
		{ id: "exp_bth_007", eventId: EVENTS.BIRTHDAY, description: "Decoração extra — balões e faixas", type: "EXPENSE", totalAmount: 30_000, budgetCategoryId: "bcat_bth_002", vendorId: null, status: "OVERDUE", paidPercentage: 0, dueDate: daysAgo(5), createdBy: USER_ADMIN },

		// ════════════════════════════════════════════════════════════════
		// CONFERENCE (10 expenses) — monthsAgo(2), COMPLETED
		// ════════════════════════════════════════════════════════════════
		{ id: "exp_conf_001", eventId: EVENTS.CONFERENCE, description: "Aluguer do Centro de Convenções — 2 dias", type: "EXPENSE", totalAmount: 4_000_000, budgetCategoryId: "bcat_conf_001", vendorId: "vnd_conf_001", status: "PAID", paidPercentage: 100, dueDate: monthsAgo(3), createdBy: USER_ADMIN },
		{ id: "exp_conf_002", eventId: EVENTS.CONFERENCE, description: "Equipamentos AV e projectores", type: "EXPENSE", totalAmount: 1_000_000, budgetCategoryId: "bcat_conf_001", vendorId: "vnd_conf_001", status: "PAID", paidPercentage: 100, dueDate: monthsAgo(2), createdBy: USER_ADMIN },
		{ id: "exp_conf_003", eventId: EVENTS.CONFERENCE, description: "Catering — almoço 2 dias", type: "EXPENSE", totalAmount: 3_500_000, budgetCategoryId: "bcat_conf_002", vendorId: "vnd_conf_002", status: "PAID", paidPercentage: 100, dueDate: monthsAgo(2), createdBy: USER_ADMIN },
		{ id: "exp_conf_004", eventId: EVENTS.CONFERENCE, description: "Coffee breaks — 4 pausas", type: "EXPENSE", totalAmount: 500_000, budgetCategoryId: "bcat_conf_002", vendorId: "vnd_conf_002", status: "PARTIALLY_PAID", paidPercentage: 60, dueDate: monthsAgo(2), createdBy: USER_ADMIN },
		{ id: "exp_conf_005", eventId: EVENTS.CONFERENCE, description: "Palestrante internacional — Prof. Carlos Santos", type: "EXPENSE", totalAmount: 2_000_000, budgetCategoryId: "bcat_conf_003", vendorId: "vnd_conf_003", status: "PAID", paidPercentage: 100, dueDate: monthsAgo(3), createdBy: USER_ADMIN },
		{ id: "exp_conf_006", eventId: EVENTS.CONFERENCE, description: "Honorários palestrantes locais", type: "EXPENSE", totalAmount: 800_000, budgetCategoryId: "bcat_conf_003", vendorId: null, status: "PLANNED", paidPercentage: 0, dueDate: monthsAgo(2), createdBy: USER_ADMIN },
		{ id: "exp_conf_007", eventId: EVENTS.CONFERENCE, description: "Materiais impressos — cadernos e badges", type: "EXPENSE", totalAmount: 800_000, budgetCategoryId: "bcat_conf_004", vendorId: null, status: "PAID", paidPercentage: 100, dueDate: monthsAgo(2), createdBy: USER_ADMIN },
		{ id: "exp_conf_008", eventId: EVENTS.CONFERENCE, description: "Segurança — 2 dias", type: "EXPENSE", totalAmount: 600_000, budgetCategoryId: "bcat_conf_005", vendorId: "vnd_conf_004", status: "PLANNED", paidPercentage: 0, dueDate: monthsAgo(2), createdBy: USER_ADMIN },
		{ id: "exp_conf_009", eventId: EVENTS.CONFERENCE, description: "Transporte de participantes", type: "EXPENSE", totalAmount: 400_000, budgetCategoryId: "bcat_conf_005", vendorId: null, status: "OVERDUE", paidPercentage: 0, dueDate: monthsAgo(1), createdBy: USER_ADMIN },
		{ id: "exp_conf_010", eventId: EVENTS.CONFERENCE, description: "Taxas de inscrição — 200 participantes", type: "INCOME", totalAmount: 3_000_000, budgetCategoryId: null, vendorId: null, status: "PAID", paidPercentage: 100, dueDate: monthsAgo(1), createdBy: USER_ADMIN },

		// ════════════════════════════════════════════════════════════════
		// WEDDING_CANCELLED (7 expenses) — monthsAhead(6), CANCELLED
		// ════════════════════════════════════════════════════════════════
		{ id: "exp_wcanc_001", eventId: EVENTS.WEDDING_CANCELLED, description: "Sinal do Palácio da Facunda", type: "EXPENSE", totalAmount: 1_000_000, budgetCategoryId: "bcat_wcanc_001", vendorId: "vnd_wcanc_001", status: "PAID", paidPercentage: 100, dueDate: monthsAgo(3), createdBy: USER_ADMIN },
		{ id: "exp_wcanc_002", eventId: EVENTS.WEDDING_CANCELLED, description: "Anticipo decoração — DecorLux", type: "EXPENSE", totalAmount: 750_000, budgetCategoryId: "bcat_wcanc_002", vendorId: "vnd_wcanc_002", status: "PARTIALLY_PAID", paidPercentage: 50, dueDate: monthsAgo(2), createdBy: USER_ADMIN },
		{ id: "exp_wcanc_003", eventId: EVENTS.WEDDING_CANCELLED, description: "Anticipo catering", type: "EXPENSE", totalAmount: 500_000, budgetCategoryId: "bcat_wcanc_003", vendorId: null, status: "CANCELLED", paidPercentage: 0, dueDate: monthsAgo(2), createdBy: USER_ADMIN },
		{ id: "exp_wcanc_004", eventId: EVENTS.WEDDING_CANCELLED, description: "Convites impressos", type: "EXPENSE", totalAmount: 150_000, budgetCategoryId: "bcat_wcanc_004", vendorId: null, status: "CANCELLED", paidPercentage: 0, dueDate: monthsAgo(1), createdBy: USER_ADMIN },
		{ id: "exp_wcanc_005", eventId: EVENTS.WEDDING_CANCELLED, description: "Transporte — aluguer de carros", type: "EXPENSE", totalAmount: 200_000, budgetCategoryId: "bcat_wcanc_004", vendorId: null, status: "CANCELLED", paidPercentage: 0, dueDate: monthsAhead(5), createdBy: USER_ADMIN },
		{ id: "exp_wcanc_006", eventId: EVENTS.WEDDING_CANCELLED, description: "Música e DJ", type: "EXPENSE", totalAmount: 300_000, budgetCategoryId: "bcat_wcanc_004", vendorId: null, status: "CANCELLED", paidPercentage: 0, dueDate: monthsAhead(5), createdBy: USER_ADMIN },
		{ id: "exp_wcanc_007", eventId: EVENTS.WEDDING_CANCELLED, description: "Reembolso parcial do venue", type: "INCOME", totalAmount: 500_000, budgetCategoryId: null, vendorId: null, status: "PAID", paidPercentage: 100, dueDate: daysAgo(10), createdBy: USER_ADMIN },

		// ════════════════════════════════════════════════════════════════
		// CORPORATE (8 expenses) — daysAhead(14), PLANNING
		// ════════════════════════════════════════════════════════════════
		{ id: "exp_corp_001", eventId: EVENTS.CORPORATE, description: "Reserva do Hotel Epic Sana — salão", type: "EXPENSE", totalAmount: 1_200_000, budgetCategoryId: "bcat_corp_001", vendorId: "vnd_corp_001", status: "PAID", paidPercentage: 100, dueDate: daysAgo(10), createdBy: USER_PARTNER },
		{ id: "exp_corp_002", eventId: EVENTS.CORPORATE, description: "Decoração do salão", type: "EXPENSE", totalAmount: 300_000, budgetCategoryId: "bcat_corp_001", vendorId: null, status: "PARTIALLY_PAID", paidPercentage: 50, dueDate: daysAhead(10), createdBy: USER_PARTNER },
		{ id: "exp_corp_003", eventId: EVENTS.CORPORATE, description: "Jantar buffet — 80 pessoas", type: "EXPENSE", totalAmount: 1_000_000, budgetCategoryId: "bcat_corp_002", vendorId: "vnd_corp_002", status: "PARTIALLY_PAID", paidPercentage: 40, dueDate: daysAhead(12), createdBy: USER_PARTNER },
		{ id: "exp_corp_004", eventId: EVENTS.CORPORATE, description: "Bebidas e bar aberto", type: "EXPENSE", totalAmount: 200_000, budgetCategoryId: "bcat_corp_002", vendorId: null, status: "PLANNED", paidPercentage: 0, dueDate: daysAhead(13), createdBy: USER_PARTNER },
		{ id: "exp_corp_005", eventId: EVENTS.CORPORATE, description: "Banda ao vivo", type: "EXPENSE", totalAmount: 600_000, budgetCategoryId: "bcat_corp_003", vendorId: "vnd_corp_003", status: "PLANNED", paidPercentage: 0, dueDate: daysAhead(14), createdBy: USER_PARTNER },
		{ id: "exp_corp_006", eventId: EVENTS.CORPORATE, description: "DJ para after-party", type: "EXPENSE", totalAmount: 200_000, budgetCategoryId: "bcat_corp_003", vendorId: "vnd_corp_003", status: "PLANNED", paidPercentage: 0, dueDate: daysAhead(14), createdBy: USER_PARTNER },
		{ id: "exp_corp_007", eventId: EVENTS.CORPORATE, description: "Patrocínio da empresa", type: "INCOME", totalAmount: 1_000_000, budgetCategoryId: null, vendorId: null, status: "PAID", paidPercentage: 100, dueDate: daysAgo(5), createdBy: USER_PARTNER },
		{ id: "exp_corp_008", eventId: EVENTS.CORPORATE, description: "Material de apoio — pastas e canetas", type: "EXPENSE", totalAmount: 100_000, budgetCategoryId: "bcat_corp_001", vendorId: null, status: "PLANNED", paidPercentage: 0, dueDate: daysAhead(12), createdBy: USER_PARTNER },

		// ════════════════════════════════════════════════════════════════
		// WORKSHOP (6 expenses) — daysAhead(21), CONFIRMED
		// ════════════════════════════════════════════════════════════════
		{ id: "exp_work_001", eventId: EVENTS.WORKSHOP, description: "Aluguer do Hub de Criatividade", type: "EXPENSE", totalAmount: 500_000, budgetCategoryId: "bcat_work_001", vendorId: "vnd_work_001", status: "PAID", paidPercentage: 100, dueDate: daysAgo(7), createdBy: USER_PARTNER },
		{ id: "exp_work_002", eventId: EVENTS.WORKSHOP, description: "Equipamentos AV e projetor", type: "EXPENSE", totalAmount: 200_000, budgetCategoryId: "bcat_work_001", vendorId: null, status: "PARTIALLY_PAID", paidPercentage: 50, dueDate: daysAhead(18), createdBy: USER_PARTNER },
		{ id: "exp_work_003", eventId: EVENTS.WORKSHOP, description: "Coffee break — manhã e tarde", type: "EXPENSE", totalAmount: 250_000, budgetCategoryId: "bcat_work_002", vendorId: "vnd_work_002", status: "PLANNED", paidPercentage: 0, dueDate: daysAhead(20), createdBy: USER_PARTNER },
		{ id: "exp_work_004", eventId: EVENTS.WORKSHOP, description: "Almoço buffet", type: "EXPENSE", totalAmount: 250_000, budgetCategoryId: "bcat_work_002", vendorId: "vnd_work_002", status: "PLANNED", paidPercentage: 0, dueDate: daysAhead(21), createdBy: USER_PARTNER },
		{ id: "exp_work_005", eventId: EVENTS.WORKSHOP, description: "Taxas de inscrição — 40 participantes", type: "INCOME", totalAmount: 600_000, budgetCategoryId: null, vendorId: null, status: "PAID", paidPercentage: 100, dueDate: daysAgo(3), createdBy: USER_PARTNER },
		{ id: "exp_work_006", eventId: EVENTS.WORKSHOP, description: "Material de apoio — cadernos e lápis", type: "EXPENSE", totalAmount: 100_000, budgetCategoryId: "bcat_work_001", vendorId: null, status: "PLANNED", paidPercentage: 0, dueDate: daysAhead(19), createdBy: USER_PARTNER },

		// ════════════════════════════════════════════════════════════════
		// BABY_SHOWER (7 expenses) — monthsAgo(1), COMPLETED
		// ════════════════════════════════════════════════════════════════
		{ id: "exp_baby_001", eventId: EVENTS.BABY_SHOWER, description: "Aluguer do Jardim da Tia Graça", type: "EXPENSE", totalAmount: 200_000, budgetCategoryId: "bcat_baby_001", vendorId: "vnd_baby_001", status: "PAID", paidPercentage: 100, dueDate: monthsAgo(2), createdBy: USER_ADMIN },
		{ id: "exp_baby_002", eventId: EVENTS.BABY_SHOWER, description: "Decoração — tema rosa e branco", type: "EXPENSE", totalAmount: 150_000, budgetCategoryId: "bcat_baby_001", vendorId: null, status: "PAID", paidPercentage: 100, dueDate: monthsAgo(1), createdBy: USER_ADMIN },
		{ id: "exp_baby_003", eventId: EVENTS.BABY_SHOWER, description: "Bolo temático — Doce Esperança", type: "EXPENSE", totalAmount: 120_000, budgetCategoryId: "bcat_baby_002", vendorId: "vnd_baby_002", status: "PAID", paidPercentage: 100, dueDate: monthsAgo(1), createdBy: USER_ADMIN },
		{ id: "exp_baby_004", eventId: EVENTS.BABY_SHOWER, description: "Lembranças para convidadas", type: "EXPENSE", totalAmount: 80_000, budgetCategoryId: "bcat_baby_002", vendorId: null, status: "PLANNED", paidPercentage: 0, dueDate: monthsAgo(1), createdBy: USER_ADMIN },
		{ id: "exp_baby_005", eventId: EVENTS.BABY_SHOWER, description: "Comida e bebidas", type: "EXPENSE", totalAmount: 100_000, budgetCategoryId: "bcat_baby_001", vendorId: null, status: "PLANNED", paidPercentage: 0, dueDate: monthsAgo(1), createdBy: USER_ADMIN },
		{ id: "exp_baby_006", eventId: EVENTS.BABY_SHOWER, description: "Contribuição das convidadas", type: "INCOME", totalAmount: 150_000, budgetCategoryId: null, vendorId: null, status: "PAID", paidPercentage: 100, dueDate: monthsAgo(1), createdBy: USER_ADMIN },
		{ id: "exp_baby_007", eventId: EVENTS.BABY_SHOWER, description: "Encomenda especial — pelúcia", type: "EXPENSE", totalAmount: 50_000, budgetCategoryId: null, vendorId: null, status: "OVERDUE", paidPercentage: 0, dueDate: monthsAgo(1), createdBy: USER_ADMIN },

		// ════════════════════════════════════════════════════════════════
		// CEREMONY (8 expenses) — monthsAhead(5), PLANNING
		// ════════════════════════════════════════════════════════════════
		{ id: "exp_cer_001", eventId: EVENTS.CEREMONY, description: "Taxas da Igreja de São Pedro", type: "EXPENSE", totalAmount: 1_500_000, budgetCategoryId: "bcat_cer_001", vendorId: "vnd_cer_001", status: "PAID", paidPercentage: 100, dueDate: daysAgo(30), createdBy: USER_OWNER },
		{ id: "exp_cer_002", eventId: EVENTS.CEREMONY, description: "Decoração da igreja — Cerimonial Events", type: "EXPENSE", totalAmount: 1_200_000, budgetCategoryId: "bcat_cer_002", vendorId: "vnd_cer_002", status: "PARTIALLY_PAID", paidPercentage: 50, dueDate: daysAhead(60), createdBy: USER_OWNER },
		{ id: "exp_cer_003", eventId: EVENTS.CEREMONY, description: "Decoração do salão paroquial", type: "EXPENSE", totalAmount: 1_300_000, budgetCategoryId: "bcat_cer_002", vendorId: "vnd_cer_002", status: "PLANNED", paidPercentage: 0, dueDate: daysAhead(60), createdBy: USER_OWNER },
		{ id: "exp_cer_004", eventId: EVENTS.CEREMONY, description: "Catering recepção — 300 pessoas", type: "EXPENSE", totalAmount: 2_500_000, budgetCategoryId: "bcat_cer_003", vendorId: null, status: "PARTIALLY_PAID", paidPercentage: 30, dueDate: daysAhead(60), createdBy: USER_OWNER },
		{ id: "exp_cer_005", eventId: EVENTS.CEREMONY, description: "Fotografia e vídeo — FotoMomento", type: "EXPENSE", totalAmount: 1_200_000, budgetCategoryId: "bcat_cer_004", vendorId: "vnd_cer_003", status: "PLANNED", paidPercentage: 0, dueDate: daysAhead(55), createdBy: USER_OWNER },
		{ id: "exp_cer_006", eventId: EVENTS.CEREMONY, description: "Transporte de participantes", type: "EXPENSE", totalAmount: 800_000, budgetCategoryId: "bcat_cer_005", vendorId: null, status: "PLANNED", paidPercentage: 0, dueDate: daysAhead(50), createdBy: USER_OWNER },
		{ id: "exp_cer_007", eventId: EVENTS.CEREMONY, description: "Ofertas da comunidade", type: "INCOME", totalAmount: 800_000, budgetCategoryId: null, vendorId: null, status: "PLANNED", paidPercentage: 0, dueDate: daysAhead(55), createdBy: USER_OWNER },
		{ id: "exp_cer_008", eventId: EVENTS.CEREMONY, description: "Segurança e organização", type: "EXPENSE", totalAmount: 200_000, budgetCategoryId: "bcat_cer_005", vendorId: null, status: "PLANNED", paidPercentage: 0, dueDate: daysAhead(50), createdBy: USER_OWNER },
	];

	for (const e of expenses) {
		await prisma.expense.upsert({
			where: { id: e.id },
			update: {},
			create: e,
		});
	}

	// ── Payments ───────────────────────────────────────────────────────
	interface PaymentData {
		id: string;
		expenseId: string;
		amount: number;
		paymentDate: Date;
		method: "BANK_TRANSFER" | "CASH" | "CARD" | "MOBILE_PAYMENT" | "ATM" | "OTHER";
		reference: string | null;
		notes: string | null;
		createdBy: string;
	}

	const payments: PaymentData[] = [
		// ── WEDDING (7 payments) ──
		{ id: "pay_001", expenseId: "exp_wed_001", amount: 1_500_000, paymentDate: daysAgo(60), method: "BANK_TRANSFER", reference: "TRF-2026-001", notes: "Pagamento integral do venue", createdBy: USER_OWNER },
		{ id: "pay_002", expenseId: "exp_wed_002", amount: 1_000_000, paymentDate: daysAgo(30), method: "BANK_TRANSFER", reference: "TRF-2026-002", notes: "Anticipo 50% decoração", createdBy: USER_OWNER },
		{ id: "pay_003", expenseId: "exp_wed_003", amount: 1_100_000, paymentDate: daysAgo(20), method: "BANK_TRANSFER", reference: "TRF-2026-003", notes: "Anticipo 50% catering", createdBy: USER_ADMIN },
		{ id: "pay_004", expenseId: "exp_wed_005", amount: 250_000, paymentDate: daysAgo(5), method: "MOBILE_PAYMENT", reference: "MP-2026-001", notes: "Adiantamento DJ — 50%", createdBy: USER_ADMIN },
		{ id: "pay_005", expenseId: "exp_wed_006", amount: 350_000, paymentDate: daysAgo(3), method: "CARD", reference: "CARD-2026-001", notes: "Adiantamento banda — 50%", createdBy: USER_ADMIN },
		{ id: "pay_006", expenseId: "exp_wed_007", amount: 200_000, paymentDate: daysAgo(7), method: "BANK_TRANSFER", reference: "TRF-2026-004", notes: "Adiantamento fotógrafo — 40%", createdBy: USER_OWNER },
		{ id: "pay_007", expenseId: "exp_wed_011", amount: 500_000, paymentDate: daysAgo(15), method: "OTHER", reference: null, notes: "Pagamento integral — contribuição dos padrinhos", createdBy: USER_OWNER },

		// ── ENGAGEMENT (5 payments) ──
		{ id: "pay_008", expenseId: "exp_eng_001", amount: 500_000, paymentDate: daysAgo(20), method: "BANK_TRANSFER", reference: "TRF-2026-005", notes: "Pagamento integral do espaço", createdBy: USER_PARTNER },
		{ id: "pay_009", expenseId: "exp_eng_002", amount: 350_000, paymentDate: daysAgo(15), method: "CASH", reference: null, notes: "Pagamento em numerário", createdBy: USER_PARTNER },
		{ id: "pay_010", expenseId: "exp_eng_003", amount: 200_000, paymentDate: daysAgo(3), method: "MOBILE_PAYMENT", reference: "MP-2026-002", notes: "Adiantamento petiscos — 50%", createdBy: USER_PARTNER },
		{ id: "pay_011", expenseId: "exp_eng_006", amount: 140_000, paymentDate: daysAgo(5), method: "CARD", reference: "CARD-2026-002", notes: "Adiantamento fotógrafo — 40%", createdBy: USER_OWNER },
		{ id: "pay_012", expenseId: "exp_eng_007", amount: 200_000, paymentDate: daysAgo(5), method: "BANK_TRANSFER", reference: "TRF-2026-006", notes: "Receita de contribuições", createdBy: USER_PARTNER },

		// ── BIRTHDAY (4 payments) ──
		{ id: "pay_013", expenseId: "exp_bth_001", amount: 350_000, paymentDate: daysAgo(15), method: "BANK_TRANSFER", reference: "TRF-2026-007", notes: "Pagamento integral da reserva", createdBy: USER_OWNER },
		{ id: "pay_014", expenseId: "exp_bth_002", amount: 150_000, paymentDate: daysAgo(10), method: "CASH", reference: null, notes: "Pagamento decoração", createdBy: USER_OWNER },
		{ id: "pay_015", expenseId: "exp_bth_004", amount: 72_000, paymentDate: daysAgo(3), method: "MOBILE_PAYMENT", reference: "MP-2026-003", notes: "Adiantamento som — 60%", createdBy: USER_ADMIN },
		{ id: "pay_016", expenseId: "exp_bth_006", amount: 200_000, paymentDate: daysAgo(2), method: "CASH", reference: null, notes: "Receita de contribuições", createdBy: USER_OWNER },

		// ── CONFERENCE (7 payments) ──
		{ id: "pay_017", expenseId: "exp_conf_001", amount: 4_000_000, paymentDate: monthsAgo(3), method: "BANK_TRANSFER", reference: "TRF-2026-009", notes: "Pagamento integral do venue", createdBy: USER_ADMIN },
		{ id: "pay_018", expenseId: "exp_conf_002", amount: 1_000_000, paymentDate: monthsAgo(2), method: "BANK_TRANSFER", reference: "TRF-2026-010", notes: "Pagamento equipamentos AV", createdBy: USER_ADMIN },
		{ id: "pay_019", expenseId: "exp_conf_003", amount: 3_500_000, paymentDate: monthsAgo(2), method: "BANK_TRANSFER", reference: "TRF-2026-011", notes: "Pagamento integral catering", createdBy: USER_ADMIN },
		{ id: "pay_020", expenseId: "exp_conf_004", amount: 300_000, paymentDate: monthsAgo(2), method: "CASH", reference: null, notes: "Adiantamento coffee breaks — 60%", createdBy: USER_ADMIN },
		{ id: "pay_021", expenseId: "exp_conf_005", amount: 2_000_000, paymentDate: monthsAgo(3), method: "CARD", reference: "CARD-2026-003", notes: "Pagamento palestrante internacional", createdBy: USER_ADMIN },
		{ id: "pay_022", expenseId: "exp_conf_007", amount: 800_000, paymentDate: monthsAgo(2), method: "OTHER", reference: "REF-MATERIAIS-001", notes: "Pagamento materiais impressos", createdBy: USER_ADMIN },
		{ id: "pay_023", expenseId: "exp_conf_010", amount: 3_000_000, paymentDate: monthsAgo(1), method: "BANK_TRANSFER", reference: "TRF-2026-012", notes: "Receita de inscrições", createdBy: USER_ADMIN },

		// ── WEDDING_CANCELLED (3 payments) ──
		{ id: "pay_024", expenseId: "exp_wcanc_001", amount: 1_000_000, paymentDate: monthsAgo(3), method: "BANK_TRANSFER", reference: "TRF-2026-013", notes: "Sinal do venue", createdBy: USER_ADMIN },
		{ id: "pay_025", expenseId: "exp_wcanc_002", amount: 375_000, paymentDate: monthsAgo(2), method: "CARD", reference: "CARD-2026-004", notes: "Adiantamento decoração — 50%", createdBy: USER_ADMIN },
		{ id: "pay_026", expenseId: "exp_wcanc_007", amount: 500_000, paymentDate: daysAgo(10), method: "MOBILE_PAYMENT", reference: "MP-2026-005", notes: "Reembolso parcial do venue", createdBy: USER_ADMIN },

		// ── CORPORATE (4 payments) ──
		{ id: "pay_027", expenseId: "exp_corp_001", amount: 1_200_000, paymentDate: daysAgo(10), method: "BANK_TRANSFER", reference: "TRF-2026-015", notes: "Pagamento integral do hotel", createdBy: USER_PARTNER },
		{ id: "pay_028", expenseId: "exp_corp_002", amount: 150_000, paymentDate: daysAgo(3), method: "CASH", reference: null, notes: "Adiantamento decoração — 50%", createdBy: USER_PARTNER },
		{ id: "pay_029", expenseId: "exp_corp_003", amount: 400_000, paymentDate: daysAgo(2), method: "MOBILE_PAYMENT", reference: "MP-2026-004", notes: "Adiantamento jantar — 40%", createdBy: USER_PARTNER },
		{ id: "pay_030", expenseId: "exp_corp_007", amount: 1_000_000, paymentDate: daysAgo(5), method: "BANK_TRANSFER", reference: "TRF-2026-016", notes: "Patrocínio da empresa", createdBy: USER_PARTNER },

		// ── WORKSHOP (3 payments) ──
		{ id: "pay_031", expenseId: "exp_work_001", amount: 500_000, paymentDate: daysAgo(7), method: "BANK_TRANSFER", reference: "TRF-2026-017", notes: "Pagamento integral do hub", createdBy: USER_PARTNER },
		{ id: "pay_032", expenseId: "exp_work_002", amount: 100_000, paymentDate: daysAgo(2), method: "CARD", reference: "CARD-2026-005", notes: "Adiantamento equipamentos — 50%", createdBy: USER_PARTNER },
		{ id: "pay_033", expenseId: "exp_work_005", amount: 600_000, paymentDate: daysAgo(3), method: "OTHER", reference: "REF-INS-2026", notes: "Receita de inscrições", createdBy: USER_PARTNER },

		// ── BABY_SHOWER (4 payments) ──
		{ id: "pay_034", expenseId: "exp_baby_001", amount: 200_000, paymentDate: monthsAgo(2), method: "CASH", reference: null, notes: "Pagamento integral do jardim", createdBy: USER_ADMIN },
		{ id: "pay_035", expenseId: "exp_baby_002", amount: 150_000, paymentDate: monthsAgo(1), method: "CASH", reference: null, notes: "Pagamento decoração", createdBy: USER_ADMIN },
		{ id: "pay_036", expenseId: "exp_baby_003", amount: 120_000, paymentDate: monthsAgo(1), method: "ATM", reference: "ATM-2026-001", notes: "Pagamento bolo", createdBy: USER_ADMIN },
		{ id: "pay_037", expenseId: "exp_baby_006", amount: 150_000, paymentDate: monthsAgo(1), method: "CARD", reference: "CARD-2026-006", notes: "Receita de contribuições", createdBy: USER_ADMIN },

		// ── CEREMONY (3 payments) ──
		{ id: "pay_038", expenseId: "exp_cer_001", amount: 1_500_000, paymentDate: daysAgo(30), method: "ATM", reference: "ATM-2026-002", notes: "Pagamento integral das taxas da igreja", createdBy: USER_OWNER },
		{ id: "pay_039", expenseId: "exp_cer_002", amount: 600_000, paymentDate: daysAgo(15), method: "CASH", reference: null, notes: "Adiantamento decoração igreja — 50%", createdBy: USER_OWNER },
		{ id: "pay_040", expenseId: "exp_cer_004", amount: 750_000, paymentDate: daysAgo(10), method: "ATM", reference: "ATM-2026-003", notes: "Adiantamento catering recepção — 30%", createdBy: USER_OWNER },
	];

	for (const p of payments) {
		await prisma.payment.upsert({
			where: { id: p.id },
			update: {},
			create: p,
		});
	}

	console.log(`  ✅ Expenses (${expenses.length}) & Payments (${payments.length})`);
}
