import type { ChecklistStatusValue } from "../-queries/checklist-queries";

/** `undefined` means "todos os estados" in the list filter. */
export type ChecklistStatusFilterValue = ChecklistStatusValue | undefined;

/** What a checklist item can be linked to (mutually exclusive on the API). */
export type LinkType = "NONE" | "SUPPLIER" | "INVENTORY";

/** Shape held by the item form while the user is typing. */
export type ChecklistItemFormValues = {
	title: string;
	description: string;
	dueDate: string;
	status: ChecklistStatusValue;
	linkType: LinkType;
	linkId: string;
};
