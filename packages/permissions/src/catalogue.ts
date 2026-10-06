/**
 * Permission catalogue — the compile-time vocabulary.
 *
 * This module is PURE (no database, no env, no server imports) on purpose: the
 * web bundle imports it to type its `can()` calls without dragging Prisma in.
 *
 * It is a *catalogue*, not a rule. The business rule — which role holds which
 * permission — lives in exactly one place, and the authoritative copy is the
 * database (`RolePermission`). The matrix below exists for three reasons only:
 *
 *   1. type-safe keys (`Permission` type, no scattered string literals);
 *   2. human-readable names/descriptions for the UI and for SQL audits;
 *   3. the seed definitions, which `upsert` this matrix into the database so a
 *      fresh environment converges on the same vocabulary.
 *
 * Adding a permission here without wiring it into the seed, or wiring it into
 * the seed without enforcing it in the backend, is drift — `permission-coverage`
 * in the test suite fails on both directions.
 */
export const PERMISSIONS = {
	// ── Account (self-scoped; never event-dependent) ──────────────────────────
	PROFILE_READ: "profile.read",
	PROFILE_UPDATE: "profile.update",
	PROFILE_PASSWORD_CHANGE: "profile.password.change",

	// ── Cross-event surfaces ─────────────────────────────────────────────────
	ACTIVITY_READ: "activity.read",
	ACTIVITY_READ_ALL: "activity.read.all",

	// ── Events ───────────────────────────────────────────────────────────────
	EVENT_READ: "events.read",
	EVENT_CREATE: "events.create",
	EVENT_UPDATE: "events.update",
	EVENT_DELETE: "events.delete",

	// ── Guests ───────────────────────────────────────────────────────────────
	GUEST_READ: "guests.read",
	GUEST_CREATE: "guests.create",
	GUEST_UPDATE: "guests.update",
	GUEST_DELETE: "guests.delete",
	GUEST_EXPORT: "guests.export",

	// ── Tables ───────────────────────────────────────────────────────────────
	TABLE_READ: "tables.read",
	TABLE_CREATE: "tables.create",
	TABLE_UPDATE: "tables.update",
	TABLE_DELETE: "tables.delete",

	// ── Invitations ──────────────────────────────────────────────────────────
	INVITATION_READ: "invitations.read",
	INVITATION_CREATE: "invitations.create",
	INVITATION_UPDATE: "invitations.update",
	INVITATION_DELETE: "invitations.delete",
	INVITATION_PUBLISH: "invitations.publish",
	INVITATION_RESPOND: "invitations.respond",

	// ── Budget ───────────────────────────────────────────────────────────────
	BUDGET_READ: "budget.read",
	BUDGET_CREATE: "budget.create",
	BUDGET_UPDATE: "budget.update",
	BUDGET_DELETE: "budget.delete",
	BUDGET_EXPORT: "budget.export",

	// ── Suppliers ────────────────────────────────────────────────────────────
	SUPPLIER_READ: "suppliers.read",
	SUPPLIER_CREATE: "suppliers.create",
	SUPPLIER_UPDATE: "suppliers.update",
	SUPPLIER_DELETE: "suppliers.delete",
	SUPPLIER_EXPORT: "suppliers.export",

	// ── Inventory ────────────────────────────────────────────────────────────
	INVENTORY_READ: "inventory.read",
	INVENTORY_CREATE: "inventory.create",
	INVENTORY_UPDATE: "inventory.update",
	INVENTORY_DELETE: "inventory.delete",
	INVENTORY_EXPORT: "inventory.export",

	// ── Tasks ────────────────────────────────────────────────────────────────
	TASK_READ: "tasks.read",
	TASK_CREATE: "tasks.create",
	TASK_UPDATE: "tasks.update",
	TASK_DELETE: "tasks.delete",

	// ── Schedule ─────────────────────────────────────────────────────────────
	SCHEDULE_READ: "schedule.read",
	SCHEDULE_CREATE: "schedule.create",
	SCHEDULE_UPDATE: "schedule.update",
	SCHEDULE_DELETE: "schedule.delete",

	// ── Food plan ────────────────────────────────────────────────────────────
	FOOD_PLAN_READ: "food-plan.read",
	FOOD_PLAN_CREATE: "food-plan.create",
	FOOD_PLAN_UPDATE: "food-plan.update",
	FOOD_PLAN_DELETE: "food-plan.delete",

	// ── Checklist ────────────────────────────────────────────────────────────
	CHECKLIST_READ: "checklist.read",
	CHECKLIST_CREATE: "checklist.create",
	CHECKLIST_UPDATE: "checklist.update",
	CHECKLIST_DELETE: "checklist.delete",

	// ── Dedications ──────────────────────────────────────────────────────────
	DEDICATION_READ: "dedications.read",
	DEDICATION_CREATE: "dedications.create",
	DEDICATION_UPDATE: "dedications.update",
	DEDICATION_DELETE: "dedications.delete",
	DEDICATION_SHARE: "dedications.share",

	// ── Team ─────────────────────────────────────────────────────────────────
	MEMBER_READ: "members.read",
	MEMBER_INVITE: "members.invite",
	MEMBER_ADD: "members.add",
	MEMBER_UPDATE_ROLE: "members.update-role",
	MEMBER_REMOVE: "members.remove",

	// ── Notifications (self-scoped) ──────────────────────────────────────────
	NOTIFICATION_READ: "notifications.read",
	NOTIFICATION_UPDATE: "notifications.update",
	NOTIFICATION_DELETE: "notifications.delete",

	// ── Dashboard ────────────────────────────────────────────────────────────
	DASHBOARD_READ: "dashboard.read",

	// ── Exports (generic, module-scoped exports use the module permission) ───
	EXPORT_CREATE: "exports.create",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Every permission key, sorted — used by the seed and by coverage tests. */
export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS).sort();

