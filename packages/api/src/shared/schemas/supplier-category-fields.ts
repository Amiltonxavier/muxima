import { z } from "zod";

/**
 * Per-category dynamic fields for suppliers.
 *
 * A supplier's extra data is not a single flat shape: a photographer needs
 * coverage hours and an album, a caterer needs a menu and servings. This module
 * declares those shapes once, validates them on write, and exposes a machine
 * readable spec (`SUPPLIER_CATEGORY_FIELDS`) so the frontend renders the form
 * from the same source instead of duplicating the list.
 */

const optionalText = z.string().trim().min(1).optional();
const optionalNumber = z.number().nonnegative().optional();
const optionalDate = z.coerce.date().optional();
const textList = z.array(z.string().trim().min(1)).optional();

const sweetsAndSavouriesItem = z.strictObject({
	name: z.string().trim().min(1),
	quantity: z.number().positive(),
	unit: z.string().trim().min(1).optional(),
});

// ── Per-category shapes ──────────────────────────────────────────

const venueFields = z.strictObject({
	capacity: optionalNumber,
	indoor: z.boolean().optional(),
	outdoor: z.boolean().optional(),
	parkingSpaces: optionalNumber,
	includedServices: textList,
});

const cateringFields = z.strictObject({
	menu: optionalText,
	servings: optionalNumber,
	serviceStyle: z
		.enum(["BUFFET", "PLATED", "FAMILY_STYLE", "STATIONS", "OTHER"])
		.optional(),
	dietaryOptions: textList,
	staffIncluded: z.boolean().optional(),
});

const cakeFields = z.strictObject({
	tiers: optionalNumber,
	flavours: textList,
	filling: textList,
	design: optionalText,
	allergens: textList,
});

const sweetsAndSavouriesFields = z.strictObject({
	products: z.array(sweetsAndSavouriesItem).optional(),
	presentationStyle: optionalText,
	allergens: textList,
});

const decorationFields = z.strictObject({
	decorStyle: optionalText,
	colourScheme: textList,
	items: textList,
	setupIncluded: z.boolean().optional(),
	dismantlingIncluded: z.boolean().optional(),
});

const floristFields = z.strictObject({
	flowerTypes: textList,
	arrangements: textList,
	deliveryDate: optionalDate,
});

const photographerFields = z.strictObject({
	coverageHours: optionalNumber,
	photoCount: optionalNumber,
	albumIncluded: z.boolean().optional(),
	deliveryTime: optionalText,
	additionalSessions: optionalNumber,
});

const videographerFields = z.strictObject({
	coverageHours: optionalNumber,
	resolution: z.enum(["HD", "FULL_HD", "UHD", "CINEMATIC"]).optional(),
	droneIncluded: z.boolean().optional(),
	liveStream: z.boolean().optional(),
	sameDayEdit: z.boolean().optional(),
	deliverables: textList,
});

const djFields = z.strictObject({
	equipment: textList,
	musicStyle: textList,
	durationHours: optionalNumber,
	soundSystemProvided: z.boolean().optional(),
	mc: z.boolean().optional(),
});

const bandFields = z.strictObject({
	bandSize: optionalNumber,
	instruments: textList,
	repertoire: textList,
	durationHours: optionalNumber,
	rehearsalIncluded: z.boolean().optional(),
});

const musicFields = z.strictObject({
	format: z.enum(["DJ", "BAND", "DUO", "SOLO", "OTHER"]).optional(),
	genres: textList,
	durationHours: optionalNumber,
});

const transportFields = z.strictObject({
	vehicleType: optionalText,
	capacity: optionalNumber,
	route: optionalText,
	distanceKm: optionalNumber,
	driverIncluded: z.boolean().optional(),
	decorated: z.boolean().optional(),
});

const beautyFields = z.strictObject({
	serviceType: textList,
	artist: optionalText,
	durationHours: optionalNumber,
	trialSession: z.boolean().optional(),
	worksOnSite: z.boolean().optional(),
});

const brideAttireFields = z.strictObject({
	dressMaker: optionalText,
	dressType: optionalText,
	size: optionalText,
	alterationsIncluded: z.boolean().optional(),
	fittingDate: optionalDate,
});

const groomAttireFields = z.strictObject({
	tailor: optionalText,
	suitType: optionalText,
	size: optionalText,
	alterationsIncluded: z.boolean().optional(),
	fittingDate: optionalDate,
});

const ringsFields = z.strictObject({
	metal: optionalText,
	stoneType: optionalText,
	ringSize: optionalText,
	engraving: z.boolean().optional(),
	engravingText: optionalText,
});

