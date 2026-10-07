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
 * Generic Muxima PDF layout.
 *
 * Responsibilities:
 * - A4 landscape layout for data-heavy reports.
 * - Consistent header/footer and pagination.
 * - Generic KPI rendering.
 * - Generic table rendering.
 * - Content-aware column sizing.
 * - Safe word wrapping.
 * - No cell overlap.
 * - Whole-row page breaks.
 * - Repeated table headers.
 * - PT-PT display normalization.
 * - Deterministic PDF metadata.
 */

// ────────────────────────────────────────────────────────────────
// Brand tokens
// ────────────────────────────────────────────────────────────────

const GOLD = { r: 184, g: 155, b: 94 } as const; // #B89B5E
const INK = { r: 31, g: 31, b: 31 } as const; // #1F1F1F
const MUTED = { r: 102, g: 102, b: 102 } as const; // #666666
const PAPER = { r: 250, g: 250, b: 248 } as const; // #FAFAF8
const HAIRLINE = { r: 218, g: 214, b: 204 } as const;
const WHITE = { r: 255, g: 255, b: 255 } as const;

// ────────────────────────────────────────────────────────────────
// Typography
// ────────────────────────────────────────────────────────────────

const FONT_SERIF = "times";
const FONT_SANS = "helvetica";

const SIZE = {
	coverTitle: 22,
	eventName: 15,
	sectionTitle: 12.5,
	headerReport: 10,
	headerMeta: 7.5,
	body: 9,
	tableHeader: 8,
	tableCell: 8,
	kpiLabel: 7,
	kpiValue: 13,
	footer: 7.2,
	note: 8,
} as const;

// ────────────────────────────────────────────────────────────────
// Page geometry
// ────────────────────────────────────────────────────────────────

/**
 * A4 landscape:
 * 841.89 × 595.28 pt
 *
 * Landscape is intentional because Muxima reports contain
 * data-heavy tables with multiple financial/status columns.
 */
const PAGE = {
	width: 841.89,
	height: 595.28,
} as const;

const MARGIN_X = 42;

const HEADER_BLOCK = 86;
const FOOTER_BLOCK = 34;

const CONTENT_TOP = MARGIN_X + HEADER_BLOCK;
const CONTENT_BOTTOM = PAGE.height - FOOTER_BLOCK;
const CONTENT_WIDTH = PAGE.width - MARGIN_X * 2;

const LINE_HEIGHT = 1.35;

const CELL_PADDING_X = 5;
const CELL_PADDING_Y = 4;

const MAX_CELL_LINES = 3;

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

type Color = {
	r: number;
	g: number;
	b: number;
};

// ────────────────────────────────────────────────────────────────
// Display helpers
// ────────────────────────────────────────────────────────────────

function hex(color: Color): string {
	const toHex = (value: number) =>
		Math.max(0, Math.min(255, Math.round(value)))
			.toString(16)
			.padStart(2, "0");

	return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

/**
 * Normalizes backend enum/status values for PDF presentation only.
 *
 * This does not mutate the source data.
 */
function translateDisplayText(value: string): string {
	const translations: Record<string, string> = {
		CONFIRMED: "Confirmado",
		PENDING: "Pendente",
		DECLINED: "Recusado",
		WAITING: "Em espera",

		DRAFT: "Rascunho",
		PLANNING: "Em planeamento",
		COMPLETED: "Concluído",
		CANCELLED: "Cancelado",

		IN_NEGOTIATION: "Em negociação",
		"IN NEGOTIATION": "Em negociação",
		NEGOTIATION: "Em negociação",

		PAID: "Pago",
		UNPAID: "Não pago",
		OVERDUE: "Em atraso",

		FAMILY: "Família",
		FRIEND: "Amigo",
		COLLEAGUE: "Colega",
		VIP: "VIP",
		OTHER: "Outro",

		ENGAGEMENT: "Noivado",
		WEDDING: "Casamento",
	};

	return value
		.split("\n")
		.map((line) => {
			const normalized = line.trim().toUpperCase();

			return translations[normalized] ?? line;
		})
		.join("\n");
}

/**
 * Formats a contact value into separate visual lines when possible.
 *
 * The report contract remains unchanged. If the report already exposes
 * separate phone/email columns, those columns are naturally preserved.
 *
 * If a single contact field contains both values, they are separated
 * visually using a newline.
 */
function formatContactValue(
	value: string | number | boolean | Date | null | undefined,
): string {
	const text = formatText(value);

	if (!text) {
		return "";
	}

	const emailMatches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu);

	const phoneMatches = text.match(/\+?\d[\d\s().-]{7,}\d/g);

	const parts: string[] = [];

	if (phoneMatches?.length) {
		for (const phone of phoneMatches) {
			const normalized = phone.trim();

			if (normalized && !parts.includes(normalized)) {
				parts.push(normalized);
			}
		}
	}

	if (emailMatches?.length) {
		for (const email of emailMatches) {
			const normalized = email.trim();

			if (normalized && !parts.includes(normalized)) {
				parts.push(normalized);
			}
		}
	}

	if (parts.length === 0) {
		return text;
	}

	return parts.join("\n");
}

function isContactColumn(column: ReportColumn): boolean {
	const value = `${column.key} ${column.header}`.toLocaleLowerCase("pt-PT");

	return (
		value.includes("contact") ||
		value.includes("contacto") ||
		value.includes("telefone") ||
		value.includes("telemóvel") ||
		value.includes("telemovel") ||
		value.includes("email") ||
		value.includes("e-mail")
	);
}

function formatCellValue(
	column: ReportColumn,
	row: ReportRow,
	currency: string,
): string {
	const raw = row[column.key];

	if (isContactColumn(column)) {
		return translateDisplayText(formatContactValue(raw));
	}

	let value: string;

	switch (column.type) {
		case "money":
			value = formatMoney(
				typeof raw === "number" ? raw : Number(raw ?? 0),
				currency,
			);
			break;

		case "number":
			value = formatNumber(typeof raw === "number" ? raw : Number(raw ?? 0));
			break;

		case "percent":
			value = formatPercent(typeof raw === "number" ? raw : Number(raw ?? 0));
			break;

		case "date":
			value = formatText(raw);
			break;

		case "datetime":
			value = formatDateTime(raw instanceof Date ? raw : null);
			break;

		case "time":
			value = formatText(raw);
			break;

		default:
			value = formatText(raw);
			break;
	}

	return translateDisplayText(value);
}

/**
 * Collapses a multi-line value line-by-line so explicit newlines survive PDF
 * sanitization (which otherwise collapses them into spaces).
 */
