import type { ActivityAction } from "@muxima/api/shared/types/entities";

/**
 * Display labels for the activity trail.
 *
 * Only presentation lives here — the action values themselves come from the
 * backend (`log.action`) and are never invented on the client. A missing entry
 * falls back to the raw value, so an action added on the server shows up as-is
 * instead of rendering blank.
 */
export const ACTIVITY_ACTION_LABELS: Record<ActivityAction, string> = {
	LOGIN: "Início de sessão",
	LOGOUT: "Fim de sessão",
	PASSWORD_CHANGED: "Palavra-passe alterada",
	PROFILE_UPDATED: "Perfil atualizado",
	EVENT_CREATED: "Evento criado",
	EVENT_UPDATED: "Evento atualizado",
	EVENT_DELETED: "Evento eliminado",
	GUEST_CREATED: "Convitado adicionado",
	GUEST_UPDATED: "Convitado atualizado",
	GUEST_DELETED: "Convitado eliminado",
};

export const ACTIVITY_RESOURCE_LABELS: Record<string, string> = {
	SESSION: "Sessão",
	PROFILE: "Perfil",
	EVENT: "Evento",
	GUEST: "Convidados",
};

export function activityActionLabel(action: string): string {
	return ACTIVITY_ACTION_LABELS[action as ActivityAction] ?? action;
}

export function activityResourceLabel(resource: string): string {
	return ACTIVITY_RESOURCE_LABELS[resource] ?? resource;
}

/** Page sizes offered by the History table, matching the shared Pagination. */
export const ACTIVITY_PAGE_SIZES = [10, 20, 50] as const;
