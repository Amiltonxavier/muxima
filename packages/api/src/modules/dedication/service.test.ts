import { beforeEach, describe, expect, it } from "vitest";
import { AppError } from "../../shared/errors/app-error";
import { createFakeDb, type SeedRow } from "./__fixtures__/fake-db";
import type { DedicationDb } from "./repository";
import { DedicationService } from "./service";

// ── World ────────────────────────────────────────────────────────

const EVENT = "evt_1";
const OTHER_EVENT = "evt_2";

const OWNER = "usr_owner"; // member of evt_1
const VIEWER = "usr_viewer"; // member of evt_1
const STRANGER = "usr_stranger"; // member of evt_1, never granted
const OUTSIDER = "usr_outsider"; // belongs to evt_2 only
const NOWHERE = "usr_nowhere"; // member of no event at all

const MEMBERS = [
	{
		id: "mem_owner",
		eventId: EVENT,
		userId: OWNER,
		role: "OWNER",
		status: "ACTIVE",
	},
	{
		id: "mem_viewer",
		eventId: EVENT,
		userId: VIEWER,
		role: "PARTNER",
		status: "ACTIVE",
	},
	{
		id: "mem_stranger",
		eventId: EVENT,
		userId: STRANGER,
		role: "EDITOR",
		status: "ACTIVE",
	},
	{
		id: "mem_pending",
		eventId: EVENT,
		userId: "usr_pending",
		role: "VIEWER",
		status: "PENDING",
	},
	{
		id: "mem_outsider",
		eventId: OTHER_EVENT,
		userId: OUTSIDER,
		role: "OWNER",
		status: "ACTIVE",
	},
];

const USERS = [
	{ id: OWNER, name: "Amilton", email: "amilton@muxima.ao" },
	{ id: VIEWER, name: "Maria José", email: "maria@muxima.ao" },
	{ id: STRANGER, name: "Carlos António", email: "carlos@muxima.ao" },
	{ id: "usr_pending", name: "Ana Paula", email: "ana@muxima.ao" },
	{ id: OUTSIDER, name: "Externo", email: "externo@outro.ao" },
	{ id: NOWHERE, name: "Desconhecido", email: "ninguem@outro.ao" },
];

