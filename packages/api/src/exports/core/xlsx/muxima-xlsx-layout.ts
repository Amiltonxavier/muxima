import ExcelJS from "exceljs";
import { type ExportContext, MUXIMA_BRAND } from "../export-context";
import { formatDateTime, sanitizeText } from "../format";
import type {
	ReportColumn,
	ReportDefinition,
	ReportRow,
	ReportSection,
} from "../report-definition";

/**
 * Default Muxima XLSX layout.
 *
 * Every report becomes one sheet per table plus a summary sheet that carries the
 * Muxima identity block. The summary sheet is always first, so opening the file
 * immediately shows who exported what, when, for which event.
 */

const GOLD = "FFB89B5E";
const GOLD_SOFT = "FFFAF8F1";
const INK = "FF1F1F1F";
const MUTED = "FF666666";
const PAPER = "FFFAFAF8";
const HAIRLINE = "FFE2DED4";

const FONT = "Calibri";

const SUMMARY_SHEET = "Resumo";
const MONEY_FORMAT = '#,##0.00 "Kz"';
const NUMBER_FORMAT = "#,##0.00";
const INTEGER_FORMAT = "#,##0";
const PERCENT_FORMAT = '#,##0.0"%"';
const DATE_FORMAT = "dd/mm/yyyy";
const DATETIME_FORMAT = "dd/mm/yyyy hh:mm";

const MIN_COLUMN_WIDTH = 10;
const MAX_COLUMN_WIDTH = 46;
const HEADER_ROW_OFFSET = 6;

export type MuximaXlsxLayoutOptions = {
	now?: Date;
};

function cellText(value: string | number | Date | null | undefined): string {
	if (value === null || value === undefined || value === "") return "—";
	if (value instanceof Date) return formatDateTime(value);
	return String(value);
}

function columnNumFmt(
	column: ReportColumn,
	currency: string,
): string | undefined {
	switch (column.type) {
		case "money":
			return currency.toUpperCase() === "AOA" ||
				currency.toUpperCase() === "AKZ"
				? MONEY_FORMAT
				: `#,##0.00 "${currency.toUpperCase()}"`;
		case "number":
			return NUMBER_FORMAT;
		case "percent":
			return PERCENT_FORMAT;
		case "date":
			return DATE_FORMAT;
		case "datetime":
			return DATETIME_FORMAT;
		default:
			return undefined;
	}
}

/** Native value when the cell is numeric, so Excel can still sort and sum. */
function cellValue(
	column: ReportColumn,
	row: ReportRow,
): string | number | Date | null {
	const raw = row[column.key];
	if (raw === null || raw === undefined || raw === "") return null;
	if (raw instanceof Date) return raw;
	if (
		column.type === "money" ||
		column.type === "number" ||
		column.type === "percent"
	) {
		const numeric = typeof raw === "number" ? raw : Number(raw);
		return Number.isFinite(numeric) ? numeric : cellText(raw);
	}
	return typeof raw === "string" ? sanitizeText(raw) : raw;
}

function alignFor(column: ReportColumn): "left" | "right" | "center" {
	if (column.align) return column.align;
	if (
		column.type === "money" ||
		column.type === "number" ||
		column.type === "percent"
	) {
		return "right";
	}
	return "left";
}

export class MuximaXlsxLayout {
	private readonly workbook = new ExcelJS.Workbook();
	private readonly context: ExportContext;
	private readonly currency: string;
	private readonly generatedAt: Date;

	constructor(context: ExportContext, options: MuximaXlsxLayoutOptions = {}) {
		this.context = context;
		this.currency = context.event?.currency ?? "AOA";
		this.generatedAt = options.now ?? context.generatedAt;
		this.workbook.creator = context.anonymous
			? MUXIMA_BRAND
			: `${MUXIMA_BRAND} — ${context.actor.name}`;
		this.workbook.created = this.generatedAt;
		this.workbook.modified = this.generatedAt;
	}

