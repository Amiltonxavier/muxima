

export const MOVEMENT_TYPE_OPTIONS = [
	{ value: "PURCHASE", label: "Compra" },
	{ value: "ADD", label: "Adição" },
	{ value: "CONSUMPTION", label: "Consumo" },
	{ value: "ADJUSTMENT", label: "Ajuste" },
	{ value: "LOSS", label: "Perda" },
	{ value: "RETURN", label: "Devolução" },
];

export const ACTION_TYPES_EVENT = {
	UPDATE: 'update',
	DELETE: 'delete',
	MOVIMENT: 'moviment',
	VIEW: 'view'
} as const