const paragraph = (text: string) => ({
	type: "doc",
	content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

function makeDedication(overrides: Record<string, unknown> = {}) {
	return {
		id: "ded_1",
		eventId: EVENT,
		ownerId: OWNER,
		title: "Os meus votos",
		type: "WEDDING_VOW",
		status: "DRAFT",
		content: paragraph("Prometo-te amor eterno."),
		isLocked: true,
		...overrides,
	};
}

let db: DedicationDb;
let tables: ReturnType<typeof createFakeDb>["tables"];

function seed(dedications: SeedRow[], viewers: SeedRow[] = []) {
	const fake = createFakeDb({
		user: USERS,
		eventMember: MEMBERS,
		dedication: dedications,
		dedicationViewer: viewers,
	});
	// The fake only implements the subset of Prisma this module touches, so it
	// cannot structurally satisfy the full `DedicationDb` union.
	db = fake.db as unknown as DedicationDb;
	tables = fake.tables;
	return fake;
}

/** A private dedication owned by OWNER. */
function seedPrivate() {
	seed([makeDedication()]);
}

/** A shared dedication with VIEWER granted. */
function seedShared() {
	seed(
		[makeDedication({ isLocked: false, status: "READY" })],
		[
			{
				id: "view_1",
				dedicationId: "ded_1",
				eventMemberId: "mem_viewer",
				lastOpenedAt: null,
			},
		],
	);
}

async function expectAppError(promise: Promise<unknown>, code: string) {
	await expect(promise).rejects.toBeInstanceOf(AppError);
	try {
		await promise;
	} catch (error) {
		expect((error as AppError).code).toBe(code);
	}
}

// ── Rule 1: a user outside the event cannot reach a dedication ────

describe("Regra 1 — utilizador fora do evento", () => {
	beforeEach(seedShared);

	it("não acede a uma dedicatória de outro evento", async () => {
		await expectAppError(
			DedicationService.get(db, {
				eventId: OTHER_EVENT,
				dedicationId: "ded_1",
				userId: OUTSIDER,
			}),
			"NOT_FOUND",
		);
	});

	it("não lista nem conta conteúdo de outro evento", async () => {
		await expectAppError(
			DedicationService.list(db, {
				eventId: OTHER_EVENT,
				userId: NOWHERE,
				pagination: { page: 1, limit: 20 },
			}),
			"FORBIDDEN",
		);
	});

	it("não acede a um evento do qual não é membro", async () => {
		await expectAppError(
			DedicationService.list(db, {
				eventId: EVENT,
				userId: OUTSIDER,
				pagination: { page: 1, limit: 20 },
			}),
			"FORBIDDEN",
		);
	});

	it("não altera nem elimina conteúdo de outro evento", async () => {
		await expectAppError(
			DedicationService.update(db, {
				eventId: OTHER_EVENT,
				dedicationId: "ded_1",
				userId: OUTSIDER,
				input: { title: "invadido" },
			}),
			"NOT_FOUND",
		);
		await expectAppError(
			DedicationService.remove(db, {
				eventId: OTHER_EVENT,
				dedicationId: "ded_1",
				userId: OUTSIDER,
			}),
			"NOT_FOUND",
		);
	});
});

// ── Rule 2: a member cannot read another member's private text ────

describe("Regra 2 — membro não vê dedicatória privada de outro", () => {
	beforeEach(seedPrivate);

	it.each([VIEWER, STRANGER])("nega leitura a %s", async (userId) => {
		await expectAppError(
			DedicationService.get(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				userId,
			}),
			"FORBIDDEN",
		);
	});

	it("não expõe o conteúdo na listagem", async () => {
		const result = await DedicationService.list(db, {
			eventId: EVENT,
			userId: STRANGER,
			pagination: { page: 1, limit: 20 },
		});

		expect(result.data).toHaveLength(0);
		expect(result.total).toBe(0);
	});
});

// ── Rule 3: a member without a grant gets 403 on shared content ──

describe("Regra 3 — membro sem permissão em conteúdo partilhado", () => {
	beforeEach(seedShared);

	it("nega leitura a quem não foi autorizado", async () => {
		await expectAppError(
			DedicationService.get(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				userId: STRANGER,
			}),
			"FORBIDDEN",
		);
	});
});

// ── Rule 4: a granted viewer may read but never write ────────────

describe("Regra 4 — viewer autorizado lê mas não escreve", () => {
	beforeEach(seedShared);

	it("lê o conteúdo e recebe a suacesso de viewer", async () => {
		const detail = await DedicationService.get(db, {
			eventId: EVENT,
			dedicationId: "ded_1",
			userId: VIEWER,
		});

		expect(detail.access).toBe("VIEWER");
		expect(detail.content).toEqual(paragraph("Prometo-te amor eterno."));
		expect(detail.owner.name).toBe("Amilton");
	});

	it("não pode editar", async () => {
		await expectAppError(
			DedicationService.update(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				userId: VIEWER,
				input: { title: "alterado" },
			}),
			"FORBIDDEN",
		);
	});

	it("não pode eliminar", async () => {
		await expectAppError(
			DedicationService.remove(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				userId: VIEWER,
			}),
			"FORBIDDEN",
		);
	});

	it("não pode alterar o estado de escrita", async () => {
		await expectAppError(
			DedicationService.update(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				userId: VIEWER,
				input: { status: "READY" },
			}),
			"FORBIDDEN",
		);
	});
});

// ── Rule 5: only the owner manages viewers ───────────────────────

