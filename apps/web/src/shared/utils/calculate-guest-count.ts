export interface GuestCount {
	total: number;
	confirmed: number;
	pending: number;
	declined: number;
	totalCompanions: number;
	totalPeople: number;
}

export function calculateGuestCount(
	guests: Array<{ status: string; companionsLimit: number }>,
): GuestCount {
	const total = guests.length;
	const confirmed = guests.filter((g) => g.status === "CONFIRMED").length;
	const pending = guests.filter(
		(g) => g.status === "PENDING" || g.status === "WAITING",
	).length;
	const declined = guests.filter((g) => g.status === "DECLINED").length;

	const confirmedGuests = guests.filter((g) => g.status === "CONFIRMED");
	const totalCompanions = confirmedGuests.reduce(
		(sum, g) => sum + g.companionsLimit,
		0,
	);
	const totalPeople = confirmed + totalCompanions;

	return {
		total,
		confirmed,
		pending,
		declined,
		totalCompanions,
		totalPeople,
	};
}

export function calculateGuestPercentage(
	confirmed: number,
	total: number,
): number {
	return total > 0 ? Math.round((confirmed / total) * 100) : 0;
}
