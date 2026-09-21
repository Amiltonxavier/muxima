import db from "@muxima/db";
import type { Prisma, VendorCategory, VendorStatus } from "@muxima/db/prisma";

export type VendorFilterParams = {
	search?: string;
	category?: VendorCategory;
	status?: VendorStatus;
};

function buildVendorWhere(
	eventId: string,
	filters?: VendorFilterParams,
): Prisma.VendorWhereInput {
	const conditions: Prisma.VendorWhereInput[] = [{ eventId }];

	if (filters?.search) {
		conditions.push({
			OR: [
				{ name: { contains: filters.search, mode: "insensitive" } },
				{ email: { contains: filters.search, mode: "insensitive" } },
				{ phone: { contains: filters.search, mode: "insensitive" } },
				{ description: { contains: filters.search, mode: "insensitive" } },
			],
		});
	}
	if (filters?.category) {
		conditions.push({ category: filters.category });
	}
	if (filters?.status) {
		conditions.push({ status: filters.status });
	}

	return { AND: conditions };
}

export const VendorRepository = {
	findByEventId(
		eventId: string,
		pagination: { page: number; limit: number },
		filters?: VendorFilterParams,
	) {
		const skip = (pagination.page - 1) * pagination.limit;
		return db.vendor.findMany({
			where: buildVendorWhere(eventId, filters),
			include: { expenses: true, contracts: true },
			orderBy: { createdAt: "desc" },
			skip,
			take: pagination.limit,
		});
	},

	countByEventId(eventId: string, filters?: VendorFilterParams) {
		return db.vendor.count({ where: buildVendorWhere(eventId, filters) });
	},

	findById(id: string) {
		return db.vendor.findUnique({
			where: { id },
			include: { expenses: { include: { payments: true } }, contracts: true },
		});
	},

	create(data: {
		eventId: string;
		name: string;
		category: VendorCategory;
		phone?: string;
		email?: string;
		address?: string;
		description?: string;
		notes?: string;
	}) {
		return db.vendor.create({ data });
	},

	update(
		id: string,
		data: Partial<{
			name: string;
			category: VendorCategory;
			phone: string;
			email: string;
			address: string;
			description: string;
			notes: string;
			status: VendorStatus;
		}>,
	) {
		return db.vendor.update({ where: { id }, data });
	},

	delete(id: string) {
		return db.vendor.delete({ where: { id } });
	},
};
