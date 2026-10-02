import { createHash } from "node:crypto";
import { jsPDF } from "jspdf";
import {
	type ExportContext,
	type ExportMetaEntry,
	MUXIMA_BRAND,
} from "../export-context";
import {
	formatDateTime,
	formatMoney,
	formatNumber,
	formatPercent,
	formatText,
	sanitizeText,
} from "../format";
import type {
	ReportColumn,
	ReportDefinition,
	ReportRow,
	ReportSection,
} from "../report-definition";

/**
 * Default Muxima PDF layout.
 *
 * One class renders every report: it owns the page geometry, the header, the
 * footer with real pagination, the typography scale and the table engine
 * (weighted column widths, wrapping, truncation, page breaks and repeated
 * header rows). Report modules only describe *what* to show.
 *
 * The critical property here is overflow safety: every draw call goes through
 * `ensureSpace`, which starts a new page before content would cross the bottom
 * margin. Nothing is ever clipped silently.
 */

// ── Brand tokens ────────────────────────────────────────────────

const GOLD = { r: 184, g: 155, b: 94 } as const; // #B89B5E
const INK = { r: 31, g: 31, b: 31 } as const; // #1F1F1F
const MUTED = { r: 102, g: 102, b: 102 } as const; // #666666
const PAPER = { r: 250, g: 250, b: 248 } as const; // #FAFAF8
const HAIRLINE = { r: 226, g: 222, b: 212 } as const;
const WHITE = { r: 255, g: 255, b: 255 } as const;

// ── Typography (points) ─────────────────────────────────────────

const FONT_SERIF = "times";
const FONT_SANS = "helvetica";

const SIZE = {
	coverTitle: 23,
	eventName: 16,
	sectionTitle: 13,
	headerReport: 10,
	headerMeta: 8,
	body: 9.5,
	tableHeader: 8.5,
	tableCell: 8.5,
	kpiLabel: 7.5,
	kpiValue: 14,
	footer: 7.5,
	note: 8,
} as const;

// ── Page geometry (points; A4 = 595.28 x 841.89) ────────────────

const PAGE = { width: 595.28, height: 841.89 } as const;
const MARGIN_X = 48;
const HEADER_BLOCK = 104;
const FOOTER_BLOCK = 46;
const CONTENT_TOP = MARGIN_X + HEADER_BLOCK;
const CONTENT_BOTTOM = PAGE.height - FOOTER_BLOCK;
const CONTENT_WIDTH = PAGE.width - MARGIN_X * 2;

const LINE_HEIGHT = 1.35;
const CELL_PADDING_X = 4;
const CELL_PADDING_Y = 4;
/** Hard cap on wrapped lines per cell — the only place text is ever truncated. */
const MAX_CELL_LINES = 3;
const MAX_PARAGRAPH_LINES = 14;

type Color = { r: number; g: number; b: number };

