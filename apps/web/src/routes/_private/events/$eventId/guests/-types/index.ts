import type { ACTION_TYPES_GUEST } from "../-constants";

export type ActionTypeGuest =
	(typeof ACTION_TYPES_GUEST)[keyof typeof ACTION_TYPES_GUEST];

export interface Guest {
	id: string;
	eventId: string;
	name: string;
	email?: string;
	phone?: string;
	category?: string;
	status: string;
	attendance?: string;
	plusOne?: boolean;
	notes?: string;
	tableId?: string;
	table?: { name?: string };
	companions?: Array<{
		id: string;
		name: string;
	}>;
}

export const STATUS_OPTIONS = [
	{ value: "PENDING", label: "Pendente" },
	{ value: "CONFIRMED", label: "Confirmado" },
	{ value: "DECLINED", label: "Recusado" },
	{ value: "CANCELLED", label: "Cancelado" },
];

export const ATTENDANCE_OPTIONS = [
	{ value: "NOT_SENT", label: "Nao enviado" },
	{ value: "SENT", label: "Enviado" },
	{ value: "ACCEPTED", label: "Aceite" },
	{ value: "DECLINED", label: "Recusado" },
];

export const CATEGORY_OPTIONS = [
	{ value: "FAMILY", label: "Familia" },
	{ value: "FRIENDS", label: "Amigos" },
	{ value: "WORK", label: "Trabalho" },
	{ value: "PARTNER", label: "Parceiros" },
	{ value: "VIP", label: "VIP" },
	{ value: "OTHER", label: "Outros" },
];

export const STATUS_MAP: Record<string, string> = Object.fromEntries(
	STATUS_OPTIONS.map((o) => [o.value, o.label]),
);
export const ATTENDANCE_MAP: Record<string, string> = Object.fromEntries(
	ATTENDANCE_OPTIONS.map((o) => [o.value, o.label]),
);