describe("Regra 5 — só o proprietário gere membros autorizados", () => {
	beforeEach(seedShared);

	it("não permite a um viewer adicionar membros", async () => {
		await expectAppError(
			DedicationService.addViewer(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				userId: VIEWER,
				input: { eventMemberId: "mem_stranger" },
			}),
			"FORBIDDEN",
		);
	});

	it("não permite a um viewer remover membros", async () => {
		await expectAppError(
			DedicationService.removeViewer(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				viewerId: "view_1",
				userId: VIEWER,
			}),
			"FORBIDDEN",
		);
	});

	it("não permite a um viewer alterar a visibilidade", async () => {
		await expectAppError(
			DedicationService.setVisibility(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				userId: VIEWER,
				input: { isLocked: true, viewerEventMemberIds: [] },
			}),
			"FORBIDDEN",
		);
	});

	it("não permite a um viewer listar os membros autorizados", async () => {
		await expectAppError(
			DedicationService.listViewers(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				userId: VIEWER,
			}),
			"FORBIDDEN",
		);
	});
});

// ── Rule 6: only the owner locks and unlocks ─────────────────────

describe("Regra 6 — só o proprietor bloqueia e desbloqueia", () => {
	beforeEach(seedPrivate);

	it("o proprietário bloqueia e desbloqueia", async () => {
		const unlocked = await DedicationService.setVisibility(db, {
			eventId: EVENT,
			dedicationId: "ded_1",
			userId: OWNER,
			input: { isLocked: false, viewerEventMemberIds: ["mem_viewer"] },
		});
		expect(unlocked).toEqual({ isLocked: false, viewerCount: 1 });

		const locked = await DedicationService.setVisibility(db, {
			eventId: EVENT,
			dedicationId: "ded_1",
			userId: OWNER,
			input: { isLocked: true, viewerEventMemberIds: [] },
		});
		expect(locked).toEqual({ isLocked: true, viewerCount: 0 });
	});
});

// ── Rule 7: only the owner deletes ───────────────────────────────

describe("Regra 7 — só o proprietário elimina", () => {
	beforeEach(seedShared);

	it("remove a dedicatória e os respetivos acessos", async () => {
		await expect(
			DedicationService.remove(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				userId: OWNER,
			}),
		).resolves.toEqual({ success: true });

		expect(tables.dedication).toHaveLength(0);
		expect(tables.dedicationViewer).toHaveLength(0);
	});
});

// ── Rule 8: viewers must belong to the same event ────────────────

describe("Regra 8 — viewers têm de pertencer ao mesmo evento", () => {
	beforeEach(seedPrivate);

	it("rejeita um membro de outro evento", async () => {
		await expectAppError(
			DedicationService.setVisibility(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				userId: OWNER,
				input: { isLocked: false, viewerEventMemberIds: ["mem_outsider"] },
			}),
			"FORBIDDEN",
		);
	});

	it("rejeita um id de membro que não existe", async () => {
		await expectAppError(
			DedicationService.setVisibility(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				userId: OWNER,
				input: { isLocked: false, viewerEventMemberIds: ["mem_inventado"] },
			}),
			"FORBIDDEN",
		);
	});

	it("rejeita um membro que ainda não aceitou o convite", async () => {
		await expectAppError(
			DedicationService.setVisibility(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				userId: OWNER,
				input: { isLocked: false, viewerEventMemberIds: ["mem_pending"] },
			}),
			"BAD_REQUEST",
		);
	});

	it("rejeita o próprio autor como viewer", async () => {
		await expectAppError(
			DedicationService.setVisibility(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				userId: OWNER,
				input: { isLocked: false, viewerEventMemberIds: ["mem_owner"] },
			}),
			"BAD_REQUEST",
		);
	});

	it("ignora ids duplicados na mesma seleção", async () => {
		const result = await DedicationService.setVisibility(db, {
			eventId: EVENT,
			dedicationId: "ded_1",
			userId: OWNER,
			input: {
				isLocked: false,
				viewerEventMemberIds: ["mem_viewer", "mem_viewer"],
			},
		});

		expect(result.viewerCount).toBe(1);
	});
});

// ── Rule 9: unlocked content is never public ─────────────────────

