import type { useInvitations } from "../-queries/invitation-queries";

export type InvitationItem = NonNullable<
	ReturnType<typeof useInvitations>["data"]
>["data"][number];

export type InvitationResponseFilter =
	| "ALL"
	| "PENDING"
	| "CONFIRM"
	| "MAYBE"
	| "DECLINE"
	| "EXPIRED"
	| "CANCELLED";

export type BulkPublishOutcome = {
	invitationId: string;
	code: string | null;
	status: "PUBLISHED" | "ALREADY_PUBLISHED" | "INVALID" | "FAILED";
	error?: string;
};

export type BulkPublishSummary = {
	total: number;
	published: number;
	alreadyPublished: number;
	invalid: number;
	failed: number;
	skipped: number;
	results: BulkPublishOutcome[];
	errors: Array<{ invitationId: string; code: string | null; reason: string }>;
};