	async render(report: ReportDefinition): Promise<Buffer> {
		const tables = report.sections.filter(
			(section): section is Extract<ReportSection, { kind: "table" }> =>
				section.kind === "table",
		);
		const others = report.sections.filter(
			(section) => section.kind !== "table",
		);

		const summary = this.workbook.addWorksheet(SUMMARY_SHEET, {
			views: [{ showGridLines: false }],
		});
		this.writeIdentityBlock(summary, report, 1);

		let row = HEADER_ROW_OFFSET + 2;
		for (const section of others) {
			row = this.writeSummarySection(summary, section, row);
		}
		// With no narrative sections the first table would have no room on the
		// summary sheet, so it is written inline there instead of getting a sheet.
		if (others.length === 0) {
			const [first] = tables;
			if (first) {
				row = this.writeInlineTable(summary, first, row);
				tables.shift();
			}
		}
		summary.getColumn(1).width = 42;

		let index = 0;
		for (const table of tables) {
			index += 1;
			const sheet = this.workbook.addWorksheet(this.sheetName(table, index), {
				views: [{ showGridLines: false }],
			});
			this.writeIdentityBlock(sheet, report, 1, true);
			this.writeTable(sheet, table, HEADER_ROW_OFFSET);
		}

		if (this.workbook.worksheets.length === 1) {
			// A report with no table at all still needs a usable file.
			summary.getCell("A8").value =
				"Este relatório não contém tabelas de dados.";
		}

		const buffer = await this.workbook.xlsx.writeBuffer();
		return Buffer.from(buffer);
	}

	private sheetName(
		table: Extract<ReportSection, { kind: "table" }>,
		index: number,
	): string {
		const raw = table.sheetName ?? table.title ?? `Tabela ${index}`;
		// Excel forbids : \ / ? * [ ] and caps sheet names at 31 characters.
		return (
			sanitizeText(raw)
				.replace(/[:\\/?*[\]]/g, "-")
				.slice(0, 31)
				.trim() || `Tabela ${index}`
		);
	}