describe("Regra 9 — conteúdo desbloqueado nunca é público", () => {
	beforeEach(() => {
		seed(
			[makeDedication({ isLocked: false })],
			[{ id: "view_1", dedicationId: "ded_1", eventMemberId: "mem_viewer" }],
		);
	});

	it("continua a negar membros não autorizados", async () => {
		await expectAppError(
			DedicationService.get(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				userId: STRANGER,
			}),
			"FORBIDDEN",
		);
	});

	it("impede desbloquear sem uma seleção válida", async () => {
		await expectAppError(
			DedicationService.setVisibility(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				userId: OWNER,
				input: { isLocked: false, viewerEventMemberIds: [] },
			}),
			"BAD_REQUEST",
		);
	});

	it("impede criar directamente em modo partilhado sem membros", async () => {
		await expectAppError(
			DedicationService.create(db, {
				eventId: EVENT,
				userId: OWNER,
				input: {
					title: "x",
					type: "DEDICATION",
					status: "NOT_STARTED",
					visibility: "SHARED",
					viewerEventMemberIds: [],
				},
			}),
			"BAD_REQUEST",
		);
	});

	it("só lista o que o utilizador pode ver", async () => {
		const asOwner = await DedicationService.list(db, {
			eventId: EVENT,
			userId: OWNER,
			pagination: { page: 1, limit: 20 },
		});
		const asStranger = await DedicationService.list(db, {
			eventId: EVENT,
			userId: STRANGER,
			pagination: { page: 1, limit: 20 },
		});
		const asViewer = await DedicationService.list(db, {
			eventId: EVENT,
			userId: VIEWER,
			pagination: { page: 1, limit: 20 },
		});

		expect(asOwner.data).toHaveLength(1);
		expect(asOwner.data[0]?.access).toBe("OWNER");
		expect(asViewer.data).toHaveLength(1);
		expect(asViewer.data[0]?.access).toBe("VIEWER");
		expect(asStranger.data).toHaveLength(0);
	});
});

// ── Rule 10: rich text is validated before it is stored ──────────

describe("Regra 10 — rich text validado", () => {
	beforeEach(seedPrivate);

	it("descarta nós fora do esquema ao gravar", async () => {
		const detail = await DedicationService.update(db, {
			eventId: EVENT,
			dedicationId: "ded_1",
			userId: OWNER,
			input: {
				content: {
					type: "doc",
					content: [
						{ type: "script", content: [{ type: "text", text: "alert(1)" }] },
						{ type: "paragraph", content: [{ type: "text", text: "texto" }] },
					],
				} as never,
			},
		});

		expect(JSON.stringify(detail.content)).not.toContain("script");
		expect(detail.excerpt).toBe("texto");
	});

	it("saneia o conteúdo também quando o caller salta a validação Zod", async () => {
		// The service is the authoritative choke point: a REST handler, script or
		// future caller must not be able to write unsanitised HTML/JS.
		const detail = await DedicationService.update(db, {
			eventId: EVENT,
			dedicationId: "ded_1",
			userId: OWNER,
			input: {
				content: {
					type: "doc",
					content: [
						{ type: "paragraph", content: [{ type: "text", text: "seguro" }] },
						{ type: "iframe", attrs: { src: "https://evil.example" } },
					],
				} as never,
			},
		});

		expect(JSON.stringify(detail.content)).not.toContain("iframe");
		expect(detail.excerpt).toBe("seguro");
	});
});

// ── Regressões: a resposta e o acesso reflectem o estado gravado ────

describe("Resposta reflecte o estado gravado", () => {
	beforeEach(seedPrivate);

	it("devolve a dedicatória desbloqueada e conta os viewers ao criar partilhada", async () => {
		const created = await DedicationService.create(db, {
			eventId: EVENT,
			userId: OWNER,
			input: {
				title: "Votos de noivado",
				type: "ENGAGEMENT_VOW",
				status: "NOT_STARTED",
				visibility: "SHARED",
				viewerEventMemberIds: ["mem_viewer"],
			},
		});

		// Regression: the response used to be assembled from the pre-transaction
		// row, reporting isLocked=true and viewerCount=0 for a shared dedication.
		expect(created.isLocked).toBe(false);
		expect(created.viewerCount).toBe(1);

		// And the viewer can actually reach it straight away.
		await expect(
			DedicationService.get(db, {
				eventId: EVENT,
				dedicationId: created.id,
				userId: VIEWER,
			}),
		).resolves.toMatchObject({ access: "VIEWER" });
	});

	it("devolve a data de abertura acabada de gravar", async () => {
		const before = Date.now();
		const detail = await DedicationService.get(db, {
			eventId: EVENT,
			dedicationId: "ded_1",
			userId: OWNER,
		});

		expect(detail.viewerLastOpenedAt).toBeNull();
		const openedAt = tables.dedication[0]?.lastOpenedAt;
		expect(openedAt).toBeInstanceOf(Date);
		expect((openedAt as Date).getTime()).toBeGreaterThanOrEqual(before);
	});
});

