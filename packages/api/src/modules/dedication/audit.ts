import type { DedicationAuditAction } from "../../shared/types/entities";
import type { DedicationDb } from "./repository";

/**
 * The module writes to the shared `AuditLog` model — there is no dedicated
 * history table, so every entry uses the same shape the rest of the system
 * reserves for audit. `entity` is namespaced so the history of a dedication
 * can be queried without touching other entities.
 */
export const DEDICATION_ENTITY = "Dedication";

type AuditEntry = {
	action: DedicationAuditAction;
	eventId: string;
	userId: string;
	entityId: string;
	newData?: unknown;
	oldData?: unknown;
};

export function recordDedicationAudit(db: DedicationDb, entry: AuditEntry) {
	return db.auditLog.create({
		data: {
			eventId: entry.eventId,
			userId: entry.userId,
			action: entry.action,
			entity: DEDICATION_ENTITY,
			entityId: entry.entityId,
			newData: entry.newData as never,
			oldData: entry.oldData as never,
		},
	});
}

const STATUS_LABEL: Record<string, string> = {
	NOT_STARTED: "POR ESCREVER",
	DRAFT: "RASCUNHO",
	IN_PROGRESS: "EM PROGRESSO",
	READY: "PRONTO",
};

const FALLBACK_MEMBER = "um membro";

/**
 * Audit rows store a free-form snapshot, so the human-readable sentence is
 * resolved here — in the backend — instead of in the history component.
 * `memberNames` maps eventMemberId → member name for the viewer entries.
 */
export function describeAuditEntry(
	entry: { action: string; newData: unknown; oldData: unknown },
	actorName: string,
	memberNames: Map<string, string>,
): string {
	const newData = (entry.newData ?? {}) as Record<string, unknown>;
	const oldData = (entry.oldData ?? {}) as Record<string, unknown>;

	const statusLabel = (value: unknown, fallback: string) =>
		typeof value === "string" ? (STATUS_LABEL[value] ?? value) : fallback;

	const memberName = (value: unknown) =>
		typeof value === "string"
			? (memberNames.get(value) ?? FALLBACK_MEMBER)
			: FALLBACK_MEMBER;

	switch (entry.action) {
		case "CREATED":
			return `${actorName} criou a dedicatória.`;
		case "UPDATED":
			return `${actorName} actualizou a dedicatória.`;
		case "STATUS_CHANGED": {
			const to = statusLabel(newData.status, "");
			const from = statusLabel(oldData.status, "");
			return from
				? `${actorName} alterou o estado de ${from} para ${to}.`
				: `${actorName} alterou o estado para ${to}.`;
		}
		case "LOCKED":
			return `${actorName} bloqueou a dedicatória. Apenas ele pode visualizar.`;
		case "UNLOCKED":
			return `${actorName} desbloqueou a dedicatória.`;
		case "VIEWER_ADDED":
			return `${actorName} autorizou ${memberName(newData.eventMemberId)} a visualizar.`;
		case "VIEWER_REMOVED":
			return `${actorName} revogou o acesso de ${memberName(newData.eventMemberId ?? oldData.eventMemberId)}.`;
		case "OPENED":
			return `${actorName} abriu a dedicatória.`;
		case "DELETED":
			return `${actorName} eliminou a dedicatória.`;
		default:
			return `${actorName} actualizou a dedicatória.`;
	}
}
