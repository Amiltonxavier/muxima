/**
 * Human-readable (pt-PT) labels for every persisted enum.
 *
 * Reports must never print raw enum keys such as `IN_PROGRESS`. The frontend has
 * its own copy for table cells; this is the backend copy, and it is the only one
 * used by the export layer so a report can never disagree with itself.
 */

export const EVENT_STATUS_LABELS: Record<string, string> = {
	DRAFT: "Rascunho",
	PLANNING: "Em planeamento",
	CONFIRMED: "Confirmado",
	ONGOING: "Em curso",
	COMPLETED: "Concluído",
	CANCELLED: "Cancelado",
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
	ENGAGEMENT: "Noivado",
	WEDDING: "Casamento",
	BIRTHDAY: "Aniversário",
	CONFERENCE: "Conferência",
	WORKSHOP: "Workshop",
	GRADUATION: "Graduação",
	DINNER: "Jantar",
	CORPORATE: "Corporativo",
	BABY_SHOWER: "Baby Shower",
	CEREMONY: "Cerimónia",
	PARTY: "Festa",
};

export const GUEST_STATUS_LABELS: Record<string, string> = {
	PENDING: "Pendente",
	CONFIRMED: "Confirmado",
	DECLINED: "Recusado",
	WAITING: "Em espera",
	MAYBE: "Talvez",
	CANCELLED: "Cancelado",
};

export const GUEST_TYPE_LABELS: Record<string, string> = {
	FAMILY: "Família",
	FRIEND: "Amigo",
	COLLEAGUE: "Colega",
	VIP: "VIP",
	OTHER: "Outro",
};

export const COMPANION_STATUS_LABELS: Record<string, string> = {
	PENDING: "Pendente",
	CONFIRMED: "Confirmado",
	DECLINED: "Recusado",
};

export const RSVP_STATUS_LABELS: Record<string, string> = {
	PENDING: "Pendente",
	CONFIRMED: "Confirmou",
	MAYBE: "Talvez",
	DECLINED: "Recusou",
};

export const INVITATION_STATUS_LABELS: Record<string, string> = {
	CREATED: "Criado",
	SENT: "Enviado",
	OPENED: "Aberto",
	RESPONDED: "Respondido",
	EXPIRED: "Expirado",
	CANCELLED: "Cancelado",
};

export const SUPPLIER_STATUS_LABELS: Record<string, string> = {
	PROSPECT: "Potencial",
	CONTACTED: "Contactado",
	NEGOTIATING: "Em negociação",
	CONFIRMED: "Confirmado",
	COMPLETED: "Concluído",
	CANCELLED: "Cancelado",
};

export const SUPPLIER_PAYMENT_STATUS_LABELS: Record<string, string> = {
	PENDING: "Pendente",
	PAID: "Pago",
	INSTALLMENTS: "Parcelado",
	OVERDUE: "Em atraso",
	CANCELLED: "Cancelado",
};

export const SUPPLIER_CATEGORY_LABELS: Record<string, string> = {
	VENUE: "Espaço",
	CATERING: "Catering",
	CAKE: "Bolo",
	SWEETS_AND_SAVOURIES: "Doces e salgados",
	DECORATION: "Decoração",
	FLORIST: "Florista",
	PHOTOGRAPHER: "Fotógrafo",
	VIDEOGRAPHER: "Videógrafo",
	DJ: "DJ",
	BAND: "Banda",
	MUSIC: "Música",
	ENTERTAINMENT: "Entretenimento",
	TRANSPORT: "Transporte",
	BEAUTY: "Beleza",
	BRIDE_ATTIRE: "Vestido da noiva",
	GROOM_ATTIRE: "Traje do noivo",
	RINGS: "Alianças",
	WEDDING_PLANNER: "Organizador",
	OFFICIANT: "Celebrante",
	FAVOURS: "Lembranças",
	ACCOMMODATION: "Alojamento",
	SECURITY: "Segurança",
	OTHER: "Outro",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
	CASH: "Numerário",
	BANK_TRANSFER: "Transferência bancária",
	ATM: "ATM",
	CARD: "Cartão",
	MOBILE_PAYMENT: "Pagamento móvel",
	MULTICAIXA_EXPRESS: "Multicaixa Express",
	OTHER: "Outro",
};

export const TASK_STATUS_LABELS: Record<string, string> = {
	TODO: "Por fazer",
	IN_PROGRESS: "Em progresso",
	COMPLETED: "Concluída",
	CANCELLED: "Cancelada",
};

export const TASK_PRIORITY_LABELS: Record<string, string> = {
	LOW: "Baixa",
	MEDIUM: "Média",
	HIGH: "Alta",
	URGENT: "Urgente",
};

export const TASK_CATEGORY_LABELS: Record<string, string> = {
	FINANCE: "Finanças",
	VENUE: "Espaço",
	GUESTS: "Convidados",
	FOOD: "Comida",
	DRINKS: "Bebidas",
	DECORATION: "Decoração",
	CEREMONY: "Cerimónia",
	DOCUMENTS: "Documentos",
	CLOTHING: "Roupa",
	TRANSPORT: "Transporte",
	OTHER: "Outro",
};

export const SCHEDULE_STATUS_LABELS: Record<string, string> = {
	PENDING: "Pendente",
	IN_PROGRESS: "Em curso",
	COMPLETED: "Concluída",
	CANCELLED: "Cancelada",
};

export const CHECKLIST_STATUS_LABELS: Record<string, string> = {
	PENDING: "Pendente",
	IN_PROGRESS: "Em progresso",
	COMPLETED: "Concluído",
	CANCELLED: "Cancelado",
};

export const INVENTORY_STATUS_LABELS: Record<string, string> = {
	PENDING: "Pendente",
	IN_PROGRESS: "Em progresso",
	COMPLETED: "Concluído",
};

