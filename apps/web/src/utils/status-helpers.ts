export const EVENT_STATUS_LABELS: Record<string, string> = {
	DRAFT: "Rascunho",
	PLANNING: "Em preparação",
	CONFIRMED: "Confirmado",
	COMPLETED: "Concluído",
	CANCELLED: "Cancelado",
};

export const EXPENSE_TYPE_LABELS: Record<string, string> = {
	EXPENSE: "Despesa",
	INCOME: "Receita",
};

export const EXPENSE_STATUS_LABELS: Record<string, string> = {
	PLANNED: "Planeado",
	PARTIALLY_PAID: "Parcialmente pago",
	PAID: "Pago",
	OVERDUE: "Atrasado",
	CANCELLED: "Cancelado",
};

export const GUEST_TYPE_LABELS: Record<string, string> = {
	FAMILY: "Família",
	FRIEND: "Amigo",
	COLLEAGUE: "Colega",
	VIP: "VIP",
	OTHER: "Outro",
};

export const GUEST_STATUS_LABELS: Record<string, string> = {
	PENDING: "Pendente",
	CONFIRMED: "Confirmado",
	DECLINED: "Recusado",
	WAITING: "Em espera",
};

export const TASK_STATUS_LABELS: Record<string, string> = {
	TODO: "Por fazer",
	IN_PROGRESS: "Em andamento",
	COMPLETED: "Concluído",
	CANCELLED: "Cancelado",
};

export const VENDOR_STATUS_LABELS: Record<string, string> = {
	PROSPECT: "Prospeto",
	CONTACTED: "Contactado",
	NEGOTIATING: "Em negociação",
	CONTRACTED: "Contratado",
	COMPLETED: "Concluído",
	CANCELLED: "Cancelado",
};

export const MEMBER_ROLE_LABELS: Record<string, string> = {
	OWNER: "Proprietário",
	PARTNER: "Parceiro",
	ADMIN: "Administrador",
	EDITOR: "Editor",
	VIEWER: "Visualizador",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
	CASH: "Dinheiro",
	BANK_TRANSFER: "Transferência bancária",
	ATM: "Multibanco",
	CARD: "Cartão",
	MOBILE_PAYMENT: "Pagamento móvel",
	OTHER: "Outro",
};

export const VENDOR_CATEGORY_LABELS: Record<string, string> = {
	VENUE: "Salão",
	DECORATION: "Decoração",
	MUSIC: "Música",
	PHOTOGRAPHY: "Fotografia",
	VIDEO: "Vídeo",
	CATERING: "Catering",
	CAKE: "Bolo",
	DRINKS: "Bebidas",
	TRANSPORT: "Transporte",
	BEAUTY: "Beleza",
	SECURITY: "Segurança",
	ENTERTAINMENT: "Entretenimento",
	OTHER: "Outro",
};

export const TASK_CATEGORY_LABELS: Record<string, string> = {
	FINANCE: "Financeiro",
	VENUE: "Local",
	GUESTS: "Convidados",
	FOOD: "Alimentação",
	DRINKS: "Bebidas",
	DECORATION: "Decoração",
	CEREMONY: "Cerimónia",
	DOCUMENTS: "Documentos",
	CLOTHING: "Vestuário",
	TRANSPORT: "Transporte",
	OTHER: "Outro",
};

export const INVENTORY_CATEGORY_LABELS: Record<string, string> = {
	DRINK: "Bebidas",
	FOOD: "Alimentação",
	CAKE: "Bolos",
	DECORATION: "Decoração",
	OTHER: "Outros",
};

export const INVENTORY_UNIT_LABELS: Record<string, string> = {
	UNIT: "Unidade",
	BOX: "Caixa",
	CASE: "Pack",
	BOTTLE: "Garrafa",
	KG: "Kg",
	LITER: "Litro",
	PACKAGE: "Pacote",
	OTHER: "Outro",
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
	CONTRACT: "Contrato",
	RECEIPT: "Recibo",
	QUOTE: "Orçamento",
	OTHER: "Outro",
};

export function getStatusColor(status: string): string {
	const colors: Record<string, string> = {
		DRAFT: "bg-neutral-100 text-neutral-700",
		PLANNING: "bg-blue-50 text-blue-700",
		CONFIRMED: "bg-green-50 text-green-700",
		COMPLETED: "bg-emerald-50 text-emerald-700",
		CANCELLED: "bg-red-50 text-red-700",
		PLANNED: "bg-neutral-100 text-neutral-700",
		PARTIALLY_PAID: "bg-amber-50 text-amber-700",
		PAID: "bg-green-50 text-green-700",
		OVERDUE: "bg-red-50 text-red-700",
		PENDING: "bg-amber-50 text-amber-700",
		DECLINED: "bg-red-50 text-red-700",
		WAITING: "bg-blue-50 text-blue-700",
		TODO: "bg-neutral-100 text-neutral-700",
		IN_PROGRESS: "bg-blue-50 text-blue-700",
		PROSPECT: "bg-neutral-100 text-neutral-700",
		CONTACTED: "bg-blue-50 text-blue-700",
		NEGOTIATING: "bg-amber-50 text-amber-700",
		CONTRACTED: "bg-green-50 text-green-700",
	};
	return colors[status] || "bg-neutral-100 text-neutral-700";
}

export function getStatusLabel(
	status: string,
	type: "event" | "expense" | "guest" | "task" | "vendor" | "role" | "document",
): string {
	const labels: Record<string, Record<string, string>> = {
		event: EVENT_STATUS_LABELS,
		expense: EXPENSE_STATUS_LABELS,
		guest: GUEST_STATUS_LABELS,
		task: TASK_STATUS_LABELS,
		vendor: VENDOR_STATUS_LABELS,
		role: MEMBER_ROLE_LABELS,
		document: { ACTIVE: "Ativo", ARCHIVED: "Arquivado", DELETED: "Eliminado" },
	};
	return labels[type]?.[status] || status;
}

/** Convert a pt-pt label map to Base UI Select items format */
export function toSelectItems(
	labels: Record<string, string>,
): Array<{ value: string; label: string }> {
	return Object.entries(labels).map(([value, label]) => ({
		value,
		label,
	}));
}
