import { prisma, EVENTS, TableAssignment } from "./helpers";

// ── Table ID helpers ─────────────────────────────────────────────
const eventShortMap: Record<string, string> = {
	[EVENTS.WEDDING]: "wed",
	[EVENTS.ENGAGEMENT]: "eng",
	[EVENTS.BIRTHDAY]: "bth",
	[EVENTS.CONFERENCE]: "con",
	[EVENTS.WEDDING_CANCELLED]: "wcx",
	[EVENTS.GRADUATION]: "gra",
	[EVENTS.CORPORATE]: "corp",
	[EVENTS.WORKSHOP]: "wrk",
	[EVENTS.BABY_SHOWER]: "bab",
	[EVENTS.CEREMONY]: "cer",
};

let tgCounter = 1;

function tableId(eventId: string, num: number): string {
	const short = eventShortMap[eventId] ?? "tbl";
	return `tbl_${short}_${String(num).padStart(3, "0")}`;
}

function tgId(): string {
	return `tg_${String(tgCounter++).padStart(3, "0")}`;
}

// ── Distribute guests to tables ─────────────────────────────────
interface TableDef {
	name: string;
	capacity: number;
	location?: string;
}

function distribute(
	eventId: string,
	tables: TableDef[],
	guestIds: string[],
): { tableData: any[]; assignments: TableAssignment[] } {
	const tableData = tables.map((t, i) => ({
		id: tableId(eventId, i + 1),
		eventId,
		name: t.name,
		capacity: t.capacity,
		location: t.location ?? null,
		notes: null,
		deletedAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	}));

	const assignments: TableAssignment[] = [];
	let guestIdx = 0;

	for (let i = 0; i < tableData.length && guestIdx < guestIds.length; i++) {
		const cap = tableData[i].capacity;
		for (let j = 0; j < cap && guestIdx < guestIds.length; j++) {
			assignments.push({
				tableId: tableData[i].id,
				guestId: guestIds[guestIdx],
			});
			guestIdx++;
		}
	}

	return { tableData, assignments };
}