function sanitizeMultiline(value: string): string {
	return value
		.split("\n")
		.map((line) => sanitizeText(line))
		.join("\n");
}

/**
 * Joins a grouped money/number token with its following unit ("Kz", "%", …) so
 * wrapping can never separate an amount from its currency symbol.
 *
 * Group separators are U+202F (non-breaking), so a token like `1 029 500,00`
 * is already a single whitespace-delimited token; only the unit is separate.
 */
function mergeMoneyTokens(tokens: string[]): string[] {
	const merged: string[] = [];
	const amount = /^-?[\d\u202f\u00a0.,]+$/u;
	const unit = /^(?:%|[A-Za-z]{1,4})$/u;

	for (let i = 0; i < tokens.length; i += 1) {
		const token = tokens[i] ?? "";
		const next = tokens[i + 1];

		if (
			token &&
			next &&
			amount.test(token) &&
			unit.test(next) &&
			/\d/u.test(token)
		) {
			merged.push(`${token} ${next}`);
			i += 1;
			continue;
		}

		merged.push(token);
	}

	return merged;
}

function alignFor(column: ReportColumn): "left" | "right" | "center" {
	if (column.align) {
		return column.align;
	}

	if (
		column.type === "money" ||
		column.type === "number" ||
		column.type === "percent"
	) {
		return "right";
	}

	return "left";
}

// ────────────────────────────────────────────────────────────────
// Options
// ────────────────────────────────────────────────────────────────

export type MuximaPdfLayoutOptions = {
	/**
	 * Injected in tests to keep byte output deterministic.
	 */
	now?: Date;
};

// ────────────────────────────────────────────────────────────────
// Layout
// ────────────────────────────────────────────────────────────────

export class MuximaPdfLayout {
	private readonly doc: jsPDF;
	private readonly context: ExportContext;
	private readonly currency: string;
	private readonly generatedAt: Date;
	private readonly reportTitle: string;

	private cursorY = CONTENT_TOP;