// ── O double de teste não pode mascarar bugs de transação ─────────

describe("Fidelidade do double de teste", () => {
	beforeEach(seedPrivate);

	it("rejeita transações aninhadas, tal como o Prisma", async () => {
		// The router used to wrap every service call in `db.$transaction` while
		// the service opened its own. That crashes in production because a real
		// TransactionClient has no `$transaction`; the fake must not allow it.
		await expect(
			db.$transaction(() => db.$transaction(async () => undefined)),
		).rejects.toThrow(/nested \$transaction/);
	});

	it("propaga exclusões em cascata como o schema", async () => {
		await expect(
			DedicationService.remove(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				userId: OWNER,
			}),
		).resolves.toEqual({ success: true });

		expect(tables.dedication).toHaveLength(0);
	});
});

// ── Saída do autor ───────────────────────────────────────────────

describe("Saída do autor", () => {
	beforeEach(seedPrivate);

	it("nega leitura e escrita ao autor que deixou de ser membro activo", async () => {
		const member = tables.eventMember.find((m) => m.id === "mem_owner");
		if (member) member.status = "PENDING";

		await expectAppError(
			DedicationService.get(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				userId: OWNER,
			}),
			"FORBIDDEN",
		);

		await expectAppError(
			DedicationService.update(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				userId: OWNER,
				input: { title: "Novo título" },
			}),
			"FORBIDDEN",
		);

		await expectAppError(
			DedicationService.getHistory(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				userId: OWNER,
			}),
			"FORBIDDEN",
		);
	});

	it("recupera o acesso quando o autor volta a ser membro activo", async () => {
		const member = tables.eventMember.find((m) => m.id === "mem_owner");
		if (member) member.status = "PENDING";

		await expectAppError(
			DedicationService.get(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				userId: OWNER,
			}),
			"FORBIDDEN",
		);

		if (member) member.status = "ACTIVE";
		await expect(
			DedicationService.get(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				userId: OWNER,
			}),
		).resolves.toMatchObject({ access: "OWNER" });
	});
});

// ── Rule 11: opening records the last open ───────────────────────

describe("Regra 11 — abrir actualiza lastOpenedAt", () => {
	beforeEach(seedShared);

	it("actualiza a dedicatória e o viewer autorizado", async () => {
		expect(tables.dedication[0]?.lastOpenedAt).toBeNull();

		await DedicationService.get(db, {
			eventId: EVENT,
			dedicationId: "ded_1",
			userId: VIEWER,
		});

		expect(tables.dedication[0]?.lastOpenedAt).toBeInstanceOf(Date);
		expect(tables.dedicationViewer[0]?.lastOpenedAt).toBeInstanceOf(Date);
	});

	it("regista uma entrada OPENED no histórico", async () => {
		await DedicationService.get(db, {
			eventId: EVENT,
			dedicationId: "ded_1",
			userId: VIEWER,
		});

		const opened = tables.auditLog.filter((row) => row.action === "OPENED");
		expect(opened).toHaveLength(1);
		expect(opened[0]?.userId).toBe(VIEWER);
	});
});

// ── Rule 12: meaningful changes are recorded ─────────────────────

