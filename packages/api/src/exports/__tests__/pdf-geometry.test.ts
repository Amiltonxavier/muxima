/*
 * Pdf-geometry tests (docs/pdf-layout-audit.md §13):
 *
 * The jsPDF text/rect/line/addImage/addPage APIs are instrumented through
 * jsPDF.API.events so every PDF produced in this file is audited for the
 * geometric failure classes the audit identified (P-01..P-14): ink escaping
 * the printable area, overlapping text, split money amounts, truncated
 * values, orphaned table headers, isolated totals, section titles that end a
 * page, KPI text spilling out of cards and captions split from their image.
 */
import { jsPDF } from "jspdf";
import { describe, expect, it } from "vitest";
import { generateInvitationQrCodePng } from "../../modules/invitations/qr-code";
import { renderReportToPdf } from "../core";
import type { ExportContext } from "../core/export-context";
import { MuximaPdfLayout } from "../core/pdf/muxima-pdf-layout";
import type {
	ReportColumn,
	ReportDefinition,
	ReportRow,
} from "../core/report-definition";

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const MARGIN_X = 42;
const CONTENT_TOP = MARGIN_X + 86; // 128
const CONTENT_BOTTOM = PAGE_HEIGHT - 34; // 561.28
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2; // 757.89
const EPS = 0.75;

const GENERATED_AT = new Date(Date.UTC(2026, 9, 7, 9, 5, 3));

function context(overrides: Partial<ExportContext> = {}): ExportContext {
	return {
		reportName: "Relatório",
		format: "pdf",
		generatedAt: GENERATED_AT,
		actor: { id: "u1", name: "Ana Silva" },
		event: {
			id: "e1",
			name: "Casamento de Maria e José",
			type: "WEDDING",
			status: "CONFIRMED",
			eventDate: new Date(Date.UTC(2026, 5, 20)),
			startTime: null,
			endTime: null,
			venueName: null,
			address: null,
			municipality: null,
			province: null,
			capacity: null,
			currency: "AOA",
		},
		meta: [
			{ label: "Período", value: "Janeiro – Dezembro de 2026" },
			{ label: "Filtros", value: "Estado: todos" },
		],
		...overrides,
	};
}

// ────────────────────────────────────────────────────────────
// Instrumentation
// ────────────────────────────────────────────────────────────

type TextBox = {
	text: string;
	x0: number;
	x1: number;
	top: number;
	bottom: number;
	baseline: number;
};

type TextRecord = {
	page: number;
	furniture: boolean;
	size: number;
	style: string;
	baseline: string;
	align: string;
	maxWidth: number;
	lines: TextBox[];
	declared: string;
};

type RectRecord = {
	page: number;
	furniture: boolean;
	x: number;
	y: number;
	w: number;
	h: number;
	style: string;
	fill: string;
	stroke: string;
};

type VLineRecord = {
	page: number;
	furniture: boolean;
	x: number;
	yMin: number;
	yMax: number;
};

type ImageRecord = {
	page: number;
	x: number;
	y: number;
	w: number;
	h: number;
};

type Problems = Record<keyof typeof emptyProblems, unknown[]>;

const trace = {
	texts: [] as TextRecord[],
	rects: [] as RectRecord[],
	vlines: [] as VLineRecord[],
	images: [] as ImageRecord[],
};

const emptyProblems = {
	contentLeft: [],
	contentRight: [],
	contentTop: [],
	contentBottom: [],
	cellCross: [],
	overlap: [],
	moneySplit: [],
	truncated: [],
	headerWrapped: [],
	cardSpill: [],
	orphans: [],
	furnitureOverlap: [],
	contentVsFurniture: [],
	imageCaptionSplit: [],
	furnitureOffPage: [],
	errors: [],
};

let furnitureMode = false;

function setFurnitureMode(value: boolean): void {
	furnitureMode = value;
}

let currentFill = "?";
let currentStroke = "?";

