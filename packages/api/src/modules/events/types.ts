export type CreateEventInput = {
	name: string;
	type: "ENGAGEMENT" | "WEDDING";
	eventDate?: string;
	description?: string;
};

export type UpdateEventInput = Partial<CreateEventInput> & {
	status?: "DRAFT" | "PLANNING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
};
