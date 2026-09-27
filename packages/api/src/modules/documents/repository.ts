import db from "@muxima/db";
import type { DocumentStatus, DocumentType, Prisma } from "@muxima/db/prisma";

export type DocumentFilterParams = {
	search?: string;
	type?: DocumentType;
	status?: DocumentStatus;
	supplierId?: string;
};

function buildDocumentWhere(
	eventId: string,
	filters?: DocumentFilterParams,
): Prisma.DocumentWhereInput {
	const conditions: Prisma.DocumentWhereInput[] = [{ eventId }];

	if (filters?.search) {
		conditions.push({
			OR: [
				{ name: { contains: filters.search, mode: "insensitive" } },
				{ reference: { contains: filters.search, mode: "insensitive" } },
			],
		});
	}
	if (filters?.type) {
		conditions.push({ type: filters.type });
	}
	if (filters?.status) {
		conditions.push({ status: filters.status });
	}
	if (filters?.supplierId) {
		conditions.push({ supplierId: filters.supplierId });
	}

	return { AND: conditions };
}

export const DocumentRepository = {
	findByEventId(
		eventId: string,
		pagination: { page: number; limit: number },
		filters?: DocumentFilterParams,
	) {
		const skip = (pagination.page - 1) * pagination.limit;
		return db.document.findMany({
			where: buildDocumentWhere(eventId, filters),
			include: {
				supplier: true,
				supplierPayment: true,
				supplierInstallment: true,
			},
			orderBy: { createdAt: "desc" },
			skip,
			take: pagination.limit,
		});
	},

	countByEventId(eventId: string, filters?: DocumentFilterParams) {
		return db.document.count({ where: buildDocumentWhere(eventId, filters) });
	},

	findById(id: string) {
		return db.document.findUnique({
			where: { id },
			include: {
				supplier: true,
				supplierPayment: true,
				supplierInstallment: true,
			},
		});
	},

	create(data: {
		eventId: string;
		name: string;
		type: DocumentType;
		reference?: string;
		supplierId?: string;
		supplierPaymentId?: string;
		supplierInstallmentId?: string;
		createdBy: string;
	}) {
		return db.document.create({ data });
	},

	update(
		id: string,
		data: Partial<{
			name: string;
			type: "CONTRACT" | "RECEIPT" | "QUOTE" | "OTHER";
			reference: string;
			supplierId: string;
			supplierPaymentId: string;
			supplierInstallmentId: string;
			status: "ACTIVE" | "ARCHIVED" | "DELETED";
		}>,
	) {
		return db.document.update({ where: { id }, data });
	},

	delete(id: string) {
		return db.document.delete({ where: { id } });
	},
};
