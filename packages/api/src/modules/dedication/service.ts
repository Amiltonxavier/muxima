import {
	BadRequestError,
	ConflictError,
	ForbiddenError,
	NotFoundError,
} from "../../shared/errors/app-error";
import type {
	Dedication,
	DedicationDetail,
	DedicationHistoryEntry,
	DedicationListItem,
	DedicationStats,
	DedicationViewerDto,
	RichTextNode,
	UserSummary,
} from "../../shared/types/entities";
import {
	DEDICATION_ENTITY,
	describeAuditEntry,
	recordDedicationAudit,
} from "./audit";
import {
	type DedicationDb,
	type DedicationFilterParams,
	type DedicationRecord,
	DedicationRepository,
	toListItem,
} from "./repository";
import { EMPTY_RICH_TEXT, parseRichTextContent } from "./rich-text";
import type {
	AddDedicationViewerInput,
	CreateDedicationInput,
	SetDedicationVisibilityInput,
	UpdateDedicationInput,
} from "./schemas";

// ── Authorization primitives ────────────────────────────────────
// Every entry point runs these three steps in this order:
//   authentication (protectedProcedure) → event membership → dedication access.
// The frontend hides buttons for convenience, but nothing here trusts it.

/** Only active members of the event reach this module at all. */
async function assertEventMembership(
	db: DedicationDb,
	userId: string,
	eventId: string,
) {
	const membership = await DedicationRepository.findMembership(
		db,
		eventId,
		userId,
	);
	if (!membership) {
		throw new ForbiddenError("Não tem acesso a este evento");
	}
	return membership;
}

/**
 * Loads a dedication for reading and decides what the requester may do.
 * Always scoped by `eventId`, so an id from another event is indistinguishable
 * from a non-existent one.
 */
async function loadForRead(
	db: DedicationDb,
	params: { eventId: string; dedicationId: string; userId: string },
) {
	// Membership is checked before anything else, so access is always derived
	// from an *active* membership. Without this the owner branch below would
	// let someone who left the event keep reading and writing their own text,
	// even though `list` already refuses them.
	await assertEventMembership(db, params.userId, params.eventId);

	const dedication = await DedicationRepository.findByIdForEvent(
		db,
		params.eventId,
		params.dedicationId,
	);
	if (!dedication) {
		throw new NotFoundError("Dedicatória não encontrada");
	}

	if (dedication.ownerId === params.userId) {
		return { dedication, access: "OWNER" as const, grant: null };
	}

	// Locked content is owner-only, regardless of membership or role.
	if (dedication.isLocked) {
		throw new ForbiddenError(
			"Esta dedicatória é privada. Apenas o autor pode visualizar.",
		);
	}

	// A member who left the event (status != ACTIVE) loses access here, and the
	// grant row itself is cascade-deleted with the membership.
	const grant = await DedicationRepository.findViewerGrant(
		db,
		dedication.id,
		params.userId,
	);
	if (!grant) {
		throw new ForbiddenError(
			"Não tem permissão para visualizar esta dedicatória",
		);
	}

	return { dedication, access: "VIEWER" as const, grant };
}

/** Loads a dedication for mutation. Owners only — viewers get 403. */
async function loadForWrite(
	db: DedicationDb,
	params: { eventId: string; dedicationId: string; userId: string },
) {
	const { dedication } = await loadForRead(db, params);
	if (dedication.ownerId !== params.userId) {
		throw new ForbiddenError("Apenas o autor pode alterar esta dedicatória");
	}
	return dedication;
}

// ── Domain rules ────────────────────────────────────────────────

/**
 * The type frames the whole text, so it is only changeable while nothing has
 * been written yet. Once writing starts the kind is fixed.
 */
export function assertTypeIsEditable(status: Dedication["status"]): void {
	if (status !== "NOT_STARTED") {
		throw new BadRequestError(
			"O tipo só pode ser alterado antes de começar a escrever",
		);
	}
}

