import type { RichTextNode } from "@muxima/api/shared/types/entities";

/**
 * The document the backend stores when nothing has been written yet, mirrored
 * here so the editor starts from the same shape instead of inventing one.
 */
export const EMPTY_RICH_TEXT: RichTextNode = {
	type: "doc",
	content: [{ type: "paragraph" }],
};

/** Flattens a Tiptap document to plain text for previews and empty checks. */
export function richTextToPlainText(
	node: RichTextNode | null | undefined,
): string {
	if (!node) return "";
	if (typeof node.text === "string") return node.text;
	if (!node.content?.length) return "";
	return node.content.map((child) => richTextToPlainText(child)).join("");
}

export function isRichTextEmpty(
	node: RichTextNode | null | undefined,
): boolean {
	return richTextToPlainText(node).trim().length === 0;
}
