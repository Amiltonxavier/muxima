import type { RichTextMark, RichTextNode } from "../../shared/types/entities";

/**
 * Tiptap rich-text guard.
 *
 * The browser owns the editor, so nothing that arrives here can be trusted.
 * Every document is rebuilt from scratch against a strict allowlist: unknown
 * node types are dropped, unknown attributes are dropped, and only the marks
 * the editor can produce survive. The result is structurally incapable of
 * carrying markup we did not explicitly allow, so it is safe to hand straight
 * to Tiptap for rendering (no `dangerouslySetInnerHTML` anywhere).
 */

/** Node types the editor can emit. */
const ALLOWED_NODES = new Set([
	"doc",
	"paragraph",
	"heading",
	"text",
	"bulletList",
	"orderedList",
	"listItem",
	"blockquote",
	"codeBlock",
	"horizontalRule",
	"hardBreak",
]);

/** Mark types the editor can emit. */
const ALLOWED_MARKS = new Set([
	"bold",
	"italic",
	"underline",
	"strike",
	"code",
	"link",
]);

/** Marks that carry attributes; everything else is a bare boolean toggle. */
const ALLOWED_MARK_ATTRS: Record<string, ReadonlySet<string>> = {
	link: new Set(["href", "target", "rel"]),
};

/** Node attributes we are willing to keep, per node type. */
const ALLOWED_NODE_ATTRS: Record<string, ReadonlySet<string>> = {
	heading: new Set(["level"]),
};

/** Node types whose children are inline, so they must not be space-separated. */
const INLINE_CONTAINERS = new Set(["paragraph", "heading", "codeBlock"]);

const MAX_DEPTH = 12;
const MAX_NODES = 2000;
const MAX_TEXT_LENGTH = 20_000;
const MAX_ATTR_LENGTH = 2048;

/** Only these schemes may appear in a link `href`. */
const SAFE_URL = /^(https?:\/\/|mailto:|tel:)/i;

export const EMPTY_RICH_TEXT: RichTextNode = {
	type: "doc",
	content: [{ type: "paragraph" }],
};

export class RichTextError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "RichTextError";
	}
}

type Json = unknown;

function isRecord(value: Json): value is Record<string, Json> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeUrl(value: Json): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	if (trimmed.length > MAX_ATTR_LENGTH) return null;
	// No scheme at all (relative link) is fine; anything with a scheme must
	// match the allowlist, which rejects `javascript:`, `data:` and `vbscript:`.
	if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
	return SAFE_URL.test(trimmed) ? trimmed : null;
}

function sanitizeMark(mark: Json): RichTextMark | null {
	if (!isRecord(mark) || typeof mark.type !== "string") return null;
	if (!ALLOWED_MARKS.has(mark.type)) return null;

	const markType = mark.type as RichTextMark["type"];
	const allowedAttrs = ALLOWED_MARK_ATTRS[markType];
	if (!allowedAttrs) return { type: markType };

	// Tiptap nests mark attributes under `attrs`; the outer keys are the mark
	// type and nothing else.
	const rawAttrs = isRecord(mark.attrs) ? mark.attrs : {};
	const attrs: Record<string, string> = {};
	for (const [key, raw] of Object.entries(rawAttrs)) {
		if (!allowedAttrs.has(key)) continue;
		if (key === "href") {
			const href = sanitizeUrl(raw);
			if (href) attrs.href = href;
			continue;
		}
		if (typeof raw === "string" && raw.length <= MAX_ATTR_LENGTH) {
			attrs[key] = raw;
		}
	}

	// A `link` with no usable href carries no meaning and no longer navigates.
	if (markType === "link" && !attrs.href) return null;

	return { type: markType, attrs };
}

function sanitizeMarks(raw: Json): RichTextMark[] | undefined {
	if (!Array.isArray(raw)) return undefined;
	const marks = raw
		.map(sanitizeMark)
		.filter((mark): mark is RichTextMark => mark !== null);
	return marks.length > 0 ? marks : undefined;
}

function sanitizeAttrs(type: string, raw: Json): RichTextNode["attrs"] {
	if (!isRecord(raw)) return undefined;
	const allowedAttrs = ALLOWED_NODE_ATTRS[type];
	if (!allowedAttrs) return undefined;

	const attrs: Record<string, string | number | boolean | null> = {};
	for (const [key, value] of Object.entries(raw)) {
		if (!allowedAttrs.has(key)) continue;
		if (typeof value === "number" || typeof value === "boolean") {
			attrs[key] = value;
		} else if (typeof value === "string" && value.length <= MAX_ATTR_LENGTH) {
			attrs[key] = value;
		}
	}

	// A heading without a valid level would render unpredictably; fall back to
	// level 2 rather than trusting the payload.
	if (type === "heading") {
		const level = attrs.level;
		if (
			typeof level !== "number" ||
			!Number.isInteger(level) ||
			level < 1 ||
			level > 6
		) {
			attrs.level = 2;
		}
	}

	return Object.keys(attrs).length > 0 ? attrs : undefined;
}