describe("Regra 12 — histórico de alterações", () => {
	beforeEach(seedPrivate);

	it("regista criação, edição, estado, bloqueio, viewers e eliminação", async () => {
		await DedicationService.create(db, {
			eventId: EVENT,
			userId: OWNER,
			input: {
				title: "Os meus votos",
				type: "WEDDING_VOW",
				status: "NOT_STARTED",
				visibility: "PRIVATE",
				viewerEventMemberIds: [],
			},
		});

		await DedicationService.update(db, {
			eventId: EVENT,
			dedicationId: "ded_1",
			userId: OWNER,
			input: { title: "Os meus votos para ti" },
		});

		await DedicationService.update(db, {
			eventId: EVENT,
			dedicationId: "ded_1",
			userId: OWNER,
			input: { status: "READY" },
		});

		await DedicationService.setVisibility(db, {
			eventId: EVENT,
			dedicationId: "ded_1",
			userId: OWNER,
			input: { isLocked: false, viewerEventMemberIds: ["mem_viewer"] },
		});

		await DedicationService.setVisibility(db, {
			eventId: EVENT,
			dedicationId: "ded_1",
			userId: OWNER,
			input: { isLocked: true, viewerEventMemberIds: [] },
		});

		await DedicationService.remove(db, {
			eventId: EVENT,
			dedicationId: "ded_1",
			userId: OWNER,
		});

		const actions = tables.auditLog.map((row) => row.action);
		expect(actions).toEqual(
			expect.arrayContaining([
				"CREATED",
				"UPDATED",
				"STATUS_CHANGED",
				"UNLOCKED",
				"LOCKED",
				"DELETED",
			]),
		);

		// The trail outlives the record it describes.
		expect(tables.dedication.find((d) => d.id === "ded_1")).toBeUndefined();
		expect(tables.auditLog.length).toBeGreaterThan(0);
	});

	it("devolve o histórico com frases resolvidas no backend", async () => {
		await DedicationService.update(db, {
			eventId: EVENT,
			dedicationId: "ded_1",
			userId: OWNER,
			input: { status: "READY" },
		});

		const history = await DedicationService.getHistory(db, {
			eventId: EVENT,
			dedicationId: "ded_1",
			userId: OWNER,
		});

		expect(history[0]?.message).toBe(
			"Amilton alterou o estado de RASCUNHO para PRONTO.",
		);
		expect(history[0]?.actor?.name).toBe("Amilton");
	});

	it("nega o histórico a quem não é o proprietário", async () => {
		seed(
			[makeDedication({ isLocked: false })],
			[
				{
					id: "view_1",
					dedicationId: "ded_1",
					eventMemberId: "mem_viewer",
				},
			],
		);

		await expectAppError(
			DedicationService.getHistory(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				userId: VIEWER,
			}),
			"FORBIDDEN",
		);
	});
});

// ── Lock / viewer management ─────────────────────────────────────

