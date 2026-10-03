import type { jsPDF } from "jspdf";

export const INV_GOLD = { r: 198, g: 169, b: 90 } as const; // #c6a95a
export const INV_DARK_GOLD = { r: 162, g: 138, b: 70 } as const; // #a28a46
export const INV_INK = { r: 40, g: 40, b: 40 } as const; // #282828
export const INV_MUTED = { r: 120, g: 120, b: 120 } as const; // #787878
export const INV_PAPER = { r: 252, g: 250, b: 244 } as const; // #fcfaf4
export const INV_LINE = { r: 225, g: 215, b: 180 } as const; // #e1d7b4

export const INV_FONT_SERIF = "times";
export const INV_FONT_SANS = "helvetica";

export const INV_SIZE = {
	title: 28,
	subtitle: 14,
	name: 22,
	label: 9,
	body: 10,
	small: 8.5,
	footer: 8,
} as const;

export const INV_PAGE = { width: 595.28, height: 841.89 } as const;
export const INV_MARGIN = 56;

export function invHex(color: { r: number; g: number; b: number }): string {
	const toHex = (value: number) =>
		Math.max(0, Math.min(255, Math.round(value)))
			.toString(16)
			.padStart(2, "0");
	return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

export function invEnsureSpace(doc: jsPDF, y: number, needed: number): number {
	if (y + needed <= INV_PAGE.height - INV_MARGIN) return y;
	doc.addPage();
	return INV_MARGIN;
}
