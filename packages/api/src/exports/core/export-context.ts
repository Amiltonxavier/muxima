import type { ExportFormat } from "./export-file-name";

/**
 * Everything a layout needs that is not report-specific: who is exporting,
 * which event, when, and which filters produced the numbers.
 *
 * Both the PDF and the XLSX layout read from this same object, so the two
 * formats can never disagree on the metadata block.
 */
export type ExportEventInfo = {
	id: string;
	name: string;
	type: string;
	status: string;
	eventDate: Date | null;
	startTime: string | null;
	endTime: string | null;
	venueName: string | null;
	address: string | null;
	municipality: string | null;
	province: string | null;
	capacity: number | null;
	currency: string;
};

export type ExportActor = {
	id: string;
	name: string;
	email?: string | null;
};

export type ExportMetaEntry = {
	label: string;
	value: string;
};

export type ExportContext = {
	/** Report title as shown to a human, e.g. "Relatório de Orçamento". */
	reportName: string;
	format: ExportFormat;
	generatedAt: Date;
	actor: ExportActor;
	/**
	 * `null` only for public exports (the invitation PDF), where no event is
	 * owned by the requester.
	 */
	event: ExportEventInfo | null;
	/** Free-form period, filters and extra context rendered in the header. */
	meta?: ExportMetaEntry[];
	/** Hides the "Exportado por" line — only for anonymous public exports. */
	anonymous?: boolean;
};

export const MUXIMA_BRAND = "MUXIMA";

/** Header metadata block: always the report, the event and the export stamp. */
export function buildContextMeta(context: ExportContext): ExportMetaEntry[] {
	const meta: ExportMetaEntry[] = [];

	if (context.event) {
		meta.push({ label: "Evento", value: context.event.name });
		meta.push({ label: "Estado", value: context.event.status });
	}

	meta.push({ label: "Data de exportação", value: "" }); // filled by layout

	for (const entry of context.meta ?? []) {
		meta.push(entry);
	}

	return meta;
}