jsPDF.API.events.push([
	"initialized",
	function (this: jsPDF) {
		const inst = this;
		const originalText = inst.text;
		const originalRect = inst.rect;
		const originalLine = inst.line;
		const originalAddImage = inst.addImage;

		inst.setFillColor = new Proxy(inst.setFillColor, {
			apply(target, _thisArg, args) {
				currentFill = String(args[0] ?? "");
				return Reflect.apply(target, _thisArg, args);
			},
		});
		inst.setDrawColor = new Proxy(inst.setDrawColor, {
			apply(target, _thisArg, args) {
				currentStroke = String(args[0] ?? "");
				return Reflect.apply(target, _thisArg, args);
			},
		});

		inst.text = ((
			rawText: unknown,
			x: number,
			y: number,
			options: { maxWidth?: number; align?: string; baseline?: string } = {},
		) => {
			try {
				const page = inst.getCurrentPageInfo().pageNumber;
				const font = inst.getFont();
				const size = inst.getFontSize();
				const declared =
					typeof rawText === "string" ? rawText : JSON.stringify(rawText);

				let parts = Array.isArray(rawText)
					? [...rawText]
					: String(rawText).split(/\r\n|\r|\n/g);
				const maxWidth = options.maxWidth || 0;
				if (maxWidth > 0) {
					const out: string[] = [];
					for (const part of parts) {
						const split = inst.splitTextToSize(part, maxWidth);
						out.push(...(Array.isArray(split) ? split : [split ?? ""]));
					}
					parts = out;
				}

				const internal = inst.internal as unknown as {
					getLineHeightFactor(): number;
					scaleFactor: number;
				};
				const lineHeightFactor = internal.getLineHeightFactor();
				const height = size / internal.scaleFactor;
				const descent = height * (lineHeightFactor - 1);

				let y0 = y;
				switch (options.baseline) {
					case "bottom":
						y0 -= descent;
						break;
					case "top":
						y0 += height - descent;
						break;
					case "hanging":
						y0 += height - 2 * descent;
						break;
					case "middle":
						y0 += height / 2 - descent;
						break;
					default:
						break;
				}

				const align = options.align || "left";
				const leading = size * lineHeightFactor;
				const lines = parts.map((part, index) => {
					const width = inst.getTextWidth(part);
					const yy = index === 0 ? y0 : y0 + index * leading;
					let x0 = x;
					if (align === "right") x0 = x - width;
					else if (align === "center") x0 = x - width / 2;
					return {
						text: part,
						x0,
						x1: x0 + width,
						top: yy - 0.78 * size,
						bottom: yy + 0.3 * size,
						baseline: yy,
					};
				});

				trace.texts.push({
					page,
					furniture: furnitureMode,
					size,
					style:
						(font as unknown as { ref?: { style?: string } }).ref?.style ?? "?",
					baseline: options.baseline || "alphabetic",
					align,
					maxWidth,
					lines,
					declared: String(declared).slice(0, 120),
				});
			} catch (error) {
				trace.texts.push({
					page: -1,
					furniture: furnitureMode,
					size: 0,
					style: "?",
					baseline: "alphabetic",
					align: "left",
					maxWidth: 0,
					lines: [],
					declared: String(error),
				});
			}
			return Reflect.apply(originalText, inst, [rawText, x, y, options]);
		}) as typeof inst.text;

		inst.rect = ((
			x: number,
			y: number,
			w: number,
			h: number,
			style?: string,
		) => {
			try {
				trace.rects.push({
					page: inst.getCurrentPageInfo().pageNumber,
					furniture: furnitureMode,
					x,
					y,
					w,
					h,
					style: style ?? "",
					fill: currentFill,
					stroke: currentStroke,
				});
			} catch {
				/* ignore */
			}
			return Reflect.apply(originalRect, inst, [x, y, w, h, style]);
		}) as typeof inst.rect;

		inst.line = ((...args: unknown[]) => {
			try {
				const x1 = Number(args[0]);
				const y1 = Number(args[1]);
				const x2 = Number(args[2]);
				const y2 = Number(args[3]);
				if (Math.abs(x1 - x2) < 0.01) {
					trace.vlines.push({
						page: inst.getCurrentPageInfo().pageNumber,
						furniture: furnitureMode,
						x: x1,
						yMin: Math.min(y1, y2),
						yMax: Math.max(y1, y2),
					});
				}
			} catch {
				/* ignore */
			}
			return Reflect.apply(originalLine, inst, args as never);
		}) as typeof inst.line;

		inst.addImage = ((..._args: unknown[]) => {
			try {
				trace.images.push({
					page: inst.getCurrentPageInfo().pageNumber,
					x: _args[2] as number,
					y: _args[3] as number,
					w: _args[4] as number,
					h: _args[5] as number,
				});
			} catch {
				/* ignore */
			}
			return Reflect.apply(originalAddImage, inst, _args as never);
		}) as typeof inst.addImage;
	},
]);