	constructor(
		context: ExportContext,
		report: ReportDefinition,
		options: MuximaPdfLayoutOptions = {},
	) {
		this.context = context;
		this.currency = context.event?.currency ?? "AOA";
		this.generatedAt = options.now ?? context.generatedAt;

		this.reportTitle = sanitizeText(report.title);

		this.doc = new jsPDF({
			unit: "pt",
			format: "a4",
			orientation: "landscape",
		});

		this.doc.setCreationDate(this.generatedAt);

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

	// ────────────────────────────────────────────────────────────
	// Render
	// ────────────────────────────────────────────────────────────

	render(report: ReportDefinition): Buffer {
		this.renderCover(report);

		for (const section of report.sections) {
			this.renderSection(section);
		}

		this.renderPageFurniture();

		return Buffer.from(this.doc.output("arraybuffer"));
	}

	// ────────────────────────────────────────────────────────────
	// Cover
	// ────────────────────────────────────────────────────────────

	private renderCover(report: ReportDefinition): void {
		/*
		 * Cover geometry:
		 *
		 * - the first ink baseline is anchored so the cap-height of the title
		 *   lands exactly on CONTENT_TOP (never above it);
		 * - every block advances by its own measured line height;
		 * - text is pre-wrapped and drawn without maxWidth so jsPDF never
		 *   re-wraps it a second time.
		 */
		let y = CONTENT_TOP;

		const titleLines = this.wrap(
			sanitizeText(report.title),
			FONT_SERIF,
			SIZE.coverTitle,
			CONTENT_WIDTH,
			Number.POSITIVE_INFINITY,
			"bold",
		);

		const titleLeading = SIZE.coverTitle * 1.2;

		this.setFont(FONT_SERIF, "bold", SIZE.coverTitle);
		this.setColor(GOLD);

		titleLines.forEach((line, index) => {
			this.doc.text(
				line,
				MARGIN_X,
				y + SIZE.coverTitle * 0.78 + index * titleLeading,
			);
		});

		y += titleLines.length * titleLeading;

		if (report.subtitle) {
			const subtitleLines = this.wrap(
				sanitizeText(report.subtitle),
				FONT_SANS,
				SIZE.sectionTitle,
				CONTENT_WIDTH,
				2,
			);

			this.setFont(FONT_SANS, "normal", SIZE.sectionTitle);
			this.setColor(INK);

			const subtitleLeading = SIZE.sectionTitle * LINE_HEIGHT;

			y += 4;

			subtitleLines.forEach((line, index) => {
				this.doc.text(
					line,
					MARGIN_X,
					y + SIZE.sectionTitle * 0.78 + index * subtitleLeading,
				);
			});

			y += subtitleLines.length * subtitleLeading;
		}

		const eventName = this.context.event?.name;

		if (eventName) {
			const eventLines = this.wrap(
				sanitizeText(eventName),
				FONT_SERIF,
				SIZE.eventName,
				CONTENT_WIDTH,
				Number.POSITIVE_INFINITY,
				"italic",
			);

			this.setFont(FONT_SERIF, "italic", SIZE.eventName);
			this.setColor(INK);

			const eventLeading = SIZE.eventName * 1.2;

			y += 4;

			eventLines.forEach((line, index) => {
				this.doc.text(
					line,
					MARGIN_X,
					y + SIZE.eventName * 0.78 + index * eventLeading,
				);
			});

			y += eventLines.length * eventLeading;
		}

		this.drawGoldRule(MARGIN_X, y + 6, 42);

		this.cursorY = Math.min(y + 20, CONTENT_BOTTOM);
	}

	// ────────────────────────────────────────────────────────────
	// Sections
	// ────────────────────────────────────────────────────────────

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

	/**
	 * Measures a section title without drawing it, so callers can reserve
	 * `title.height + firstBlockHeight` before committing to a page.
	 *
	 * Returns `null` when there is no (visible) title.
	 */
	private layoutSectionTitle(
		title: string | undefined,
	): { lines: string[]; size: number; height: number } | null {
		if (!title) {
			return null;
		}

		const cleanTitle = sanitizeText(title);

		if (this.isRedundantSectionTitle(cleanTitle)) {
			return null;
		}

		const { lines, size } = this.wrapShrinking(
			cleanTitle,
			FONT_SERIF,
			SIZE.sectionTitle,
			CONTENT_WIDTH,
			{ minSize: 10, targetLines: 2, style: "bold" },
		);

		const leading = size * LINE_HEIGHT;

		return {
			lines,
			size,
			height: lines.length * leading + 12,
		};
	}

	/**
	 * Draws a previously measured section title at the current cursor.
	 *
	 * The first baseline is placed so the cap-height starts exactly at
	 * `cursorY` (never above CONTENT_TOP), and the cursor advances by the
	 * measured height.
	 */
	private drawSectionTitle(
		layout: {
			lines: string[];
			size: number;
			height: number;
		} | null,
	): void {
		if (!layout) {
			return;
		}

		this.setFont(FONT_SERIF, "bold", layout.size);
		this.setColor(GOLD);

		const leading = layout.size * LINE_HEIGHT;

		layout.lines.forEach((line, index) => {
			this.doc.text(
				line,
				MARGIN_X,
				this.cursorY + layout.size * 0.78 + index * leading,
			);
		});

		this.cursorY += layout.lines.length * leading;

		this.drawGoldRule(MARGIN_X, this.cursorY + 1, 36);

		this.cursorY += 10;
	}

	/**
	 * Reserve-and-draw helper: guarantees `title + firstBlock` fit on the same
	 * page before the title is painted.
	 */
	private startSection(
		title: string | undefined,
		firstBlockHeight: number,
	): { lines: string[]; size: number; height: number } | null {
		const layout = this.layoutSectionTitle(title);

		this.ensureSpace((layout?.height ?? 0) + firstBlockHeight);

		this.drawSectionTitle(layout);

		return layout;
	}

	private isRedundantSectionTitle(title: string): boolean {
		const normalize = (value: string) =>
			value
				.toLocaleLowerCase("pt-PT")
				.replace(/^relatório\s+de\s+/u, "")
				.trim();

		return normalize(this.reportTitle) === normalize(title);
	}

	// ────────────────────────────────────────────────────────────
	// KPIs
	// ────────────────────────────────────────────────────────────

	private renderKpis(
		title: string | undefined,
		items: {
			label: string;
			value: string;
			hint?: string;
		}[],
	): void {
		if (items.length === 0) {
			return;
		}

		const perRow = Math.min(4, Math.max(2, Math.floor(CONTENT_WIDTH / 170)));

		const gap = 10;
		const cardWidth = (CONTENT_WIDTH - gap * (perRow - 1)) / perRow;
		const innerWidth = cardWidth - 20;
		const PAD = 8;

		/*
		 * Every card is measured up front so its height reflects the real
		 * content (label + value + hint) instead of a fixed 50pt box.
		 */
		const cards = items.map((item) => {
			const label = this.wrap(
				sanitizeText(item.label).toUpperCase(),
				FONT_SANS,
				SIZE.kpiLabel,
				innerWidth,
				3,
				"bold",
			);

			const value = this.wrapShrinking(
				sanitizeText(item.value),
				FONT_SERIF,
				SIZE.kpiValue,
				innerWidth,
				{ minSize: 9, targetLines: 2, style: "bold" },
			);

			const hint = item.hint
				? this.wrap(sanitizeMultiline(item.hint), FONT_SANS, 6.8, innerWidth, 3)
				: [];

			const labelHeight = label.length * SIZE.kpiLabel * LINE_HEIGHT;
			const valueHeight = value.lines.length * value.size * LINE_HEIGHT;
			const hintHeight = hint.length ? hint.length * 6.8 * LINE_HEIGHT + 3 : 0;

			const height = Math.max(
				50,
				PAD + labelHeight + 4 + valueHeight + hintHeight + PAD,
			);

			return { item, label, value, hint, height };
		});

		const rows: (typeof cards)[] = [];

		for (let start = 0; start < cards.length; start += perRow) {
			rows.push(cards.slice(start, start + perRow));
		}

		const firstRowHeight = Math.max(
			...(rows[0] ?? []).map((card) => card.height),
			50,
		);

		this.startSection(title, firstRowHeight + gap);

		for (const [rowIndex, row] of rows.entries()) {
			const rowHeight = Math.max(...row.map((card) => card.height), 50);

			if (rowIndex > 0) {
				this.ensureSpace(rowHeight + gap);
			}

			row.forEach((card, column) => {
				const x = MARGIN_X + column * (cardWidth + gap);
				const y = this.cursorY;

				this.doc.setFillColor(PAPER.r, PAPER.g, PAPER.b);

				this.doc.setDrawColor(HAIRLINE.r, HAIRLINE.g, HAIRLINE.b);

				this.doc.setLineWidth(0.6);

				this.doc.rect(x, y, cardWidth, rowHeight, "FD");

				this.setFillColor(GOLD);

				this.doc.rect(x, y, 2, rowHeight, "F");

				// Label.
				this.setFont(FONT_SANS, "bold", SIZE.kpiLabel);
				this.setColor(MUTED);

				let textY = y + PAD;

				card.label.forEach((line, index) => {
					const lineY =
						textY + SIZE.kpiLabel + index * SIZE.kpiLabel * LINE_HEIGHT;
					this.doc.text(line, x + 10, lineY);
				});

				textY += card.label.length * SIZE.kpiLabel * LINE_HEIGHT;
				textY += 4;

				// Value.
				this.setFont(FONT_SERIF, "bold", card.value.size);
				this.setColor(INK);

				card.value.lines.forEach((line, index) => {
					const lineY =
						textY + card.value.size + index * card.value.size * LINE_HEIGHT;
					this.doc.text(line, x + 10, lineY);
				});

				textY += card.value.lines.length * card.value.size * LINE_HEIGHT;

				// Hint.
				if (card.hint.length > 0) {
					this.setFont(FONT_SANS, "normal", 6.8);
					this.setColor(MUTED);

					card.hint.forEach((line, index) => {
						const lineY = textY + 6.8 + index * 6.8 * LINE_HEIGHT;
						this.doc.text(line, x + 10, lineY);
					});

					textY += card.hint.length * 6.8 * LINE_HEIGHT + 3;
				}
			});

			this.cursorY += rowHeight + gap;
		}

		this.cursorY += 4;
	}

	// ────────────────────────────────────────────────────────────
	// Pairs
	// ────────────────────────────────────────────────────────────

	private renderPairs(
		title: string | undefined,
		items: {
			label: string;
			value: string;
		}[],
	): void {
		if (items.length === 0) {
			return;
		}

		const rowHeight = 17;
		const labelWidth = CONTENT_WIDTH * 0.32;
		const valueWidth = CONTENT_WIDTH - labelWidth - 8;

		/*
		 * Measure the first pair so the section title and the first row land
		 * on the same page (P-13).
		 */
		const measure = (item: { label: string; value: string }) => {
			const labelLines = this.wrap(
				sanitizeMultiline(item.label),
				FONT_SANS,
				SIZE.body,
				labelWidth - 8,
			);

			const valueLines = this.wrap(
				sanitizeMultiline(item.value),
				FONT_SANS,
				SIZE.body,
				valueWidth,
			);

			const lineCount = Math.max(labelLines.length, valueLines.length);

			return {
				labelLines,
				valueLines,
				height: Math.max(rowHeight, lineCount * SIZE.body * LINE_HEIGHT + 4),
			};
		};

		const first = measure(items[0] as (typeof items)[0]);

		this.startSection(title, first.height);

		for (const [index, item] of items.entries()) {
			const measured = index === 0 ? first : measure(item);

			this.ensureSpace(measured.height);

			const y = this.cursorY;

			this.setFont(FONT_SANS, "normal", SIZE.body);
			this.setColor(MUTED);

			measured.labelLines.forEach((line, lineIndex) => {
				this.doc.text(
					line,
					MARGIN_X,
					y + SIZE.body + lineIndex * SIZE.body * LINE_HEIGHT,
				);
			});

			this.setFont(FONT_SANS, "bold", SIZE.body);
			this.setColor(INK);

			measured.valueLines.forEach((line, lineIndex) => {
				this.doc.text(
					line,
					MARGIN_X + labelWidth,
					y + SIZE.body + lineIndex * SIZE.body * LINE_HEIGHT,
				);
			});

			this.setDrawColor(HAIRLINE);
			this.doc.setLineWidth(0.4);

			this.doc.line(
				MARGIN_X,
				y + measured.height,
				PAGE.width - MARGIN_X,
				y + measured.height,
			);

			this.cursorY += measured.height;
		}

		this.cursorY += 8;
	}

	// ────────────────────────────────────────────────────────────
	// Paragraphs
	// ────────────────────────────────────────────────────────────

	private renderParagraphs(
		title: string | undefined,
		paragraphs: string[],
	): void {
		const cleaned = paragraphs
			.map(sanitizeMultiline)
			.filter((paragraph) => paragraph.trim().length > 0);

		if (cleaned.length === 0) {
			return;
		}

		/*
		 * Reserve title + first line of the first paragraph so a section
		 * title is never orphaned at the bottom of a page (P-13).
		 */
		this.startSection(title, SIZE.body * LINE_HEIGHT);

		this.setFont(FONT_SANS, "normal", SIZE.body);
		this.setColor(INK);

		for (const paragraph of cleaned) {
			/*
			 * Paragraphs are never truncated: every wrapped line flows to the
			 * next page as needed (P-12).
			 */
			const lines = this.wrap(
				paragraph,
				FONT_SANS,
				SIZE.body,
				CONTENT_WIDTH,
				Number.POSITIVE_INFINITY,
			);

			for (const line of lines) {
				this.ensureSpace(SIZE.body * LINE_HEIGHT);

				this.doc.text(line, MARGIN_X, this.cursorY + SIZE.body);

				this.cursorY += SIZE.body * LINE_HEIGHT;
			}

			this.cursorY += 6;
		}
	}

	// ────────────────────────────────────────────────────────────
	// Images
	// ────────────────────────────────────────────────────────────

	private renderImage(
		section: Extract<ReportSection, { kind: "image" }>,
	): void {
		const { image } = section;

		/*
		 * The image, its caption and its alt text are a single atomic block:
		 * nothing may page-break between them (P-08).
		 *
		 * 1. Measure the text part first (caption + gap + alt).
		 * 2. Reserve title + minimum image height + text block.
		 * 3. Scale the image to the *final* page remainder so the whole block
		 *    fits without any further ensureSpace call.
		 */
		const captionLines = image.caption
			? this.wrap(
					sanitizeMultiline(image.caption),
					FONT_SANS,
					SIZE.note,
					CONTENT_WIDTH,
					Number.POSITIVE_INFINITY,
					"bold",
				)
			: [];

		const altLines = this.wrap(
			sanitizeMultiline(image.alt),
			FONT_SANS,
			SIZE.note,
			CONTENT_WIDTH,
			Number.POSITIVE_INFINITY,
			"italic",
		);

		const noteLeading = SIZE.note * LINE_HEIGHT;

		const captionHeight = captionLines.length
			? 8 + captionLines.length * noteLeading
			: 0;

		const altHeight = altLines.length ? 4 + altLines.length * noteLeading : 0;

		const textBlock = captionHeight + altHeight;
		const MIN_IMAGE_HEIGHT = 40;
		const trailingGap = 12;

		this.startSection(
			section.title,
			textBlock + MIN_IMAGE_HEIGHT + trailingGap,
		);

		const availableHeight =
			CONTENT_BOTTOM - this.cursorY - textBlock - trailingGap;

		const ratio = Math.min(
			1,
			CONTENT_WIDTH / image.width,
			availableHeight / image.height,
		);

		const width = image.width * ratio;
		const height = image.height * ratio;

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

		if (captionLines.length > 0) {
			this.cursorY += 8;

			this.setFont(FONT_SANS, "bold", SIZE.note);
			this.setColor(MUTED);

			for (const line of captionLines) {
				this.cursorY += noteLeading;
				this.doc.text(line, MARGIN_X, this.cursorY, {
					align: "center",
				});
			}
		}

		this.cursorY += 4;

		if (altLines.length > 0) {
			this.setFont(FONT_SANS, "italic", SIZE.note);
			this.setColor(MUTED);

			for (const line of altLines) {
				this.cursorY += noteLeading;
				this.doc.text(line, MARGIN_X, this.cursorY, {
					align: "center",
				});
			}
		}

		this.cursorY += trailingGap;
	}

	// ────────────────────────────────────────────────────────────
	// Table
	// ────────────────────────────────────────────────────────────

	private renderTable(
		section: Extract<ReportSection, { kind: "table" }>,
	): void {
		const columns = section.columns;

		if (columns.length === 0) {
			return;
		}

		const widths = this.resolveColumnWidths(columns, section.rows);

		const usableWidth = (index: number) =>
			Math.max(20, (widths[index] ?? 0) - CELL_PADDING_X * 2);

		/*
		 * A row must never be taller than the printable band, otherwise it
		 * could never be placed. This is a pathological-value valve: normal
		 * content never reaches it.
		 */
		const maxCellLines = Math.max(
			3,
			Math.floor(
				(CONTENT_BOTTOM - CONTENT_TOP) / (SIZE.tableCell * LINE_HEIGHT),
			) - 2,
		);

		/*
		 * Headers are measured (and shrunk) up-front so the band height is
		 * real instead of a fixed 22pt assumption (P-03).
		 */
		const headerLines = columns.map((column, index) =>
			this.wrapShrinking(
				sanitizeText(column.header),
				FONT_SANS,
				SIZE.tableHeader,
				usableWidth(index),
				{ minSize: 6.5, targetLines: 2, style: "bold" },
			),
		);

		const headerHeight = Math.max(
			22,
			Math.max(1, ...headerLines.map((line) => line.lines.length)) *
				SIZE.tableHeader *
				LINE_HEIGHT +
				CELL_PADDING_Y * 2 +
				2,
		);

		const measureRow = (row: ReportRow) => {
			const cells = columns.map((column) =>
				formatCellValue(column, row, this.currency),
			);

			const wrapped = cells.map((cell, index) => {
				const measured = this.wrapShrinking(
					cell || "—",
					FONT_SANS,
					SIZE.tableCell,
					usableWidth(index),
					{
						minSize: 6.5,
						targetLines: MAX_CELL_LINES,
					},
				);

				return {
					size: measured.size,
					lines: this.truncateLines(
						measured.lines,
						maxCellLines,
						FONT_SANS,
						measured.size,
						usableWidth(index),
					),
				};
			});

			const contentHeight = Math.max(
				1,
				...wrapped.map((cell) => cell.lines.length * cell.size * LINE_HEIGHT),
			);

			return {
				wrapped,
				rowHeight: Math.max(24, contentHeight + CELL_PADDING_Y * 2 + 2),
			};
		};

		const totalsLayout = section.totals
			? this.layoutTotals(section.totals, columns, widths)
			: null;

		const titleLayout = this.layoutSectionTitle(section.title);

		const descriptionLines = section.description
			? this.wrap(
					sanitizeMultiline(section.description),
					FONT_SANS,
					SIZE.body,
					CONTENT_WIDTH,
					Number.POSITIVE_INFINITY,
				)
			: [];

		const descriptionHeight = descriptionLines.length
			? descriptionLines.length * SIZE.body * LINE_HEIGHT + 6
			: 0;

		const firstRow = section.rows[0] ? measureRow(section.rows[0]) : null;

		/*
		 * P-13 / P-03: the section title, the description, the table header
		 * and the first data row are one indivisible block.
		 */
		this.ensureSpace(
			(titleLayout?.height ?? 0) +
				descriptionHeight +
				headerHeight +
				(firstRow?.rowHeight ?? 0) +
				(totalsLayout && section.rows.length === 0
					? totalsLayout.rowHeight
					: 0),
		);

		this.drawSectionTitle(titleLayout);

		if (descriptionLines.length > 0) {
			this.setFont(FONT_SANS, "normal", SIZE.body);
			this.setColor(INK);

			for (const line of descriptionLines) {
				this.doc.text(line, MARGIN_X, this.cursorY + SIZE.body);
				this.cursorY += SIZE.body * LINE_HEIGHT;
			}

			this.cursorY += 6;
		}

		const drawHeader = () => {
			const y = this.cursorY;

			this.setFillColor(GOLD);

			this.doc.rect(MARGIN_X, y, CONTENT_WIDTH, headerHeight, "F");

			const blockHeight = SIZE.tableHeader * LINE_HEIGHT;
			const startY = y + (headerHeight - blockHeight) / 2;

			let x = MARGIN_X;

			columns.forEach((column, index) => {
				const width = widths[index] ?? 0;
				const align = alignFor(column);
				const cell = headerLines[index] ?? {
					lines: [""],
					size: SIZE.tableHeader,
				};

				this.setFont(FONT_SANS, "bold", cell.size);
				this.setColor(WHITE);

				const anchorX =
					align === "right"
						? x + width - CELL_PADDING_X
						: align === "center"
							? x + width / 2
							: x + CELL_PADDING_X;

				const leading = cell.size * LINE_HEIGHT;
				const cellBlock = cell.lines.length * leading;
				const firstLineY = startY + (blockHeight - cellBlock) / 2;

				cell.lines.forEach((line, lineIndex) => {
					this.doc.text(line, anchorX, firstLineY + leading * lineIndex, {
						align,
					});
				});

				x += width;
			});

			this.cursorY += headerHeight;
		};

		drawHeader();

		if (section.rows.length === 0) {
			this.ensureSpace(28);

			this.setFont(FONT_SANS, "italic", SIZE.note);
			this.setColor(MUTED);

			const emptyLines = this.wrap(
				sanitizeMultiline(section.emptyMessage ?? "Sem registos para exibir."),
				FONT_SANS,
				SIZE.note,
				CONTENT_WIDTH,
				Number.POSITIVE_INFINITY,
				"italic",
			);

			for (const line of emptyLines) {
				this.doc.text(line, MARGIN_X, this.cursorY + 14);
				this.cursorY += SIZE.note * LINE_HEIGHT;
			}

			if (totalsLayout) {
				this.drawTotals(totalsLayout, widths);
			}

			this.cursorY += 10;

			return;
		}

		const lastIndex = section.rows.length - 1;

		section.rows.forEach((row, rowIndex) => {
			const measured = rowIndex === 0 && firstRow ? firstRow : measureRow(row);

			/*
			 * P-04: the last row and the totals block share a page.
			 */
			const required =
				measured.rowHeight +
				(rowIndex === lastIndex && totalsLayout
					? totalsLayout.rowHeight + 4
					: 0);

			if (this.cursorY + required > CONTENT_BOTTOM) {
				this.doc.addPage();
				this.cursorY = CONTENT_TOP;
				drawHeader();
			}

			const y = this.cursorY;

			// Alternating row background.
			if (rowIndex % 2 === 1) {
				this.setFillColor(PAPER);

				this.doc.rect(MARGIN_X, y, CONTENT_WIDTH, measured.rowHeight, "F");
			}

			let x = MARGIN_X;

			columns.forEach((column, index) => {
				const width = widths[index] ?? 0;
				const align = alignFor(column);
				const cell = measured.wrapped[index] ?? {
					lines: [""],
					size: SIZE.tableCell,
				};

				this.setFont(FONT_SANS, "normal", cell.size);
				this.setColor(INK);

				const anchorX =
					align === "right"
						? x + width - CELL_PADDING_X
						: align === "center"
							? x + width / 2
							: x + CELL_PADDING_X;

				cell.lines.forEach((line, lineIndex) => {
					const lineY =
						y +
						CELL_PADDING_Y +
						cell.size +
						lineIndex * cell.size * LINE_HEIGHT;

					this.doc.text(line, anchorX, lineY, { align });
				});

				x += width;
			});

			/*
			 * Subtle vertical grid.
			 *
			 * It improves readability without making the table visually heavy.
			 */
			let columnX = MARGIN_X;

			columns.forEach((_column, index) => {
				const width = widths[index] ?? 0;

				if (index > 0) {
					this.setDrawColor(HAIRLINE);
					this.doc.setLineWidth(0.25);

					this.doc.line(columnX, y, columnX, y + measured.rowHeight);
				}

				columnX += width;
			});

			/*
			 * Horizontal separator.
			 */
			this.setDrawColor(HAIRLINE);
			this.doc.setLineWidth(0.55);

			this.doc.line(
				MARGIN_X,
				y + measured.rowHeight,
				PAGE.width - MARGIN_X,
				y + measured.rowHeight,
			);

			this.cursorY += measured.rowHeight;
		});

		if (totalsLayout) {
			this.drawTotals(totalsLayout, widths);
		}

		this.cursorY += 12;
	}

	// ────────────────────────────────────────────────────────────
	// Table totals
	// ────────────────────────────────────────────────────────────

	/**
	 * Measures the totals band up-front so it can be kept together with the
	 * last data row (P-04) and so its height reflects the real content.
	 *
	 * Totals are shrink-to-fit and never truncated with an ellipsis (P-05).
	 */
	private layoutTotals(
		totals: {
			label: string;
			values: Record<string, string | number | Date | null | undefined>;
		},
		columns: ReportColumn[],
		widths: number[],
	): {
		cells: {
			lines: string[];
			size: number;
			align: "left" | "right" | "center";
		}[];
		rowHeight: number;
	} {
		const cells = columns.map((column, index) => {
			const usable = Math.max(20, (widths[index] ?? 0) - CELL_PADDING_X * 2);

			const value =
				index === 0
					? sanitizeText(totals.label)
					: formatCellValue(column, totals.values, this.currency);

			const measured = this.wrapShrinking(
				value,
				FONT_SANS,
				SIZE.tableCell,
				usable,
				{ minSize: 6, targetLines: 1, style: "bold" },
			);

			return {
				lines: measured.lines,
				size: measured.size,
				align: alignFor(column),
			};
		});

		const contentHeight = Math.max(
			1,
			...cells.map((cell) => cell.lines.length * cell.size * LINE_HEIGHT),
		);

		return {
			cells,
			rowHeight: Math.max(24, contentHeight + CELL_PADDING_Y * 2 + 6),
		};
	}

	private drawTotals(
		layout: {
			cells: {
				lines: string[];
				size: number;
				align: "left" | "right" | "center";
			}[];
			rowHeight: number;
		},
		widths: number[],
	): void {
		this.ensureSpace(layout.rowHeight + 4);

		const y = this.cursorY;

		this.setFillColor(PAPER);
		this.setDrawColor(GOLD);
		this.doc.setLineWidth(0.7);

		this.doc.rect(MARGIN_X, y, CONTENT_WIDTH, layout.rowHeight, "FD");

		let x = MARGIN_X;

		layout.cells.forEach((cell, index) => {
			const width = widths[index] ?? 0;

			this.setFont(FONT_SANS, "bold", cell.size);
			this.setColor(INK);

			const anchorX =
				cell.align === "right"
					? x + width - CELL_PADDING_X
					: cell.align === "center"
						? x + width / 2
						: x + CELL_PADDING_X;

			const leading = cell.size * LINE_HEIGHT;
			const blockHeight = cell.lines.length * leading;
			const firstLineY = y + (layout.rowHeight - blockHeight) / 2;

			cell.lines.forEach((line, lineIndex) => {
				this.doc.text(line, anchorX, firstLineY + leading * lineIndex, {
					align: cell.align,
				});
			});

			x += width;
		});

		this.cursorY += layout.rowHeight;
	}

	// ────────────────────────────────────────────────────────────
	// Column sizing
	// ────────────────────────────────────────────────────────────

	/**
	 * Calculates widths using:
	 *
	 * 1. Explicit column weight.
	 * 2. Header width.
	 * 3. Real content width.
	 * 4. Minimum usable width.
	 *
	 * This is intentionally generic and does not contain report-specific
	 * column names or special-case widths.
	 */
	private resolveColumnWidths(
		columns: ReportColumn[],
		rows: ReportRow[],
	): number[] {
		if (columns.length === 0) {
			return [];
		}

		const singleLine = (value: string) => value.replace(/\n/g, " ");

		/*
		 * Widest atomic token (money amount + currency, group separators
		 * intact) for a column. Knowing it lets the column be wide enough to
		 * keep money values on one line (P-06).
		 */
		const widestToken = (column: ReportColumn) => {
			let widest = 0;

			for (const row of rows.slice(0, 100)) {
				const value = formatCellValue(column, row, this.currency);

				for (const token of mergeMoneyTokens(
					singleLine(value).split(/[\t ]+/),
				)) {
					const width = this.measureTextWidth(token, FONT_SANS, SIZE.tableCell);

					if (width > widest) {
						widest = width;
					}
				}
			}

			return widest;
		};

		const rawWeights = columns.map((column) => {
			const explicitWeight = Math.max(column.weight ?? 1, 0.5);

			const headerWidth = this.measureTextWidth(
				sanitizeText(column.header),
				FONT_SANS,
				SIZE.tableHeader,
				"bold",
			);

			const contentWidths = rows
				.slice(0, 100)
				.map((row) =>
					this.measureTextWidth(
						singleLine(formatCellValue(column, row, this.currency)),
						FONT_SANS,
						SIZE.tableCell,
					),
				);

			const maxContentWidth = Math.max(headerWidth, ...contentWidths, 0);

			const contentFactor = Math.min(1.8, Math.max(0.85, maxContentWidth / 85));

			return explicitWeight * contentFactor;
		});

		const totalWeight = rawWeights.reduce((sum, weight) => sum + weight, 0);

		if (totalWeight <= 0) {
			return columns.map(() => CONTENT_WIDTH / columns.length);
		}

		let widths = rawWeights.map(
			(weight) => (weight / totalWeight) * CONTENT_WIDTH,
		);

		/*
		 * Minimum usable width, measured with the real (bold) header style and
		 * with the widest atomic content token, so money never splits (P-06).
		 */
		let minimums = columns.map((column) => {
			return Math.min(
				160,
				Math.max(
					44,
					Math.max(
						this.measureTextWidth(
							sanitizeText(column.header),
							FONT_SANS,
							SIZE.tableHeader,
							"bold",
						),
						widestToken(column),
					) +
						CELL_PADDING_X * 2 +
						8,
				),
			);
		});

		/*
		 * Feasibility: when the minima do not fit in the printable width, they
		 * are scaled down proportionally so a solution always exists. Without
		 * this the balancing loop could never converge (P-01).
		 */
		const minSum = minimums.reduce((sum, minimum) => sum + minimum, 0);

		if (minSum > CONTENT_WIDTH) {
			const scale = CONTENT_WIDTH / minSum;
			minimums = minimums.map((minimum) => minimum * scale);
		}

		/*
		 * Raise columns below their minimum, taking the deficit from the
		 * columns above theirs in proportion to their slack. The sum is
		 * preserved exactly, so this converges in a single pass.
		 */
		for (let pass = 0; pass < 8; pass += 1) {
			let deficit = 0;

			widths = widths.map((width, index) => {
				const minimum = minimums[index] ?? 44;

				if (width >= minimum) {
					return width;
				}

				deficit += minimum - width;
				return minimum;
			});

			if (deficit <= 1e-9) {
				break;
			}

			const slack = widths.reduce(
				(total, width, index) =>
					total + Math.max(0, width - (minimums[index] ?? 44)),
				0,
			);

			if (slack <= 1e-9) {
				break;
			}

			const keep = 1 - deficit / slack;

			widths = widths.map((width, index) => {
				const minimum = minimums[index] ?? 44;
				const excess = width - minimum;

				if (excess <= 0) {
					return width;
				}

				return minimum + excess * keep;
			});
		}

		/*
		 * Distribute the floating point residual proportionally. Dumping it on
		 * the last column is what produced negative/oversized widths before.
		 */
		const sum = widths.reduce((total, width) => total + width, 0);
		const difference = CONTENT_WIDTH - sum;

		if (Math.abs(difference) > 1e-9 && sum > 0) {
			widths = widths.map((width) => width + (difference * width) / sum);
		}

		return widths;
	}

	private measureTextWidth(
		text: string,
		family: string,
		size: number,
		style: "normal" | "bold" | "italic" | "bolditalic" = "normal",
	): number {
		this.doc.setFont(family, style);
		this.doc.setFontSize(size);
		return this.doc.getTextWidth(text);
	}

	// ────────────────────────────────────────────────────────────
	// Page furniture
	// ────────────────────────────────────────────────────────────

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

			meta.push({
				label: "Estado do evento",
				value: translateDisplayText(event.status),
			});
		}

