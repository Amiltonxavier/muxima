import { beforeEach, describe, expect, it } from "vitest";
import {
	type DedicationDraft,
	draftKey,
	useDedicationDrafts,
} from "../dedication-drafts";
import {
	EMPTY_RICH_TEXT,
	isRichTextEmpty,
	richTextToPlainText,
} from "../rich-text";

const STORAGE_KEY = "muxima:dedication-drafts";

function makeDraft(overrides: Partial<DedicationDraft> = {}): DedicationDraft {
	return {
		dedicationId: "ded_1",
		title: "Votos",
		type: "WEDDING_VOW",
		status: "DRAFT",
		content: EMPTY_RICH_TEXT,
		visibility: "PRIVATE",
		viewerEventMemberIds: [],
		baseUpdatedAt: "2026-01-01T00:00:00.000Z",
		savedAt: new Date().toISOString(),
		...overrides,
	};
}

describe("draftKey", () => {
	it("uses the dedication id when editing", () => {
		expect(draftKey("ded_1", "evt_1")).toBe("edit:ded_1");
	});

	it("scopes a new draft to the event", () => {
		expect(draftKey(null, "evt_1")).toBe("new:evt_1");
	});
});

describe("rich text helpers", () => {
	it("treats an empty document as empty", () => {
		expect(isRichTextEmpty(EMPTY_RICH_TEXT)).toBe(true);
		expect(isRichTextEmpty(null)).toBe(true);
	});

	it("flattens nested text", () => {
		const doc = {
			type: "doc",
			content: [
				{ type: "paragraph", content: [{ type: "text", text: "Olá" }] },
				{
					type: "paragraph",
					content: [{ type: "text", text: "mundo" }],
				},
			],
		};
		expect(richTextToPlainText(doc)).toBe("Olámundo");
		expect(isRichTextEmpty(doc)).toBe(false);
	});
});

describe("useDedicationDrafts", () => {
	beforeEach(() => {
		window.localStorage.clear();
		useDedicationDrafts.setState({ drafts: {} });
	});

	it("persists a draft to localStorage", () => {
		useDedicationDrafts.getState().saveDraft("edit:ded_1", makeDraft());

		const raw = window.localStorage.getItem(STORAGE_KEY);
		expect(raw).toBeTruthy();
		expect(JSON.parse(raw as string)["edit:ded_1"].title).toBe("Votos");
	});

	it("keeps a draft that still matches the server row", () => {
		useDedicationDrafts.getState().saveDraft("edit:ded_1", makeDraft());

		const recovered = useDedicationDrafts
			.getState()
			.reconcileDraft("edit:ded_1", "2026-01-01T00:00:00.000Z");

		expect(recovered?.title).toBe("Votos");
		expect(useDedicationDrafts.getState().drafts["edit:ded_1"]).toBeTruthy();
	});

	it("discards a draft when the row changed underneath it", () => {
		useDedicationDrafts.getState().saveDraft("edit:ded_1", makeDraft());

		// Someone else saved first, so `updatedAt` no longer matches.
		const recovered = useDedicationDrafts
			.getState()
			.reconcileDraft("edit:ded_1", "2026-02-02T00:00:00.000Z");

		expect(recovered).toBeNull();
		expect(useDedicationDrafts.getState().drafts["edit:ded_1"]).toBeUndefined();
		expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
	});

	it("returns null when there is nothing stored", () => {
		expect(
			useDedicationDrafts.getState().reconcileDraft("edit:missing", null),
		).toBeNull();
	});

	it("drops expired drafts on hydrate", () => {
		window.localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				"edit:old": makeDraft({
					savedAt: new Date(
						Date.now() - 30 * 24 * 60 * 60 * 1000,
					).toISOString(),
				}),
			}),
		);

		useDedicationDrafts.getState().hydrate();

		expect(useDedicationDrafts.getState().drafts["edit:old"]).toBeUndefined();
	});

	it("survives malformed storage content", () => {
		window.localStorage.setItem(STORAGE_KEY, "not json");

		expect(() => useDedicationDrafts.getState().hydrate()).not.toThrow();
		expect(useDedicationDrafts.getState().drafts).toEqual({});
	});

	it("removes the storage entry once the last draft is discarded", () => {
		useDedicationDrafts.getState().saveDraft("edit:ded_1", makeDraft());
		useDedicationDrafts.getState().discardDraft("edit:ded_1");

		expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
	});
});
