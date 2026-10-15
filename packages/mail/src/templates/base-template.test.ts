import { describe, expect, it } from "vitest";
import {
	bulletList,
	detailList,
	escapeHtml,
	infoBox,
	otpCodeBlock,
	renderBaseEmail,
} from "./base-template";

describe("escapeHtml", () => {
	it("neutralizes markup so values cannot inject HTML", () => {
		expect(escapeHtml(`<script>alert("x")</script>'&`)).not.toContain(
			"<script>",
		);
		expect(escapeHtml("<b>")).toBe("&lt;b&gt;");
	});

	it("escapes quotes used in attribute position", () => {
		expect(escapeHtml('url" onmouseover="x')).toContain("&quot;");
	});
});

describe("renderBaseEmail", () => {
	it("keeps subject, title, description, CTA and preheader escaped and present", () => {
		const { html } = renderBaseEmail({
			to: "a@b.c",
			subject: "Assunto",
			preheader: "Pré-texto",
			title: "Título",
			description: "Descrição do e-mail",
			cta: {
				label: "Aceitar",
				url: "https://app.muxima.test/invite?token=abc",
			},
			footerNote: "Evento: Festa",
		});

		expect(html).toContain("<title>Assunto</title>");
		expect(html).toContain("Pré-texto");
		expect(html).toContain("Título");
		expect(html).toContain("Descrição do e-mail");
		expect(html).toContain("Aceitar");
		expect(html).toContain("https://app.muxima.test/invite?token=abc");
		expect(html).toContain("Evento: Festa");
		expect(html).toContain("Muxima");
	});

	it("renders the CTA link as an absolute URL (never a relative path)", () => {
		const { html } = renderBaseEmail({
			to: "a@b.c",
			subject: "s",
			preheader: "p",
			title: "t",
			cta: { label: "Ver", url: "https://app.muxima.test/events/evt_1" },
		});
		expect(html).toMatch(/href="https:\/\//);
		expect(html).not.toMatch(/href="\/[^"]*"/);
	});

	it("prevents field values from breaking out of markup", () => {
		const { html } = renderBaseEmail({
			to: "a@b.c",
			subject: "Ataque",
			preheader: "p",
			title: "<script>alert(1)</script>",
			description: '<b onclick="x">texto',
			cta: { label: "ok", url: 'https://x.test/" onmouseover="hack' },
		});
		expect(html).not.toContain("<script>alert(1)</script>");
		expect(html).not.toContain('onmouseover="hack');
		expect(html).toContain("&lt;script&gt;");
	});

	it("produces a plain-text fallback including title, description and CTAs", () => {
		const { text } = renderBaseEmail({
			to: "a@b.c",
			subject: "s",
			preheader: "p",
			title: "Título",
			description: "Corpo",
			cta: { label: "Aceitar", url: "https://app.muxima.test/i" },
			secondaryCta: { label: "Recusar", url: "https://app.muxima.test/r" },
			footerNote: "Nota",
		});
		expect(text).toContain("Título");
		expect(text).toContain("Corpo");
		expect(text).toContain("Aceitar → https://app.muxima.test/i");
		expect(text).toContain("Recusar → https://app.muxima.test/r");
	});
});

describe("content helpers", () => {
	it("renders the OTP block with the untouched code", () => {
		const html = otpCodeBlock("123 456");
		expect(html).toContain("123 456");
	});

	it("renders a detail list with labels and values", () => {
		const html = detailList([
			{ label: "Evento", value: "Festa" },
			{ label: "Papel", value: "Admin" },
		]);
		expect(html).toContain("Evento");
		expect(html).toContain("Festa");
		expect(html).toContain("Admin");
	});

	it("renders a bulleted list of permissions", () => {
		const html = bulletList(["Ver orçamento", "Gerir convites"]);
		expect(html).toContain("Ver orçamento");
		expect(html).toContain("Gerir convites");
	});

	it("escapes text inside info boxes", () => {
		const html = infoBox("<img src=x onerror=alert(1)>");
		expect(html).not.toContain("<img");
	});
});
