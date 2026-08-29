import { NotFoundError } from "../../shared/errors/app-error";
import { VendorRepository } from "./repository";

export const VendorService = {
	async findByEventId(eventId: string) {
		return VendorRepository.findByEventId(eventId);
	},

	async findById(id: string) {
		const vendor = await VendorRepository.findById(id);
		if (!vendor) throw new NotFoundError("Fornecedor não encontrado");
		return vendor;
	},

	async create(
		eventId: string,
		data: {
			name: string;
			category: string;
			phone?: string;
			email?: string;
			address?: string;
			description?: string;
			notes?: string;
		},
	) {
		return VendorRepository.create({ eventId, ...data });
	},

	async update(id: string, data: Record<string, unknown>) {
		const vendor = await VendorRepository.findById(id);
		if (!vendor) throw new NotFoundError("Fornecedor não encontrado");
		return VendorRepository.update(id, data);
	},

	async delete(id: string) {
		const vendor = await VendorRepository.findById(id);
		if (!vendor) throw new NotFoundError("Fornecedor não encontrado");
		return VendorRepository.delete(id);
	},
};
