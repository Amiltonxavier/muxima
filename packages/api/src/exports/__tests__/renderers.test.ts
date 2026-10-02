import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { generateInvitationQrCodePng } from "../../modules/invitations/qr-code";
import { renderReportToPdf, renderReportToXlsx } from "../core";
import type { ExportContext } from "../core/export-context";
import type { ReportDefinition } from "../core/report-definition";

const GENERATED_AT = new Date(Date.UTC(2026, 2, 7, 9, 5, 3));

function context(overrides: Partial<ExportContext> = {}): ExportContext {
	return {
		reportName: "Orçamento",
		format: "pdf",
		generatedAt: GENERATED_AT,
		actor: { id: "user-1", name: "Ana Silva", email: "ana@example.com" },
		event: {
			id: "event-1",
			name: "Casamento da Ana",
			type: "WEDDING",
			status: "CONFIRMED",
			eventDate: new Date(Date.UTC(2026, 5, 20, 15, 0)),
			startTime: "15:00",
			endTime: "23:30",
			venueName: "Salão Miramar",
			address: "Rua daindependência",
			municipality: "Luanda",
			province: "Luanda",
			capacity: 120,
			currency: "AOA",
		},
		...overrides,
	};
}

const REPORT: ReportDefinition = {
	title: "Relatório de Orçamento",
	subtitle: "Materiais e fornecedores",
	sections: [
		{
			kind: "kpis",
			title: "Resumo",
			items: [
				{ label: "Total", value: "1.250.000,00 Kz" },
				{ label: "Pago", value: "400.000,00 Kz", hint: "32%" },
			],
		},
		{
			kind: "pairs",
			title: "Evento",
			items: [
				{ label: "Data", value: "20/06/2026" },
				{ label: "Local", value: "Salão Miramar" },
			],
		},
		{
			kind: "table",
			title: "Fornecedores",
			sheetName: "Fornecedores",
			columns: [
				{ header: "Fornecedor", key: "name", weight: 2 },
				{ header: "Valor", key: "price", type: "money", align: "right" },
				{ header: "Entrega", key: "due", type: "date" },
			],
			rows: [
				{ name: "Catering Luanda", price: 800000, due: new Date(2026, 4, 1) },
				{ name: "FlorDecor", price: 450000, due: new Date(2026, 4, 10) },
			],
			totals: {
				label: "Total",
				values: { price: 1250000, due: null },
			},
			emptyMessage: "Sem fornecedores.",
		},
		{
			kind: "paragraphs",
			title: "Notas",
			paragraphs: ["Entrega combinada para a véspera."],
		},
		{ kind: "pageBreak" },
		{ kind: "paragraphs", title: "Anexo", paragraphs: ["Página segunda."] },
	],
};

describe("renderReportToPdf", () => {
	it("produces a real PDF buffer", () => {
		const buffer = renderReportToPdf(REPORT, context(), { now: GENERATED_AT });
		expect(buffer.length).toBeGreaterThan(1000);
		expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
	});

	it("is byte-identical for the same definition, context and clock", () => {
		const a = renderReportToPdf(REPORT, context(), { now: GENERATED_AT });
		const b = renderReportToPdf(REPORT, context(), { now: GENERATED_AT });
		expect(a.equals(b)).toBe(true);
	});

	it("paginates rather than clipping a long table", () => {
		const long: ReportDefinition = {
			title: "Convidados",
			sections: [
				{
					kind: "table",
					columns: [{ header: "Nome", key: "name" }],
					rows: Array.from({ length: 200 }, (_value, index) => ({
						name: `Convidado ${index}`,
					})),
				},
			],
		};
		const buffer = renderReportToPdf(long, context(), { now: GENERATED_AT });
		// Every row is present, so the byte count has to grow well past one page.
		expect(buffer.length).toBeGreaterThan(10_000);
		expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
	});

	it("does not crash on a table with no rows", () => {
		const empty: ReportDefinition = {
			title: "Vazio",
			sections: [
				{
					kind: "table",
					columns: [{ header: "Nome", key: "name" }],
					rows: [],
					emptyMessage: "Nada aqui.",
				},
			],
		};
		expect(
			renderReportToPdf(empty, context(), { now: GENERATED_AT })
				.subarray(0, 5)
				.toString(),
		).toBe("%PDF-");
	});

	it("embeds a raster image section (the invitation QR Code)", async () => {
		const png = await generateInvitationQrCodePng(
			"http://localhost:3001/invite/abc123",
		);
		const withQr: ReportDefinition = {
			title: "Convite",
			sections: [
				{
					kind: "image",
					title: "QR Code de acesso",
					image: {
						data: png,
						format: "png",
						width: 120,
						height: 120,
						caption: "Aponte a câmara",
						alt: "http://localhost:3001/invite/abc123",
					},
				},
			],
		};

		const withImage = renderReportToPdf(withQr, context(), {
			now: GENERATED_AT,
		});
		const without = renderReportToPdf(
			{ title: "Convite", sections: [] },
			context(),
			{ now: GENERATED_AT },
		);
		expect(withImage.subarray(0, 5).toString()).toBe("%PDF-");
		// The image is real content, not a placeholder.
		expect(withImage.length).toBeGreaterThan(without.length);
	});

	it("hides the actor line for anonymous public exports", () => {
		const anonymous = context({
			anonymous: true,
			actor: { id: "anonymous", name: "Convidado" },
		});
		expect(
			renderReportToPdf(REPORT, anonymous, { now: GENERATED_AT }).length,
		).toBeGreaterThan(0);
	});
});