function resetTrace(): void {
	trace.texts.length = 0;
	trace.rects.length = 0;
	trace.vlines.length = 0;
	trace.images.length = 0;
	furnitureMode = false;
	currentFill = "?";
	currentStroke = "?";
}

// Furniture is marked so the analysis can separate header/footer ink from
// content ink, mirroring the audit harness.
const layoutPrototype = MuximaPdfLayout.prototype as unknown as {
	renderPageFurniture(this: MuximaPdfLayout, ...args: unknown[]): void;
};
const originalRenderPageFurniture = layoutPrototype.renderPageFurniture;
Object.defineProperty(layoutPrototype, "renderPageFurniture", {
	configurable: true,
	value(this: MuximaPdfLayout, ...args: unknown[]) {
		setFurnitureMode(true);
		try {
			return Reflect.apply(originalRenderPageFurniture, this, args as never);
		} finally {
			setFurnitureMode(false);
		}
	},
});

// ────────────────────────────────────────────────────────────
// Analysis (mirrors docs/pdf-layout-audit.md failure classes)
// ────────────────────────────────────────────────────────────

function analyse(): Problems {
	const problems = JSON.parse(
		JSON.stringify(emptyProblems),
	) as unknown as Problems;
	const content = trace.texts.filter((r) => r.lines.length > 0);

	for (const r of content) {
		if (r.page < 0) {
			problems.errors.push(r);
			continue;
		}

		if (r.furniture) {
			for (const b of r.lines) {
				if (b.bottom > PAGE_HEIGHT - 1 || b.x1 > PAGE_WIDTH - 1 || b.x0 < 1) {
					problems.furnitureOffPage.push({ r, b });
				}
			}
			continue;
		}

		for (const b of r.lines) {
			if (!b.text) continue;
			if (b.x0 < MARGIN_X - EPS) problems.contentLeft.push({ r, b });
			if (b.x1 > PAGE_WIDTH - MARGIN_X + EPS)
				problems.contentRight.push({ r, b });
			if (b.top < CONTENT_TOP - 1) problems.contentTop.push({ r, b });
			if (b.bottom > CONTENT_BOTTOM + EPS)
				problems.contentBottom.push({ r, b });
			if (b.text.endsWith("…")) problems.truncated.push({ r, b });
		}

		if (
			/[\u202f\u00a0]/.test(r.declared) &&
			!r.declared.trim().endsWith("Kz") &&
			!/%$/.test(r.declared.trim())
		) {
			problems.moneySplit.push({ r });
		}

		if (r.baseline === "middle" && r.lines.length > 1) {
			problems.headerWrapped.push({ r });
		}
	}

	// KPI card spill: content text leaving the card rectangle it belongs to.
	// Cards are the PAPER-filled "FD" boxes (rowHeight ≥ 50) of the KPI grid.
	const cards = trace.rects.filter(
		(rect) =>
			!rect.furniture &&
			rect.style.includes("FD") &&
			rect.fill.startsWith("250") &&
			rect.w > 80,
	);
	for (const r of content) {
		if (r.furniture) continue;
		for (const b of r.lines) {
			if (!b.text) continue;
			for (const card of cards) {
				if (card.page !== r.page) continue;
				const cx = (b.x0 + b.x1) / 2;
				if (cx < card.x || cx > card.x + card.w) continue;
				if (
					b.top >= card.y - 2 &&
					b.top < card.y + card.h &&
					b.bottom > card.y + card.h + 0.5
				) {
					problems.cardSpill.push({
						page: r.page,
						size: r.size,
						text: b.text.slice(0, 50),
						cardBottom: card.y + card.h,
						textBottom: b.bottom,
					});
				}
			}
		}
	}

	// Orphaned table headers: a gold header strip on page P with rows below on
	// P+1 but none below it on P.
	const headerRects = trace.rects.filter(
		(rect) =>
			!rect.furniture &&
			rect.style.includes("F") &&
			rect.fill.startsWith("184") &&
			rect.h >= 22 &&
			rect.h < 70,
	);
	for (const header of headerRects) {
		const rowsBelow = trace.vlines.some(
			(line) =>
				!line.furniture &&
				line.page === header.page &&
				line.yMin >= header.y + header.h - 1,
		);
		const nextPageRows = trace.vlines.some(
			(line) => !line.furniture && line.page === header.page + 1,
		);
		if (!rowsBelow && nextPageRows) {
			problems.orphans.push({
				kind: "tableHeader",
				page: header.page,
				y: header.y,
			});
		}
	}

	// Orphaned section titles: last content text of a page is a 12.5pt serif
	// title while a later page continues the section.
	const byPage = new Map<number, TextRecord[]>();
	for (const r of content) {
		if (r.furniture) continue;
		if (!byPage.has(r.page)) byPage.set(r.page, []);
		byPage.get(r.page)?.push(r);
	}
	const pages = [...byPage.keys()].sort((a, b) => a - b);
	const lastPage = pages.length ? Math.max(...pages) : 0;
	for (const page of pages) {
		const current = byPage.get(page) ?? [];
		const last = current[current.length - 1];
		if (last && last.size === 12.5 && page + 1 <= lastPage) {
			problems.orphans.push({
				kind: "sectionTitle",
				page,
				text: last.declared,
				y: last.lines[last.lines.length - 1]?.bottom,
			});
		}
	}

	// Content text crossing a vertical column separator.
	for (const r of content) {
		if (r.furniture) continue;
		for (const b of r.lines) {
			if (!b.text) continue;
			for (const line of trace.vlines) {
				if (line.furniture || line.page !== r.page) continue;
				if (line.yMax <= b.top + 0.5 || line.yMin >= b.bottom - 0.5) continue;
				if (line.x > b.x0 + 0.4 && line.x < b.x1 - 0.4) {
					problems.cellCross.push({ r, b, line });
				}
			}
		}
	}

	// Text-vs-text overlap among content records.
	const byContentPage = new Map<number, { r: TextRecord; b: TextBox }[]>();
	for (const r of content) {
		if (r.furniture) continue;
		for (const b of r.lines) {
			if (!byContentPage.has(r.page)) byContentPage.set(r.page, []);
			byContentPage.get(r.page)?.push({ r, b });
		}
	}
	for (const [page, boxes] of byContentPage) {
		for (let i = 0; i < boxes.length; i += 1) {
			for (let j = i + 1; j < boxes.length; j += 1) {
				const a = boxes[i]?.b;
				const b = boxes[j]?.b;
				if (!a || !b || !a.text || !b.text) continue;
				const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
				const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
				if (ox > 1 && oy > 2) {
					problems.overlap.push({
						page,
						a,
						b,
						ox: +ox.toFixed(1),
						oy: +oy.toFixed(1),
						aStyle: `${boxes[i]?.r.size}/${boxes[i]?.r.style}`,
						bStyle: `${boxes[j]?.r.size}/${boxes[j]?.r.style}`,
					});
				}
			}
		}
	}

	// Furniture overlapping itself.
	const furn = content.filter((r) => r.furniture);
	for (let i = 0; i < furn.length; i += 1) {
		for (let j = i + 1; j < furn.length; j += 1) {
			const a = furn[i];
			const b = furn[j];
			if (!a || !b || a.page !== b.page) continue;
			for (const ab of a.lines) {
				for (const bb of b.lines) {
					if (!ab.text || !bb.text) continue;
					const ox = Math.min(ab.x1, bb.x1) - Math.max(ab.x0, bb.x0);
					const oy = Math.min(ab.bottom, bb.bottom) - Math.max(ab.top, bb.top);
					if (ox > 1 && oy > 1.5) {
						problems.furnitureOverlap.push({ page: a.page, a: ab, b: bb });
					}
				}
			}
		}
	}

	// Content colliding with header/footer furniture.
	const furnitureRecords = content.filter((r) => r.furniture);
	const contentRecords = content.filter((r) => !r.furniture);
	for (const f of furnitureRecords) {
		for (const c of contentRecords) {
			if (f.page !== c.page) continue;
			for (const a of f.lines) {
				for (const b of c.lines) {
					if (!a.text || !b.text) continue;
					const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
					const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
					if (ox > 1 && oy > 1.5) {
						problems.contentVsFurniture.push({ page: c.page, a, b });
					}
				}
			}
		}
	}

	// Image caption/alt on a later page than the image.
	for (const image of trace.images) {
		for (const r of content) {
			if (r.furniture || !r.lines.length) continue;
			if (r.size !== 8 || r.page === image.page) continue;
			const first = r.lines[0];
			if (
				first &&
				first.x0 >= image.x - 10 &&
				first.x0 <= image.x + image.w + 10 &&
				first.top < CONTENT_TOP + 60
			) {
				problems.imageCaptionSplit.push({
					imagePage: image.page,
					textPage: r.page,
					text: r.declared.slice(0, 60),
				});
			}
		}
	}

	return problems;
}

