import type {
	DedicationStatus,
	DedicationType,
} from "@muxima/api/shared/types/entities";
import { create } from "zustand";

/**
 * Local drafts keep unsaved editor work safe across reloads, but they are
 * never a source of truth: a draft only survives while its `baseUpdatedAt`
 * still matches the server row it was started from. As soon as someone else
 * saves, the draft is discarded instead of overwriting their changes.
 */

export type DedicationDraft = {
	dedicationId: string | null;
	title: string;
	type: DedicationType;
	status: DedicationStatus;
	/** Serialised Tiptap document, kept as JSON on purpose. */
	content: unknown;
	visibility: "PRIVATE" | "SHARED";
	viewerEventMemberIds: string[];
	/** `updatedAt` of the row this draft was branched from. */
	baseUpdatedAt: string | null;
	savedAt: string;
};

const STORAGE_KEY = "muxima:dedication-drafts";
const MAX_DRAFT_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type DraftState = {
	drafts: Record<string, DedicationDraft>;
	hydrate: () => void;
	saveDraft: (key: string, draft: DedicationDraft) => void;
	discardDraft: (key: string) => void;
	/**
	 * Returns the stored draft only when it is still compatible with the
	 * server state, otherwise it is dropped and `null` is returned.
	 */
	reconcileDraft: (
		key: string,
		currentUpdatedAt: string | null,
	) => DedicationDraft | null;
};

function readStorage(): Record<string, DedicationDraft> {
	if (typeof window === "undefined") return {};
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw) as Record<string, DedicationDraft>;
		if (!parsed || typeof parsed !== "object") return {};

		const now = Date.now();
		const entries = Object.entries(parsed).filter(([, draft]) => {
			if (!draft?.savedAt) return false;
			return now - new Date(draft.savedAt).getTime() < MAX_DRAFT_AGE_MS;
		});
		return Object.fromEntries(entries);
	} catch {
		return {};
	}
}

function writeStorage(drafts: Record<string, DedicationDraft>) {
	if (typeof window === "undefined") return;
	try {
		if (Object.keys(drafts).length === 0) {
			window.localStorage.removeItem(STORAGE_KEY);
			return;
		}
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
	} catch {
		// Quota or private-mode failures must not break editing.
	}
}

/** `new:${eventId}` while creating, `edit:${dedicationId}` once it exists. */
export function draftKey(dedicationId: string | null, eventId: string): string {
	return dedicationId ? `edit:${dedicationId}` : `new:${eventId}`;
}

export const useDedicationDrafts = create<DraftState>((set, get) => ({
	drafts: {},

	hydrate: () => {
		set({ drafts: readStorage() });
	},

	saveDraft: (key, draft) => {
		const drafts = { ...get().drafts, [key]: draft };
		set({ drafts });
		writeStorage(drafts);
	},

	discardDraft: (key) => {
		if (!(key in get().drafts)) return;
		const drafts = { ...get().drafts };
		delete drafts[key];
		set({ drafts });
		writeStorage(drafts);
	},

	reconcileDraft: (key, currentUpdatedAt) => {
		const draft = get().drafts[key];
		if (!draft) return null;

		const stale = draft.baseUpdatedAt !== (currentUpdatedAt ?? null);
		if (stale) {
			get().discardDraft(key);
			return null;
		}
		return draft;
	},
}));