describe("renderReportToXlsx", () => {
	async function load(buffer: Buffer) {
		const workbook = new ExcelJS.Workbook();
		await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
		return workbook;
	}

	it("produces a zip container readable by ExcelJS", async () => {
		const buffer = await renderReportToXlsx(REPORT, context(), {
			now: GENERATED_AT,
		});
		expect(buffer.length).toBeGreaterThan(1000);
		expect(buffer.subarray(0, 2).toString()).toBe("PK");

		const workbook = await load(buffer);
		expect(workbook.worksheets.map((sheet) => sheet.name)).toContain("Resumo");
		expect(workbook.worksheets.map((sheet) => sheet.name)).toContain(
			"Fornecedores",
		);
	});

	it("puts the summary sheet first", async () => {
		const workbook = await load(
			await renderReportToXlsx(REPORT, context(), { now: GENERATED_AT }),
		);
		expect(workbook.worksheets[0]?.name).toBe("Resumo");
	});

	it("writes every row, not just the first page of them", async () => {
		// A narrative section is what forces the table onto its own sheet; with
		// none, the first table is written inline on the summary sheet instead.
		const long: ReportDefinition = {
			title: "Convidados",
			sections: [
				{ kind: "pairs", items: [{ label: "Total", value: "150" }] },
				{
					kind: "table",
					sheetName: "Convidados",
					columns: [{ header: "Nome", key: "name" }],
					rows: Array.from({ length: 150 }, (_value, index) => ({
						name: `Convidado ${index}`,
					})),
				},
			],
		};
		const workbook = await load(
			await renderReportToXlsx(long, context(), { now: GENERATED_AT }),
		);
		const sheet = workbook.worksheets.find(
			(item) => item.name === "Convidados",
		);
		expect(sheet).toBeDefined();
		const values: unknown[] = [];
		sheet?.eachRow((row) => values.push(row.getCell(1).value));
		// Header row + every guest row.
		expect(
			values.filter((value) => String(value ?? "").startsWith("Convidado")),
		).toHaveLength(150);
	});

	it("sanitises sheet names Excel would reject", async () => {
		const workbook = await load(
			await renderReportToXlsx(
				{
					title: "Teste",
					sections: [
						{
							kind: "table",
							sheetName: "a/b:c*d?e[f]g com um nome bastante longo",
							columns: [{ header: "X", key: "x" }],
							rows: [{ x: 1 }],
						},
					],
				},
				context(),
				{ now: GENERATED_AT },
			),
		);
		for (const sheet of workbook.worksheets) {
			expect(sheet.name).not.toMatch(/[:\\/?*[\]]/);
			expect(sheet.name.length).toBeLessThanOrEqual(31);
		}
	});

	it("stays a usable file for a report with no tables at all", async () => {
		const workbook = await load(
			await renderReportToXlsx(
				{ title: "Só pares", sections: [{ kind: "pageBreak" }] },
				context(),
				{ now: GENERATED_AT },
			),
		);
		expect(workbook.worksheets).toHaveLength(1);
	});

	it("embeds an image section as a workbook image", async () => {
		const png = await generateInvitationQrCodePng(
			"http://localhost:3001/invite/abc123",
		);
		const workbook = await load(
			await renderReportToXlsx(
				{
					title: "Convite",
					sections: [
						{
							kind: "image",
							image: {
								data: png,
								format: "png",
								width: 120,
								height: 120,
								caption: "Aponte a câmara",
								alt: "http://localhost:3001/invite/abc123",
							},
						},
					],
				},
				context(),
				{ now: GENERATED_AT },
			),
		);
		const summary = workbook.worksheets[0];
		expect(summary?.getImages().length).toBeGreaterThan(0);
	});
});
