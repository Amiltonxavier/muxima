export type FoodPlanItemRow = {
	id: string;
	name: string;
	category: string;
	quantity: number;
	unit: string;
	description: string | null;
	notes: string | null;
	status: string;
	position: number;
	createdAt: string | Date;
	updatedAt: string | Date;
	customFields: unknown;
};
