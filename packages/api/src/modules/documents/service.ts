import { NotFoundError } from "../../shared/errors/app-error";
import { type DocumentFilterParams, DocumentRepository } from "./repository";

export const DocumentService = {
	async findByEventId(
		eventId: string,
		pagination: { page: number; limit: number },
		filters?: DocumentFilterParams,
	) {
		const [data, total] = await Promise.all([
			DocumentRepository.findByEventId(eventId, pagination, filters),
			DocumentRepository.countByEventId(eventId, filters),
		]);
		return { data, total };
	},

	async findById(id: string) {
		const doc = await DocumentRepository.findById(id);
		if (!doc) throw new NotFoundError("Documento não encontrado");
		return doc;
	},

	async create(
		eventId: string,
		userId: string,
		data: {
			name: string;
			type: "CONTRACT" | "RECEIPT" | "QUOTE" | "OTHER";
			reference?: string;
			vendorId?: string;
			expenseId?: string;
			paymentId?: string;
		},
	) {
		return DocumentRepository.create({ eventId, ...data, createdBy: userId });
	},

	async update(
		id: string,
		data: Partial<{
			name: string;
			type: "CONTRACT" | "RECEIPT" | "QUOTE" | "OTHER";
			reference: string;
			vendorId: string;
			expenseId: string;
			paymentId: string;
			status: "ACTIVE" | "ARCHIVED" | "DELETED";
		}>,
	) {
		const doc = await DocumentRepository.findById(id);
		if (!doc) throw new NotFoundError("Documento não encontrado");
		return DocumentRepository.update(id, data);
	},

	async delete(id: string) {
		const doc = await DocumentRepository.findById(id);
		if (!doc) throw new NotFoundError("Documento não encontrado");
		return DocumentRepository.delete(id);
	},
};