// ── Seed function ───────────────────────────────────────────────
export async function seedTables(
	guestIds: Record<string, string[]>,
): Promise<TableAssignment[]> {
	tgCounter = 1;
	const allTables: any[] = [];
	const allAssignments: TableAssignment[] = [];

	// ── WEDDING ─────────────────────────────────────────────────
	const weddingGuests = guestIds[EVENTS.WEDDING] ?? [];
	const weddingTables: TableDef[] = [
		{ name: "Mesa da Família Noiva", capacity: 8, location: "Ao lado do palco" },
		{ name: "Mesa da Família Noivo", capacity: 8, location: "Ao lado do palco" },
		{ name: "Mesa Padrinhos", capacity: 6, location: "Frente ao altar" },
		{ name: "Mesa Amigos da Universidade", capacity: 10, location: "Zona central" },
		{ name: "Mesa Trabalho Banco", capacity: 8, location: "Zona lateral" },
		{ name: "Mesa VIP", capacity: 6, location: "Ao lado da mesa principal" },
		{ name: "Mesa Vizinhos", capacity: 8, location: "Zona traseira" },
		{ name: "Mesa Reserva", capacity: 10, location: "Zona traseira" },
		{ name: "Mesa Família distante", capacity: 8, location: "Zona lateral" },
		{ name: "Mesa Amigos do Noivo", capacity: 10, location: "Zona central" },
		{ name: "Mesa Colegas de Trabalho", capacity: 8, location: "Zona lateral" },
		{ name: "Mesa Convidados Especiais", capacity: 6, location: "Ao lado da mesa principal" },
	];
	const w = distribute(EVENTS.WEDDING, weddingTables, weddingGuests);
	allTables.push(...w.tableData);
	allAssignments.push(...w.assignments);

	// ── ENGAGEMENT ──────────────────────────────────────────────
	const engagementGuests = guestIds[EVENTS.ENGAGEMENT] ?? [];
	const engagementTables: TableDef[] = [
		{ name: "Mesa Principal", capacity: 8 },
		{ name: "Mesa Família", capacity: 10 },
		{ name: "Mesa Amigos", capacity: 8 },
		{ name: "Mesa Casais", capacity: 6 },
		{ name: "Mesa Jovens", capacity: 8 },
		{ name: "Mesa Reserva", capacity: 10 },
	];
	const e = distribute(EVENTS.ENGAGEMENT, engagementTables, engagementGuests);
	allTables.push(...e.tableData);
	allAssignments.push(...e.assignments);

	// ── BIRTHDAY ────────────────────────────────────────────────
	const birthdayGuests = guestIds[EVENTS.BIRTHDAY] ?? [];
	const birthdayTables: TableDef[] = [
		{ name: "Mesa Principal", capacity: 8 },
		{ name: "Mesa Amigos Próximos", capacity: 10 },
		{ name: "Mesa Família", capacity: 8 },
		{ name: "Mesa Reserva", capacity: 6 },
	];
	const b = distribute(EVENTS.BIRTHDAY, birthdayTables, birthdayGuests);
	allTables.push(...b.tableData);
	allAssignments.push(...b.assignments);

	// ── CONFERENCE ──────────────────────────────────────────────
	const conferenceGuests = guestIds[EVENTS.CONFERENCE] ?? [];
	const conferenceTables: TableDef[] = Array.from({ length: 15 }, (_, i) => ({
		name: `Mesa ${i + 1}`,
		capacity: 10,
	}));
	const c = distribute(EVENTS.CONFERENCE, conferenceTables, conferenceGuests);
	allTables.push(...c.tableData);
	allAssignments.push(...c.assignments);

	// ── WEDDING_CANCELLED ───────────────────────────────────────
	const wcGuests = guestIds[EVENTS.WEDDING_CANCELLED] ?? [];
	const wcTables: TableDef[] = Array.from({ length: 8 }, (_, i) => ({
		name: `Mesa ${i + 1}`,
		capacity: 8,
	}));
	const wc = distribute(EVENTS.WEDDING_CANCELLED, wcTables, wcGuests);
	allTables.push(...wc.tableData);
	allAssignments.push(...wc.assignments);

	// ── GRADUATION — no tables ──────────────────────────────────

	// ── CORPORATE ───────────────────────────────────────────────
	const corporateGuests = guestIds[EVENTS.CORPORATE] ?? [];
	const corporateTables: TableDef[] = [
		...Array.from({ length: 6 }, (_, i) => ({
			name: `Mesa ${i + 1}`,
			capacity: 8,
		})),
		...Array.from({ length: 2 }, (_, i) => ({
			name: `Mesa ${i + 7}`,
			capacity: 10,
		})),
	];
	const co = distribute(EVENTS.CORPORATE, corporateTables, corporateGuests);
	allTables.push(...co.tableData);
	allAssignments.push(...co.assignments);

	// ── WORKSHOP ────────────────────────────────────────────────
	const workshopGuests = guestIds[EVENTS.WORKSHOP] ?? [];
	const workshopTables: TableDef[] = Array.from({ length: 4 }, (_, i) => ({
		name: `Mesa ${i + 1}`,
		capacity: 10,
	}));
	const wk = distribute(EVENTS.WORKSHOP, workshopTables, workshopGuests);
	allTables.push(...wk.tableData);
	allAssignments.push(...wk.assignments);

	// ── BABY_SHOWER ─────────────────────────────────────────────
	const babyGuests = guestIds[EVENTS.BABY_SHOWER] ?? [];
	const babyTables: TableDef[] = [
		{ name: "Mesa Principal", capacity: 10 },
		{ name: "Mesa Amigas", capacity: 8 },
		{ name: "Mesa Família", capacity: 8 },
	];
	const bs = distribute(EVENTS.BABY_SHOWER, babyTables, babyGuests);
	allTables.push(...bs.tableData);
	allAssignments.push(...bs.assignments);

	// ── CEREMONY ────────────────────────────────────────────────
	const ceremonyGuests = guestIds[EVENTS.CEREMONY] ?? [];
	const ceremonyTables: TableDef[] = Array.from({ length: 14 }, (_, i) => ({
		name: `Mesa ${i + 1}`,
		capacity: 10,
	}));
	const cer = distribute(EVENTS.CEREMONY, ceremonyTables, ceremonyGuests);
	allTables.push(...cer.tableData);
	allAssignments.push(...cer.assignments);

	// ── Persist ─────────────────────────────────────────────────
	await prisma.table.createMany({ data: allTables });

	const assignmentData = allAssignments.map((a) => ({
		id: tgId(),
		tableId: a.tableId,
		guestId: a.guestId,
		assignedAt: new Date(),
	}));
	await prisma.tableGuest.createMany({ data: assignmentData });

	return allAssignments;
}
