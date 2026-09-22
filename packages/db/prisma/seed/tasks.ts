import { prisma, EVENTS, daysAgo, daysAhead, monthsAhead, monthsAgo } from "./helpers";

const USER_OWNER = "usr_owner_001";
const USER_PARTNER = "usr_partner_002";
const USER_ADMIN = "usr_admin_003";
const USER_EDITOR = "usr_editor_004";

type Category =
	| "FINANCE"
	| "VENUE"
	| "GUESTS"
	| "FOOD"
	| "DRINKS"
	| "DECORATION"
	| "CEREMONY"
	| "DOCUMENTS"
	| "CLOTHING"
	| "TRANSPORT"
	| "OTHER";

type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type Status = "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

interface TaskInput {
	id: string;
	eventId: string;
	title: string;
	description?: string;
	category: Category;
	priority: Priority;
	status: Status;
	assignedTo?: string;
	dueDate?: Date;
	completedAt?: Date;
	completedBy?: string;
	createdBy: string;
}

function task(data: TaskInput) {
	const now = new Date();
	return prisma.task.upsert({
		where: { id: data.id },
		update: {},
		create: {
			id: data.id,
			eventId: data.eventId,
			title: data.title,
			description: data.description,
			category: data.category,
			priority: data.priority,
			status: data.status,
			assignedTo: data.assignedTo,
			dueDate: data.dueDate,
			completedAt: data.status === "COMPLETED" ? data.completedAt ?? now : null,
			completedBy: data.status === "COMPLETED" ? data.completedBy ?? data.createdBy : null,
			createdBy: data.createdBy,
			createdAt: now,
			updatedAt: now,
		},
	});
}

