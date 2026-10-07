import { describe, expect, it } from "vitest";
import { buildLoginUrl, sanitizeReturnTo } from "../auth-redirect";

describe("sanitizeReturnTo", () => {
	it("permite caminhos internos", () => {
		expect(sanitizeReturnTo("/dashboard", "http://localhost:3000")).toBe(
			"/dashboard",
		);
	});

	it("preserva query e hash", () => {
		expect(
			sanitizeReturnTo("/events/123?tab=guests", "http://localhost:3000"),
		).toBe("/events/123?tab=guests");
		expect(sanitizeReturnTo("/events/123#tab", "http://localhost:3000")).toBe(
			"/events/123#tab",
		);
	});

	it("rejeita dominio externo", () => {
		expect(sanitizeReturnTo("https://evil.com", "http://localhost:3000")).toBe(
			null,
		);
		expect(
			sanitizeReturnTo("http://evil.com/path", "http://localhost:3000"),
		).toBe(null);
	});

	it("rejeita //evil.com", () => {
		expect(sanitizeReturnTo("//evil.com", "http://localhost:3000")).toBe(null);
	});

	it("rejeita javascript:", () => {
		expect(
			sanitizeReturnTo("javascript:alert(1)", "http://localhost:3000"),
		).toBe(null);
	});

	it("rejeita data: vbscript:", () => {
		expect(
			sanitizeReturnTo("data:text/html,<script>", "http://localhost:3000"),
		).toBe(null);
		expect(
			sanitizeReturnTo("vbscript:msgbox(1)", "http://localhost:3000"),
		).toBe(null);
	});

	it("rejeita caminhos fora do origin mesmo relativos maliciosos", () => {
		// URL com scheme relativo tratado; mas validamos origin
		expect(
			sanitizeReturnTo("https://evil.com/path", "http://localhost:3000"),
		).toBe(null);
	});
});

describe("buildLoginUrl", () => {
	it("constrói url com returnTo seguro", () => {
		const url = buildLoginUrl("/dashboard", "http://localhost:3000");
		expect(url).toBe("/login?returnTo=%2Fdashboard");
	});

	it("ignora returnTo inseguro", () => {
		const url = buildLoginUrl("javascript:alert(1)", "http://localhost:3000");
		expect(url).toBe("/login");
	});
});