const weddingPlannerFields = z.strictObject({
	planningHours: optionalNumber,
	servicesIncluded: textList,
	onSiteDayOf: z.boolean().optional(),
	coordination: optionalText,
});

const officiantFields = z.strictObject({
	ceremonyType: textList,
	languages: textList,
	yearsExperience: optionalNumber,
	religiousAffiliation: optionalText,
});

const favoursFields = z.strictObject({
	quantity: optionalNumber,
	packaging: optionalText,
	personalised: z.boolean().optional(),
	contentDescription: textList,
});

const accommodationFields = z.strictObject({
	rooms: optionalNumber,
	nights: optionalNumber,
	guests: optionalNumber,
	breakfastIncluded: z.boolean().optional(),
	transportIncluded: z.boolean().optional(),
});

const securityFields = z.strictObject({
	guards: optionalNumber,
	hours: optionalNumber,
	equipment: textList,
	uniformed: z.boolean().optional(),
	armed: z.boolean().optional(),
});

const entertainmentFields = z.strictObject({
	acts: textList,
	durationHours: optionalNumber,
	audienceInteraction: z.boolean().optional(),
});

const otherFields = z.strictObject({
	extras: textList,
});

// ── Discriminated union, keyed by supplier category ──────────────

export const supplierCategoryFieldsSchema = z.discriminatedUnion("category", [
	z.strictObject({ category: z.literal("VENUE"), fields: venueFields }),
	z.strictObject({ category: z.literal("CATERING"), fields: cateringFields }),
	z.strictObject({ category: z.literal("CAKE"), fields: cakeFields }),
	z.strictObject({
		category: z.literal("SWEETS_AND_SAVOURIES"),
		fields: sweetsAndSavouriesFields,
	}),
	z.strictObject({
		category: z.literal("DECORATION"),
		fields: decorationFields,
	}),
	z.strictObject({ category: z.literal("FLORIST"), fields: floristFields }),
	z.strictObject({
		category: z.literal("PHOTOGRAPHER"),
		fields: photographerFields,
	}),
	z.strictObject({
		category: z.literal("VIDEOGRAPHER"),
		fields: videographerFields,
	}),
	z.strictObject({ category: z.literal("DJ"), fields: djFields }),
	z.strictObject({ category: z.literal("BAND"), fields: bandFields }),
	z.strictObject({ category: z.literal("MUSIC"), fields: musicFields }),
	z.strictObject({
		category: z.literal("ENTERTAINMENT"),
		fields: entertainmentFields,
	}),
	z.strictObject({ category: z.literal("TRANSPORT"), fields: transportFields }),
	z.strictObject({ category: z.literal("BEAUTY"), fields: beautyFields }),
	z.strictObject({
		category: z.literal("BRIDE_ATTIRE"),
		fields: brideAttireFields,
	}),
	z.strictObject({
		category: z.literal("GROOM_ATTIRE"),
		fields: groomAttireFields,
	}),
	z.strictObject({ category: z.literal("RINGS"), fields: ringsFields }),
	z.strictObject({
		category: z.literal("WEDDING_PLANNER"),
		fields: weddingPlannerFields,
	}),
	z.strictObject({ category: z.literal("OFFICIANT"), fields: officiantFields }),
	z.strictObject({ category: z.literal("FAVOURS"), fields: favoursFields }),
	z.strictObject({
		category: z.literal("ACCOMMODATION"),
		fields: accommodationFields,
	}),
	z.strictObject({ category: z.literal("SECURITY"), fields: securityFields }),
	z.strictObject({ category: z.literal("OTHER"), fields: otherFields }),
]);

export type SupplierCategoryFieldsInput = z.input<
	typeof supplierCategoryFieldsSchema
>;

/**
 * Validates a payload for a given category. Returns the parsed object, or
 * `null` when the supplier carries no category data at all.
 */
export function parseSupplierCategoryFields(
	category: string,
	payload: unknown,
): Record<string, unknown> | null {
	if (payload === null || payload === undefined) return null;
	const parsed = supplierCategoryFieldsSchema.safeParse({
		category,
		fields: payload,
	});
	if (!parsed.success) {
		throw new Error(
			`Campos inválidos para a categoria ${category}: ${parsed.error.issues
				.map((i) => `${i.path.join(".")} ${i.message}`)
				.join("; ")}`,
		);
	}
	return parsed.data.fields as Record<string, unknown>;
}

// ── Field spec, served to the frontend ───────────────────────────

export type SupplierFieldSpec = {
	name: string;
	label: string;
	type: "text" | "textarea" | "number" | "boolean" | "date" | "tags" | "items";
	placeholder?: string;
	required?: boolean;
};