export async function seedTasks() {
	console.log("  Seeding tasks…");

	const weddingDate = monthsAhead(4);
	const engagementDate = monthsAhead(1);
	const birthdayDate = new Date();
	const conferenceDate = monthsAgo(2);
	const weddingCancelledDate = monthsAhead(6);
	const graduationDate = monthsAhead(8);
	const corporateDate = daysAhead(14);
	const workshopDate = daysAhead(21);
	const babyShowerDate = monthsAgo(1);
	const ceremonyDate = monthsAhead(5);

	// ── WEDDING ────────────────────────────────────────────────────────
	await Promise.all([
		// 1. COMPLETED
		task({
			id: "tsk_wed_001",
			eventId: EVENTS.WEDDING,
			title: "Confirmar contrato com decoração",
			category: "DECORATION",
			priority: "HIGH",
			status: "COMPLETED",
			assignedTo: USER_OWNER,
			dueDate: daysAgo(20),
			completedAt: daysAgo(19),
			completedBy: USER_OWNER,
			createdBy: USER_OWNER,
		}),
		// 2. IN_PROGRESS
		task({
			id: "tsk_wed_002",
			eventId: EVENTS.WEDDING,
			title: "Envio de convites",
			category: "DOCUMENTS",
			priority: "HIGH",
			status: "IN_PROGRESS",
			assignedTo: USER_PARTNER,
			dueDate: daysAhead(5),
			createdBy: USER_OWNER,
		}),
		// 3. TODO
		task({
			id: "tsk_wed_003",
			eventId: EVENTS.WEDDING,
			title: "Prova de menu com Chef Ngola",
			category: "FOOD",
			priority: "MEDIUM",
			status: "TODO",
			assignedTo: USER_OWNER,
			dueDate: daysAhead(30),
			createdBy: USER_OWNER,
		}),
		// 4. TODO
		task({
			id: "tsk_wed_004",
			eventId: EVENTS.WEDDING,
			title: "Escolher música de entrada da noiva",
			category: "CEREMONY",
			priority: "HIGH",
			status: "TODO",
			assignedTo: USER_PARTNER,
			dueDate: daysAhead(40),
			createdBy: USER_OWNER,
		}),
		// 5. TODO
		task({
			id: "tsk_wed_005",
			eventId: EVENTS.WEDDING,
			title: "Reservar carro decorado",
			category: "TRANSPORT",
			priority: "MEDIUM",
			status: "TODO",
			assignedTo: USER_EDITOR,
			dueDate: daysAhead(25),
			createdBy: USER_OWNER,
		}),
		// 6. TODO
		task({
			id: "tsk_wed_006",
			eventId: EVENTS.WEDDING,
			title: "Agendar maquilhagem de provas",
			category: "CLOTHING",
			priority: "LOW",
			status: "TODO",
			assignedTo: USER_PARTNER,
			dueDate: daysAhead(35),
			createdBy: USER_OWNER,
		}),
		// 7. COMPLETED
		task({
			id: "tsk_wed_007",
			eventId: EVENTS.WEDDING,
			title: "Confirmar lista de fornecedores",
			category: "VENUE",
			priority: "MEDIUM",
			status: "COMPLETED",
			assignedTo: USER_ADMIN,
			dueDate: daysAgo(15),
			completedAt: daysAgo(14),
			completedBy: USER_ADMIN,
			createdBy: USER_OWNER,
		}),
		// 8. TODO
		task({
			id: "tsk_wed_008",
			eventId: EVENTS.WEDDING,
			title: "Definir assentos dos convidados VIP",
			category: "GUESTS",
			priority: "URGENT",
			status: "TODO",
			assignedTo: USER_OWNER,
			dueDate: daysAhead(10),
			createdBy: USER_OWNER,
		}),
		// 9. COMPLETED
		task({
			id: "tsk_wed_009",
			eventId: EVENTS.WEDDING,
			title: "Pagamento adiantado decoração",
			category: "FINANCE",
			priority: "HIGH",
			status: "COMPLETED",
			assignedTo: USER_OWNER,
			dueDate: daysAgo(25),
			completedAt: daysAgo(24),
			completedBy: USER_OWNER,
			createdBy: USER_OWNER,
		}),
		// 10. IN_PROGRESS
		task({
			id: "tsk_wed_010",
			eventId: EVENTS.WEDDING,
			title: "Verificar licenças e alvarás do venue",
			category: "DOCUMENTS",
			priority: "URGENT",
			status: "IN_PROGRESS",
			assignedTo: USER_ADMIN,
			dueDate: daysAhead(3),
			createdBy: USER_OWNER,
		}),
		// 11. TODO
		task({
			id: "tsk_wed_011",
			eventId: EVENTS.WEDDING,
			title: "Ensaio geral da cerimónia",
			category: "CEREMONY",
			priority: "HIGH",
			status: "TODO",
			assignedTo: USER_PARTNER,
			dueDate: daysAhead(15),
			createdBy: USER_OWNER,
		}),
		// 12. TODO
		task({
			id: "tsk_wed_012",
			eventId: EVENTS.WEDDING,
			title: "Fechar bar aberto — definir drinks",
			category: "DRINKS",
			priority: "MEDIUM",
			status: "TODO",
			assignedTo: USER_EDITOR,
			dueDate: daysAhead(20),
			createdBy: USER_OWNER,
		}),
		// 13. CANCELLED
		task({
			id: "tsk_wed_013",
			eventId: EVENTS.WEDDING,
			title: "Comprar lembranças para convidados",
			category: "OTHER",
			priority: "LOW",
			status: "CANCELLED",
			assignedTo: USER_PARTNER,
			dueDate: daysAhead(30),
			createdBy: USER_OWNER,
		}),
		// 14. TODO
		task({
			id: "tsk_wed_014",
			eventId: EVENTS.WEDDING,
			title: "Ensaio de DJ e banda",
			category: "OTHER",
			priority: "MEDIUM",
			status: "TODO",
			assignedTo: USER_EDITOR,
			dueDate: daysAhead(12),
			createdBy: USER_OWNER,
		}),
		// 15. IN_PROGRESS
		task({
			id: "tsk_wed_015",
			eventId: EVENTS.WEDDING,
			title: "Confirmar presença dos padrinhos",
			category: "GUESTS",
			priority: "HIGH",
			status: "IN_PROGRESS",
			assignedTo: USER_PARTNER,
			dueDate: daysAhead(7),
			createdBy: USER_OWNER,
		}),
		// 16. TODO
		task({
			id: "tsk_wed_016",
			eventId: EVENTS.WEDDING,
			title: "Contratar seguranças para o evento",
			category: "VENUE",
			priority: "MEDIUM",
			status: "TODO",
			assignedTo: USER_ADMIN,
			dueDate: daysAhead(18),
			createdBy: USER_OWNER,
		}),
		// 17. IN_PROGRESS
		task({
			id: "tsk_wed_017",
			eventId: EVENTS.WEDDING,
			title: "Confirmar transporte dos convidados VIP",
			category: "TRANSPORT",
			priority: "HIGH",
			status: "IN_PROGRESS",
			assignedTo: USER_EDITOR,
			dueDate: daysAhead(8),
			createdBy: USER_OWNER,
		}),
		// 18. COMPLETED
		task({
			id: "tsk_wed_018",
			eventId: EVENTS.WEDDING,
			title: "Finalizar lista de convidados",
			category: "GUESTS",
			priority: "HIGH",
			status: "COMPLETED",
			assignedTo: USER_OWNER,
			dueDate: daysAgo(10),
			completedAt: daysAgo(9),
			completedBy: USER_OWNER,
			createdBy: USER_OWNER,
		}),
		// 19. COMPLETED
		task({
			id: "tsk_wed_019",
			eventId: EVENTS.WEDDING,
			title: "Confirmar fotógrafo e videógrafo",
			category: "OTHER",
			priority: "MEDIUM",
			status: "COMPLETED",
			assignedTo: USER_ADMIN,
			dueDate: daysAgo(12),
			completedAt: daysAgo(11),
			completedBy: USER_ADMIN,
			createdBy: USER_OWNER,
		}),
		// 20. CANCELLED
		task({
			id: "tsk_wed_020",
			eventId: EVENTS.WEDDING,
			title: "Organizar ensaio da cerimónia",
			category: "CEREMONY",
			priority: "LOW",
			status: "CANCELLED",
			assignedTo: USER_PARTNER,
			dueDate: daysAhead(5),
			createdBy: USER_OWNER,
		}),
	]);

	// ── ENGAGEMENT ──────────────────────────────────────────────────────
	await Promise.all([
		// 1. COMPLETED
		task({
			id: "tsk_eng_001",
			eventId: EVENTS.ENGAGEMENT,
			title: "Confirmar espaço no Clube Mineiro",
			category: "VENUE",
			priority: "HIGH",
			status: "COMPLETED",
			assignedTo: USER_OWNER,
			dueDate: daysAgo(18),
			completedAt: daysAgo(17),
			completedBy: USER_OWNER,
			createdBy: USER_OWNER,
		}),
		// 2. IN_PROGRESS
		task({
			id: "tsk_eng_002",
			eventId: EVENTS.ENGAGEMENT,
			title: "Enviar convites de noivado",
			category: "GUESTS",
			priority: "HIGH",
			status: "IN_PROGRESS",
			assignedTo: USER_PARTNER,
			dueDate: daysAhead(4),
			createdBy: USER_OWNER,
		}),
		// 3. TODO
		task({
			id: "tsk_eng_003",
			eventId: EVENTS.ENGAGEMENT,
			title: "Encomendar bolo de noivado",
			category: "FOOD",
			priority: "MEDIUM",
			status: "TODO",
			assignedTo: USER_PARTNER,
			dueDate: daysAhead(15),
			createdBy: USER_OWNER,
		}),
		// 4. COMPLETED
		task({
			id: "tsk_eng_004",
			eventId: EVENTS.ENGAGEMENT,
			title: "Definir tema e cores do evento",
			category: "DECORATION",
			priority: "MEDIUM",
			status: "COMPLETED",
			assignedTo: USER_OWNER,
			dueDate: daysAgo(22),
			completedAt: daysAgo(21),
			completedBy: USER_OWNER,
			createdBy: USER_OWNER,
		}),
		// 5. IN_PROGRESS
		task({
			id: "tsk_eng_005",
			eventId: EVENTS.ENGAGEMENT,
			title: "Contratar DJ para a festa",
			category: "OTHER",
			priority: "HIGH",
			status: "IN_PROGRESS",
			assignedTo: USER_EDITOR,
			dueDate: daysAhead(6),
			createdBy: USER_OWNER,
		}),
		// 6. TODO
		task({
			id: "tsk_eng_006",
			eventId: EVENTS.ENGAGEMENT,
			title: "Confirmar lista final de convidados",
			category: "GUESTS",
			priority: "HIGH",
			status: "TODO",
			assignedTo: USER_OWNER,
			dueDate: daysAhead(8),
			createdBy: USER_OWNER,
		}),
		// 7. COMPLETED
		task({
			id: "tsk_eng_007",
			eventId: EVENTS.ENGAGEMENT,
			title: "Reservar restaurante para o jantar",
			category: "FOOD",
			priority: "MEDIUM",
			status: "COMPLETED",
			assignedTo: USER_ADMIN,
			dueDate: daysAgo(16),
			completedAt: daysAgo(15),
			completedBy: USER_ADMIN,
			createdBy: USER_OWNER,
		}),
		// 8. TODO
		task({
			id: "tsk_eng_008",
			eventId: EVENTS.ENGAGEMENT,
			title: "Organizar jogos e brincadeiras",
			category: "OTHER",
			priority: "LOW",
			status: "TODO",
			assignedTo: USER_PARTNER,
			dueDate: daysAhead(12),
			createdBy: USER_OWNER,
		}),
		// 9. IN_PROGRESS
		task({
			id: "tsk_eng_009",
			eventId: EVENTS.ENGAGEMENT,
			title: "Comprar decoração",
			category: "DECORATION",
			priority: "MEDIUM",
			status: "IN_PROGRESS",
			assignedTo: USER_PARTNER,
			dueDate: daysAhead(5),
			createdBy: USER_OWNER,
		}),
		// 10. TODO
		task({
			id: "tsk_eng_010",
			eventId: EVENTS.ENGAGEMENT,
			title: "Confirmar presenças",
			category: "GUESTS",
			priority: "HIGH",
			status: "TODO",
			assignedTo: USER_OWNER,
			dueDate: daysAhead(2),
			createdBy: USER_OWNER,
		}),
		// 11. COMPLETED
		task({
			id: "tsk_eng_011",
			eventId: EVENTS.ENGAGEMENT,
			title: "Pagar sinal do espaço",
			category: "FINANCE",
			priority: "HIGH",
			status: "COMPLETED",
			assignedTo: USER_OWNER,
			dueDate: daysAgo(20),
			completedAt: daysAgo(20),
			completedBy: USER_OWNER,
			createdBy: USER_OWNER,
		}),
		// 12. CANCELLED
		task({
			id: "tsk_eng_012",
			eventId: EVENTS.ENGAGEMENT,
			title: "Preparar discurso do noivo",
			category: "OTHER",
			priority: "LOW",
			status: "CANCELLED",
			assignedTo: USER_PARTNER,
			dueDate: daysAgo(5),
			createdBy: USER_OWNER,
		}),
	]);

	// ── BIRTHDAY ────────────────────────────────────────────────────────
	await Promise.all([
		// 1. COMPLETED
		task({
			id: "tsk_bir_001",
			eventId: EVENTS.BIRTHDAY,
			title: "Reservar restaurante",
			category: "VENUE",
			priority: "HIGH",
			status: "COMPLETED",
			assignedTo: USER_OWNER,
			dueDate: daysAgo(7),
			completedAt: daysAgo(6),
			completedBy: USER_OWNER,
			createdBy: USER_OWNER,
		}),
		// 2. COMPLETED
		task({
			id: "tsk_bir_002",
			eventId: EVENTS.BIRTHDAY,
			title: "Comprar bolo de aniversário",
			category: "FOOD",
			priority: "HIGH",
			status: "COMPLETED",
			assignedTo: USER_PARTNER,
			dueDate: daysAgo(2),
			completedAt: daysAgo(1),
			completedBy: USER_PARTNER,
			createdBy: USER_OWNER,
		}),
		// 3. COMPLETED
		task({
			id: "tsk_bir_003",
			eventId: EVENTS.BIRTHDAY,
			title: "Enviar convites",
			category: "GUESTS",
			priority: "HIGH",
			status: "COMPLETED",
			assignedTo: USER_OWNER,
			dueDate: daysAgo(14),
			completedAt: daysAgo(13),
			completedBy: USER_OWNER,
			createdBy: USER_OWNER,
		}),
		// 4. COMPLETED
		task({
			id: "tsk_bir_004",
			eventId: EVENTS.BIRTHDAY,
			title: "Escolher música",
			category: "OTHER",
			priority: "MEDIUM",
			status: "COMPLETED",
			assignedTo: USER_EDITOR,
			dueDate: daysAgo(10),
			completedAt: daysAgo(9),
			completedBy: USER_EDITOR,
			createdBy: USER_OWNER,
		}),
		// 5. COMPLETED
		task({
			id: "tsk_bir_005",
			eventId: EVENTS.BIRTHDAY,
			title: "Confirmar decoração",
			category: "DECORATION",
			priority: "MEDIUM",
			status: "COMPLETED",
			assignedTo: USER_ADMIN,
			dueDate: daysAgo(5),
			completedAt: daysAgo(4),
			completedBy: USER_ADMIN,
			createdBy: USER_OWNER,
		}),
		// 6. IN_PROGRESS
		task({
			id: "tsk_bir_006",
			eventId: EVENTS.BIRTHDAY,
			title: "Organizar presentes",
			category: "OTHER",
			priority: "LOW",
			status: "IN_PROGRESS",
			assignedTo: USER_PARTNER,
			dueDate: new Date(),
			createdBy: USER_OWNER,
		}),
		// 7. IN_PROGRESS
		task({
			id: "tsk_bir_007",
			eventId: EVENTS.BIRTHDAY,
			title: "Preparar surpresa",
			category: "OTHER",
			priority: "HIGH",
			status: "IN_PROGRESS",
			assignedTo: USER_OWNER,
			dueDate: new Date(),
			createdBy: USER_OWNER,
		}),
		// 8. COMPLETED
		task({
			id: "tsk_bir_008",
			eventId: EVENTS.BIRTHDAY,
			title: "Confirmar presenças",
			category: "GUESTS",
			priority: "HIGH",
			status: "COMPLETED",
			assignedTo: USER_OWNER,
			dueDate: daysAgo(3),
			completedAt: daysAgo(2),
			completedBy: USER_OWNER,
			createdBy: USER_OWNER,
		}),
		// 9. TODO
		task({
			id: "tsk_bir_009",
			eventId: EVENTS.BIRTHDAY,
			title: "Decorar o espaço",
			category: "DECORATION",
			priority: "MEDIUM",
			status: "TODO",
			assignedTo: USER_ADMIN,
			dueDate: new Date(),
			createdBy: USER_OWNER,
		}),
		// 10. COMPLETED
		task({
			id: "tsk_bir_010",
			eventId: EVENTS.BIRTHDAY,
			title: "Pagar restaurante",
			category: "FINANCE",
			priority: "HIGH",
			status: "COMPLETED",
			assignedTo: USER_OWNER,
			dueDate: daysAgo(1),
			completedAt: daysAgo(1),
			completedBy: USER_OWNER,
			createdBy: USER_OWNER,
		}),
	]);

	// ── CONFERENCE ──────────────────────────────────────────────────────
	await Promise.all([
		// 1. COMPLETED
		task({
			id: "tsk_con_001",
			eventId: EVENTS.CONFERENCE,
			title: "Reservar centro de convenções",
			category: "VENUE",
			priority: "HIGH",
			status: "COMPLETED",
			assignedTo: USER_OWNER,
			dueDate: daysAgo(70),
			completedAt: daysAgo(69),
			completedBy: USER_OWNER,
			createdBy: USER_OWNER,
		}),
		// 2. COMPLETED
		task({
			id: "tsk_con_002",
			eventId: EVENTS.CONFERENCE,
			title: "Confirmar palestrantes",
			category: "OTHER",
			priority: "URGENT",
			status: "COMPLETED",
			assignedTo: USER_ADMIN,
			dueDate: daysAgo(60),
			completedAt: daysAgo(59),
			completedBy: USER_ADMIN,
			createdBy: USER_OWNER,
		}),
		// 3. COMPLETED
		task({
			id: "tsk_con_003",
			eventId: EVENTS.CONFERENCE,
			title: "Organizar programa do evento",
			category: "OTHER",
			priority: "HIGH",
			status: "COMPLETED",
			assignedTo: USER_OWNER,
			dueDate: daysAgo(55),
			completedAt: daysAgo(54),
			completedBy: USER_OWNER,
			createdBy: USER_OWNER,
		}),
		// 4. COMPLETED
		task({
			id: "tsk_con_004",
			eventId: EVENTS.CONFERENCE,
			title: "Contratar catering",
			category: "FOOD",
			priority: "HIGH",
			status: "COMPLETED",
			assignedTo: USER_EDITOR,
			dueDate: daysAgo(50),
			completedAt: daysAgo(49),
			completedBy: USER_EDITOR,
			createdBy: USER_OWNER,
		}),
		// 5. COMPLETED
		task({
			id: "tsk_con_005",
			eventId: EVENTS.CONFERENCE,
			title: "Preparar materiais impressos",
			category: "DOCUMENTS",
			priority: "MEDIUM",
			status: "COMPLETED",
			assignedTo: USER_PARTNER,
			dueDate: daysAgo(35),
			completedAt: daysAgo(34),
			completedBy: USER_PARTNER,
			createdBy: USER_OWNER,
		}),
		// 6. COMPLETED
		task({
			id: "tsk_con_006",
			eventId: EVENTS.CONFERENCE,
			title: "Configurar equipamentos de som",
			category: "OTHER",
			priority: "HIGH",
			status: "COMPLETED",
			assignedTo: USER_ADMIN,
			dueDate: daysAgo(25),
			completedAt: daysAgo(24),
			completedBy: USER_ADMIN,
			createdBy: USER_OWNER,
		}),
		// 7. COMPLETED
		task({
			id: "tsk_con_007",
			eventId: EVENTS.CONFERENCE,
			title: "Organizar estacionamento",
			category: "TRANSPORT",
			priority: "MEDIUM",
			status: "COMPLETED",
			assignedTo: USER_EDITOR,
			dueDate: daysAgo(30),
			completedAt: daysAgo(29),
			completedBy: USER_EDITOR,
			createdBy: USER_OWNER,
		}),
		// 8. COMPLETED
		task({
			id: "tsk_con_008",
			eventId: EVENTS.CONFERENCE,
			title: "Contratar segurança",
			category: "VENUE",
			priority: "MEDIUM",
			status: "COMPLETED",
			assignedTo: USER_ADMIN,
			dueDate: daysAgo(28),
			completedAt: daysAgo(27),
			completedBy: USER_ADMIN,
			createdBy: USER_OWNER,
		}),
		// 9. COMPLETED
		task({
			id: "tsk_con_009",
			eventId: EVENTS.CONFERENCE,
			title: "Confirmar inscritos",
			category: "GUESTS",
			priority: "HIGH",
			status: "COMPLETED",
			assignedTo: USER_OWNER,
			dueDate: daysAgo(20),
			completedAt: daysAgo(19),
			completedBy: USER_OWNER,
			createdBy: USER_OWNER,
		}),
		// 10. COMPLETED
		task({
			id: "tsk_con_010",
			eventId: EVENTS.CONFERENCE,
			title: "Preparar certificados",
			category: "DOCUMENTS",
			priority: "MEDIUM",
			status: "COMPLETED",
			assignedTo: USER_PARTNER,
			dueDate: daysAgo(22),
			completedAt: daysAgo(21),
			completedBy: USER_PARTNER,
			createdBy: USER_OWNER,
		}),
		// 11. COMPLETED
		task({
			id: "tsk_con_011",
			eventId: EVENTS.CONFERENCE,
			title: "Organizar coffee break",
			category: "FOOD",
			priority: "MEDIUM",
			status: "COMPLETED",
			assignedTo: USER_EDITOR,
			dueDate: daysAgo(18),
			completedAt: daysAgo(17),
			completedBy: USER_EDITOR,
			createdBy: USER_OWNER,
		}),
		// 12. COMPLETED
		task({
			id: "tsk_con_012",
			eventId: EVENTS.CONFERENCE,
			title: "Configurar projetor e ecrã",
			category: "OTHER",
			priority: "HIGH",
			status: "COMPLETED",
			assignedTo: USER_ADMIN,
			dueDate: daysAgo(15),
			completedAt: daysAgo(14),
			completedBy: USER_ADMIN,
			createdBy: USER_OWNER,
		}),
		// 13. COMPLETED
		task({
			id: "tsk_con_013",
			eventId: EVENTS.CONFERENCE,
			title: "Contratar fotógrafo",
			category: "OTHER",
			priority: "MEDIUM",
			status: "COMPLETED",
			assignedTo: USER_OWNER,
			dueDate: daysAgo(40),
			completedAt: daysAgo(39),
			completedBy: USER_OWNER,
			createdBy: USER_OWNER,
		}),
		// 14. COMPLETED
		task({
			id: "tsk_con_014",
			eventId: EVENTS.CONFERENCE,
			title: "Preparar welcome kit",
			category: "OTHER",
			priority: "LOW",
			status: "COMPLETED",
			assignedTo: USER_PARTNER,
			dueDate: daysAgo(10),
			completedAt: daysAgo(9),
			completedBy: USER_PARTNER,
			createdBy: USER_OWNER,
		}),
		// 15. COMPLETED
		task({
			id: "tsk_con_015",
			eventId: EVENTS.CONFERENCE,
			title: "Confirmar transporte dos palestrantes",
			category: "TRANSPORT",
			priority: "HIGH",
			status: "COMPLETED",
			assignedTo: USER_EDITOR,
			dueDate: daysAgo(12),
			completedAt: daysAgo(11),
			completedBy: USER_EDITOR,
			createdBy: USER_OWNER,
		}),
		// 16. COMPLETED
		task({
			id: "tsk_con_016",
			eventId: EVENTS.CONFERENCE,
			title: "Organizar networking",
			category: "OTHER",
			priority: "MEDIUM",
			status: "COMPLETED",
			assignedTo: USER_ADMIN,
			dueDate: daysAgo(16),
			completedAt: daysAgo(15),
			completedBy: USER_ADMIN,
			createdBy: USER_OWNER,
		}),
		// 17. CANCELLED
		task({
			id: "tsk_con_017",
			eventId: EVENTS.CONFERENCE,
			title: "Reservar hotel para palestrantes",
			category: "VENUE",
			priority: "HIGH",
			status: "CANCELLED",
			assignedTo: USER_ADMIN,
			dueDate: daysAgo(45),
			createdBy: USER_OWNER,
		}),
		// 18. CANCELLED
		task({
			id: "tsk_con_018",
			eventId: EVENTS.CONFERENCE,
			title: "Organizar excursão pós-evento",
			category: "OTHER",
			priority: "LOW",
			status: "CANCELLED",
			assignedTo: USER_PARTNER,
			dueDate: daysAgo(10),
			createdBy: USER_OWNER,
		}),
		// 19. CANCELLED
		task({
			id: "tsk_con_019",
			eventId: EVENTS.CONFERENCE,
			title: "Preparar enquete de satisfação",
			category: "OTHER",
			priority: "MEDIUM",
			status: "CANCELLED",
			assignedTo: USER_EDITOR,
			dueDate: daysAgo(8),
			createdBy: USER_OWNER,
		}),
		// 20. CANCELLED
		task({
			id: "tsk_con_020",
			eventId: EVENTS.CONFERENCE,
			title: "Contratar tradutor simultâneo",
			category: "OTHER",
			priority: "HIGH",
			status: "CANCELLED",
			assignedTo: USER_ADMIN,
			dueDate: daysAgo(30),
			createdBy: USER_OWNER,
		}),
	]);

	// ── WEDDING_CANCELLED ───────────────────────────────────────────────
	await Promise.all([
		// 1. COMPLETED
		task({
			id: "tsk_wcx_001",
			eventId: EVENTS.WEDDING_CANCELLED,
			title: "Reservar espaço",
			category: "VENUE",
			priority: "HIGH",
			status: "COMPLETED",
			assignedTo: USER_OWNER,
			dueDate: daysAgo(60),
			completedAt: daysAgo(59),
			completedBy: USER_OWNER,
			createdBy: USER_OWNER,
		}),
		// 2. COMPLETED
		task({
			id: "tsk_wcx_002",
			eventId: EVENTS.WEDDING_CANCELLED,
			title: "Contactar fornecedores",
			category: "VENUE",
			priority: "HIGH",
			status: "COMPLETED",
			assignedTo: USER_ADMIN,
			dueDate: daysAgo(55),
			completedAt: daysAgo(54),
			completedBy: USER_ADMIN,
			createdBy: USER_OWNER,
		}),
		// 3. IN_PROGRESS
		task({
			id: "tsk_wcx_003",
			eventId: EVENTS.WEDDING_CANCELLED,
			title: "Enviar convites",
			category: "GUESTS",
			priority: "HIGH",
			status: "IN_PROGRESS",
			assignedTo: USER_PARTNER,
			dueDate: daysAhead(10),
			createdBy: USER_OWNER,
		}),
		// 4. TODO
		task({
			id: "tsk_wcx_004",
			eventId: EVENTS.WEDDING_CANCELLED,
			title: "Contratar decoração",
			category: "DECORATION",
			priority: "MEDIUM",
			status: "TODO",
			assignedTo: USER_EDITOR,
			dueDate: daysAhead(30),
			createdBy: USER_OWNER,
		}),
		// 5. TODO
		task({
			id: "tsk_wcx_005",
			eventId: EVENTS.WEDDING_CANCELLED,
			title: "Organizar transporte",
			category: "TRANSPORT",
			priority: "MEDIUM",
			status: "TODO",
			assignedTo: USER_ADMIN,
			dueDate: daysAhead(35),
			createdBy: USER_OWNER,
		}),
		// 6. CANCELLED
		task({
			id: "tsk_wcx_006",
			eventId: EVENTS.WEDDING_CANCELLED,
			title: "Confirmar menu",
			category: "FOOD",
			priority: "HIGH",
			status: "CANCELLED",
			assignedTo: USER_OWNER,
			dueDate: daysAgo(5),
			createdBy: USER_OWNER,
		}),
		// 7. CANCELLED
		task({
			id: "tsk_wcx_007",
			eventId: EVENTS.WEDDING_CANCELLED,
			title: "Reservar DJ",
			category: "OTHER",
			priority: "MEDIUM",
			status: "CANCELLED",
			assignedTo: USER_EDITOR,
			dueDate: daysAgo(10),
			createdBy: USER_OWNER,
		}),
		// 8. CANCELLED
		task({
			id: "tsk_wcx_008",
			eventId: EVENTS.WEDDING_CANCELLED,
			title: "Comprar vestido",
			category: "CLOTHING",
			priority: "HIGH",
			status: "CANCELLED",
			assignedTo: USER_PARTNER,
			dueDate: daysAgo(15),
			createdBy: USER_OWNER,
		}),
		// 9. CANCELLED
		task({
			id: "tsk_wcx_009",
			eventId: EVENTS.WEDDING_CANCELLED,
			title: "Organizar lista de convidados",
			category: "GUESTS",
			priority: "MEDIUM",
			status: "CANCELLED",
			assignedTo: USER_OWNER,
			dueDate: daysAhead(3),
			createdBy: USER_OWNER,
		}),
		// 10. TODO
		task({
			id: "tsk_wcx_010",
			eventId: EVENTS.WEDDING_CANCELLED,
			title: "Confirmar fotógrafo",
			category: "OTHER",
			priority: "MEDIUM",
			status: "TODO",
			assignedTo: USER_ADMIN,
			dueDate: daysAhead(20),
			createdBy: USER_OWNER,
		}),
	]);

	// ── GRADUATION ──────────────────────────────────────────────────────
	await Promise.all([
		// 1. TODO
		task({
			id: "tsk_gra_001",
			eventId: EVENTS.GRADUATION,
			title: "Pesquisar espaços disponíveis",
			category: "VENUE",
			priority: "HIGH",
			status: "TODO",
			assignedTo: USER_OWNER,
			dueDate: daysAhead(20),
			createdBy: USER_OWNER,
		}),
		// 2. CANCELLED
		task({
			id: "tsk_gra_002",
			eventId: EVENTS.GRADUATION,
			title: "Contactar universidade",
			category: "DOCUMENTS",
			priority: "MEDIUM",
			status: "CANCELLED",
			assignedTo: USER_ADMIN,
			dueDate: daysAgo(5),
			createdBy: USER_OWNER,
		}),
	]);

	// ── CORPORATE ───────────────────────────────────────────────────────
	await Promise.all([
		// 1. COMPLETED
		task({
			id: "tsk_cor_001",
			eventId: EVENTS.CORPORATE,
			title: "Reservar hotel",
			category: "VENUE",
			priority: "HIGH",
			status: "COMPLETED",
			assignedTo: USER_OWNER,
			dueDate: daysAgo(10),
			completedAt: daysAgo(9),
			completedBy: USER_OWNER,
			createdBy: USER_OWNER,
		}),
		// 2. COMPLETED
		task({
			id: "tsk_cor_002",
			eventId: EVENTS.CORPORATE,
			title: "Confirmar MENU executivo",
			category: "FOOD",
			priority: "HIGH",
			status: "COMPLETED",
			assignedTo: USER_ADMIN,
			dueDate: daysAgo(8),
			completedAt: daysAgo(7),
			completedBy: USER_ADMIN,
			createdBy: USER_OWNER,
		}),
		// 3. IN_PROGRESS
		task({
			id: "tsk_cor_003",
			eventId: EVENTS.CORPORATE,
			title: "Enviar convites corporativos",
			category: "GUESTS",
			priority: "HIGH",
			status: "IN_PROGRESS",
			assignedTo: USER_PARTNER,
			dueDate: daysAhead(5),
			createdBy: USER_OWNER,
		}),
		// 4. IN_PROGRESS
		task({
			id: "tsk_cor_004",
			eventId: EVENTS.CORPORATE,
			title: "Organizar AV e projetor",
			category: "OTHER",
			priority: "MEDIUM",
			status: "IN_PROGRESS",
			assignedTo: USER_EDITOR,
			dueDate: daysAhead(8),
			createdBy: USER_OWNER,
		}),
		// 5. TODO
		task({
			id: "tsk_cor_005",
			eventId: EVENTS.CORPORATE,
			title: "Contratar banda para animação",
			category: "OTHER",
			priority: "MEDIUM",
			status: "TODO",
			assignedTo: USER_EDITOR,
			dueDate: daysAhead(10),
			createdBy: USER_OWNER,
		}),
		// 6. IN_PROGRESS
		task({
			id: "tsk_cor_006",
			eventId: EVENTS.CORPORATE,
			title: "Preparar materiais de apresentação",
			category: "DOCUMENTS",
			priority: "HIGH",
			status: "IN_PROGRESS",
			assignedTo: USER_ADMIN,
			dueDate: daysAhead(6),
			createdBy: USER_OWNER,
		}),
		// 7. TODO
		task({
			id: "tsk_cor_007",
			eventId: EVENTS.CORPORATE,
			title: "Confirmar estacionamento",
			category: "TRANSPORT",
			priority: "MEDIUM",
			status: "TODO",
			assignedTo: USER_ADMIN,
			dueDate: daysAhead(12),
			createdBy: USER_OWNER,
		}),
		// 8. TODO
		task({
			id: "tsk_cor_008",
			eventId: EVENTS.CORPORATE,
			title: "Organizar welcome drink",
			category: "DRINKS",
			priority: "LOW",
			status: "TODO",
			assignedTo: USER_PARTNER,
			dueDate: daysAhead(10),
			createdBy: USER_OWNER,
		}),
		// 9. IN_PROGRESS
		task({
			id: "tsk_cor_009",
			eventId: EVENTS.CORPORATE,
			title: "Contratar segurança",
			category: "VENUE",
			priority: "MEDIUM",
			status: "IN_PROGRESS",
			assignedTo: USER_ADMIN,
			dueDate: daysAhead(9),
			createdBy: USER_OWNER,
		}),
		// 10. CANCELLED
		task({
			id: "tsk_cor_010",
			eventId: EVENTS.CORPORATE,
			title: "Preparar brindes",
			category: "OTHER",
			priority: "LOW",
			status: "CANCELLED",
			assignedTo: USER_PARTNER,
			dueDate: daysAgo(3),
			createdBy: USER_OWNER,
		}),
		// 11. CANCELLED
		task({
			id: "tsk_cor_011",
			eventId: EVENTS.CORPORATE,
			title: "Reservar transporte executivo",
			category: "TRANSPORT",
			priority: "HIGH",
			status: "CANCELLED",
			assignedTo: USER_EDITOR,
			dueDate: daysAgo(5),
			createdBy: USER_OWNER,
		}),
		// 12. TODO
		task({
			id: "tsk_cor_012",
			eventId: EVENTS.CORPORATE,
			title: "Confirmar presença dos diretores",
			category: "GUESTS",
			priority: "HIGH",
			status: "TODO",
			assignedTo: USER_OWNER,
			dueDate: daysAhead(4),
			createdBy: USER_OWNER,
		}),
	]);

	// ── WORKSHOP ────────────────────────────────────────────────────────
	await Promise.all([
		// 1. COMPLETED
		task({
			id: "tsk_wor_001",
			eventId: EVENTS.WORKSHOP,
			title: "Reservar espaço workshop",
			category: "VENUE",
			priority: "HIGH",
			status: "COMPLETED",
			assignedTo: USER_OWNER,
			dueDate: daysAgo(15),
			completedAt: daysAgo(14),
			completedBy: USER_OWNER,
			createdBy: USER_OWNER,
		}),
		// 2. COMPLETED
		task({
			id: "tsk_wor_002",
			eventId: EVENTS.WORKSHOP,
			title: "Preparar materiais didáticos",
			category: "DOCUMENTS",
			priority: "HIGH",
			status: "COMPLETED",
			assignedTo: USER_ADMIN,
			dueDate: daysAgo(10),
			completedAt: daysAgo(9),
			completedBy: USER_ADMIN,
			createdBy: USER_OWNER,
		}),
		// 3. COMPLETED
		task({
			id: "tsk_wor_003",
			eventId: EVENTS.WORKSHOP,
			title: "Confirmar instrutores",
			category: "OTHER",
			priority: "HIGH",
			status: "COMPLETED",
			assignedTo: USER_OWNER,
			dueDate: daysAgo(12),
			completedAt: daysAgo(11),
			completedBy: USER_OWNER,
			createdBy: USER_OWNER,
		}),
		// 4. IN_PROGRESS
		task({
			id: "tsk_wor_004",
			eventId: EVENTS.WORKSHOP,
			title: "Organizar coffee breaks",
			category: "FOOD",
			priority: "MEDIUM",
			status: "IN_PROGRESS",
			assignedTo: USER_PARTNER,
			dueDate: daysAhead(7),
			createdBy: USER_OWNER,
		}),
		// 5. IN_PROGRESS
		task({
			id: "tsk_wor_005",
			eventId: EVENTS.WORKSHOP,
			title: "Configurar projetor e som",
			category: "OTHER",
			priority: "MEDIUM",
			status: "IN_PROGRESS",
			assignedTo: USER_EDITOR,
			dueDate: daysAhead(10),
			createdBy: USER_OWNER,
		}),
		// 6. IN_PROGRESS
		task({
			id: "tsk_wor_006",
			eventId: EVENTS.WORKSHOP,
			title: "Enviar convites participantes",
			category: "GUESTS",
			priority: "HIGH",
			status: "IN_PROGRESS",
			assignedTo: USER_PARTNER,
			dueDate: daysAhead(5),
			createdBy: USER_OWNER,
		}),
		// 7. TODO
		task({
			id: "tsk_wor_007",
			eventId: EVENTS.WORKSHOP,
			title: "Preparar certificados",
			category: "DOCUMENTS",
			priority: "LOW",
			status: "TODO",
			assignedTo: USER_ADMIN,
			dueDate: daysAhead(12),
			createdBy: USER_OWNER,
		}),
		// 8. TODO
		task({
			id: "tsk_wor_008",
			eventId: EVENTS.WORKSHOP,
			title: "Organizar estacionamento",
			category: "TRANSPORT",
			priority: "MEDIUM",
			status: "TODO",
			assignedTo: USER_ADMIN,
			dueDate: daysAhead(14),
			createdBy: USER_OWNER,
		}),
		// 9. TODO
		task({
			id: "tsk_wor_009",
			eventId: EVENTS.WORKSHOP,
			title: "Comprar material de escritório",
			category: "OTHER",
			priority: "LOW",
			status: "TODO",
			assignedTo: USER_PARTNER,
			dueDate: daysAhead(8),
			createdBy: USER_OWNER,
		}),
		// 10. TODO
		task({
			id: "tsk_wor_010",
			eventId: EVENTS.WORKSHOP,
			title: "Confirmar presenças finais",
			category: "GUESTS",
			priority: "HIGH",
			status: "TODO",
			assignedTo: USER_OWNER,
			dueDate: daysAhead(3),
			createdBy: USER_OWNER,
		}),
	]);

	// ── BABY_SHOWER ─────────────────────────────────────────────────────
	await Promise.all([
		// 1. COMPLETED
		task({
			id: "tsk_bab_001",
			eventId: EVENTS.BABY_SHOWER,
			title: "Reservar jardim",
			category: "VENUE",
			priority: "HIGH",
			status: "COMPLETED",
			assignedTo: USER_OWNER,
			dueDate: daysAgo(35),
			completedAt: daysAgo(34),
			completedBy: USER_OWNER,
			createdBy: USER_OWNER,
		}),
		// 2. COMPLETED
		task({
			id: "tsk_bab_002",
			eventId: EVENTS.BABY_SHOWER,
			title: "Comprar decoração rosa e branco",
			category: "DECORATION",
			priority: "HIGH",
			status: "COMPLETED",
			assignedTo: USER_PARTNER,
			dueDate: daysAgo(30),
			completedAt: daysAgo(29),
			completedBy: USER_PARTNER,
			createdBy: USER_OWNER,
		}),
		// 3. COMPLETED
		task({
			id: "tsk_bab_003",
			eventId: EVENTS.BABY_SHOWER,
			title: "Encomendar bolo de embalar",
			category: "FOOD",
			priority: "HIGH",
			status: "COMPLETED",
			assignedTo: USER_ADMIN,
			dueDate: daysAgo(25),
			completedAt: daysAgo(24),
			completedBy: USER_ADMIN,
			createdBy: USER_OWNER,
		}),
		// 4. COMPLETED
		task({
			id: "tsk_bab_004",
			eventId: EVENTS.BABY_SHOWER,
			title: "Enviar convites",
			category: "GUESTS",
			priority: "HIGH",
			status: "COMPLETED",
			assignedTo: USER_OWNER,
			dueDate: daysAgo(28),
			completedAt: daysAgo(27),
			completedBy: USER_OWNER,
			createdBy: USER_OWNER,
		}),
		// 5. COMPLETED
		task({
			id: "tsk_bab_005",
			eventId: EVENTS.BABY_SHOWER,
			title: "Organizar jogos",
			category: "OTHER",
			priority: "MEDIUM",
			status: "COMPLETED",
			assignedTo: USER_PARTNER,
			dueDate: daysAgo(20),
			completedAt: daysAgo(19),
			completedBy: USER_PARTNER,
			createdBy: USER_OWNER,
		}),
		// 6. COMPLETED
		task({
			id: "tsk_bab_006",
			eventId: EVENTS.BABY_SHOWER,
			title: "Comprar lembranças",
			category: "OTHER",
			priority: "MEDIUM",
			status: "COMPLETED",
			assignedTo: USER_EDITOR,
			dueDate: daysAgo(22),
			completedAt: daysAgo(21),
			completedBy: USER_EDITOR,
			createdBy: USER_OWNER,
		}),
		// 7. COMPLETED
		task({
			id: "tsk_bab_007",
			eventId: EVENTS.BABY_SHOWER,
			title: "Preparar playlist",
			category: "OTHER",
			priority: "LOW",
			status: "COMPLETED",
			assignedTo: USER_EDITOR,
			dueDate: daysAgo(18),
			completedAt: daysAgo(17),
			completedBy: USER_EDITOR,
			createdBy: USER_OWNER,
		}),
		// 8. COMPLETED
		task({
			id: "tsk_bab_008",
			eventId: EVENTS.BABY_SHOWER,
			title: "Decorar o espaço",
			category: "DECORATION",
			priority: "MEDIUM",
			status: "COMPLETED",
			assignedTo: USER_PARTNER,
			dueDate: daysAgo(16),
			completedAt: daysAgo(15),
			completedBy: USER_PARTNER,
			createdBy: USER_OWNER,
		}),
	]);

	// ── CEREMONY ────────────────────────────────────────────────────────
	await Promise.all([
		// 1. COMPLETED
		task({
			id: "tsk_cer_001",
			eventId: EVENTS.CEREMONY,
			title: "Contactar paróquia",
			category: "VENUE",
			priority: "HIGH",
			status: "COMPLETED",
			assignedTo: USER_OWNER,
			dueDate: daysAgo(40),
			completedAt: daysAgo(39),
			completedBy: USER_OWNER,
			createdBy: USER_OWNER,
		}),
		// 2. COMPLETED
		task({
			id: "tsk_cer_002",
			eventId: EVENTS.CEREMONY,
			title: "Organizar documentação religiosa",
			category: "DOCUMENTS",
			priority: "HIGH",
			status: "COMPLETED",
			assignedTo: USER_ADMIN,
			dueDate: daysAgo(35),
			completedAt: daysAgo(34),
			completedBy: USER_ADMIN,
			createdBy: USER_OWNER,
		}),
		// 3. IN_PROGRESS
		task({
			id: "tsk_cer_003",
			eventId: EVENTS.CEREMONY,
			title: "Confirmar padre celebrante",
			category: "CEREMONY",
			priority: "URGENT",
			status: "IN_PROGRESS",
			assignedTo: USER_OWNER,
			dueDate: daysAhead(5),
			createdBy: USER_OWNER,
		}),
		// 4. IN_PROGRESS
		task({
			id: "tsk_cer_004",
			eventId: EVENTS.CEREMONY,
			title: "Escolher hinos e músicas",
			category: "CEREMONY",
			priority: "HIGH",
			status: "IN_PROGRESS",
			assignedTo: USER_PARTNER,
			dueDate: daysAhead(10),
			createdBy: USER_OWNER,
		}),
		// 5. IN_PROGRESS
		task({
			id: "tsk_cer_005",
			eventId: EVENTS.CEREMONY,
			title: "Organizar coro",
			category: "OTHER",
			priority: "MEDIUM",
			status: "IN_PROGRESS",
			assignedTo: USER_EDITOR,
			dueDate: daysAhead(15),
			createdBy: USER_OWNER,
		}),
		// 6. IN_PROGRESS
		task({
			id: "tsk_cer_006",
			eventId: EVENTS.CEREMONY,
			title: "Confirmar leituras",
			category: "CEREMONY",
			priority: "MEDIUM",
			status: "IN_PROGRESS",
			assignedTo: USER_PARTNER,
			dueDate: daysAhead(12),
			createdBy: USER_OWNER,
		}),
		// 7. IN_PROGRESS
		task({
			id: "tsk_cer_007",
			eventId: EVENTS.CEREMONY,
			title: "Preparar flores da igreja",
			category: "DECORATION",
			priority: "HIGH",
			status: "IN_PROGRESS",
			assignedTo: USER_ADMIN,
			dueDate: daysAhead(8),
			createdBy: USER_OWNER,
		}),
		// 8. TODO
		task({
			id: "tsk_cer_008",
			eventId: EVENTS.CEREMONY,
			title: "Organizar transportes",
			category: "TRANSPORT",
			priority: "MEDIUM",
			status: "TODO",
			assignedTo: USER_EDITOR,
			dueDate: daysAhead(20),
			createdBy: USER_OWNER,
		}),
		// 9. TODO
		task({
			id: "tsk_cer_009",
			eventId: EVENTS.CEREMONY,
			title: "Confirmar lista de convidados",
			category: "GUESTS",
			priority: "HIGH",
			status: "TODO",
			assignedTo: USER_OWNER,
			dueDate: daysAhead(25),
			createdBy: USER_OWNER,
		}),
		// 10. TODO
		task({
			id: "tsk_cer_010",
			eventId: EVENTS.CEREMONY,
			title: "Reservar salão paroquial",
			category: "VENUE",
			priority: "HIGH",
			status: "TODO",
			assignedTo: USER_ADMIN,
			dueDate: daysAhead(18),
			createdBy: USER_OWNER,
		}),
		// 11. TODO
		task({
			id: "tsk_cer_011",
			eventId: EVENTS.CEREMONY,
			title: "Organizar catering recepção",
			category: "FOOD",
			priority: "MEDIUM",
			status: "TODO",
			assignedTo: USER_PARTNER,
			dueDate: daysAhead(22),
			createdBy: USER_OWNER,
		}),
		// 12. TODO
		task({
			id: "tsk_cer_012",
			eventId: EVENTS.CEREMONY,
			title: "Contratar fotógrafo",
			category: "OTHER",
			priority: "MEDIUM",
			status: "TODO",
			assignedTo: USER_ADMIN,
			dueDate: daysAhead(30),
			createdBy: USER_OWNER,
		}),
		// 13. TODO
		task({
			id: "tsk_cer_013",
			eventId: EVENTS.CEREMONY,
			title: "Preparar votos",
			category: "CEREMONY",
			priority: "HIGH",
			status: "TODO",
			assignedTo: USER_PARTNER,
			dueDate: daysAhead(28),
			createdBy: USER_OWNER,
		}),
		// 14. CANCELLED
		task({
			id: "tsk_cer_014",
			eventId: EVENTS.CEREMONY,
			title: "Organizar ensaio",
			category: "CEREMONY",
			priority: "MEDIUM",
			status: "CANCELLED",
			assignedTo: USER_PARTNER,
			dueDate: daysAgo(3),
			createdBy: USER_OWNER,
		}),
		// 15. CANCELLED
		task({
			id: "tsk_cer_015",
			eventId: EVENTS.CEREMONY,
			title: "Contratar banda",
			category: "OTHER",
			priority: "LOW",
			status: "CANCELLED",
			assignedTo: USER_EDITOR,
			dueDate: daysAgo(10),
			createdBy: USER_OWNER,
		}),
	]);

	console.log("  Tasks seeded ✓");
}
