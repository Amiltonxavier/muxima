export const EVENT_STATUS_LABELS: Record<string, string> = {
	DRAFT: "Rascunho",
	PLANNING: "Planeamento",
	CONFIRMED: "Confirmado",
	ONGOING: "A decorrer",
	COMPLETED: "Concluído",
	CANCELLED: "Cancelado",
};

export const EXPENSE_TYPE_LABELS: Record<string, string> = {
	EXPENSE: "Despesa",
	INCOME: "Receita",
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
	MAYBE: "Talvez",
	CANCELLED: "Cancelado",
};

export const TASK_STATUS_LABELS: Record<string, string> = {
	TODO: "Por fazer",
	IN_PROGRESS: "Em andamento",
	COMPLETED: "Concluído",
	CANCELLED: "Cancelado",
};

export const SUPPLIER_STATUS_LABELS: Record<string, string> = {
	PROSPECT: "Prospeto",
	CONTACTED: "Contactado",
	NEGOTIATING: "Em negociação",
	CONFIRMED: "Confirmado",
	COMPLETED: "Concluído",
	CANCELLED: "Cancelado",
};

/** Payment state of a supplier, resolved by the API. */
export const SUPPLIER_PAYMENT_STATUS_LABELS: Record<string, string> = {
	PENDING: "Por pagar",
	PAID: "Pago",
	INSTALLMENTS: "Em parcelas",
	OVERDUE: "Em atraso",
	CANCELLED: "Cancelado",
};