describe("Bloqueio e membros autorizados", () => {
	beforeEach(seedPrivate);

	it("novo conteúdo nasce privado", async () => {
		const created = await DedicationService.create(db, {
			eventId: EVENT,
			userId: OWNER,
			input: {
				title: "Uma dedicatória",
				type: "DEDICATION",
				status: "NOT_STARTED",
				visibility: "PRIVATE",
				viewerEventMemberIds: [],
			},
		});

		expect(created.isLocked).toBe(true);
		expect(created.status).toBe("NOT_STARTED");
		expect(created.viewerCount).toBe(0);
	});

	it("bloquear revoga o acesso dos viewers", async () => {
		await DedicationService.setVisibility(db, {
			eventId: EVENT,
			dedicationId: "ded_1",
			userId: OWNER,
			input: { isLocked: false, viewerEventMemberIds: ["mem_viewer"] },
		});
		expect(tables.dedicationViewer).toHaveLength(1);

		await DedicationService.setVisibility(db, {
			eventId: EVENT,
			dedicationId: "ded_1",
			userId: OWNER,
			input: { isLocked: true, viewerEventMemberIds: [] },
		});

		expect(tables.dedicationViewer).toHaveLength(0);
		await expectAppError(
			DedicationService.get(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				userId: VIEWER,
			}),
			"FORBIDDEN",
		);
	});

	it("não permite adicionar viewer a uma dedicatória bloqueada", async () => {
		await expectAppError(
			DedicationService.addViewer(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				userId: OWNER,
				input: { eventMemberId: "mem_viewer" },
			}),
			"CONFLICT",
		);
	});

	it("impede duplicar um viewer", async () => {
		await DedicationService.setVisibility(db, {
			eventId: EVENT,
			dedicationId: "ded_1",
			userId: OWNER,
			input: { isLocked: false, viewerEventMemberIds: ["mem_viewer"] },
		});

		await expectAppError(
			DedicationService.addViewer(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				userId: OWNER,
				input: { eventMemberId: "mem_viewer" },
			}),
			"CONFLICT",
		);
	});

	it("remove um viewer e deixa de lhe dar acesso", async () => {
		await DedicationService.setVisibility(db, {
			eventId: EVENT,
			dedicationId: "ded_1",
			userId: OWNER,
			input: { isLocked: false, viewerEventMemberIds: ["mem_viewer"] },
		});

		const result = await DedicationService.removeViewer(db, {
			eventId: EVENT,
			dedicationId: "ded_1",
			viewerId: tables.dedicationViewer[0]?.id as string,
			userId: OWNER,
		});
		expect(result.viewerCount).toBe(0);

		await expectAppError(
			DedicationService.get(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				userId: VIEWER,
			}),
			"FORBIDDEN",
		);
	});

	it("devolve os membros elegíveis e os já autorizados", async () => {
		await DedicationService.setVisibility(db, {
			eventId: EVENT,
			dedicationId: "ded_1",
			userId: OWNER,
			input: { isLocked: false, viewerEventMemberIds: ["mem_viewer"] },
		});

		const { viewers, eligibleMembers } = await DedicationService.listViewers(
			db,
			{
				eventId: EVENT,
				dedicationId: "ded_1",
				userId: OWNER,
			},
		);

		expect(viewers).toHaveLength(1);
		expect(viewers[0]?.member.user.name).toBe("Maria José");
		// The author is never offered as a viewer of their own text.
		expect(eligibleMembers.map((m) => m.userId)).not.toContain(OWNER);
		expect(eligibleMembers.map((m) => m.userId)).toContain(STRANGER);
	});
});

// ── A member who leaves the event loses access ───────────────────

describe("Saída do evento", () => {
	it("um viewer que deixa de ser membro activo perde o acesso", async () => {
		seedShared();
		const member = tables.eventMember.find((m) => m.id === "mem_viewer");
		if (member) member.status = "DECLINED";

		await expectAppError(
			DedicationService.get(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				userId: VIEWER,
			}),
			"FORBIDDEN",
		);
	});
});

// ── Status and type rules ────────────────────────────────────────

describe("Estado de escrita e tipo", () => {
	beforeEach(() => {
		seed([makeDedication({ status: "NOT_STARTED" })]);
	});

	it("permite mudar o tipo antes de começar a escrever", async () => {
		await expect(
			DedicationService.update(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				userId: OWNER,
				input: { type: "ENGAGEMENT_VOW" },
			}),
		).resolves.toMatchObject({ type: "ENGAGEMENT_VOW" });
	});

	it("bloqueia a mudança de tipo depois de começar", async () => {
		await DedicationService.update(db, {
			eventId: EVENT,
			dedicationId: "ded_1",
			userId: OWNER,
			input: { status: "DRAFT" },
		});

		await expectAppError(
			DedicationService.update(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				userId: OWNER,
				input: { type: "ENGAGEMENT_VOW" },
			}),
			"BAD_REQUEST",
		);
	});

	it("aceita reenviar o mesmo tipo em qualquer estado", async () => {
		await DedicationService.update(db, {
			eventId: EVENT,
			dedicationId: "ded_1",
			userId: OWNER,
			input: { status: "IN_PROGRESS" },
		});

		await expect(
			DedicationService.update(db, {
				eventId: EVENT,
				dedicationId: "ded_1",
				userId: OWNER,
				input: { type: "WEDDING_VOW" },
			}),
		).resolves.toMatchObject({ type: "WEDDING_VOW" });
	});
});

