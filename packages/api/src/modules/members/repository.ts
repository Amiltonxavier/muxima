import db from "@muxima/db";

export const MemberRepository = {
	create(data: {
		eventId: string;
		userId: string;
		role: string;
		status?: string;
	}) {
		const memberData = {
			...data,
			status: (data.status || "PENDING") as "PENDING" | "ACTIVE" | "INACTIVE",
		};
		return db.eventMember.create({
			data: {
				...memberData,
				role: memberData.role as
					| "OWNER"
					| "PARTNER"
					| "ADMIN"
					| "EDITOR"
					| "VIEWER",
			},
		});
	},

	findByEventAndUser(eventId: string, userId: string) {
		return db.eventMember.findUnique({
			where: { eventId_userId: { eventId, userId } },
		});
	},

	findByEvent(eventId: string) {
		return db.eventMember.findMany({
			where: { eventId },
			include: { user: true },
		});
	},

	updateRole(id: string, role: string) {
		return db.eventMember.update({
			where: { id },
			data: {
				role: role as "OWNER" | "PARTNER" | "ADMIN" | "EDITOR" | "VIEWER",
			},
		});
	},

	delete(id: string) {
		return db.eventMember.delete({ where: { id } });
	},
};