type Budget = { nodes: number; text: number };

function sanitizeNode(
	raw: Json,
	depth: number,
	budget: Budget,
	insideList: boolean,
): RichTextNode | null {
	if (!isRecord(raw) || typeof raw.type !== "string") return null;
	if (depth > MAX_DEPTH) return null;

	const type = raw.type;
	if (!ALLOWED_NODES.has(type)) return null;

	budget.nodes += 1;
	if (budget.nodes > MAX_NODES) {
		throw new RichTextError("O conteúdo é demasiado longo para ser guardado");
	}

	// `listItem` is only meaningful inside a list; a stray one is a sign of a
	// hand-crafted payload, so it is dropped instead of rendered.
	if (type === "listItem" && !insideList) return null;

	const node: RichTextNode = { type };
	const attrs = sanitizeAttrs(type, raw.attrs);
	if (attrs) node.attrs = attrs;

	if (type === "text") {
		if (typeof raw.text !== "string" || raw.text.length === 0) return null;
		budget.text += raw.text.length;
		if (budget.text > MAX_TEXT_LENGTH) {
			throw new RichTextError("O conteúdo é demasiado longo para ser guardado");
		}
		node.text = raw.text;
		const marks = sanitizeMarks(raw.marks);
		if (marks) node.marks = marks;
		return node;
	}

	if (type === "horizontalRule" || type === "hardBreak") return node;

	if (Array.isArray(raw.content)) {
		const childInsideList = type === "bulletList" || type === "orderedList";
		const children = raw.content
			.map((child) => sanitizeNode(child, depth + 1, budget, childInsideList))
			.filter((child): child is RichTextNode => child !== null);
		// An empty container is not representable in ProseMirror; keep it as a
		// plain paragraph so the user's caret position survives a round-trip.
		if (children.length === 0) return { type: "paragraph" };
		node.content = children;
	} else if (type === "doc") {
		// A document with no blocks at all gets a single empty paragraph.
		node.content = [{ type: "paragraph" }];
	}

	return node;
}

/**
 * Rebuild a Tiptap document from an untrusted payload.
 *
 * @throws RichTextError when the payload is not a Tiptap document, or when it
 * exceeds the size limits. Anything merely *unknown* is silently stripped
 * rather than rejected, so a payload that mixes valid and invalid nodes still
 * yields a usable document.
 */
export function sanitizeRichTextContent(raw: unknown): RichTextNode {
	if (!isRecord(raw) || raw.type !== "doc") {
		throw new RichTextError("O conteúdo do editor tem um formato inválido");
	}

	const budget: Budget = { nodes: 0, text: 0 };
	const content = Array.isArray(raw.content)
		? raw.content
				.map((child) => sanitizeNode(child, 1, budget, false))
				.filter((child): child is RichTextNode => child !== null)
		: [];

	return {
		type: "doc",
		content: content.length > 0 ? content : [{ type: "paragraph" }],
	};
}

/** Non-throwing variant, for callers that want to fall back instead. */
export function parseRichTextContent(raw: unknown): RichTextNode | null {
	try {
		return sanitizeRichTextContent(raw);
	} catch {
		return null;
	}
}

/**
 * Plain-text projection of a document, used for list excerpts. Inline runs are
 * concatenated directly (so styled runs do not gain a phantom space) while
 * block boundaries are separated.
 */
export function richTextToPlainText(node: RichTextNode): string {
	if (node.type === "text") return node.text ?? "";
	if (node.type === "hardBreak" || node.type === "horizontalRule") return " ";
	if (!node.content || node.content.length === 0) return "";

	const parts = node.content.map(richTextToPlainText);
	return INLINE_CONTAINERS.has(node.type) ? parts.join("") : parts.join(" ");
}

export function richTextToExcerpt(node: RichTextNode, maxLength = 120): string {
	const text = richTextToPlainText(node).replace(/\s+/g, " ").trim();
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

/** True when the document holds no text at all (e.g. a fresh editor). */
export function isEmptyRichText(node: RichTextNode): boolean {
	return richTextToPlainText(node).trim().length === 0;
}
