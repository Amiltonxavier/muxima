/**
 * Format-agnostic report model.
 *
 * A report module returns a `ReportDefinition`; the PDF and the XLSX layouts
 * each render it. This is what keeps a module from growing a second, divergent
 * "spreadsheet version" of its own numbers — there is only one description of
 * the report, and two renderers.
 */

export type ReportColumnType =
	| "text"
	| "money"
	| "number"
	| "percent"
	| "date"
	| "datetime"
	| "time";

export type ReportColumnAlign = "left" | "right" | "center";

export type ReportColumn = {
	header: string;
	/** Key read from each row object. */
	key: string;
	type?: ReportColumnType;
	align?: ReportColumnAlign;
	/**
	 * Relative width weight. Columns share the printable width proportionally, so
	 * no module has to know the page geometry.
	 */
	weight?: number;
};

export type ReportRow = Record<
	string,
	string | number | Date | null | undefined
>;

/** A highlighted row rendered as a totals/aggregate line. */
export type ReportTotals = {
	label: string;
	values: Record<string, string | number | Date | null | undefined>;
};

export type ReportKpi = {
	label: string;
	value: string;
	hint?: string;
};

export type ReportPair = {
	label: string;
	value: string;
};

/**
 * A raster image embedded in the report (currently only the invitation QR
 * Code). The payload is base64 without the data-URL prefix so each renderer can
 * hand it to its own encoder untouched.
 */
export type ReportImage = {
	data: string;
	format: "png" | "jpeg";
	/** Rendered size; points in the PDF, pixels in the XLSX. */
	width: number;
	height: number;
	/** Text alternative. Never blank — the PDF/XLSX carry no other description. */
	alt: string;
	caption?: string;
};

export type ReportSection =
	| {
			kind: "kpis";
			title?: string;
			items: ReportKpi[];
	  }
	| {
			kind: "pairs";
			title?: string;
			items: ReportPair[];
	  }
	| {
			kind: "table";
			title?: string;
			description?: string;
			columns: ReportColumn[];
			rows: ReportRow[];
			totals?: ReportTotals;
			/** Rendered instead of an empty table body when there are no rows. */
			emptyMessage?: string;
			/** Sheet name hint for the XLSX layout (tables become sheets). */
			sheetName?: string;
	  }
	| {
			kind: "paragraphs";
			title?: string;
			paragraphs: string[];
	  }
	| {
			kind: "image";
			title?: string;
			image: ReportImage;
	  }
	| {
			kind: "pageBreak";
	  };

export type ReportDefinition = {
	/** Document title, e.g. "Relatório de Orçamento". */
	title: string;
	/** Optional one-line subtitle under the title. */
	subtitle?: string;
	sections: ReportSection[];
};
