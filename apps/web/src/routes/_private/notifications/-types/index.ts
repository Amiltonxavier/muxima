export type Notification = {
	id: string;
	title: string;
	message?: string | null;
	readAt?: string | null;
	createdAt: string;
};