/**
 * The editor document is rebuilt against the allowlist right before it is
 * stored. The input schema already does this, but the service is the
 * authoritative choke point: any future caller (REST layer, script, migration)
 * goes through here, and sanitising twice is idempotent.
 */
function toStorableContent(raw: unknown): RichTextNode {
	const content = parseRichTextContent(raw);
	if (!content) {
		throw new BadRequestError("O conteúdo do editor tem um formato inválido");
	}
	return content;
}

/**
 * Resolves viewer ids to event members of *this* event, rejecting anything
 * that does not belong. An arbitrary id from the client is never trusted: the
 * membership row is re-read and both its `eventId` and its `status` are
 * checked here.
 */
async function resolveViewers(
	db: DedicationDb,
	params: { eventId: string; ownerUserId: string; eventMemberIds: string[] },
) {
	const unique = [...new Set(params.eventMemberIds)];
	if (unique.length === 0) return [];

	const members = await Promise.all(
		unique.map((id) => DedicationRepository.findEventMember(db, id)),
	);

	const resolved: { id: string; userId: string }[] = [];
	for (const member of members) {
		if (!member || member.eventId !== params.eventId) {
			throw new ForbiddenError(
				"Um dos membros seleccionados não pertence a este evento",
			);
		}
		if (member.status !== "ACTIVE") {
			throw new BadRequestError(
				"Um dos membros seleccionados ainda não aceitou o convite",
			);
		}
		if (member.userId === params.ownerUserId) {
			throw new BadRequestError("O autor já tem acesso à própria dedicatória");
		}
		resolved.push({ id: member.id, userId: member.userId });
	}

	return resolved;
}

// ── Service ─────────────────────────────────────────────────────

