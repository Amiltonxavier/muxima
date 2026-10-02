import { describe, expect, it } from "vitest";

import {
	createExportFileName,
	slugify,
	toAsciiFileName,
} from "../core/export-file-name";
import {
	contentDisposition,
	ExportNotSupportedError,
} from "../orchestration/export-service";
import {
	EVENT_EXPORT_MODULES,
	getReportBuilder,
	getReportName,
	isEventExportModule,
	isExportModule,
} from "../registry/export-registry";

describe("createExportFileName", () => {
	// 2026-03-07 09:05:03 UTC — the name is stamped in UTC on purpose.
	const stamp = new Date(Date.UTC(2026, 2, 7, 9, 5, 3));

	it("builds muxima-event-report-timestamp-token.ext", () => {
		const name = createExportFileName({
			eventName: "Casamento da Ana e do João",
			reportName: "Orçamento",
			format: "pdf",
			date: stamp,
			token: "9a51",
		});

		expect(name).toBe(
			"muxima-casamento-da-ana-e-do-joao-orcamento-2026-03-07-090503-9a51.pdf",
		);
	});

	it("falls back to `evento` when there is no event (public exports)", () => {
		expect(
			createExportFileName({
				reportName: "Convite",
				format: "pdf",
				date: stamp,
				token: "5dd7",
			}),
		).toBe("muxima-evento-convite-2026-03-07-090503-5dd7.pdf");
	});

	it("marks the XLSX variant in the report name, not only the extension", () => {
		expect(
			createExportFileName({
				eventName: "Aniversário",
				reportName: "Convidados (XLSX)",
				format: "xlsx",
				date: stamp,
				token: "b4d3",
			}),
		).toBe("muxima-aniversario-convidados-xlsx-2026-03-07-090503-b4d3.xlsx");
	});

	it("stamps in UTC so two servers never disagree on the name", () => {
		const name = createExportFileName({
			reportName: "Tarefas",
			format: "pdf",
			date: stamp,
			token: "0000",
		});
		expect(name).toContain("2026-03-07-090503");
	});

	it("adds a random token so concurrent downloads never collide", () => {
		const base = {
			eventName: "Bodas de Ouro",
			reportName: "Tarefas",
			format: "pdf" as const,
			date: stamp,
		};
		expect(createExportFileName(base)).not.toBe(createExportFileName(base));
	});

	it("always starts with the brand and keeps a usable length", () => {
		const name = createExportFileName({
			eventName: "x".repeat(400),
			reportName: "Plano Alimentação",
			format: "pdf",
			date: stamp,
		});
		expect(name.startsWith("muxima-")).toBe(true);
		expect(name.endsWith(".pdf")).toBe(true);
		expect(name.length).toBeLessThanOrEqual(255);
	});

	it("produces only characters that are safe in a quoted header", () => {
		const name = createExportFileName({
			eventName: 'Evento " perigoso \\ com ; caracteres',
			reportName: "Orçamento",
			format: "pdf",
			date: stamp,
		});
		expect(name).toMatch(/^[a-z0-9.-]+$/);
		expect(toAsciiFileName(name)).toBe(name);
	});
});

describe("slugify", () => {
	it("drops accents and punctuation", () => {
		// "&" is punctuation, not a word: runs of non-alphanumerics collapse to
		// a single dash, so "Criação & Café" reads "criacao-cafe".
		expect(slugify("Criação & Café nº 4 / 2026")).toBe(
			"criacao-cafe-no-4-2026",
		);
		expect(slugify("nº 4 · 3ª vez")).toBe("no-4-3a-vez");
	});

	it("never returns a leading, trailing or doubled dash", () => {
		expect(slugify("  ---Olá---Mundo---  ")).toBe("ola-mundo");
	});

	it("returns an empty string when there is nothing to keep", () => {
		expect(slugify("!!!")).toBe("");
	});
});

describe("contentDisposition", () => {
	it("defaults to attachment", () => {
		const header = contentDisposition("muxima-evento-orcamento.pdf");
		expect(header).toContain("attachment;");
		expect(header).toContain('filename="muxima-evento-orcamento.pdf"');
	});

	it("switches to inline for the browser preview", () => {
		expect(contentDisposition("relatorio.pdf", true)).toContain("inline;");
	});

	it("emits an ASCII fallback plus the UTF-8 name", () => {
		const header = contentDisposition("muxima-acao.pdf");
		expect(header).toContain("filename*=UTF-8''muxima-acao.pdf");
	});

	it("never lets a quote or backslash break out of the quoted filename", () => {
		const header = contentDisposition('muxima-a"b\\c.pdf');
		expect(header).toContain('filename="muxima-abc.pdf"');
	});

	it("cannot be used to inject another header directive", () => {
		const header = contentDisposition("muxima-a\r\nX-Injected: 1.pdf");
		expect(header).not.toContain("\r");
		expect(header).not.toContain("\n");
	});
});

describe("export registry", () => {
	it("only accepts known modules", () => {
		expect(isExportModule("budget")).toBe(true);
		expect(isExportModule("../../etc/passwd")).toBe(false);
		expect(isExportModule("constructor")).toBe(false);
	});

	it("keeps the per-event module list free of the individual documents", () => {
		for (const module of EVENT_EXPORT_MODULES) {
			expect(isExportModule(module)).toBe(true);
		}
		expect(EVENT_EXPORT_MODULES).not.toContain("dedication");
		expect(EVENT_EXPORT_MODULES).not.toContain("invitation");
	});

	it("recognises only the ten event modules as reachable from the event route", () => {
		expect(isEventExportModule("tasks")).toBe(true);
		expect(isEventExportModule("dedication")).toBe(false);
		expect(isEventExportModule("invitation")).toBe(false);
	});

	it("builds every event module in both formats", () => {
		for (const module of EVENT_EXPORT_MODULES) {
			expect(getReportBuilder(module, "pdf"), `${module} pdf`).toBeDefined();
			expect(getReportBuilder(module, "xlsx"), `${module} xlsx`).toBeDefined();
		}
	});

	it("serves dedication and invitation as PDF only", () => {
		expect(getReportBuilder("dedication", "pdf")).toBeDefined();
		expect(getReportBuilder("dedication", "xlsx")).toBeUndefined();
		expect(getReportBuilder("invitation", "pdf")).toBeDefined();
		expect(getReportBuilder("invitation", "xlsx")).toBeUndefined();
	});

	it("names the report per format and refuses an unsupported pair", () => {
		expect(getReportName("budget", "pdf")).toBe("Orçamento");
		expect(getReportName("budget", "xlsx")).toBe("Orçamento (XLSX)");
		expect(getReportName("dedication", "xlsx")).toBeUndefined();
	});

	it("throws a typed error the route maps to 404", () => {
		const error = new ExportNotSupportedError("dedication", "xlsx");
		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe("ExportNotSupportedError");
		expect(error.module).toBe("dedication");
		expect(error.format).toBe("xlsx");
	});
});