	/** MUXIMA / report title / event / export stamp — identical on every sheet. */
	private writeIdentityBlock(
		sheet: ExcelJS.Worksheet,
		report: ReportDefinition,
		startRow: number,
		compact = false,
	): void {
		const eventName = this.context.event?.name ?? "Convite";
		const rows: { label: string; value: string }[] = [
			{ label: "Relatório", value: report.title },
			{ label: "Evento", value: eventName },
		];

		if (!this.context.anonymous) {
			rows.push({ label: "Exportado por", value: this.context.actor.name });
		}
		rows.push({
			label: "Data de exportação",
			value: formatDateTime(this.generatedAt),
		});
		for (const entry of this.context.meta ?? []) rows.push(entry);

		const brandRow = sheet.getRow(startRow);
		brandRow.getCell(1).value = MUXIMA_BRAND;
		brandRow.getCell(1).font = {
			name: FONT,
			size: compact ? 12 : 16,
			bold: true,
			color: { argb: GOLD },
		};
		brandRow.height = compact ? 20 : 26;

		sheet.mergeCells(startRow, 1, startRow, 6);

		let row = startRow + 1;
		for (const { label, value } of rows) {
			const target = sheet.getRow(row);
			target.getCell(1).value = label;
			target.getCell(1).font = {
				name: FONT,
				size: 9,
				bold: true,
				color: { argb: MUTED },
			};
			target.getCell(2).value = sanitizeText(value);
			target.getCell(2).font = { name: FONT, size: 9, color: { argb: INK } };
			sheet.mergeCells(row, 2, row, 6);
			row += 1;
		}

		sheet.getRow(startRow).eachCell((cell) => {
			cell.fill = {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: GOLD_SOFT },
			};
		});
	}

	private writeSummarySection(
		sheet: ExcelJS.Worksheet,
		section: ReportSection,
		startRow: number,
	): number {
		let row = startRow;
		switch (section.kind) {
			case "pageBreak":
				return row + 1;
			case "kpis": {
				if (section.title)
					row = this.writeSheetHeading(sheet, section.title, row);
				for (const item of section.items) {
					const target = sheet.getRow(row);
					target.getCell(1).value = sanitizeText(item.label);
					target.getCell(1).font = {
						name: FONT,
						size: 9,
						bold: true,
						color: { argb: MUTED },
					};
					target.getCell(2).value = sanitizeText(item.value);
					target.getCell(2).font = {
						name: FONT,
						size: 10,
						bold: true,
						color: { argb: INK },
					};
					if (item.hint) {
						target.getCell(3).value = sanitizeText(item.hint);
						target.getCell(3).font = {
							name: FONT,
							size: 8,
							color: { argb: MUTED },
						};
					}
					row += 1;
				}
				return row + 1;
			}
			case "pairs": {
				if (section.title)
					row = this.writeSheetHeading(sheet, section.title, row);
				for (const item of section.items) {
					const target = sheet.getRow(row);
					target.getCell(1).value = sanitizeText(item.label);
					target.getCell(1).font = {
						name: FONT,
						size: 9,
						bold: true,
						color: { argb: MUTED },
					};
					target.getCell(2).value = sanitizeText(item.value);
					target.getCell(2).font = {
						name: FONT,
						size: 9,
						color: { argb: INK },
					};
					row += 1;
				}
				return row + 1;
			}
			case "paragraphs": {
				if (section.title)
					row = this.writeSheetHeading(sheet, section.title, row);
				for (const paragraph of section.paragraphs) {
					const text = sanitizeText(paragraph);
					if (!text) continue;
					const target = sheet.getRow(row);
					target.getCell(1).value = text;
					target.getCell(1).font = {
						name: FONT,
						size: 9,
						color: { argb: INK },
					};
					target.getCell(1).alignment = { wrapText: true, vertical: "top" };
					sheet.mergeCells(row, 1, row, 6);
					row += 1;
				}
				return row + 1;
			}
			case "table":
				return this.writeInlineTable(sheet, section, row);
			case "image":
				return this.writeImage(sheet, section, row);
		}
	}

	/**
	 * Anchors a raster image on the summary sheet and reserves the rows it
	 * covers, so the following section never overlaps it. Excel floats images, so
	 * the reservation is what keeps the layout honest.
	 */
	private writeImage(
		sheet: ExcelJS.Worksheet,
		section: Extract<ReportSection, { kind: "image" }>,
		startRow: number,
	): number {
		let row = startRow;
		if (section.title) row = this.writeSheetHeading(sheet, section.title, row);

		const { image } = section;
		const imageId = this.workbook.addImage({
			base64: image.data,
			extension: image.format,
		});
		sheet.addImage(imageId, {
			tl: { col: 0.5, row: row - 1 },
			editAs: "oneCell",
			ext: { width: image.width, height: image.height },
		});

		// ~20px per default row keeps the reservation close to what Excel shows.
		const reserved = Math.ceil(image.height / 20) + 1;
		sheet.getRow(row + reserved - 1).height = 6;
		row += reserved;

		if (image.caption) {
			const caption = sheet.getRow(row);
			caption.getCell(1).value = sanitizeText(image.caption);
			caption.getCell(1).font = {
				name: FONT,
				size: 9,
				bold: true,
				color: { argb: MUTED },
			};
			caption.getCell(1).alignment = { horizontal: "left" };
			sheet.mergeCells(row, 1, row, 6);
			row += 1;
		}

		const alt = sheet.getRow(row);
		alt.getCell(1).value = sanitizeText(image.alt);
		alt.getCell(1).font = {
			name: FONT,
			size: 9,
			italic: true,
			color: { argb: MUTED },
		};
		sheet.mergeCells(row, 1, row, 6);

		return row + 2;
	}

	private writeInlineTable(
		sheet: ExcelJS.Worksheet,
		table: Extract<ReportSection, { kind: "table" }>,
		startRow: number,
	): number {
		const row = table.title
			? this.writeSheetHeading(sheet, table.title, startRow)
			: startRow;
		const lastRow = this.writeTable(sheet, table, row);
		return lastRow + 2;
	}

	private writeSheetHeading(
		sheet: ExcelJS.Worksheet,
		title: string,
		row: number,
	): number {
		const target = sheet.getRow(row);
		target.getCell(1).value = sanitizeText(title);
		target.getCell(1).font = {
			name: FONT,
			size: 11,
			bold: true,
			color: { argb: GOLD },
		};
		target.height = 18;
		sheet.mergeCells(row, 1, row, 6);
		return row + 1;
	}

	/** Writes header + body + totals and returns the last used row number. */
	private writeTable(
		sheet: ExcelJS.Worksheet,
		table: Extract<ReportSection, { kind: "table" }>,
		startRow: number,
	): number {
		const columns = table.columns;
		if (columns.length === 0) return startRow;

		const headerRowIndex = startRow;
		const headerRow = sheet.getRow(headerRowIndex);
		columns.forEach((column, index) => {
			const cell = headerRow.getCell(index + 1);
			cell.value = sanitizeText(column.header);
			cell.font = {
				name: FONT,
				size: 9,
				bold: true,
				color: { argb: "FFFFFFFF" },
			};
			cell.fill = {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: GOLD },
			};
			cell.alignment = {
				horizontal: alignFor(column),
				vertical: "middle",
				wrapText: true,
			};
			cell.border = thinBorder();
		});
		headerRow.height = 22;

		let row = headerRowIndex + 1;
		if (table.rows.length === 0) {
			const emptyRow = sheet.getRow(row);
			emptyRow.getCell(1).value = sanitizeText(
				table.emptyMessage ?? "Sem registos para exibir.",
			);
			emptyRow.getCell(1).font = {
				name: FONT,
				size: 9,
				italic: true,
				color: { argb: MUTED },
			};
			sheet.mergeCells(row, 1, row, columns.length);
			return row;
		}

		table.rows.forEach((data, dataIndex) => {
			const target = sheet.getRow(row);
			target.height = 16;
			columns.forEach((column, columnIndex) => {
				const cell = target.getCell(columnIndex + 1);
				cell.value = cellValue(column, data);
				cell.font = { name: FONT, size: 9, color: { argb: INK } };
				cell.alignment = {
					horizontal: alignFor(column),
					vertical: "middle",
					wrapText: true,
				};
				cell.border = thinBorder();
				const numFmt = columnNumFmt(column, this.currency);
				if (numFmt) cell.numFmt = numFmt;
				if (dataIndex % 2 === 1) {
					cell.fill = {
						type: "pattern",
						pattern: "solid",
						fgColor: { argb: PAPER },
					};
				}
			});
			row += 1;
		});

		if (table.totals) {
			const totalsRow = sheet.getRow(row);
			totalsRow.height = 18;
			columns.forEach((column, columnIndex) => {
				const cell = totalsRow.getCell(columnIndex + 1);
				cell.value =
					columnIndex === 0
						? sanitizeText(table.totals?.label ?? "")
						: cellValue(column, table.totals?.values ?? {});
				cell.font = { name: FONT, size: 9, bold: true, color: { argb: INK } };
				cell.fill = {
					type: "pattern",
					pattern: "solid",
					fgColor: { argb: GOLD_SOFT },
				};
				cell.border = thinBorder();
				cell.alignment = { horizontal: alignFor(column), vertical: "middle" };
				const numFmt = columnNumFmt(column, this.currency);
				if (numFmt) cell.numFmt = numFmt;
			});
			row += 1;
		}

		// Usability: filterable, frozen header, sensible widths.
		sheet.autoFilter = {
			from: { row: headerRowIndex, column: 1 },
			to: { row: headerRowIndex, column: columns.length },
		};
		sheet.views = [
			{
				showGridLines: false,
				state: "frozen",
				ySplit: headerRowIndex,
			},
		];

		this.applyColumnWidths(sheet, table);

		return row - 1;
	}

	/** Width from the widest rendered cell, clamped to sane bounds. */
	private applyColumnWidths(
		sheet: ExcelJS.Worksheet,
		table: Extract<ReportSection, { kind: "table" }>,
	): void {
		table.columns.forEach((column, index) => {
			let longest = sanitizeText(column.header).length + 3;

			for (const row of table.rows) {
				const value = cellValue(column, row);
				const text =
					value instanceof Date ? formatDateTime(value) : String(value ?? "");
				if (text.length + 3 > longest) longest = text.length + 3;
			}

			const weight = column.weight ?? 1;
			const width = Math.min(
				MAX_COLUMN_WIDTH,
				Math.max(MIN_COLUMN_WIDTH, longest * 0.95 + weight * 2),
			);
			sheet.getColumn(index + 1).width = Number(width.toFixed(2));
		});
	}
}

function thinBorder() {
	const side = { style: "thin" as const, color: { argb: HAIRLINE } };
	return { top: side, left: side, bottom: side, right: side };
}

export async function renderReportToXlsx(
	report: ReportDefinition,
	context: ExportContext,
	options?: MuximaXlsxLayoutOptions,
): Promise<Buffer> {
	return new MuximaXlsxLayout(context, options).render(report);
}

export const XLSX_BRAND_COLOR = GOLD;
export { INTEGER_FORMAT };