export const DedicationService = {
	async list(
		db: DedicationDb,
		params: {
			eventId: string;
			userId: string;
			pagination: { page: number; limit: number };
			filters?: DedicationFilterParams;
		},
	): Promise<{ data: DedicationListItem[]; total: number }> {
		await assertEventMembership(db, params.userId, params.eventId);

		const [rows, total] = await Promise.all([
			DedicationRepository.findVisible(
				db,
				params.eventId,
				params.userId,
				params.pagination,
				params.filters,
			),
			DedicationRepository.countVisible(
				db,
				params.eventId,
				params.userId,
				params.filters,
			),
		]);

		return {
			data: (rows as DedicationRecord[]).map((row) =>
				toListItem(row, params.userId),
			),
			total,
		};
	},

	async getStats(
		db: DedicationDb,
		params: { eventId: string; userId: string },
	): Promise<DedicationStats> {
		await assertEventMembership(db, params.userId, params.eventId);
		return DedicationRepository.getStats(db, params.eventId, params.userId);
	},

	/**
	 * Opening a dedication *is* reading it: the last-open timestamps and the
	 * OPENED audit entry are written here so callers never forget.
	 */
	async get(
		db: DedicationDb,
		params: { eventId: string; dedicationId: string; userId: string },
	): Promise<DedicationDetail> {
		const { dedication, grant } = await loadForRead(db, params);
		const openedAt = new Date();

		await db.$transaction(async (tx) => {
			await DedicationRepository.markOpened(tx, dedication.id, openedAt);
			if (grant) {
				await DedicationRepository.markViewerOpened(tx, grant.id, openedAt);
			}
			// No snapshot payload: `getHistory` resolves the actor from the
			// audit row's `user` relation, so recording a name here would only
			// risk drifting from the real actor.
			await recordDedicationAudit(tx, {
				action: "OPENED",
				eventId: dedication.eventId,
				userId: params.userId,
				entityId: dedication.id,
			});
		});

		return {
			...toListItem(dedication as DedicationRecord, params.userId),
			content: dedication.content as RichTextNode,
			// Reflect the read that just happened rather than the stale value.
			viewerLastOpenedAt: grant ? openedAt : null,
		};
	},

	async create(
		db: DedicationDb,
		params: { eventId: string; userId: string; input: CreateDedicationInput },
	): Promise<DedicationDetail> {
		await assertEventMembership(db, params.userId, params.eventId);

		const { input } = params;
		// New content is always born private. Sharing is a separate, explicit
		// step so a create request can never widen access by accident.
		const viewers =
			input.visibility === "SHARED"
				? await resolveViewers(db, {
						eventId: params.eventId,
						ownerUserId: params.userId,
						eventMemberIds: input.viewerEventMemberIds,
					})
				: [];

		if (input.visibility === "SHARED" && viewers.length === 0) {
			throw new BadRequestError(
				"Selecione pelo menos um membro para partilhar a dedicatória",
			);
		}

		const createdId = await db.$transaction(async (tx) => {
			const created = await DedicationRepository.create(tx, {
				eventId: params.eventId,
				ownerId: params.userId,
				title: input.title,
				type: input.type,
				status: input.status,
				content: input.content
					? toStorableContent(input.content)
					: EMPTY_RICH_TEXT,
			});

			for (const viewer of viewers) {
				await DedicationRepository.addViewer(tx, created.id, viewer.id);
			}

			if (viewers.length > 0) {
				await DedicationRepository.setLock(tx, created.id, false);
			}

			await recordDedicationAudit(tx, {
				action: "CREATED",
				eventId: params.eventId,
				userId: params.userId,
				entityId: created.id,
				newData: { title: input.title, type: input.type, status: input.status },
			});

			return created.id;
		});

		// Re-read instead of mapping the pre-transaction row: unlocking and
		// adding viewers changed both `isLocked` and the viewer count.
		const saved = await DedicationRepository.findByIdForEvent(
			db,
			params.eventId,
			createdId,
		);
		// Only reachable if the row was deleted between the two statements.
		if (!saved) {
			throw new NotFoundError("Dedicatória não encontrada");
		}
		// The stored document was rebuilt against the allowlist on write, so the
		// cast only bridges Prisma's `JsonValue` to the validated DTO shape.
		const record = saved as DedicationRecord;
		return {
			...toListItem(record, params.userId),
			content: record.content,
			viewerLastOpenedAt: null,
		};
	},

	async update(
		db: DedicationDb,
		params: {
			eventId: string;
			dedicationId: string;
			userId: string;
			input: UpdateDedicationInput;
		},
	): Promise<DedicationDetail> {
		const dedication = await loadForWrite(db, params);
		const { input } = params;

		if (input.type !== undefined && input.type !== dedication.type) {
			assertTypeIsEditable(dedication.status);
		}

		const statusChanged =
			input.status !== undefined && input.status !== dedication.status;

		return db.$transaction(async (tx) => {
			const updated = await DedicationRepository.update(tx, dedication.id, {
				...(input.title !== undefined ? { title: input.title } : {}),
				...(input.type !== undefined ? { type: input.type } : {}),
				...(input.status !== undefined ? { status: input.status } : {}),
				...(input.content !== undefined
					? { content: toStorableContent(input.content) }
					: {}),
			});

			if (statusChanged) {
				await recordDedicationAudit(tx, {
					action: "STATUS_CHANGED",
					eventId: dedication.eventId,
					userId: params.userId,
					entityId: dedication.id,
					oldData: { status: dedication.status },
					newData: { status: input.status },
				});
			} else {
				await recordDedicationAudit(tx, {
					action: "UPDATED",
					eventId: dedication.eventId,
					userId: params.userId,
					entityId: dedication.id,
					newData: { title: updated.title },
				});
			}

			return {
				...toListItem(updated as DedicationRecord, params.userId),
				content: updated.content as RichTextNode,
				viewerLastOpenedAt: null,
			};
		});
	},

	/**
	 * Locking and unlocking are one atomic operation. Unlocking *requires* a
	 * valid viewer set, so `isLocked = false` can never be interpreted as
	 * "every member of the event". Locking revokes every grant.
	 */
	async setVisibility(
		db: DedicationDb,
		params: {
			eventId: string;
			dedicationId: string;
			userId: string;
			input: SetDedicationVisibilityInput;
		},
	): Promise<{ isLocked: boolean; viewerCount: number }> {
		const dedication = await loadForWrite(db, params);
		const { isLocked, viewerEventMemberIds } = params.input;

		if (isLocked) {
			const existing = await DedicationRepository.listViewers(
				db,
				dedication.id,
			);
			await db.$transaction(async (tx) => {
				await DedicationRepository.setLock(tx, dedication.id, true);
				await DedicationRepository.removeAllViewers(tx, dedication.id);
				await recordDedicationAudit(tx, {
					action: "LOCKED",
					eventId: dedication.eventId,
					userId: params.userId,
					entityId: dedication.id,
					oldData: { isLocked: false, viewerCount: existing.length },
					newData: { isLocked: true },
				});
			});
			return { isLocked: true, viewerCount: 0 };
		}

		if (dedication.isLocked === false && viewerEventMemberIds.length === 0) {
			// Already shared: an empty set would silently lock it again, which
			// is not what "unlock" means.
			throw new BadRequestError(
				"Selecione pelo menos um membro para partilhar a dedicatória",
			);
		}

		const viewers = await resolveViewers(db, {
			eventId: dedication.eventId,
			ownerUserId: params.userId,
			eventMemberIds: viewerEventMemberIds,
		});

		if (viewers.length === 0) {
			throw new BadRequestError(
				"Selecione pelo menos um membro para partilhar a dedicatória",
			);
		}

		return db.$transaction(async (tx) => {
			// Replace the grant set wholesale so the dialog's selection is the
			// final word and no stale grant survives.
			await DedicationRepository.removeAllViewers(tx, dedication.id);
			for (const viewer of viewers) {
				await DedicationRepository.addViewer(tx, dedication.id, viewer.id);
			}
			await DedicationRepository.setLock(tx, dedication.id, false);
			await recordDedicationAudit(tx, {
				action: "UNLOCKED",
				eventId: dedication.eventId,
				userId: params.userId,
				entityId: dedication.id,
				oldData: { isLocked: dedication.isLocked },
				newData: { isLocked: false, viewerCount: viewers.length },
			});
			return { isLocked: false, viewerCount: viewers.length };
		});
	},

	async listViewers(
		db: DedicationDb,
		params: { eventId: string; dedicationId: string; userId: string },
	): Promise<{
		viewers: DedicationViewerDto[];
		eligibleMembers: DedicationViewerDto["member"][];
	}> {
		const dedication = await loadForWrite(db, params);

		const [viewers, members] = await Promise.all([
			DedicationRepository.listViewers(db, dedication.id),
			DedicationRepository.listEligibleMembers(
				db,
				dedication.eventId,
				dedication.ownerId,
			),
		]);

		return {
			viewers: viewers.map((viewer) => ({
				id: viewer.id,
				dedicationId: viewer.dedicationId,
				eventMemberId: viewer.eventMemberId,
				lastOpenedAt: viewer.lastOpenedAt,
				createdAt: viewer.createdAt,
				member: viewer.eventMember,
			})),
			eligibleMembers: members,
		};
	},

	async addViewer(
		db: DedicationDb,
		params: {
			eventId: string;
			dedicationId: string;
			userId: string;
			input: AddDedicationViewerInput;
		},
	): Promise<{ viewerCount: number }> {
		const dedication = await loadForWrite(db, params);

		// Grants only make sense on shared content; a locked dedication has no
		// audience yet.
		if (dedication.isLocked) {
			throw new ConflictError(
				"Desbloqueie a dedicatória antes de seleccionar membros",
			);
		}

		const [member] = await resolveViewers(db, {
			eventId: dedication.eventId,
			ownerUserId: params.userId,
			eventMemberIds: [params.input.eventMemberId],
		});
		if (!member) {
			throw new BadRequestError("Seleccione um membro do evento");
		}

		const existing = await DedicationRepository.findViewerGrantByMember(
			db,
			dedication.id,
			member.id,
		);
		if (existing) {
			throw new ConflictError("Este membro já pode visualizar a dedicatória");
		}

		return db.$transaction(async (tx) => {
			await DedicationRepository.addViewer(tx, dedication.id, member.id);
			await recordDedicationAudit(tx, {
				action: "VIEWER_ADDED",
				eventId: dedication.eventId,
				userId: params.userId,
				entityId: dedication.id,
				newData: { eventMemberId: member.id },
			});
			const viewers = await DedicationRepository.listViewers(tx, dedication.id);
			return { viewerCount: viewers.length };
		});
	},

	async removeViewer(
		db: DedicationDb,
		params: {
			eventId: string;
			dedicationId: string;
			viewerId: string;
			userId: string;
		},
	): Promise<{ viewerCount: number }> {
		const dedication = await loadForWrite(db, params);

		const viewer = await DedicationRepository.findViewerById(
			db,
			dedication.id,
			params.viewerId,
		);
		if (!viewer) {
			throw new NotFoundError("Membro autorizado não encontrado");
		}

		return db.$transaction(async (tx) => {
			await DedicationRepository.removeViewer(tx, viewer.id);
			await recordDedicationAudit(tx, {
				action: "VIEWER_REMOVED",
				eventId: dedication.eventId,
				userId: params.userId,
				entityId: dedication.id,
				oldData: { eventMemberId: viewer.eventMemberId },
			});
			const remaining = await DedicationRepository.listViewers(
				tx,
				dedication.id,
			);
			return { viewerCount: remaining.length };
		});
	},

	async remove(
		db: DedicationDb,
		params: { eventId: string; dedicationId: string; userId: string },
	): Promise<{ success: true }> {
		const dedication = await loadForWrite(db, params);

		return db.$transaction(async (tx) => {
			// Written before the delete so the trail survives: AuditLog is only
			// cascade-deleted with the event, not with the dedication.
			await recordDedicationAudit(tx, {
				action: "DELETED",
				eventId: dedication.eventId,
				userId: params.userId,
				entityId: dedication.id,
				oldData: { title: dedication.title, type: dedication.type },
			});
			await DedicationRepository.delete(tx, dedication.id);
			return { success: true as const };
		});
	},

	async getHistory(
		db: DedicationDb,
		params: { eventId: string; dedicationId: string; userId: string },
	): Promise<DedicationHistoryEntry[]> {
		const dedication = await loadForWrite(db, params);

		const rows = await db.auditLog.findMany({
			where: { entity: DEDICATION_ENTITY, entityId: dedication.id },
			orderBy: { createdAt: "desc" },
			take: 100,
			include: { user: { select: { id: true, name: true, email: true } } },
		});

		// Resolve member names once so the sentences can be written server-side.
		const eventMemberIds = new Set<string>();
		for (const row of rows) {
			for (const snapshot of [row.newData, row.oldData]) {
				const id = (snapshot as { eventMemberId?: unknown } | null)
					?.eventMemberId;
				if (typeof id === "string") eventMemberIds.add(id);
			}
		}
		const members = eventMemberIds.size
			? await db.eventMember.findMany({
					where: { id: { in: [...eventMemberIds] } },
					select: { id: true, user: { select: { name: true } } },
				})
			: [];
		const memberNames = new Map(members.map((m) => [m.id, m.user.name]));

		return rows.map((row) => ({
			id: row.id,
			action: row.action as DedicationHistoryEntry["action"],
			userId: row.userId,
			actor: (row.user as UserSummary | null) ?? null,
			message: describeAuditEntry(
				row,
				row.user?.name ?? "Um membro",
				memberNames,
			),
			createdAt: row.createdAt,
		}));
	},
};