		for (const entry of this.context.meta ?? []) {
			meta.push({
				...entry,
				value: translateDisplayText(entry.value),
			});
		}

		return meta;
	}

	private drawHeader(isFirstPage: boolean, meta: ExportMetaEntry[]): void {
		const topY = MARGIN_X - 12;

		// Brand.
		this.setFont(FONT_SANS, "bold", 9);
		this.setColor(GOLD);

		this.doc.text(MUXIMA_BRAND, MARGIN_X, topY);

		// Report name — single line, shrink-to-fit (P-10).
		const reportName = this.fitSingleLine(
			sanitizeText(this.context.reportName),
			FONT_SERIF,
			SIZE.headerReport,
			CONTENT_WIDTH * 0.55,
			8,
			"bold",
		);

		this.setFont(FONT_SERIF, "bold", reportName.size);
		this.setColor(INK);

		this.doc.text(reportName.text, PAGE.width - MARGIN_X, topY, {
			align: "right",
		});

		// Event name — single line, shrink-to-fit (P-10).
		const eventName = this.context.event?.name;

		if (eventName) {
			const fitted = this.fitSingleLine(
				sanitizeText(eventName),
				FONT_SANS,
				SIZE.headerMeta,
				CONTENT_WIDTH * 0.55,
				6.5,
			);

			this.setFont(FONT_SANS, "normal", fitted.size);
			this.setColor(MUTED);

			this.doc.text(fitted.text, PAGE.width - MARGIN_X, MARGIN_X - 1, {
				align: "right",
			});
		}

		/*
		 * Header divider.
		 */
		this.setDrawColor(HAIRLINE);

		this.doc.setLineWidth(0.6);

		this.doc.line(MARGIN_X, MARGIN_X + 6, PAGE.width - MARGIN_X, MARGIN_X + 6);

		this.setDrawColor(GOLD);

		this.doc.setLineWidth(1.4);

		this.doc.line(MARGIN_X, MARGIN_X + 6, MARGIN_X + 46, MARGIN_X + 6);

		if (!isFirstPage) {
			return;
		}

		/*
		 * First-page metadata.
		 *
		 * Two columns, one line per entry, capped at 12 entries so the block
		 * can never reach CONTENT_TOP (128pt) or collide with the cover (P-09).
		 */
		const metaStartY = 64;
		const metaPitch = 12;
		const maxEntries = 12;

		const columnGap = 24;
		const metaColumnWidth = (CONTENT_WIDTH - columnGap) / 2;

		meta.slice(0, maxEntries).forEach((entry, index) => {
			const column = index % 2;
			const row = Math.floor(index / 2);

			const x = MARGIN_X + column * (metaColumnWidth + columnGap);

			const y = metaStartY + row * metaPitch;

			const label = `${entry.label}:`;

			const fittedLabel = this.fitSingleLine(
				label,
				FONT_SANS,
				7.2,
				70,
				6,
				"bold",
			);

			this.setFont(FONT_SANS, "bold", fittedLabel.size);
			this.setColor(MUTED);

			this.doc.text(fittedLabel.text, x, y);

			const fittedValue = this.fitSingleLine(
				sanitizeText(entry.value),
				FONT_SANS,
				7.2,
				metaColumnWidth - 78,
				6,
			);

			this.setFont(FONT_SANS, "normal", fittedValue.size);
			this.setColor(INK);

			this.doc.text(fittedValue.text, x + 78, y);
		});
	}

	private drawFooter(page: number, total: number): void {
		const y = PAGE.height - FOOTER_BLOCK + 10;

		this.setDrawColor(HAIRLINE);

		this.doc.setLineWidth(0.4);

		this.doc.line(MARGIN_X, y - 9, PAGE.width - MARGIN_X, y - 9);

		this.setFont(FONT_SANS, "bold", SIZE.footer);

		this.setColor(GOLD);

		this.doc.text(MUXIMA_BRAND, MARGIN_X, y);

		const eventName = this.context.event?.name;

		if (eventName) {
			/*
			 * P-10: the footer event name is a single line — shrink then
			 * ellipsize so it can never push past the page edge.
			 */
			const fitted = this.fitSingleLine(
				sanitizeText(eventName),
				FONT_SANS,
				SIZE.footer,
				CONTENT_WIDTH - 180,
				6,
			);

			this.setFont(FONT_SANS, "normal", fitted.size);
			this.setColor(MUTED);

			this.doc.text(fitted.text, MARGIN_X + 52, y);
		}

		this.setFont(FONT_SANS, "normal", SIZE.footer);

		this.setColor(MUTED);

		this.doc.text(`Página ${page} de ${total}`, PAGE.width - MARGIN_X, y, {
			align: "right",
		});
	}

	// ────────────────────────────────────────────────────────────
	// Pagination
	// ────────────────────────────────────────────────────────────

	private ensureSpace(height: number): void {
		if (this.cursorY + height <= CONTENT_BOTTOM) {
			return;
		}

		this.doc.addPage();

		this.cursorY = CONTENT_TOP;
	}

	// ────────────────────────────────────────────────────────────
	// Typography / drawing helpers
	// ────────────────────────────────────────────────────────────

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

	// ────────────────────────────────────────────────────────────
	// Text wrapping
	// ────────────────────────────────────────────────────────────

	private wrap(
		text: string,
		family: string,
		size: number,
		maxWidth = CONTENT_WIDTH,
		maxLines = Number.POSITIVE_INFINITY,
		style: "normal" | "bold" | "italic" | "bolditalic" = "normal",
	): string[] {
		if (!text) {
			return [""];
		}

		const safeWidth = Math.max(20, maxWidth);

		this.doc.setFont(family, style);
		this.doc.setFontSize(size);

		const lines: string[] = [];

		for (const paragraph of text.split("\n")) {
			for (const line of this.wrapLine(
				paragraph,
				safeWidth,
				family,
				style,
				size,
			)) {
				lines.push(line);
				if (lines.length >= maxLines) {
					break;
				}
			}
			if (lines.length >= maxLines) {
				break;
			}
		}

		if (lines.length === 0) {
			return [""];
		}

		if (lines.length <= maxLines) {
			return lines;
		}

		const kept = lines.slice(0, maxLines);
		const last = kept[kept.length - 1] ?? "";
		let truncated = `${last}…`;
		while (
			truncated.length > 1 &&
			this.measureTextWidth(truncated, family, size, style) > safeWidth
		) {
			truncated = `${truncated.slice(0, -2).trimEnd()}…`;
		}
		kept[kept.length - 1] = truncated;
		return kept;
	}

	private wrapLine(
		text: string,
		maxWidth: number,
		family: string,
		style: "normal" | "bold" | "italic" | "bolditalic",
		size: number,
	): string[] {
		if (!text) {
			return [""];
		}
		const results: string[] = [];
		let current = "";
		const tokens = mergeMoneyTokens(text.split(/[\t ]+/));

		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i] ?? "";
			if (!token) {
				continue;
			}
			const candidate = current ? `${current} ${token}` : token;
			if (this.measureTextWidth(candidate, family, size, style) <= maxWidth) {
				current = candidate;
				continue;
			}
			if (current) {
				results.push(current);
				current = "";
			}
			if (this.measureTextWidth(token, family, size, style) <= maxWidth) {
				current = token;
				continue;
			}
			let charBuffer = "";
			for (const char of token) {
				const charCandidate = charBuffer + char;
				if (
					this.measureTextWidth(charCandidate, family, size, style) > maxWidth
				) {
					if (charBuffer) {
						results.push(charBuffer);
						charBuffer = "";
					}
					charBuffer = char;
				} else {
					charBuffer = charCandidate;
				}
			}
			if (charBuffer) {
				current = charBuffer;
			}
		}
		if (current) {
			results.push(current);
		}
		return results.length > 0 ? results : [""];
	}

	/**
	 * Wraps `text` while progressively shrinking the font until it fits within
	 * `maxLines` lines (or `minSize` is reached). Never truncates.
	 */
	private wrapShrinking(
		text: string,
		family: string,
		size: number,
		maxWidth: number,
		options: {
			minSize?: number;
			targetLines?: number;
			style?: "normal" | "bold" | "italic" | "bolditalic";
		} = {},
	): { lines: string[]; size: number } {
		const minSize = options.minSize ?? size;
		const targetLines = options.targetLines ?? Number.POSITIVE_INFINITY;
		const style = options.style ?? "normal";

		let current = size;
		let lines = this.wrap(
			text,
			family,
			current,
			maxWidth,
			Number.POSITIVE_INFINITY,
			style,
		);

		while (lines.length > targetLines && current > minSize) {
			current = Math.max(minSize, current - 0.25);
			lines = this.wrap(
				text,
				family,
				current,
				maxWidth,
				Number.POSITIVE_INFINITY,
				style,
			);
		}

		return { lines, size: current };
	}

	/** Fits `text` on a single line, shrinking then ellipsizing if needed. */
	private fitSingleLine(
		text: string,
		family: string,
		size: number,
		maxWidth: number,
		minSize: number,
		style: "normal" | "bold" | "italic" | "bolditalic" = "normal",
	): { text: string; size: number; overflow: boolean } {
		const { lines, size: fittedSize } = this.wrapShrinking(
			text,
			family,
			size,
			maxWidth,
			{ minSize, targetLines: 1, style },
		);

		if (lines.length <= 1) {
			return {
				text: lines[0] ?? "",
				size: fittedSize,
				overflow: false,
			};
		}

		return {
			text: this.ellipsize(text, family, fittedSize, maxWidth, style),
			size: fittedSize,
			overflow: true,
		};
	}

	private ellipsize(
		text: string,
		family: string,
		size: number,
		maxWidth: number,
		style: "normal" | "bold" | "italic" | "bolditalic" = "normal",
	): string {
		if (this.measureTextWidth(text, family, size, style) <= maxWidth) {
			return text;
		}

		let truncated = `${text}…`;
		while (
			truncated.length > 1 &&
			this.measureTextWidth(truncated, family, size, style) > maxWidth
		) {
			truncated = `${truncated.slice(0, -2).trimEnd()}…`;
		}
		return truncated;
	}

	/** Truncates an already-wrapped block to `maxLines`, ellipsizing the last. */
	private truncateLines(
		lines: string[],
		maxLines: number,
		family: string,
		size: number,
		maxWidth: number,
		style: "normal" | "bold" | "italic" | "bolditalic" = "normal",
	): string[] {
		if (lines.length <= maxLines) {
			return lines;
		}
		const kept = lines.slice(0, maxLines);
		kept[kept.length - 1] = this.ellipsize(
			kept[kept.length - 1] ?? "",
			family,
			size,
			maxWidth,
			style,
		);
		return kept;
	}
}

// ────────────────────────────────────────────────────────────────
// Public helper
// ────────────────────────────────────────────────────────────────

/**
 * Convenience helper for rendering a report directly to a PDF buffer.
 */
export function renderReportToPdf(
	report: ReportDefinition,
	context: ExportContext,
	options?: MuximaPdfLayoutOptions,
): Buffer {
	return new MuximaPdfLayout(context, report, options).render(report);
}

// ────────────────────────────────────────────────────────────────
// Public brand constants
// ────────────────────────────────────────────────────────────────

export const PDF_BRAND_COLOR = hex(GOLD);

export const PDF_INK_COLOR = hex(INK);

export const PDF_MUTED_COLOR = hex(MUTED);
