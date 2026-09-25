import {
	daysAgo,
	EVENTS,
	prisma,
	USER_ADMIN,
	USER_EDITOR,
	USER_OWNER,
	USER_PARTNER,
	USER_VIEWER,
} from "./helpers";

export async function seedUsers() {
	const users = [
		{
			id: USER_OWNER,
			name: "Ana Fernandes",
			email: "ana@muxima.ao",
			emailVerified: true,
			image: null,
			phone: "+244 923 100 001",
		},
		{
			id: USER_PARTNER,
			name: "Carlos Mendes",
			email: "carlos@muxima.ao",
			emailVerified: true,
			image: null,
			phone: "+244 923 100 002",
		},
		{
			id: USER_ADMIN,
			name: "Sofia Neto",
			email: "sofia@muxima.ao",
			emailVerified: true,
			image: null,
			phone: "+244 923 100 003",
		},
		{
			id: USER_EDITOR,
			name: "Miguel Tavares",
			email: "miguel@muxima.ao",
			emailVerified: true,
			image: null,
			phone: "+244 923 100 004",
		},
		{
			id: USER_VIEWER,
			name: "Laura Simões",
			email: "laura@muxima.ao",
			emailVerified: false,
			image: null,
			phone: "+244 923 100 005",
		},
	];

	for (const u of users) {
		await prisma.user.upsert({
			where: { id: u.id },
			update: {},
			create: u,
		});
	}
	console.log("  ✅ Users (5)");

	return users;
}