// ── Stats ────────────────────────────────────────────────────────

describe("Estatísticas", () => {
	beforeEach(() => {
		seed(
			[
				makeDedication({ id: "ded_1", status: "NOT_STARTED", isLocked: true }),
				makeDedication({ id: "ded_2", status: "IN_PROGRESS", isLocked: true }),
				makeDedication({ id: "ded_3", status: "READY", isLocked: false }),
				makeDedication({ id: "ded_4", status: "READY", isLocked: false }),
			],
			[
				{ id: "view_1", dedicationId: "ded_3", eventMemberId: "mem_stranger" },
				{
					id: "view_2",
					dedicationId: "ded_4",
					eventMemberId: "mem_stranger",
					lastOpenedAt: new Date(),
				},
			],
		);
	});

	it("agrega por estado e visibilidade no backend", async () => {
		const stats = await DedicationService.getStats(db, {
			eventId: EVENT,
			userId: OWNER,
		});

		expect(stats).toEqual({
			total: 4,
			notStarted: 1,
			draft: 0,
			inProgress: 1,
			ready: 2,
			privateCount: 2,
			sharedCount: 2,
			sharedWithMe: 0,
			openedByMe: 0,
		});
	});

	it("conta apenas o que o utilizador pode ver", async () => {
		const stats = await DedicationService.getStats(db, {
			eventId: EVENT,
			userId: STRANGER,
		});

		expect(stats.total).toBe(2);
		expect(stats.sharedWithMe).toBe(2);
		expect(stats.openedByMe).toBe(1);
	});
});

// ── Listing and filtering ────────────────────────────────────────

describe("Listagem e filtros", () => {
	beforeEach(() => {
		seed([
			makeDedication({
				id: "ded_1",
				title: "Os meus votos",
				type: "WEDDING_VOW",
			}),
			makeDedication({
				id: "ded_2",
				title: "Para a minha esposa",
				type: "WEDDING_VOW",
				status: "READY",
				isLocked: false,
			}),
			makeDedication({
				id: "ded_3",
				title: "Uma dedicatória",
				type: "DEDICATION",
				status: "IN_PROGRESS",
			}),
		]);
	});

	it("filtra por tipo, estado e visibilidade", async () => {
		const byType = await DedicationService.list(db, {
			eventId: EVENT,
			userId: OWNER,
			pagination: { page: 1, limit: 20 },
			filters: { type: "DEDICATION" },
		});
		expect(byType.data.map((d) => d.id)).toEqual(["ded_3"]);

		const byStatus = await DedicationService.list(db, {
			eventId: EVENT,
			userId: OWNER,
			pagination: { page: 1, limit: 20 },
			filters: { status: "READY" },
		});
		expect(byStatus.data.map((d) => d.id)).toEqual(["ded_2"]);

		const byVisibility = await DedicationService.list(db, {
			eventId: EVENT,
			userId: OWNER,
			pagination: { page: 1, limit: 20 },
			filters: { visibility: "PRIVATE" },
		});
		expect(byVisibility.data).toHaveLength(2);
	});

	it("pesquisa por título, ignorando maiúsculas", async () => {
		const result = await DedicationService.list(db, {
			eventId: EVENT,
			userId: OWNER,
			pagination: { page: 1, limit: 20 },
			filters: { search: "ESPOSA" },
		});

		expect(result.data.map((d) => d.id)).toEqual(["ded_2"]);
	});

	it("pagina", async () => {
		const page1 = await DedicationService.list(db, {
			eventId: EVENT,
			userId: OWNER,
			pagination: { page: 1, limit: 2 },
		});
		const page2 = await DedicationService.list(db, {
			eventId: EVENT,
			userId: OWNER,
			pagination: { page: 2, limit: 2 },
		});

		expect(page1.data).toHaveLength(2);
		expect(page2.data).toHaveLength(1);
		expect(page1.total).toBe(3);
	});
});
