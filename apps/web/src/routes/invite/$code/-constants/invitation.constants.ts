import { Check, Clock, X } from "lucide-react";

export const MONTHS_PT = [
	"janeiro",
	"fevereiro",
	"março",
	"abril",
	"maio",
	"junho",
	"julho",
	"agosto",
	"setembro",
	"outubro",
	"novembro",
	"dezembro",
];

export const EVENT_TYPE_LABELS: Record<string, string> = {
	WEDDING: "Casamento",
	ENGAGEMENT: "Noivado",
	PARTY: "Festa",
	DINNER: "Jantar",
	CEREMONY: "Celebração",
	BIRTHDAY: "Aniversário",
	BABY_SHOWER: "Chá de bebé",
	GRADUATION: "Formatura",
	CORPORATE: "Evento",
	CONFERENCE: "Conferência",
	WORKSHOP: "Workshop",
};

export const RSVP_OPTIONS = [
	{
		value: "CONFIRM",
		label: "Confirmo a minha presença",
		description: "Conto contigo neste dia especial.",
		icon: Check,
	},
	{
		value: "MAYBE",
		label: "Fico por confirmar",
		description: "Ainda estou a decidir.",
		icon: Clock,
	},
	{
		value: "DECLINE",
		label: "Não vou conseguir ir",
		description: "Com muita pena, não estarei presente.",
		icon: X,
	},
] as const;

export type RsvpOptionValue = (typeof RSVP_OPTIONS)[number]["value"];