export async function seedEventMembers() {
	const memberData = [
		// Event 1: Wedding — Ana (owner), Carlos (partner), Sofia (admin), Laura (viewer)
		{
			eventId: EVENTS.WEDDING,
			userId: USER_OWNER,
			role: "OWNER" as const,
			status: "ACTIVE" as const,
			joinedAt: daysAgo(90),
		},
		{
			eventId: EVENTS.WEDDING,
			userId: USER_PARTNER,
			role: "PARTNER" as const,
			status: "ACTIVE" as const,
			joinedAt: daysAgo(85),
		},
		{
			eventId: EVENTS.WEDDING,
			userId: USER_ADMIN,
			role: "ADMIN" as const,
			status: "ACTIVE" as const,
			joinedAt: daysAgo(80),
		},
		{
			eventId: EVENTS.WEDDING,
			userId: USER_VIEWER,
			role: "VIEWER" as const,
			status: "ACTIVE" as const,
			joinedAt: daysAgo(70),
		},

		// Event 2: Engagement — Carlos (owner), Ana (partner), Miguel (editor)
		{
			eventId: EVENTS.ENGAGEMENT,
			userId: USER_PARTNER,
			role: "OWNER" as const,
			status: "ACTIVE" as const,
			joinedAt: daysAgo(45),
		},
		{
			eventId: EVENTS.ENGAGEMENT,
			userId: USER_OWNER,
			role: "PARTNER" as const,
			status: "ACTIVE" as const,
			joinedAt: daysAgo(40),
		},
		{
			eventId: EVENTS.ENGAGEMENT,
			userId: USER_EDITOR,
			role: "EDITOR" as const,
			status: "ACTIVE" as const,
			joinedAt: daysAgo(35),
		},

		// Event 3: Birthday — Ana (owner), Sofia (admin)
		{
			eventId: EVENTS.BIRTHDAY,
			userId: USER_OWNER,
			role: "OWNER" as const,
			status: "ACTIVE" as const,
			joinedAt: daysAgo(60),
		},
		{
			eventId: EVENTS.BIRTHDAY,
			userId: USER_ADMIN,
			role: "ADMIN" as const,
			status: "ACTIVE" as const,
			joinedAt: daysAgo(55),
		},

		// Event 4: Conference — Sofia (owner), Ana (partner), Miguel (editor)
		{
			eventId: EVENTS.CONFERENCE,
			userId: USER_ADMIN,
			role: "OWNER" as const,
			status: "ACTIVE" as const,
			joinedAt: daysAgo(120),
		},
		{
			eventId: EVENTS.CONFERENCE,
			userId: USER_OWNER,
			role: "PARTNER" as const,
			status: "ACTIVE" as const,
			joinedAt: daysAgo(115),
		},
		{
			eventId: EVENTS.CONFERENCE,
			userId: USER_EDITOR,
			role: "EDITOR" as const,
			status: "ACTIVE" as const,
			joinedAt: daysAgo(110),
		},

		// Event 5: Wedding Cancelled — Sofia (owner), Ana (partner)
		{
			eventId: EVENTS.WEDDING_CANCELLED,
			userId: USER_ADMIN,
			role: "OWNER" as const,
			status: "ACTIVE" as const,
			joinedAt: daysAgo(100),
		},
		{
			eventId: EVENTS.WEDDING_CANCELLED,
			userId: USER_OWNER,
			role: "PARTNER" as const,
			status: "ACTIVE" as const,
			joinedAt: daysAgo(95),
		},

		// Event 6: Graduation — Ana (owner) only
		{
			eventId: EVENTS.GRADUATION,
			userId: USER_OWNER,
			role: "OWNER" as const,
			status: "ACTIVE" as const,
			joinedAt: daysAgo(5),
		},

		// Event 7: Corporate Dinner — Carlos (owner), Laura (viewer)
		{
			eventId: EVENTS.CORPORATE,
			userId: USER_PARTNER,
			role: "OWNER" as const,
			status: "ACTIVE" as const,
			joinedAt: daysAgo(40),
		},
		{
			eventId: EVENTS.CORPORATE,
			userId: USER_VIEWER,
			role: "VIEWER" as const,
			status: "PENDING" as const,
			joinedAt: null,
		},

		// Event 8: Workshop — Miguel (owner), Ana (partner)
		{
			eventId: EVENTS.WORKSHOP,
			userId: USER_EDITOR,
			role: "OWNER" as const,
			status: "ACTIVE" as const,
			joinedAt: daysAgo(30),
		},
		{
			eventId: EVENTS.WORKSHOP,
			userId: USER_OWNER,
			role: "PARTNER" as const,
			status: "ACTIVE" as const,
			joinedAt: daysAgo(25),
		},

		// Event 9: Baby Shower — Sofia (owner), Ana (partner)
		{
			eventId: EVENTS.BABY_SHOWER,
			userId: USER_ADMIN,
			role: "OWNER" as const,
			status: "ACTIVE" as const,
			joinedAt: daysAgo(80),
		},
		{
			eventId: EVENTS.BABY_SHOWER,
			userId: USER_OWNER,
			role: "PARTNER" as const,
			status: "ACTIVE" as const,
			joinedAt: daysAgo(75),
		},

		// Event 10: Ceremony — Ana (owner), Carlos (partner), Sofia (admin), Laura (viewer)
		{
			eventId: EVENTS.CEREMONY,
			userId: USER_OWNER,
			role: "OWNER" as const,
			status: "ACTIVE" as const,
			joinedAt: daysAgo(60),
		},
		{
			eventId: EVENTS.CEREMONY,
			userId: USER_PARTNER,
			role: "PARTNER" as const,
			status: "ACTIVE" as const,
			joinedAt: daysAgo(55),
		},
		{
			eventId: EVENTS.CEREMONY,
			userId: USER_ADMIN,
			role: "ADMIN" as const,
			status: "ACTIVE" as const,
			joinedAt: daysAgo(50),
		},
		{
			eventId: EVENTS.CEREMONY,
			userId: USER_VIEWER,
			role: "VIEWER" as const,
			status: "ACTIVE" as const,
			joinedAt: daysAgo(45),
		},
	];

	for (const m of memberData) {
		await prisma.eventMember.upsert({
			where: { eventId_userId: { eventId: m.eventId, userId: m.userId } },
			update: {},
			create: {
				id: `mem_${m.userId}_${m.eventId}`,
				...m,
			},
		});
	}
	console.log(`  ✅ Event Members (${memberData.length})`);

	return memberData;
}