function hex(color: Color): string {
	const toHex = (value: number) =>
		Math.max(0, Math.min(255, Math.round(value)))
			.toString(16)
			.padStart(2, "0");
	return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

function formatCellValue(
	column: ReportColumn,
	row: ReportRow,
	currency: string,
): string {
	const raw = row[column.key];
	switch (column.type) {
		case "money":
			return formatMoney(
				typeof raw === "number" ? raw : Number(raw ?? 0),
				currency,
			);
		case "number":
			return formatNumber(typeof raw === "number" ? raw : Number(raw ?? 0));
		case "percent":
			return formatPercent(typeof raw === "number" ? raw : Number(raw ?? 0));
		case "date":
			return formatText(raw);
		case "datetime":
			return formatDateTime(raw instanceof Date ? raw : null);
		case "time":
			return formatText(raw);
		default:
			return formatText(raw);
	}
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

export type MuximaPdfLayoutOptions = {
	/** Injected in tests to keep byte output deterministic. */
	now?: Date;
};

export class MuximaPdfLayout {
	private readonly doc: jsPDF;
	private readonly context: ExportContext;
	private readonly currency: string;
	private readonly generatedAt: Date;
	private cursorY = CONTENT_TOP;

	constructor(
		context: ExportContext,
		report: ReportDefinition,
		options: MuximaPdfLayoutOptions = {},
	) {
		this.context = context;
		this.currency = context.event?.currency ?? "AOA";
		this.generatedAt = options.now ?? context.generatedAt;
		this.doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
		this.doc.setCreationDate(this.generatedAt);

		// jsPDF otherwise stamps a random `/ID` on every document, which makes two
		// exports of the same report differ byte for byte for no reason. Deriving
		// the id from the export itself keeps the output reproducible while still
		// differing between two distinct exports.
		this.doc.setFileId(
			createHash("sha256")
				.update(
					[
						report.title,
						context.reportName,
						context.event?.id ?? "",
						this.generatedAt.toISOString(),
					].join("|"),
				)
				.digest("hex")
				.slice(0, 32)
				.toUpperCase(),
		);
	}

	/** Full render: content first, then every page header and footer. */
	render(report: ReportDefinition): Buffer {
		this.renderCover(report);
		for (const section of report.sections) {
			this.renderSection(section);
		}
		this.renderPageFurniture();
		return Buffer.from(this.doc.output("arraybuffer"));
	}

	// ── Cover ────────────────────────────────────────────────────

	private renderCover(report: ReportDefinition): void {
		let y = CONTENT_TOP + 4;

		this.setFont(FONT_SERIF, "bold", SIZE.coverTitle);
		this.setColor(GOLD);
		this.doc.text(sanitizeText(report.title), MARGIN_X, y, {
			maxWidth: CONTENT_WIDTH,
		});
		y += SIZE.coverTitle * 1.25;

		if (report.subtitle) {
			this.setFont(FONT_SANS, "normal", SIZE.sectionTitle);
			this.setColor(INK);
			for (const line of this.wrap(
				sanitizeText(report.subtitle),
				FONT_SANS,
				11,
			)) {
				this.doc.text(line, MARGIN_X, y, { maxWidth: CONTENT_WIDTH });
				y += 11 * LINE_HEIGHT;
			}
			y += 4;
		}

		// Event name — the visual anchor of the cover.
		const eventName = this.context.event?.name;
		if (eventName) {
			this.setFont(FONT_SERIF, "italic", SIZE.eventName);
			this.setColor(INK);
			for (const line of this.wrap(
				sanitizeText(eventName),
				FONT_SERIF,
				SIZE.eventName,
			)) {
				this.doc.text(line, MARGIN_X, y, { maxWidth: CONTENT_WIDTH });
				y += SIZE.eventName * 1.2;
			}
		}

		this.drawGoldRule(MARGIN_X, y + 6, 54);
		this.cursorY = y + 22;
	}

	// ── Sections ─────────────────────────────────────────────────

	private renderSection(section: ReportSection): void {
		switch (section.kind) {
			case "pageBreak":
				this.doc.addPage();
				this.cursorY = CONTENT_TOP;
				return;
			case "kpis":
				this.renderKpis(section.title, section.items);
				return;
			case "pairs":
				this.renderPairs(section.title, section.items);
				return;
			case "table":
				this.renderTable(section);
				return;
			case "paragraphs":
				this.renderParagraphs(section.title, section.paragraphs);
				return;
			case "image":
				this.renderImage(section);
				return;
		}
	}

	private renderSectionTitle(title: string | undefined): void {
		if (!title) return;
		this.ensureSpace(30);
		this.setFont(FONT_SERIF, "bold", SIZE.sectionTitle);
		this.setColor(GOLD);
		const lines = this.wrap(sanitizeText(title), FONT_SERIF, SIZE.sectionTitle);
		for (const line of lines) {
			this.doc.text(line, MARGIN_X, this.cursorY, { maxWidth: CONTENT_WIDTH });
			this.cursorY += SIZE.sectionTitle * LINE_HEIGHT;
		}
		this.drawGoldRule(MARGIN_X, this.cursorY - 2, 32);
		this.cursorY += 12;
	}

	private renderKpis(
		title: string | undefined,
		items: { label: string; value: string; hint?: string }[],
	): void {
		if (items.length === 0) return;
		this.renderSectionTitle(title);

		const perRow = Math.min(4, Math.max(2, Math.floor(CONTENT_WIDTH / 150)));
		const gap = 10;
		const cardWidth = (CONTENT_WIDTH - gap * (perRow - 1)) / perRow;
		const cardHeight = 52;

		items.forEach((item, index) => {
			const column = index % perRow;
			if (column === 0 && index > 0) this.cursorY += cardHeight + gap;

			const x = MARGIN_X + column * (cardWidth + gap);
			this.ensureSpace(cardHeight + gap);

			this.doc.setFillColor(PAPER.r, PAPER.g, PAPER.b);
			this.doc.setDrawColor(HAIRLINE.r, HAIRLINE.g, HAIRLINE.b);
			this.doc.rect(x, this.cursorY, cardWidth, cardHeight, "FD");

			// Gold spine — a highlight, not a flood.
			this.setFillColor(GOLD);
			this.doc.rect(x, this.cursorY, 2, cardHeight, "F");

			this.setFont(FONT_SANS, "bold", SIZE.kpiLabel);
			this.setColor(MUTED);
			this.doc.text(
				sanitizeText(item.label).toUpperCase(),
				x + 9,
				this.cursorY + 15,
				{ maxWidth: cardWidth - 16 },
			);

			this.setFont(FONT_SERIF, "bold", SIZE.kpiValue);
			this.setColor(INK);
			const valueLines = this.wrap(
				sanitizeText(item.value),
				FONT_SERIF,
				SIZE.kpiValue,
				cardWidth - 16,
				1,
			);
			this.doc.text(valueLines[0] ?? "", x + 9, this.cursorY + 35, {
				maxWidth: cardWidth - 16,
			});

			if (item.hint) {
				this.setFont(FONT_SANS, "normal", 6.8);
				this.setColor(MUTED);
				this.doc.text(sanitizeText(item.hint), x + 9, this.cursorY + 46, {
					maxWidth: cardWidth - 16,
				});
			}
		});

		this.cursorY += cardHeight + gap + 6;
	}

	private renderPairs(
		title: string | undefined,
		items: { label: string; value: string }[],
	): void {
		if (items.length === 0) return;
		this.renderSectionTitle(title);

		const rowHeight = 15;
		const labelWidth = CONTENT_WIDTH * 0.36;

		for (const item of items) {
			this.ensureSpace(rowHeight);
			const y = this.cursorY;

			this.setFont(FONT_SANS, "normal", SIZE.body);
			this.setColor(MUTED);
			this.doc.text(sanitizeText(item.label), MARGIN_X, y + SIZE.body, {
				maxWidth: labelWidth - 8,
			});

			this.setFont(FONT_SANS, "bold", SIZE.body);
			this.setColor(INK);
			this.doc.text(
				sanitizeText(item.value),
				MARGIN_X + labelWidth,
				y + SIZE.body,
				{ maxWidth: CONTENT_WIDTH - labelWidth },
			);

			this.setDrawColor(HAIRLINE);
			this.doc.setLineWidth(0.4);
			this.doc.line(
				MARGIN_X,
				y + rowHeight - 3,
				PAGE.width - MARGIN_X,
				y + rowHeight - 3,
			);

			this.cursorY += rowHeight;
		}
		this.cursorY += 8;
	}

	private renderParagraphs(
		title: string | undefined,
		paragraphs: string[],
	): void {
		const cleaned = paragraphs.map(sanitizeText).filter(Boolean);
		if (cleaned.length === 0) return;
		this.renderSectionTitle(title);

		for (const paragraph of cleaned) {
			const lines = this.wrap(
				paragraph,
				FONT_SANS,
				SIZE.body,
				CONTENT_WIDTH,
				MAX_PARAGRAPH_LINES,
			);
			this.setFont(FONT_SANS, "normal", SIZE.body);
			this.setColor(INK);
			for (const line of lines) {
				this.ensureSpace(SIZE.body * LINE_HEIGHT);
				this.doc.text(line, MARGIN_X, this.cursorY + SIZE.body, {
					maxWidth: CONTENT_WIDTH,
				});
				this.cursorY += SIZE.body * LINE_HEIGHT;
			}
			this.cursorY += 6;
		}
	}

	/**
	 * Embeds a raster image centred in the content column, with its caption and
	 * alternative text. The image is scaled down to fit both the column width and
	 * the remaining page height so it can never cross the footer.
	 */
	private renderImage(
		section: Extract<ReportSection, { kind: "image" }>,
	): void {
		this.renderSectionTitle(section.title);

		const { image } = section;
		const captionLines = image.caption
			? this.wrap(sanitizeText(image.caption), FONT_SANS, SIZE.note)
			: [];
		const altLines = this.wrap(sanitizeText(image.alt), FONT_SANS, SIZE.note);
		const textBlock =
			(captionLines.length + altLines.length + 1) * SIZE.note * LINE_HEIGHT;
		const availableHeight = CONTENT_BOTTOM - this.cursorY - textBlock;

		const ratio = Math.min(
			1,
			CONTENT_WIDTH / image.width,
			availableHeight / image.height,
		);
		const width = image.width * ratio;
		const height = image.height * ratio;

		this.ensureSpace(height + textBlock);

		const x = MARGIN_X + (CONTENT_WIDTH - width) / 2;
		this.doc.addImage(
			image.data,
			image.format,
			x,
			this.cursorY,
			width,
			height,
			undefined,
			"FAST",
		);
		this.cursorY += height;

		if (image.caption) {
			this.cursorY += 8;
			this.setFont(FONT_SANS, "bold", SIZE.note);
			this.setColor(MUTED);
			for (const line of captionLines) {
				this.ensureSpace(SIZE.note * LINE_HEIGHT);
				this.doc.text(line, MARGIN_X, this.cursorY + SIZE.note, {
					maxWidth: CONTENT_WIDTH,
					align: "center",
				});
				this.cursorY += SIZE.note * LINE_HEIGHT;
			}
		}

		this.cursorY += 4;
		this.setFont(FONT_SANS, "italic", SIZE.note);
		this.setColor(MUTED);
		for (const line of altLines) {
			this.ensureSpace(SIZE.note * LINE_HEIGHT);
			this.doc.text(line, MARGIN_X, this.cursorY + SIZE.note, {
				maxWidth: CONTENT_WIDTH,
				align: "center",
			});
			this.cursorY += SIZE.note * LINE_HEIGHT;
		}

		this.cursorY += 12;
	}

	// ── Table engine ─────────────────────────────────────────────
	private renderTable(
		section: Extract<ReportSection, { kind: "table" }>,
	): void {
		if (section.title || section.description) {
			this.renderSectionTitle(section.title);
		}
		if (section.description) {
			this.renderParagraphs(undefined, [section.description]);
		}

		const columns = section.columns;
		if (columns.length === 0) return;

		const widths = this.resolveColumnWidths(columns);
		const headerHeight = 18;

		const drawHeader = () => {
			this.ensureSpace(headerHeight);
			const y = this.cursorY;
			this.setFillColor(GOLD);
			this.doc.rect(MARGIN_X, y, CONTENT_WIDTH, headerHeight, "F");

			let x = MARGIN_X;
			columns.forEach((column, index) => {
				const width = widths[index] ?? 0;
				this.setFont(FONT_SANS, "bold", SIZE.tableHeader);
				this.setColor(WHITE);
				const align = alignFor(column);
				this.doc.text(
					sanitizeText(column.header),
					x + CELL_PADDING_X,
					y + headerHeight / 2 + 3,
					{ maxWidth: width - CELL_PADDING_X * 2, align, baseline: "middle" },
				);
				x += width;
			});

			this.cursorY += headerHeight;
		};

		drawHeader();

		if (section.rows.length === 0) {
			this.ensureSpace(24);
			this.setFont(FONT_SANS, "italic", SIZE.note);
			this.setColor(MUTED);
			this.doc.text(
				sanitizeText(section.emptyMessage ?? "Sem registos para exibir."),
				MARGIN_X,
				this.cursorY + 14,
				{ maxWidth: CONTENT_WIDTH },
			);
			this.cursorY += 24;
			this.cursorY += 10;
			return;
		}

		section.rows.forEach((row, rowIndex) => {
			const cells = columns.map((column) =>
				formatCellValue(column, row, this.currency),
			);
			const wrapped = columns.map((_column, index) =>
				this.wrap(
					cells[index] ?? "—",
					FONT_SANS,
					SIZE.tableCell,
					(widths[index] ?? 0) - CELL_PADDING_X * 2,
					MAX_CELL_LINES,
				),
			);
			const lineCount = Math.max(1, ...wrapped.map((lines) => lines.length));
			const rowHeight =
				lineCount * SIZE.tableCell * LINE_HEIGHT + CELL_PADDING_Y * 2;

			// A row never straddles a page break: move the whole row, and repeat
			// the header on the fresh page.
			if (this.cursorY + rowHeight > CONTENT_BOTTOM) {
				this.doc.addPage();
				this.cursorY = CONTENT_TOP;
				drawHeader();
			}

			const y = this.cursorY;
			if (rowIndex % 2 === 1) {
				this.setFillColor(PAPER);
				this.doc.rect(MARGIN_X, y, CONTENT_WIDTH, rowHeight, "F");
			}

			let x = MARGIN_X;
			columns.forEach((column, index) => {
				const width = widths[index] ?? 0;
				this.setFont(FONT_SANS, "normal", SIZE.tableCell);
				this.setColor(INK);
				const align = alignFor(column);
				const lines = wrapped[index] ?? [];

				lines.forEach((line, lineIndex) => {
					const lineY =
						y + CELL_PADDING_Y + lineIndex * SIZE.tableCell * LINE_HEIGHT;
					this.doc.text(line, x + CELL_PADDING_X, lineY, {
						maxWidth: width - CELL_PADDING_X * 2,
						align,
					});
				});

				x += width;
			});

			this.setDrawColor(HAIRLINE);
			this.doc.setLineWidth(0.3);
			this.doc.line(
				MARGIN_X,
				y + rowHeight,
				PAGE.width - MARGIN_X,
				y + rowHeight,
			);

			this.cursorY += rowHeight;
		});

		if (section.totals) {
			this.renderTotals(section.totals, columns, widths);
		}

		this.cursorY += 12;
	}

	private renderTotals(
		totals: {
			label: string;
			values: Record<string, string | number | Date | null | undefined>;
		},
		columns: ReportColumn[],
		widths: number[],
	): void {
		const rowHeight = 20;
		this.ensureSpace(rowHeight + 4);
		const y = this.cursorY;

		this.setFillColor(PAPER);
		this.setDrawColor(GOLD);
		this.doc.setLineWidth(0.6);
		this.doc.rect(MARGIN_X, y, CONTENT_WIDTH, rowHeight, "FD");

		let x = MARGIN_X;
		columns.forEach((column, index) => {
			const width = widths[index] ?? 0;
			const align = alignFor(column);

			// The totals label occupies the first column; every other column shows
			// its own aggregated value.
			const value =
				index === 0
					? sanitizeText(totals.label)
					: formatCellValue(column, totals.values, this.currency);

			this.setFont(
				FONT_SANS,
				"bold",
				index === 0 ? SIZE.tableCell : SIZE.tableCell,
			);
			this.setColor(INK);
			this.doc.text(
				value,
				align === "right"
					? x + width - CELL_PADDING_X
					: align === "center"
						? x + width / 2
						: x + CELL_PADDING_X,
				y + rowHeight / 2 + 3,
				{
					maxWidth: width - CELL_PADDING_X * 2,
					align,
					baseline: "middle",
				},
			);
			x += width;
		});

		this.cursorY += rowHeight;
	}

	/** Distributes `CONTENT_WIDTH` proportionally to the column weights. */
	private resolveColumnWidths(columns: ReportColumn[]): number[] {
		const weights = columns.map((column) => {
			const weight = column.weight ?? 1;
			return weight > 0 ? weight : 1;
		});
		const total = weights.reduce((sum, weight) => sum + weight, 0);
		return weights.map((weight) => (weight / total) * CONTENT_WIDTH);
	}

	// ── Page furniture ───────────────────────────────────────────

	/** Header band and footer, drawn on every page once content exists. */
	private renderPageFurniture(): void {
		const total = this.doc.getNumberOfPages();
		const meta = this.buildMeta();

		for (let page = 1; page <= total; page += 1) {
			this.doc.setPage(page);
			this.drawHeader(page === 1, meta);
			this.drawFooter(page, total);
		}
	}

	private buildMeta(): ExportMetaEntry[] {
		const meta: ExportMetaEntry[] = [
			{
				label: "Data de exportação",
				value: formatDateTime(this.generatedAt),
			},
		];

		if (!this.context.anonymous) {
			meta.push({
				label: "Exportado por",
				value: this.context.actor.name,
			});
		}

		const event = this.context.event;
		if (event) {
			if (event.eventDate) {
				meta.push({
					label: "Data do evento",
					value: formatDateTime(event.eventDate),
				});
			}
			meta.push({ label: "Estado do evento", value: event.status });
		}

		for (const entry of this.context.meta ?? []) {
			meta.push(entry);
		}

		return meta;
	}

	private drawHeader(isFirstPage: boolean, meta: ExportMetaEntry[]): void {
		this.setFont(FONT_SANS, "bold", 9);
		this.setColor(GOLD);
		this.doc.text(MUXIMA_BRAND, MARGIN_X, MARGIN_X - 12);

		this.setFont(FONT_SERIF, "bold", SIZE.headerReport);
		this.setColor(INK);
		this.doc.text(
			sanitizeText(this.context.reportName),
			PAGE.width - MARGIN_X,
			MARGIN_X - 12,
			{ align: "right", maxWidth: CONTENT_WIDTH * 0.6 },
		);

		const eventName = this.context.event?.name;
		if (eventName) {
			this.setFont(FONT_SANS, "normal", SIZE.headerMeta);
			this.setColor(MUTED);
			this.doc.text(
				sanitizeText(eventName),
				PAGE.width - MARGIN_X,
				MARGIN_X - 1,
				{ align: "right", maxWidth: CONTENT_WIDTH * 0.6 },
			);
		}

		// Hairline + short gold accent.
		this.setDrawColor(HAIRLINE);
		this.doc.setLineWidth(0.5);
		this.doc.line(MARGIN_X, MARGIN_X + 6, PAGE.width - MARGIN_X, MARGIN_X + 6);
		this.setDrawColor(GOLD);
		this.doc.setLineWidth(1.2);
		this.doc.line(MARGIN_X, MARGIN_X + 6, MARGIN_X + 46, MARGIN_X + 6);

		// Metadata only on the first page: repeating it on every page would eat
		// the content area without adding information.
		if (!isFirstPage) return;

		let y = MARGIN_X + 22;
		for (const entry of meta) {
			if (y > CONTENT_TOP - 12) break;
			this.setFont(FONT_SANS, "bold", 7.5);
			this.setColor(MUTED);
			this.doc.text(`${entry.label}:`, MARGIN_X, y);

			this.setFont(FONT_SANS, "normal", 7.5);
			this.setColor(INK);
			this.doc.text(sanitizeText(entry.value), MARGIN_X + 120, y, {
				maxWidth: CONTENT_WIDTH - 120,
			});
			y += 11;
		}
	}

	private drawFooter(page: number, total: number): void {
		const y = PAGE.height - FOOTER_BLOCK + 14;

		this.setDrawColor(HAIRLINE);
		this.doc.setLineWidth(0.4);
		this.doc.line(MARGIN_X, y - 10, PAGE.width - MARGIN_X, y - 10);

		this.setFont(FONT_SANS, "bold", SIZE.footer);
		this.setColor(GOLD);
		this.doc.text(MUXIMA_BRAND, MARGIN_X, y);

		const eventName = this.context.event?.name;
		if (eventName) {
			this.setFont(FONT_SANS, "normal", SIZE.footer);
			this.setColor(MUTED);
			this.doc.text(sanitizeText(eventName), MARGIN_X + 52, y, {
				maxWidth: CONTENT_WIDTH - 160,
			});
		}

		this.setFont(FONT_SANS, "normal", SIZE.footer);
		this.setColor(MUTED);
		this.doc.text(`Página ${page} de ${total}`, PAGE.width - MARGIN_X, y, {
			align: "right",
		});
	}

	// ── Low-level helpers ────────────────────────────────────────

	private ensureSpace(height: number): void {
		if (this.cursorY + height <= CONTENT_BOTTOM) return;
		this.doc.addPage();
		this.cursorY = CONTENT_TOP;
	}

	private setFont(
		family: typeof FONT_SERIF | typeof FONT_SANS,
		style: "normal" | "bold" | "italic" | "bolditalic",
		size: number,
	): void {
		this.doc.setFont(family, style);
		this.doc.setFontSize(size);
	}

	private setColor(color: Color): void {
		this.doc.setTextColor(color.r, color.g, color.b);
	}

	private setFillColor(color: Color): void {
		this.doc.setFillColor(color.r, color.g, color.b);
	}

	private setDrawColor(color: Color): void {
		this.doc.setDrawColor(color.r, color.g, color.b);
	}

	private drawGoldRule(x: number, y: number, width: number): void {
		this.setDrawColor(GOLD);
		this.doc.setLineWidth(1.2);
		this.doc.line(x, y, x + width, y);
	}

	/**
	 * Wraps text to `maxWidth`, optionally truncating to `maxLines` with an
	 * ellipsis. Both PDF and any future renderer use this, so overflow is
	 * decided in exactly one place.
	 */
	private wrap(
		text: string,
		family: string,
		size: number,
		maxWidth = CONTENT_WIDTH,
		maxLines = Number.POSITIVE_INFINITY,
	): string[] {
		if (!text) return [""];
		this.doc.setFont(family, "normal");
		this.doc.setFontSize(size);

		const lines: string[] = [];
		for (const paragraph of text.split("\n")) {
			const wrapped = this.doc.splitTextToSize(paragraph, maxWidth) as string[];
			lines.push(...wrapped);
		}

		if (lines.length <= maxLines) return lines.length > 0 ? lines : [""];

		// Overflow: keep the allowed lines and mark the cut with an ellipsis. The
		// last kept line is shortened to fit rather than having its final word
		// dropped wholesale — a long unbroken word would otherwise blank the cell.
		const kept = lines.slice(0, maxLines);
		const last = kept[kept.length - 1] ?? "";
		this.doc.setFont(family, "normal");
		this.doc.setFontSize(size);
		let truncated = `${last}…`;
		while (
			truncated.length > 1 &&
			this.doc.getTextWidth(truncated) > maxWidth
		) {
			truncated = `${truncated.slice(0, -2).trimEnd()}…`;
		}
		kept[kept.length - 1] = truncated;
		return kept;
	}
}

/** Convenience: render a definition straight to a PDF buffer. */
export function renderReportToPdf(
	report: ReportDefinition,
	context: ExportContext,
	options?: MuximaPdfLayoutOptions,
): Buffer {
	return new MuximaPdfLayout(context, report, options).render(report);
}

export const PDF_BRAND_COLOR = hex(GOLD);
export const PDF_INK_COLOR = hex(INK);
export const PDF_MUTED_COLOR = hex(MUTED);
