import { NotFoundError } from "../../shared/errors/app-error";
import { type VendorFilterParams, VendorRepository } from "./repository";

export const VendorService = {
	async findByEventId(
		eventId: string,
		pagination: { page: number; limit: number },
		filters?: VendorFilterParams,
	) {
		const [data, total] = await Promise.all([
			VendorRepository.findByEventId(eventId, pagination, filters),
			VendorRepository.countByEventId(eventId, filters),
		]);
		return { data, total };
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
			category:
				| "VENUE"
				| "DECORATION"
				| "MUSIC"
				| "PHOTOGRAPHY"
				| "VIDEO"
				| "CATERING"
				| "CAKE"
				| "DRINKS"
				| "TRANSPORT"
				| "BEAUTY"
				| "SECURITY"
				| "ENTERTAINMENT"
				| "OTHER";
			phone?: string;
			email?: string;
			address?: string;
			description?: string;
			notes?: string;
		},
	) {
		return VendorRepository.create({
			eventId,
			...data,
			email: data.email || undefined,
		});
	},

	async update(
		id: string,
		data: Partial<{
			name: string;
			category:
				| "VENUE"
				| "DECORATION"
				| "MUSIC"
				| "PHOTOGRAPHY"
				| "VIDEO"
				| "CATERING"
				| "CAKE"
				| "DRINKS"
				| "TRANSPORT"
				| "BEAUTY"
				| "SECURITY"
				| "ENTERTAINMENT"
				| "OTHER";
			phone: string;
			email: string;
			address: string;
			description: string;
			notes: string;
			status:
				| "PROSPECT"
				| "CONTACTED"
				| "NEGOTIATING"
				| "CONTRACTED"
				| "COMPLETED"
				| "CANCELLED";
		}>,
	) {
		const vendor = await VendorRepository.findById(id);
		if (!vendor) throw new NotFoundError("Fornecedor não encontrado");
		return VendorRepository.update(id, {
			...data,
			email: data.email === "" ? undefined : data.email,
		});
	},

	async delete(id: string) {
		const vendor = await VendorRepository.findById(id);
		if (!vendor) throw new NotFoundError("Fornecedor não encontrado");
		return VendorRepository.delete(id);
	},
};