function sampleLabel(key: keyof typeof emptyProblems): string {
	const items = analyse()[key] ?? [];
	return JSON.stringify(items, null, 0).slice(0, 400);
}

// ────────────────────────────────────────────────────────────
// Fixtures
// ────────────────────────────────────────────────────────────

function moneyTable(rowsPerMoneyColumn: number): ReportDefinition {
	return {
		title: "Relatório de Inventário",
		sections: [
			{
				kind: "table",
				title: "Fornecedores",
				columns: [
					{ header: "Nome do fornecedor", key: "name", weight: 3 },
					{ header: "Contacto", key: "contact", weight: 2 },
					{ header: "Categoria", key: "category" },
					{ header: "Valor pago", key: "paid", type: "money", align: "right" },
					{ header: "Pendente", key: "pending", type: "money", align: "right" },
					{ header: "Estado", key: "status" },
					{ header: "Condições de pagamento", key: "category" },
					{ header: "Acordo", key: "paid", type: "money", align: "right" },
					{ header: "Recebido", key: "paid", type: "money", align: "right" },
				],
				rows: Array.from({ length: rowsPerMoneyColumn }, (_value, index) => ({
					name: `Fornecedor ${index} — Soluções de Catering e Eventos, Lda`,
					contact: `+244 9${index} 123 456\nf${index}@exemplo.co.ao`,
					category: index % 2 ? "Catering" : "Decoração",
					paid: 100000 + index * 1000,
					pending: index * 500,
					status: index % 3 === 0 ? "Pago" : "Pendente",
				})),
				totals: {
					label: "Total geral",
					values: { paid: 128450000, pending: 96300000, category: 32150000 },
				},
			},
		],
	};
}

