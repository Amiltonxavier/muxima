import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import { PrismaClient } from "../../generated/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../../apps/server/.env") });

const adapter = new PrismaPg({
	connectionString: process.env.DATABASE_URL!,
});

export const prisma = new PrismaClient({ adapter });

// ── Timestamps ──────────────────────────────────────────────────────
export const now = new Date();
export const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);
export const daysAhead = (d: number) => new Date(now.getTime() + d * 86_400_000);
export const monthsAhead = (m: number) => {
	const d = new Date(now);
	d.setMonth(d.getMonth() + m);
	return d;
};
export const monthsAgo = (m: number) => {
	const d = new Date(now);
	d.setMonth(d.getMonth() - m);
	return d;
};
export const hoursAhead = (h: number) => new Date(now.getTime() + h * 3_600_000);

// ── User IDs ────────────────────────────────────────────────────────
export const USER_OWNER = "usr_owner_001";
export const USER_PARTNER = "usr_partner_002";
export const USER_ADMIN = "usr_admin_003";
export const USER_EDITOR = "usr_editor_004";
export const USER_VIEWER = "usr_viewer_005";

// ── Event IDs ───────────────────────────────────────────────────────
export const EVENTS = {
	WEDDING: "evt_wedding_001",
	ENGAGEMENT: "evt_engagement_002",
	BIRTHDAY: "evt_birthday_003",
	CONFERENCE: "evt_conference_004",
	WEDDING_CANCELLED: "evt_wed_cancel_005",
	GRADUATION: "evt_graduation_006",
	CORPORATE: "evt_corporate_007",
	WORKSHOP: "evt_workshop_008",
	BABY_SHOWER: "evt_babyshower_009",
	CEREMONY: "evt_ceremony_010",
} as const;

// ── Helper: Date on event day at specific hour ──────────────────────
export function eventDateTime(eventDate: Date, hours: number, minutes = 0): Date {
	const d = new Date(eventDate);
	d.setHours(hours, minutes, 0, 0);
	return d;
}

// ── Table assignment type ───────────────────────────────────────────
export interface TableAssignment {
	tableId: string;
	guestId: string;
}