const PERMISSION_KEYS = new Set<string>(ALL_PERMISSIONS);

/** Narrow an untrusted string (DB row, request payload) to a known key. */
export function isPermission(value: string): value is Permission {
	return PERMISSION_KEYS.has(value);
}

/** `guests.update` → `{ resource: "guests", action: "update" }`. */
export function splitPermission(permission: Permission): {
	resource: string;
	action: string;
} {
	const separator = permission.indexOf(".");
	return {
		resource: separator === -1 ? permission : permission.slice(0, separator),
		action: separator === -1 ? "" : permission.slice(separator + 1),
	};
}

/**
 * PT-PT labels for the profile tab. Kept beside the keys so a permission can
 * never ship without a human-readable name.
 */
const PERMISSION_NAMES: Record<Permission, string> = {
	[PERMISSIONS.PROFILE_READ]: "Ver o próprio perfil",
	[PERMISSIONS.PROFILE_UPDATE]: "Editar o próprio perfil",
	[PERMISSIONS.PROFILE_PASSWORD_CHANGE]: "Alterar a palavra-passe",

	[PERMISSIONS.ACTIVITY_READ]: "Ver o próprio histórico",
	[PERMISSIONS.ACTIVITY_READ_ALL]: "Ver o histórico de outros membros",

	[PERMISSIONS.EVENT_READ]: "Ver eventos",
	[PERMISSIONS.EVENT_CREATE]: "Criar eventos",
	[PERMISSIONS.EVENT_UPDATE]: "Editar eventos",
	[PERMISSIONS.EVENT_DELETE]: "Eliminar eventos",

	[PERMISSIONS.GUEST_READ]: "Ver convidados",
	[PERMISSIONS.GUEST_CREATE]: "Adicionar convidados",
	[PERMISSIONS.GUEST_UPDATE]: "Editar convidados",
	[PERMISSIONS.GUEST_DELETE]: "Eliminar convidados",
	[PERMISSIONS.GUEST_EXPORT]: "Exportar convidados",

	[PERMISSIONS.TABLE_READ]: "Ver mesas",
	[PERMISSIONS.TABLE_CREATE]: "Criar mesas",
	[PERMISSIONS.TABLE_UPDATE]: "Editar mesas",
	[PERMISSIONS.TABLE_DELETE]: "Eliminar mesas",

	[PERMISSIONS.INVITATION_READ]: "Ver convites",
	[PERMISSIONS.INVITATION_CREATE]: "Criar convites",
	[PERMISSIONS.INVITATION_UPDATE]: "Editar convites",
	[PERMISSIONS.INVITATION_DELETE]: "Eliminar convites",
	[PERMISSIONS.INVITATION_PUBLISH]: "Publicar convites",
	[PERMISSIONS.INVITATION_RESPOND]: "Responder a convites",

	[PERMISSIONS.BUDGET_READ]: "Ver orçamento",
	[PERMISSIONS.BUDGET_CREATE]: "Criar orçamento",
	[PERMISSIONS.BUDGET_UPDATE]: "Editar orçamento",
	[PERMISSIONS.BUDGET_DELETE]: "Eliminar orçamento",
	[PERMISSIONS.BUDGET_EXPORT]: "Exportar orçamento",

	[PERMISSIONS.SUPPLIER_READ]: "Ver fornecedores",
	[PERMISSIONS.SUPPLIER_CREATE]: "Adicionar fornecedores",
	[PERMISSIONS.SUPPLIER_UPDATE]: "Editar fornecedores",
	[PERMISSIONS.SUPPLIER_DELETE]: "Eliminar fornecedores",
	[PERMISSIONS.SUPPLIER_EXPORT]: "Exportar fornecedores",

	[PERMISSIONS.INVENTORY_READ]: "Ver inventário",
	[PERMISSIONS.INVENTORY_CREATE]: "Adicionar itens ao inventário",
	[PERMISSIONS.INVENTORY_UPDATE]: "Editar inventário",
	[PERMISSIONS.INVENTORY_DELETE]: "Eliminar itens do inventário",
	[PERMISSIONS.INVENTORY_EXPORT]: "Exportar inventário",

	[PERMISSIONS.TASK_READ]: "Ver tarefas",
	[PERMISSIONS.TASK_CREATE]: "Criar tarefas",
	[PERMISSIONS.TASK_UPDATE]: "Editar tarefas",
	[PERMISSIONS.TASK_DELETE]: "Eliminar tarefas",

	[PERMISSIONS.SCHEDULE_READ]: "Ver cronograma",
	[PERMISSIONS.SCHEDULE_CREATE]: "Criar agendamentos",
	[PERMISSIONS.SCHEDULE_UPDATE]: "Editar agendamentos",
	[PERMISSIONS.SCHEDULE_DELETE]: "Eliminar agendamentos",

	[PERMISSIONS.FOOD_PLAN_READ]: "Ver plano alimentar",
	[PERMISSIONS.FOOD_PLAN_CREATE]: "Adicionar ao plano alimentar",
	[PERMISSIONS.FOOD_PLAN_UPDATE]: "Editar plano alimentar",
	[PERMISSIONS.FOOD_PLAN_DELETE]: "Eliminar do plano alimentar",

	[PERMISSIONS.CHECKLIST_READ]: "Ver checklist",
	[PERMISSIONS.CHECKLIST_CREATE]: "Adicionar à checklist",
	[PERMISSIONS.CHECKLIST_UPDATE]: "Editar checklist",
	[PERMISSIONS.CHECKLIST_DELETE]: "Eliminar da checklist",

	[PERMISSIONS.DEDICATION_READ]: "Ver dedicatórias",
	[PERMISSIONS.DEDICATION_CREATE]: "Criar dedicatória",
	[PERMISSIONS.DEDICATION_UPDATE]: "Editar dedicatória",
	[PERMISSIONS.DEDICATION_DELETE]: "Eliminar dedicatória",
	[PERMISSIONS.DEDICATION_SHARE]: "Partilhar dedicatória",

	[PERMISSIONS.MEMBER_READ]: "Ver membros da equipa",
	[PERMISSIONS.MEMBER_INVITE]: "Convidar membros",
	[PERMISSIONS.MEMBER_ADD]: "Adicionar membros",
	[PERMISSIONS.MEMBER_UPDATE_ROLE]: "Alterar a role de um membro",
	[PERMISSIONS.MEMBER_REMOVE]: "Remover membros",

	[PERMISSIONS.NOTIFICATION_READ]: "Ver notificações",
	[PERMISSIONS.NOTIFICATION_UPDATE]: "Marcar notificações como lidas",
	[PERMISSIONS.NOTIFICATION_DELETE]: "Eliminar notificações",

	[PERMISSIONS.DASHBOARD_READ]: "Ver o dashboard",

	[PERMISSIONS.EXPORT_CREATE]: "Exportar relatórios",
};

export function permissionName(permission: Permission): string {
	return PERMISSION_NAMES[permission] ?? permission;
}
