import { NotFoundError } from "../../shared/errors/app-error";
import { DocumentRepository } from "./repository";

export const DocumentService = {
	async findByEventId(eventId: string) {
		return DocumentRepository.findByEventId(eventId);
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
			type: string;
			reference?: string;
			vendorId?: string;
			expenseId?: string;
			paymentId?: string;
		},
	) {
		return DocumentRepository.create({ eventId, ...data, createdBy: userId });
	},

	async update(id: string, data: Record<string, unknown>) {
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
