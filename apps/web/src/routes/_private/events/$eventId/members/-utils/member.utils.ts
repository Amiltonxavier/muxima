import type {
	AssignableMemberRole,
	MemberItem,
	MemberRole,
	MemberStatus,
} from "../-types/member.types";

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
	OWNER: "Proprietário",
	PARTNER: "Parceiro",
	ADMIN: "Administrador",
	EDITOR: "Editor",
	VIEWER: "Visualizador",
};

/**
 * Type guard for the owner role. Written as a guard (rather than a boolean
 * helper over the member) so `member.role` narrows to `AssignableMemberRole`
 * in the negative branch.
 */
export function isOwnerRole(role: MemberRole): role is "OWNER" {
	return role === "OWNER";
}

/** Roles selectable when adding a member or changing someone's role. */
export const MEMBER_ROLE_OPTIONS: Array<{
	value: AssignableMemberRole;
	label: string;
}> = (
	[
		["PARTNER", MEMBER_ROLE_LABELS.PARTNER],
		["ADMIN", MEMBER_ROLE_LABELS.ADMIN],
		["EDITOR", MEMBER_ROLE_LABELS.EDITOR],
		["VIEWER", MEMBER_ROLE_LABELS.VIEWER],
	] as Array<[AssignableMemberRole, string]>
).map(([value, label]) => ({ value, label }));

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
	ACTIVE: "Ativo",
	PENDING: "Pendente",
	DECLINED: "Recusou",
};

export const MEMBER_STATUS_BADGE_CLASSES: Record<MemberStatus, string> = {
	ACTIVE: "bg-green-50 text-green-700",
	PENDING: "bg-amber-50 text-amber-700",
	DECLINED: "bg-muted text-muted-foreground",
};

export const MEMBER_ROLE_DESCRIPTIONS: Record<MemberRole, string> = {
	OWNER: "Criador do evento, com controlo total e sem remoção possível.",
	PARTNER: "Acesso total, incluindo facturação e exclusão do evento.",
	ADMIN: "Gere o evento, membros e convidados sem acesso à facturação.",
	EDITOR: "Pode editar convidados, mesas, convites e conteúdo do evento.",
	VIEWER: "Apenas consulta — não pode alterar nada.",
};

export function getMemberName(member: Pick<MemberItem, "user">): string {
	const name = member.user?.name;
	return name ? String(name) : "Utilizador";
}

export function getMemberEmail(member: Pick<MemberItem, "user">): string {
	const email = member.user?.email;
	return email ? String(email) : "—";
}

export function getMemberInitials(member: Pick<MemberItem, "user">): string {
	return getMemberName(member)
		.split(" ")
		.filter(Boolean)
		.map((part) => part[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();
}

export function getMemberStatus(
	member: Pick<MemberItem, "status">,
): MemberStatus {
	return MEMBER_STATUS_LABELS[member.status] ? member.status : "PENDING";
}
