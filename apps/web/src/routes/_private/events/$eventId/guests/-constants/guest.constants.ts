import {
	GUEST_STATUS_LABELS,
	GUEST_TYPE_LABELS,
	toSelectItems,
} from "@/utils/status-helpers";

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;

export const GUEST_STATUS_FILTER_OPTIONS = [
	{ value: "ALL", label: "Todos os estados" },
	...toSelectItems(GUEST_STATUS_LABELS),
];

export const GUEST_TYPE_FILTER_OPTIONS = [
	{ value: "ALL", label: "Todos os tipos" },
	...toSelectItems(GUEST_TYPE_LABELS),
];

// ── Invitations ──────────────────────────────────────────────────
// Migrated from the deactivated `invitations` page module.
export const INVITATION_RESPONSE_FILTER_OPTIONS = [
	{ value: "ALL", label: "Todas as respostas" },
	{ value: "PENDING", label: "Sem resposta" },
	{ value: "CONFIRM", label: "Confirmados" },
	{ value: "MAYBE", label: "Talvez" },
	{ value: "DECLINE", label: "Recusados" },
	{ value: "EXPIRED", label: "Expirados" },
	{ value: "CANCELLED", label: "Cancelados" },
] as const;

/**
 * Mirrors `PUBLISHABLE_GUEST_STATUSES` in the API. Used to hide the bulk
 * publish action in the UI — the backend still validates every invitation.
 */
export const PUBLISHABLE_GUEST_STATUSES = [
	"PENDING",
	"CONFIRMED",
	"MAYBE",
	"WAITING",
] as const;