export const INVENTORY_CATEGORY_LABELS: Record<string, string> = {
	DRINK: "Bebida",
	MATERIAL: "Material",
	EQUIPMENT: "Equipamento",
	FURNITURE: "Mobiliário",
	LINEN: "Linho",
	OTHER: "Outro",
};

export const INVENTORY_UNIT_LABELS: Record<string, string> = {
	UNIT: "unidade",
	BOX: "caixa",
	CASE: "estojo",
	BOTTLE: "garrafa",
	KG: "kg",
	LITER: "litro",
	PACKAGE: "pacote",
	OTHER: "outro",
};

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
	PURCHASE: "Compra",
	ADD: "Adição",
	CONSUMPTION: "Consumo",
	ADJUSTMENT: "Ajuste",
	LOSS: "Perda",
	RETURN: "Devolução",
};

export const FOOD_PLAN_CATEGORY_LABELS: Record<string, string> = {
	STARTER: "Entradas",
	MAIN_COURSE: "Pratos principais",
	SIDE_DISH: "Acompanhamentos",
	DESSERT: "Sobremesas",
	FRUIT: "Frutas",
	OTHER: "Outros",
};

export const FOOD_PLAN_STATUS_LABELS: Record<string, string> = {
	PENDING: "Pendente",
	IN_PROGRESS: "Em progresso",
	COMPLETED: "Concluído",
};

export const FOOD_PLAN_UNIT_LABELS: Record<string, string> = {
	UNIT: "unidade",
	PLATE: "prato",
	BOWL: "tigela",
	PORTION: "porção",
	GRAM: "grama",
	KILOGRAM: "quilo",
	LITER: "litro",
	GLASS: "copo",
	BOTTLE: "garrafa",
	PACKAGE: "pacote",
	OTHER: "outro",
};

export const DEDICATION_STATUS_LABELS: Record<string, string> = {
	NOT_STARTED: "Por começar",
	DRAFT: "Rascunho",
	IN_PROGRESS: "Em escrita",
	READY: "Pronto",
};

export const DEDICATION_TYPE_LABELS: Record<string, string> = {
	WEDDING_VOW: "Votos de casamento",
	ENGAGEMENT_VOW: "Votos de noivado",
	DEDICATION: "Dedicação",
};

export const MEMBER_ROLE_LABELS: Record<string, string> = {
	OWNER: "Proprietário",
	PARTNER: "Parceiro",
	ADMIN: "Administrador",
	EDITOR: "Editor",
	VIEWER: "Observador",
};

/** Falls back to the raw key so an unknown value is still traceable. */
export function label(
	labels: Record<string, string>,
	value: string | null | undefined,
): string {
	if (!value) return "—";
	return labels[value] ?? value;
}

export const labelEventStatus = (value?: string | null) =>
	label(EVENT_STATUS_LABELS, value);
export const labelEventType = (value?: string | null) =>
	label(EVENT_TYPE_LABELS, value);
export const labelGuestStatus = (value?: string | null) =>
	label(GUEST_STATUS_LABELS, value);
export const labelGuestType = (value?: string | null) =>
	label(GUEST_TYPE_LABELS, value);
export const labelRsvpStatus = (value?: string | null) =>
	label(RSVP_STATUS_LABELS, value);
export const labelSupplierStatus = (value?: string | null) =>
	label(SUPPLIER_STATUS_LABELS, value);
export const labelPaymentStatus = (value?: string | null) =>
	label(SUPPLIER_PAYMENT_STATUS_LABELS, value);
export const labelSupplierCategory = (value?: string | null) =>
	label(SUPPLIER_CATEGORY_LABELS, value);
export const labelTaskStatus = (value?: string | null) =>
	label(TASK_STATUS_LABELS, value);
export const labelTaskPriority = (value?: string | null) =>
	label(TASK_PRIORITY_LABELS, value);
export const labelTaskCategory = (value?: string | null) =>
	label(TASK_CATEGORY_LABELS, value);
export const labelScheduleStatus = (value?: string | null) =>
	label(SCHEDULE_STATUS_LABELS, value);
export const labelChecklistStatus = (value?: string | null) =>
	label(CHECKLIST_STATUS_LABELS, value);
export const labelInventoryStatus = (value?: string | null) =>
	label(INVENTORY_STATUS_LABELS, value);
export const labelInventoryCategory = (value?: string | null) =>
	label(INVENTORY_CATEGORY_LABELS, value);
export const labelInventoryUnit = (value?: string | null) =>
	label(INVENTORY_UNIT_LABELS, value);
export const labelFoodPlanStatus = (value?: string | null) =>
	label(FOOD_PLAN_STATUS_LABELS, value);
export const labelFoodPlanCategory = (value?: string | null) =>
	label(FOOD_PLAN_CATEGORY_LABELS, value);
export const labelFoodPlanUnit = (value?: string | null) =>
	label(FOOD_PLAN_UNIT_LABELS, value);
export const labelDedicationStatus = (value?: string | null) =>
	label(DEDICATION_STATUS_LABELS, value);
export const labelDedicationType = (value?: string | null) =>
	label(DEDICATION_TYPE_LABELS, value);
export const labelMemberRole = (value?: string | null) =>
	label(MEMBER_ROLE_LABELS, value);
export const labelInvitationStatus = (value?: string | null) =>
	label(INVITATION_STATUS_LABELS, value);
export const labelPaymentMethod = (value?: string | null) =>
	label(PAYMENT_METHOD_LABELS, value);
export const labelMovementType = (value?: string | null) =>
	label(MOVEMENT_TYPE_LABELS, value);
export const labelCompanionStatus = (value?: string | null) =>
	label(COMPANION_STATUS_LABELS, value);
