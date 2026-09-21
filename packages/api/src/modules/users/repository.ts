import db from "@muxima/db";

export const UserRepository = {
	findById(id: string) {
		return db.user.findUnique({ where: { id } });
	},

	update(
		id: string,
		data: Partial<{
			name: string;
			email: string;
			phone: string;
		}>,
	) {
		return db.user.update({ where: { id }, data });
	},

	findByEventMembers(eventId: string) {
		return db.eventMember.findMany({
			where: { eventId },
			include: { user: true },
		});
	},
};