/** State of a single installment, resolved by the API. */
export const INSTALLMENT_STATUS_LABELS: Record<string, string> = {
	PENDING: "Por pagar",
	PAID: "Paga",
	OVERDUE: "Em atraso",
	CANCELLED: "Cancelada",
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

export const SUPPLIER_CATEGORY_LABELS: Record<string, string> = {
	VENUE: "Salão",
	DECORATION: "Decoração",
	FLORIST: "Flores",
	CATERING: "Catering",
	CAKE: "Bolo",
	SWEETS_AND_SAVOURIES: "Doces e salgados",
	PHOTOGRAPHER: "Fotografia",
	VIDEOGRAPHER: "Vídeo",
	DJ: "DJ",
	BAND: "Banda",
	MUSIC: "Música",
	ENTERTAINMENT: "Animação",
	TRANSPORT: "Transportes",
	BEAUTY: "Beleza",
	BRIDE_ATTIRE: "Vestido da noiva",
	GROOM_ATTIRE: "Traje do noivo",
	RINGS: "Alianças",
	WEDDING_PLANNER: "Planeamento",
	OFFICIANT: "Celebrante",
	FAVOURS: "Lembranças",
	ACCOMMODATION: "Alojamento",
	SECURITY: "Segurança",
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

export const INVENTORY_STATUS_LABELS: Record<string, string> = {
	PENDING: "Pendente",
	IN_PROGRESS: "Em curso",
	COMPLETED: "Concluído",
};

export const INVENTORY_CATEGORY_LABELS: Record<string, string> = {
	DRINK: "Bebidas",
	MATERIAL: "Materiais",
	EQUIPMENT: "Equipamento",
	FURNITURE: "Mobiliário",
	LINEN: "Loiça e têxteis",
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

export const COMPANION_STATUS_LABELS: Record<string, string> = {
	PENDING: "Pendente",
	CONFIRMED: "Confirmado",
	DECLINED: "Recusado",
};

export const INVITATION_STATUS_LABELS: Record<string, string> = {
	CREATED: "Criado",
	SENT: "Enviado",
	OPENED: "Aberto",
	RESPONDED: "Respondido",
	EXPIRED: "Expirado",
	CANCELLED: "Cancelado",
};

export const INVITATION_RESPONSE_LABELS: Record<string, string> = {
	CONFIRM: "Confirmado",
	DECLINE: "Recusado",
	MAYBE: "Talvez",
};

export const RSVP_STATUS_LABELS: Record<string, string> = {
	PENDING: "Sem resposta",
	CONFIRMED: "Confirmado",
	MAYBE: "Talvez",
	DECLINED: "Recusado",
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
	CONTRACT: "Contrato",
	RECEIPT: "Recibo",
	QUOTE: "Orçamento",
	OTHER: "Outro",
};

export const DEDICATION_TYPE_LABELS: Record<string, string> = {
	WEDDING_VOW: "Votos de casamento",
	ENGAGEMENT_VOW: "Votos de noivado",
	DEDICATION: "Dedicatória",
};

export const DEDICATION_STATUS_LABELS: Record<string, string> = {
	NOT_STARTED: "Por escrever",
	DRAFT: "Rascunho",
	IN_PROGRESS: "Em progresso",
	READY: "Pronto",
};

export const DEDICATION_VISIBILITY_LABELS: Record<string, string> = {
	PRIVATE: "Privada",
	SHARED: "Partilhada",
};

export function getStatusColor(status: string): string {
	const colors: Record<string, string> = {
		DRAFT: "bg-neutral-100 text-neutral-700",
		PLANNING: "bg-blue-50 text-blue-700",
		CONFIRMED: "bg-green-50 text-green-700",
		ONGOING: "bg-amber-50 text-amber-700",
		COMPLETED: "bg-emerald-50 text-emerald-700",
		CANCELLED: "bg-red-50 text-red-700",
		PLANNED: "bg-neutral-100 text-neutral-700",
		PARTIALLY_PAID: "bg-amber-50 text-amber-700",
		PAID: "bg-green-50 text-green-700",
		OVERDUE: "bg-red-50 text-red-700",
		PENDING: "bg-amber-50 text-amber-700",
		DECLINED: "bg-red-50 text-red-700",
		WAITING: "bg-blue-50 text-blue-700",
		MAYBE: "bg-yellow-50 text-yellow-700",
		RESPONDED: "bg-green-50 text-green-700",
		OPENED: "bg-blue-50 text-blue-700",
		SENT: "bg-neutral-100 text-neutral-700",
		CREATED: "bg-neutral-100 text-neutral-700",
		EXPIRED: "bg-neutral-200 text-neutral-600",
		TODO: "bg-neutral-100 text-neutral-700",
		IN_PROGRESS: "bg-blue-50 text-blue-700",
		PROSPECT: "bg-neutral-100 text-neutral-700",
		CONTACTED: "bg-blue-50 text-blue-700",
		NEGOTIATING: "bg-amber-50 text-amber-700",
		NOT_STARTED: "bg-neutral-100 text-neutral-700",
		READY: "bg-emerald-50 text-emerald-700",
		PRIVATE: "bg-neutral-100 text-neutral-700",
		SHARED: "bg-blue-50 text-blue-700",
	};
	return colors[status] || "bg-neutral-100 text-neutral-700";
}

export function getStatusLabel(
	status: string,
	type:
		| "event"
		| "guest"
		| "task"
		| "supplier"
		| "supplierPayment"
		| "installment"
		| "role"
		| "document"
		| "inventory"
		| "dedication",
): string {
	const labels: Record<string, Record<string, string>> = {
		event: EVENT_STATUS_LABELS,
		guest: GUEST_STATUS_LABELS,
		task: TASK_STATUS_LABELS,
		supplier: SUPPLIER_STATUS_LABELS,
		supplierPayment: SUPPLIER_PAYMENT_STATUS_LABELS,
		installment: INSTALLMENT_STATUS_LABELS,
		role: MEMBER_ROLE_LABELS,
		document: { ACTIVE: "Ativo", ARCHIVED: "Arquivado", DELETED: "Eliminado" },
		inventory: INVENTORY_STATUS_LABELS,
		dedication: DEDICATION_STATUS_LABELS,
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