export type SupplierCategorySpec = {
	category: string;
	label: string;
	fields: SupplierFieldSpec[];
};

const field = (
	name: string,
	label: string,
	type: SupplierFieldSpec["type"],
	extra: Partial<SupplierFieldSpec> = {},
): SupplierFieldSpec => ({ name, label, type, ...extra });

/**
 * Single source of truth for the dynamic form. The frontend renders these
 * fields, so adding a field here is enough to make it appear in the UI.
 */
export const SUPPLIER_CATEGORY_FIELDS: Record<string, SupplierCategorySpec> = {
	VENUE: {
		category: "VENUE",
		label: "Espaço",
		fields: [
			field("capacity", "Capacidade", "number"),
			field("indoor", "Interior", "boolean"),
			field("outdoor", "Exterior", "boolean"),
			field("parkingSpaces", "Estacionamentos", "number"),
			field("includedServices", "Serviços incluídos", "tags"),
		],
	},
	CATERING: {
		category: "CATERING",
		label: "Buffet",
		fields: [
			field("menu", "Menu", "textarea"),
			field("servings", "Refeições", "number"),
			field("serviceStyle", "Estilo de serviço", "text", {
				placeholder: "BUFFET, PLATED, FAMILY_STYLE, STATIONS",
			}),
			field("dietaryOptions", "Opções alimentares", "tags"),
			field("staffIncluded", "Equipa incluída", "boolean"),
		],
	},
	CAKE: {
		category: "CAKE",
		label: "Bolo",
		fields: [
			field("tiers", "Andares", "number"),
			field("flavours", "Sabores", "tags"),
			field("filling", "Recheios", "tags"),
			field("design", "Design", "text"),
			field("allergens", "Alérgenos", "tags"),
		],
	},
	SWEETS_AND_SAVOURIES: {
		category: "SWEETS_AND_SAVOURIES",
		label: "Doces e salgados",
		fields: [
			field("products", "Produtos", "items"),
			field("presentationStyle", "Embalagem", "text"),
			field("allergens", "Alérgenos", "tags"),
		],
	},
	DECORATION: {
		category: "DECORATION",
		label: "Decoração",
		fields: [
			field("decorStyle", "Estilo", "text"),
			field("colourScheme", "Paleta de cores", "tags"),
			field("items", "Itens incluídos", "tags"),
			field("setupIncluded", "Montagem incluída", "boolean"),
			field("dismantlingIncluded", "Desmontagem incluída", "boolean"),
		],
	},
	FLORIST: {
		category: "FLORIST",
		label: "Florista",
		fields: [
			field("flowerTypes", "Tipos de flor", "tags"),
			field("arrangements", "Arranjos", "tags"),
			field("deliveryDate", "Data de entrega", "date"),
		],
	},
	PHOTOGRAPHER: {
		category: "PHOTOGRAPHER",
		label: "Fotógrafo",
		fields: [
			field("coverageHours", "Horas de cobertura", "number"),
			field("photoCount", "Nº de fotografias", "number"),
			field("albumIncluded", "Álbum incluído", "boolean"),
			field("deliveryTime", "Prazo de entrega", "text"),
			field("additionalSessions", "Sessões adicionais", "number"),
		],
	},
	VIDEOGRAPHER: {
		category: "VIDEOGRAPHER",
		label: "Videomaker",
		fields: [
			field("coverageHours", "Horas de cobertura", "number"),
			field("resolution", "Resolução", "text", {
				placeholder: "HD, FULL_HD, UHD, CINEMATIC",
			}),
			field("droneIncluded", "Drone incluído", "boolean"),
			field("liveStream", "Transmissão em direto", "boolean"),
			field("sameDayEdit", "Edição no mesmo dia", "boolean"),
			field("deliverables", "Entregas", "tags"),
		],
	},
	DJ: {
		category: "DJ",
		label: "DJ",
		fields: [
			field("equipment", "Equipamento", "tags"),
			field("musicStyle", "Estilos musicais", "tags"),
			field("durationHours", "Duração (horas)", "number"),
			field("soundSystemProvided", "Sistema de som", "boolean"),
			field("mc", "Mestre de cerimónias", "boolean"),
		],
	},
	BAND: {
		category: "BAND",
		label: "Banda",
		fields: [
			field("bandSize", "Dimensão da banda", "number"),
			field("instruments", "Instrumentos", "tags"),
			field("repertoire", "Repertório", "tags"),
			field("durationHours", "Duração (horas)", "number"),
			field("rehearsalIncluded", "Ensaio incluído", "boolean"),
		],
	},
	MUSIC: {
		category: "MUSIC",
		label: "Música",
		fields: [
			field("format", "Formato", "text", {
				placeholder: "DJ, BAND, DUO, SOLO, OTHER",
			}),
			field("genres", "Géneros", "tags"),
			field("durationHours", "Duração (horas)", "number"),
		],
	},
	ENTERTAINMENT: {
		category: "ENTERTAINMENT",
		label: "Entretenimento",
		fields: [
			field("acts", "Atrações", "tags"),
			field("durationHours", "Duração (horas)", "number"),
			field("audienceInteraction", "Interação com o público", "boolean"),
		],
	},
	TRANSPORT: {
		category: "TRANSPORT",
		label: "Transporte",
		fields: [
			field("vehicleType", "Tipo de viatura", "text"),
			field("capacity", "Capacidade", "number"),
			field("route", "Percurso", "text"),
			field("distanceKm", "Distância (km)", "number"),
			field("driverIncluded", "Motorista incluído", "boolean"),
			field("decorated", "Decorada", "boolean"),
		],
	},
	BEAUTY: {
		category: "BEAUTY",
		label: "Beleza",
		fields: [
			field("serviceType", "Serviços", "tags"),
			field("artist", "Artista", "text"),
			field("durationHours", "Duração (horas)", "number"),
			field("trialSession", "Sessão de teste", "boolean"),
			field("worksOnSite", "Desloca-se ao local", "boolean"),
		],
	},
	BRIDE_ATTIRE: {
		category: "BRIDE_ATTIRE",
		label: "Vestido da noiva",
		fields: [
			field("dressMaker", "Alfaiataria", "text"),
			field("dressType", "Tipo de vestido", "text"),
			field("size", "Tamanho", "text"),
			field("alterationsIncluded", "Ajustes incluídos", "boolean"),
			field("fittingDate", "Data da prova", "date"),
		],
	},
	GROOM_ATTIRE: {
		category: "GROOM_ATTIRE",
		label: "Traje do noivo",
		fields: [
			field("tailor", "Alfaiataria", "text"),
			field("suitType", "Tipo de traje", "text"),
			field("size", "Tamanho", "text"),
			field("alterationsIncluded", "Ajustes incluídos", "boolean"),
			field("fittingDate", "Data da prova", "date"),
		],
	},
	RINGS: {
		category: "RINGS",
		label: "Alianças",
		fields: [
			field("metal", "Metal", "text"),
			field("stoneType", "Pedra", "text"),
			field("ringSize", "Tamanho", "text"),
			field("engraving", "Gravação", "boolean"),
			field("engravingText", "Texto da gravação", "text"),
		],
	},
	WEDDING_PLANNER: {
		category: "WEDDING_PLANNER",
		label: "Organizador",
		fields: [
			field("planningHours", "Horas de planeamento", "number"),
			field("servicesIncluded", "Serviços incluídos", "tags"),
			field("onSiteDayOf", "Presente no dia", "boolean"),
			field("coordination", "Coordenação", "textarea"),
		],
	},
	OFFICIANT: {
		category: "OFFICIANT",
		label: "Celebrante",
		fields: [
			field("ceremonyType", "Tipo de cerimónia", "tags"),
			field("languages", "Idiomas", "tags"),
			field("yearsExperience", "Anos de experiência", "number"),
			field("religiousAffiliation", "Religião", "text"),
		],
	},
	FAVOURS: {
		category: "FAVOURS",
		label: "Lembranças",
		fields: [
			field("quantity", "Quantidade", "number"),
			field("packaging", "Embalagem", "text"),
			field("personalised", "Personalizadas", "boolean"),
			field("contentDescription", "Conteúdo", "tags"),
		],
	},
	ACCOMMODATION: {
		category: "ACCOMMODATION",
		label: "Alojamento",
		fields: [
			field("rooms", "Quartos", "number"),
			field("nights", "Noites", "number"),
			field("guests", "Hóspedes", "number"),
			field("breakfastIncluded", "Pequeno-almoço incluído", "boolean"),
			field("transportIncluded", "Transporte incluído", "boolean"),
		],
	},
	SECURITY: {
		category: "SECURITY",
		label: "Segurança",
		fields: [
			field("guards", "Seguranças", "number"),
			field("hours", "Horas", "number"),
			field("equipment", "Equipamento", "tags"),
			field("uniformed", "Uniformizados", "boolean"),
			field("armed", "Armados", "boolean"),
		],
	},
	OTHER: {
		category: "OTHER",
		label: "Outro",
		fields: [field("extras", "Detalhes", "tags")],
	},
};

/** Categories that own a dedicated dynamic form, in display order. */
export const SUPPLIER_CATEGORY_ORDER = Object.keys(SUPPLIER_CATEGORY_FIELDS);