function wideTable(columnCount: number, rowCount: number): ReportDefinition {
	return {
		title: "Tabela larga",
		sections: [
			{
				kind: "table",
				title: "Colunas",
				columns: Array.from({ length: columnCount }, (_value, index) => ({
					header: `Coluna ${index + 1}`,
					key: `c${index}`,
					weight: index % 2 ? 2 : 1,
					...((index === 5 || index === columnCount - 1) && {
						type: "money",
					}),
					...(index === 10 ? { align: "right" } : {}),
				})) as ReportColumn[],
				rows: Array.from({ length: rowCount }, (_value, row) => {
					const values: Record<string, string | number> = {};
					for (let column = 0; column < columnCount; column += 1) {
						values[`c${column}`] =
							column === 5 || column === columnCount - 1
								? 1250000 + row * 1000
								: `valor ${row + 1} coluna ${column + 1} longo o suficiente para envolver`;
					}
					return values;
				}),
			},
		],
	};
}

describe("pdf-geometry (A1–A12, docs/pdf-layout-audit.md)", () => {
	it("A1: column widths are never negative, NaN or overflowing for 1..20 columns", () => {
		for (let n = 1; n <= 20; n += 1) {
			const columns = Array.from({ length: n }, (_value, i) => ({
				header: `Coluna ${i + 1}`,
				key: `c${i}`,
				weight: 1,
			})) as ReportColumn[];
			const rows = Array.from({ length: 5 }, (_value, r) => {
				const values: Record<string, string> = {};
				for (let i = 0; i < n; i += 1) {
					values[`c${i}`] = `dado ${r}-${i}`;
				}
				return values;
			});
			const instance = new MuximaPdfLayout(
				context(),
				{ title: `Larguras ${n}`, sections: [] },
				{ now: GENERATED_AT },
			);
			const resolved = (
				instance as unknown as {
					resolveColumnWidths(
						columns: ReportColumn[],
						rows: ReportRow[],
					): number[];
				}
			).resolveColumnWidths(columns, rows);

			expect(resolved).toHaveLength(n);
			for (const width of resolved) {
				expect(Number.isFinite(width)).toBe(true);
				expect(width).toBeGreaterThanOrEqual(0);
				expect(width).toBeLessThanOrEqual(CONTENT_WIDTH);
			}
			expect(resolved.reduce((sum, width) => sum + width, 0)).toBeCloseTo(
				CONTENT_WIDTH,
				2,
			);
		}
	});

	it("A1/A6: a 16-column table keeps every column inside the printable area, every money amount on one line and never truncates", () => {
		resetTrace();
		renderReportToPdf(wideTable(16, 40), context(), { now: GENERATED_AT });
		const problems = analyse();
		expect(problems.contentRight, sampleLabel("contentRight")).toEqual([]);
		expect(problems.contentLeft, sampleLabel("contentLeft")).toEqual([]);
		expect(problems.truncated, sampleLabel("truncated")).toEqual([]);
		expect(problems.cellCross, sampleLabel("cellCross")).toEqual([]);
		expect(problems.overlap, sampleLabel("overlap")).toEqual([]);
	});

	it("A6: money values keep the currency unit attached (never split across lines)", () => {
		resetTrace();
		renderReportToPdf(moneyTable(70), context(), { now: GENERATED_AT });
		expect(analyse().moneySplit, sampleLabel("moneySplit")).toEqual([]);
		expect(analyse().truncated, sampleLabel("truncated")).toEqual([]);
	});

	it("A5: totals rows are never truncated and keep their values intact", () => {
		resetTrace();
		renderReportToPdf(moneyTable(200), context(), { now: GENERATED_AT });

		const ellipsis = trace.texts
			.filter((r) => !r.furniture)
			.flatMap((r) => r.lines)
			.filter((b) => b.text.endsWith("…"));
		expect(ellipsis.map((b) => b.text)).toEqual([]);
		expect(analyse().moneySplit, sampleLabel("moneySplit")).toEqual([]);
	});

	it("A7: for every table page the header and the first row stay on the same page", () => {
		resetTrace();
		renderReportToPdf(moneyTable(200), context(), { now: GENERATED_AT });

		const headers = trace.rects.filter(
			(rect) =>
				!rect.furniture &&
				rect.style.includes("F") &&
				rect.fill.startsWith("184") &&
				rect.h >= 22 &&
				rect.h < 70,
		);
		expect(headers.length).toBeGreaterThan(0);
		for (const header of headers) {
			const rowsBelow = trace.vlines.some(
				(line) =>
					!line.furniture &&
					line.page === header.page &&
					line.yMin >= header.y + header.h - 1,
			);
			expect(
				rowsBelow,
				`página ${header.page}: cabeçalho em y=${header.y.toFixed(1)} sem linha de dados por baixo`,
			).toBe(true);
		}
		expect(analyse().orphans, sampleLabel("orphans")).toEqual([]);
	});

	it("A5: totals always share their page with at least one data row (never isolated)", () => {
		resetTrace();
		renderReportToPdf(moneyTable(200), context(), { now: GENERATED_AT });

		const totalsRects = trace.rects.filter(
			(rect) =>
				!rect.furniture &&
				rect.style.includes("FD") &&
				rect.fill.startsWith("250") &&
				rect.stroke.startsWith("184"),
		);
		expect(totalsRects.length).toBe(1);
		for (const totals of totalsRects) {
			const rowAbove = trace.vlines.some(
				(line) =>
					!line.furniture &&
					line.page === totals.page &&
					line.yMax <= totals.y + 2,
			);
			expect(
				rowAbove,
				`página ${totals.page}: totais em y=${totals.y.toFixed(1)} sem linha de dados acima`,
			).toBe(true);
		}
	});

	it("A10/A11: KPI cards keep label, value and hint inside the card (no spill)", () => {
		const report: ReportDefinition = {
			title: "Resumo financeiro",
			sections: [
				{
					kind: "kpis",
					title: "Resumo",
					items: [
						{
							label: "Valor total do orçamento do evento",
							value: "12 500 000,00 Kz",
							hint: "Inclui impostos e taxas de serviço da região",
						},
						{
							label: "Pago até à data de hoje",
							value: "400 000,00 Kz",
							hint: "32% do total já liquidado",
						},
						{
							label: "Pendente de pagamento",
							value: "8 100 000,00 Kz",
							hint: "Valor estimado, sujeito a confirmação",
						},
					],
				},
				{
					kind: "pairs",
					title: "Nota",
					items: [{ label: "Observação", value: "Sem observações." }],
				},
			],
		};
		resetTrace();
		renderReportToPdf(report, context(), { now: GENERATED_AT });
		expect(analyse().cardSpill, sampleLabel("cardSpill")).toEqual([]);

		const cards = trace.rects.filter(
			(rect) =>
				!rect.furniture &&
				rect.style.includes("FD") &&
				rect.fill.startsWith("250") &&
				rect.w > 80,
		);
		expect(cards.length).toBe(3);
	});

	it("A8: image, caption and alt text stay together on the same page", async () => {
		const png = await generateInvitationQrCodePng(
			"http://localhost:3001/invite/abc123",
		);
		const report: ReportDefinition = {
			title: "Convite",
			sections: [
				{
					kind: "table",
					title: "Convidados",
					columns: [{ header: "Nome", key: "name" }],
					rows: Array.from({ length: 40 }, (_value, i) => ({
						name: `Convidado ${i}`,
					})),
				},
				{
					kind: "image",
					title: "QR Code de acesso",
					image: {
						data: png,
						format: "png",
						width: 80,
						height: 80,
						caption: "Aponte a câmara para o código QR de acesso ao evento",
						alt: "http://localhost:3001/invite/abc123",
					},
				},
			],
		};
		resetTrace();
		renderReportToPdf(report, context(), { now: GENERATED_AT });

		expect(trace.images.length).toBe(1);
		const image = trace.images[0];
		if (!image) throw new Error("no image placed");

		const imagePageInk = trace.texts.filter(
			(r) => !r.furniture && r.page === image.page,
		);
		expect(
			imagePageInk.some((r) => r.declared.includes("Aponte a câmara")),
			"A legenda deve estar na mesma página que a imagem",
		).toBe(true);
		expect(
			imagePageInk.some((r) =>
				r.declared.includes("http://localhost:3001/invite"),
			),
			"O alt deve estar na mesma página que a imagem",
		).toBe(true);

		expect(
			analyse().imageCaptionSplit,
			sampleLabel("imageCaptionSplit"),
		).toEqual([]);
	});

	it("A12: a 300-word paragraph wraps within the content area without truncation", () => {
		const longText = [
			"O planeamento de um evento de grande dimensão envolve a coordenação de centenas de fornecedores, a gestão de prazos apertados e a previsão rigorosa de custos.",
			"Cada decisão tomada numa fase inicial tem impacto direto no orçamento final, pelo que a revisão periódica dos valores é indispensável para evitar derrapagens.",
			"A equipa responsável pela logística deve manter um registo atualizado das confirmações, dos pagamentos efetuados e das pendências, garantindo assim a rastreabilidade de todo o processo.",
			"Este parágrafo é propositadamente extenso para validar a forma como o layout faz a quebra de linhas sem jamais truncar o conteúdo nem exceder a área imprimível.",
			"Para além da coordenação operacional, importa acompanhar de perto a execução financeira, comparando o orçamentado com o realizado e ajustando os planos sempre que se identifiquem desvios significativos.",
			"A informação deve ser registada de forma consistente para que qualquer pessoa da equipa consiga reconstituir o histórico das decisões e compreender a evolução dos números ao longo do tempo.",
		];
		const paragraph = longText.join(" ") + (longText.join(" ") + " ").repeat(8);
		const report: ReportDefinition = {
			title: "Relatório narrativo",
			sections: [
				{ kind: "paragraphs", title: "Contexto", paragraphs: [paragraph] },
			],
		};
		resetTrace();
		renderReportToPdf(report, context(), { now: GENERATED_AT });

		const words = paragraph.split(/\s+/).length;
		expect(words).toBeGreaterThan(300);

		const content = trace.texts.filter((r) => !r.furniture);
		expect(
			content.some((r) => r.declared.includes("planeamento")),
			"o parágrafo deve estar presente no render",
		).toBe(true);
		expect(content.length).toBeGreaterThan(1);

		const problems = analyse();
		expect(problems.truncated, sampleLabel("truncated")).toEqual([]);
		expect(problems.contentBottom, sampleLabel("contentBottom")).toEqual([]);
	});

	it("A3: the header metadata block stays compact and never collides with content", () => {
		const meta = Array.from({ length: 8 }, (_value, i) => ({
			label: `Filtro extra ${i + 1}`,
			value: `valor do filtro número ${i + 1} para contexto`,
		}));
		resetTrace();
		renderReportToPdf(wideTable(4, 20), context({ meta }), {
			now: GENERATED_AT,
		});

		const problems = analyse();
		expect(problems.furnitureOverlap, sampleLabel("furnitureOverlap")).toEqual(
			[],
		);
		expect(
			problems.contentVsFurniture,
			sampleLabel("contentVsFurniture"),
		).toEqual([]);
		expect(problems.contentTop, sampleLabel("contentTop")).toEqual([]);
		expect(problems.furnitureOffPage, sampleLabel("furnitureOffPage")).toEqual(
			[],
		);
	});

	it("A9: footer text never leaves the page", () => {
		const report: ReportDefinition = {
			title: "Relatório",
			sections: [
				{
					kind: "pairs",
					title: "Detalhes",
					items: Array.from({ length: 3 }, (_value, i) => ({
						label: `Item ${i + 1}`,
						value: `Valor do item ${i + 1} com uma quantidade razoável de texto`,
					})),
				},
			],
		};
		resetTrace();
		renderReportToPdf(report, context(), { now: GENERATED_AT });

		const footerInk = trace.texts
			.filter((r) => r.furniture)
			.flatMap((r) => r.lines)
			.filter((b) => b.bottom > PAGE_HEIGHT - 40);
		for (const b of footerInk) {
			expect(b.x0).toBeGreaterThanOrEqual(MARGIN_X - 1);
			expect(b.x1).toBeLessThanOrEqual(PAGE_WIDTH - MARGIN_X + 1);
			expect(b.top).toBeLessThanOrEqual(PAGE_HEIGHT);
			expect(b.bottom).toBeLessThanOrEqual(PAGE_HEIGHT);
		}
		expect(analyse().furnitureOffPage, sampleLabel("furnitureOffPage")).toEqual(
			[],
		);
	});

	it("A12: rendering is byte-identical for the same definition, context and clock", () => {
		const a = renderReportToPdf(moneyTable(60), context(), {
			now: GENERATED_AT,
		});
		const b = renderReportToPdf(moneyTable(60), context(), {
			now: GENERATED_AT,
		});
		expect(a.equals(b)).toBe(true);
	});

	it("P-02/P-14: pair labels and values never overlap and stay in the content area", () => {
		const report: ReportDefinition = {
			title: "Ficha do evento",
			sections: [
				{
					kind: "pairs",
					title: "Evento",
					items: [
						{
							label:
								"Nome do evento completo e detalhado que pode ocupar várias linhas",
							value: "Casamento de Maria e José Pereira",
						},
						{ label: "Data e hora de início", value: "20/06/2026 às 18:30" },
						{
							label: "Localização do evento",
							value: "Salão Miramar, Marginal de Luanda",
						},
						{ label: "Nº de convidados estimado para o evento", value: "120" },
						{
							label: "Observações da organização",
							value: "Nenhuma pendência registada até à data desta exportação.",
						},
					],
				},
			],
		};
		resetTrace();
		renderReportToPdf(report, context(), { now: GENERATED_AT });
		const problems = analyse();
		expect(problems.overlap, sampleLabel("overlap")).toEqual([]);
		expect(problems.contentRight, sampleLabel("contentRight")).toEqual([]);
		expect(problems.contentBottom, sampleLabel("contentBottom")).toEqual([]);
	});

	it("P-13: section titles stay inside the content area and never end a page", () => {
		const report: ReportDefinition = {
			title: "Misto",
			sections: [
				{
					kind: "table",
					title: "Primeira secção longa",
					columns: [{ header: "Nome", key: "name" }],
					rows: Array.from({ length: 150 }, (_value, i) => ({
						name: `Registo ${i}`,
					})),
				},
				{
					kind: "table",
					title: "Segunda secção",
					columns: [{ header: "Nome", key: "name" }],
					rows: Array.from({ length: 60 }, (_value, i) => ({
						name: `Outro registo ${i}`,
					})),
				},
			],
		};
		resetTrace();
		renderReportToPdf(report, context(), { now: GENERATED_AT });

		const problems = analyse();
		expect(problems.contentTop, sampleLabel("contentTop")).toEqual([]);
		expect(problems.contentBottom, sampleLabel("contentBottom")).toEqual([]);
		expect(problems.orphans, sampleLabel("orphans")).toEqual([]);
	});

	it("P-07: cover title, subtitle and event name are pre-wrapped inside CONTENT_TOP", () => {
		const report: ReportDefinition = {
			title:
				"Relatório detalhado do orçamento do evento de casamento da família Pereira da Silva e Sousa",
			subtitle:
				"Sub-relatório com a decomposição completa de todas as rubricas de despesa previstas e realizadas",
			sections: [
				{
					kind: "pairs",
					title: "Evento",
					items: [{ label: "Nome", value: "Nome muito extenso" }],
				},
			],
		};
		resetTrace();
		renderReportToPdf(report, context(), { now: GENERATED_AT });

		const problems = analyse();
		expect(problems.contentTop, sampleLabel("contentTop")).toEqual([]);

		const cover = trace.texts.filter((r) => !r.furniture && r.page === 1);
		for (const r of cover) {
			for (const b of r.lines) {
				expect(b.x1).toBeLessThanOrEqual(PAGE_WIDTH - MARGIN_X + EPS);
			}
		}
	});
});
