import type {
	DedicationStatus,
	DedicationType,
	RichTextNode,
} from "@muxima/api/shared/types/entities";

export type DedicationTypeFilter = "ALL" | DedicationType;
export type DedicationStatusFilter = "ALL" | DedicationStatus;
export type DedicationVisibilityFilter = "ALL" | "PRIVATE" | "SHARED";

/**
 * Which overlay is open. A single discriminated union keeps the dialog
 * wiring in one place instead of a boolean per dialog.
 */
export type DedicationDialogState =
	| { kind: "none" }
	| { kind: "create" }
	| { kind: "edit"; id: string }
	| { kind: "view"; id: string }
	| { kind: "visibility"; id: string }
	| { kind: "delete"; id: string };

/** A member as rendered in the sharing picker, normalised from the API. */
export type ViewerMember = {
	/** EventMember id — what the API expects. */
	id: string;
	userId: string;
	name: string;
	email: string;
	isActive: boolean;
	/** Present for existing grants; `null` until the viewer opens it. */
	lastOpenedAt?: string | null;
};

/** Values the form dialog edits. */
export type DedicationFormValues = {
	title: string;
	type: DedicationType;
	status: DedicationStatus;
	content: RichTextNode;
};
