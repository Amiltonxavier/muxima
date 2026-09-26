import { describe, expect, it } from "vitest";
import {
	EMPTY_RICH_TEXT,
	isEmptyRichText,
	RichTextError,
	richTextToExcerpt,
	richTextToPlainText,
	sanitizeRichTextContent,
} from "./rich-text";

const doc = (...content: unknown[]) => ({ type: "doc", content });

describe("sanitizeRichTextContent", () => {
	it("accepts a well-formed document unchanged", () => {
		const input = doc({
			type: "paragraph",
			content: [
				{ type: "text", text: "Os meus votos", marks: [{ type: "bold" }] },
			],
		});

		expect(sanitizeRichTextContent(input)).toEqual(input);
	});

	it("keeps the marks the editor can produce", () => {
		const input = doc({
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "oi",
					marks: [
						{ type: "bold" },
						{ type: "italic" },
						{ type: "underline" },
						{ type: "strike" },
						{ type: "code" },
					],
				},
			],
		});

		expect(sanitizeRichTextContent(input)).toEqual(input);
	});

	it("keeps headings with a valid level and normalises an invalid one", () => {
		const valid = doc({ type: "heading", attrs: { level: 3 } });
		expect(sanitizeRichTextContent(valid)).toEqual(valid);

		expect(
			sanitizeRichTextContent(doc({ type: "heading", attrs: { level: 99 } })),
		).toEqual(doc({ type: "heading", attrs: { level: 2 } }));
	});

	it("rejects a payload that is not a Tiptap document", () => {
		expect(() => sanitizeRichTextContent(null)).toThrow(RichTextError);
		expect(() => sanitizeRichTextContent("<p>oi</p>")).toThrow(RichTextError);
		expect(() => sanitizeRichTextContent({ type: "paragraph" })).toThrow(
			RichTextError,
		);
		expect(() => sanitizeRichTextContent([])).toThrow(RichTextError);
	});

	// The payload is attacker-controlled, so anything outside the allowlist is
	// removed rather than trusted.
	it("drops unknown node types instead of storing them", () => {
		const input = doc(
			{ type: "script", content: [{ type: "text", text: "alert(1)" }] },
			{ type: "paragraph", content: [{ type: "text", text: "segredo" }] },
		);

		expect(sanitizeRichTextContent(input)).toEqual(
			doc({ type: "paragraph", content: [{ type: "text", text: "segredo" }] }),
		);
	});

	it("drops unknown marks and unknown attributes", () => {
		const input = doc({
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "oi",
					marks: [
						{ type: "bold" },
						{ type: "onClick", attrs: { handler: "alert(1)" } },
					],
				},
			],
		});

		expect(sanitizeRichTextContent(input)).toEqual(
			doc({
				type: "paragraph",
				content: [{ type: "text", text: "oi", marks: [{ type: "bold" }] }],
			}),
		);
	});

	it("strips javascript: and data: links but keeps safe schemes", () => {
		const hostile = [
			"javascript:alert(1)",
			"JaVaScRiPt:alert(1)",
			"data:text/html;base64,PHNjcmlwdD4=",
			"vbscript:msgbox(1)",
		];
		for (const href of hostile) {
			const sanitized = sanitizeRichTextContent(
				doc({
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "clique",
							marks: [{ type: "link", attrs: { href } }],
						},
					],
				}),
			);
			expect(JSON.stringify(sanitized)).not.toContain("href");
		}

		for (const href of [
			"https://muxima.ao",
			"http://muxima.ao",
			"mailto:oi@muxima.ao",
			"tel:+244900000000",
		]) {
			const sanitized = sanitizeRichTextContent(
				doc({
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "clique",
							marks: [{ type: "link", attrs: { href } }],
						},
					],
				}),
			);
			expect(JSON.stringify(sanitized)).toContain(href);
		}
	});

	it("rejects a document that nests beyond the depth limit", () => {
		let node: unknown = { type: "text", text: "fundo" };
		for (let i = 0; i < 40; i += 1) {
			node = { type: "blockquote", content: [node] };
		}

		expect(() => sanitizeRichTextContent(doc(node))).not.toThrow();
		expect(
			JSON.stringify(sanitizeRichTextContent(doc(node))).length,
		).toBeLessThan(JSON.stringify(doc(node)).length);
	});

	it("rejects a document with too much text", () => {
		const input = doc({
			type: "paragraph",
			content: [{ type: "text", text: "a".repeat(20_001) }],
		});

		expect(() => sanitizeRichTextContent(input)).toThrow(RichTextError);
	});

	it("rejects a document with too many nodes", () => {
		const content = Array.from({ length: 2500 }, () => ({
			type: "paragraph",
		}));

		expect(() => sanitizeRichTextContent(doc(...content))).toThrow(
			RichTextError,
		);
	});

	it("never returns an empty document", () => {
		expect(sanitizeRichTextContent(doc())).toEqual(EMPTY_RICH_TEXT);
		expect(sanitizeRichTextContent({ type: "doc" })).toEqual(EMPTY_RICH_TEXT);
	});

	it("turns an empty container into a paragraph so the caret survives", () => {
		expect(
			sanitizeRichTextContent(doc({ type: "bulletList", content: [] })),
		).toEqual(doc({ type: "paragraph" }));
	});

	it("drops a list item that is not inside a list", () => {
		expect(
			sanitizeRichTextContent(
				doc({ type: "listItem", content: [{ type: "text", text: "x" }] }),
			),
		).toEqual(doc({ type: "paragraph" }));
	});

	it("drops empty text nodes", () => {
		expect(
			sanitizeRichTextContent(
				doc({ type: "paragraph", content: [{ type: "text", text: "" }] }),
			),
		).toEqual(doc({ type: "paragraph" }));
	});
});

describe("rich text projections", () => {
	it("joins inline runs with spaces", () => {
		expect(
			richTextToPlainText({
				type: "paragraph",
				content: [
					{ type: "text", text: "Amor" },
					{ type: "text", text: " eterno" },
				],
			}),
		).toBe("Amor eterno");
	});

	it("truncates long excerpts with an ellipsis", () => {
		const excerpt = richTextToExcerpt(
			{ type: "paragraph", content: [{ type: "text", text: "a".repeat(300) }] },
			20,
		);

		expect(excerpt).toHaveLength(20);
		expect(excerpt.endsWith("…")).toBe(true);
	});

	it("detects an untouched editor", () => {
		expect(isEmptyRichText(EMPTY_RICH_TEXT)).toBe(true);
		expect(
			isEmptyRichText({
				type: "paragraph",
				content: [{ type: "text", text: "  \n " }],
			}),
		).toBe(true);
		expect(
			isEmptyRichText({
				type: "paragraph",
				content: [{ type: "text", text: "oi" }],
			}),
		).toBe(false);
	});
});
