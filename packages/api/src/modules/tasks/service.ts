import { NotFoundError } from "../../shared/errors/app-error";
import { type TaskFilterParams, TaskRepository } from "./repository";

export const TaskService = {
	async findByEventId(
		eventId: string,
		pagination: { page: number; limit: number },
		filters?: TaskFilterParams,
	) {
		const [data, total] = await Promise.all([
			TaskRepository.findByEventId(eventId, pagination, filters),
			TaskRepository.countByEventId(eventId, filters),
		]);
		return { data, total };
	},

	async findById(id: string) {
		const task = await TaskRepository.findById(id);
		if (!task) throw new NotFoundError("Tarefa não encontrada");
		return task;
	},

	async create(
		eventId: string,
		userId: string,
		data: {
			title: string;
			description?: string;
			category:
				| "FINANCE"
				| "VENUE"
				| "GUESTS"
				| "FOOD"
				| "DRINKS"
				| "DECORATION"
				| "CEREMONY"
				| "DOCUMENTS"
				| "CLOTHING"
				| "TRANSPORT"
				| "OTHER";
			priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
			assignedTo?: string;
			dueDate?: string;
		},
	) {
		return TaskRepository.create({
			eventId,
			title: data.title,
			description: data.description,
			category: data.category,
			priority: data.priority,
			assignedTo: data.assignedTo,
			dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
			createdBy: userId,
		});
	},

	async update(
		id: string,
		data: Partial<{
			title: string;
			description: string;
			category:
				| "FINANCE"
				| "VENUE"
				| "GUESTS"
				| "FOOD"
				| "DRINKS"
				| "DECORATION"
				| "CEREMONY"
				| "DOCUMENTS"
				| "CLOTHING"
				| "TRANSPORT"
				| "OTHER";
			priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
			status: "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
			assignedTo: string;
			dueDate: string;
		}>,
	) {
		const task = await TaskRepository.findById(id);
		if (!task) throw new NotFoundError("Tarefa não encontrada");
		return TaskRepository.update(id, {
			...data,
			dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
		});
	},

	async delete(id: string) {
		const task = await TaskRepository.findById(id);
		if (!task) throw new NotFoundError("Tarefa não encontrada");
		return TaskRepository.delete(id);
	},

	async getSchedules(
		eventId: string,
		pagination: { page: number; limit: number },
		filters?: {
			search?: string;
			status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
		},
	) {
		const [data, total] = await Promise.all([
			TaskRepository.findSchedulesByEventId(eventId, pagination, filters),
			TaskRepository.countSchedulesByEventId(eventId, filters),
		]);
		return { data, total };
	},

	async createSchedule(
		eventId: string,
		data: {
			title: string;
			description?: string;
			startAt: string;
			endAt?: string;
			location?: string;
			responsible?: string;
		},
	) {
		return TaskRepository.createSchedule({
			eventId,
			title: data.title,
			description: data.description,
			startAt: new Date(data.startAt),
			endAt: data.endAt ? new Date(data.endAt) : undefined,
			location: data.location,
			responsible: data.responsible,
		});
	},

	async updateSchedule(
		id: string,
		data: Partial<{
			title: string;
			description: string;
			startAt: string;
			endAt: string;
			location: string;
			responsible: string;
			status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
		}>,
	) {
		return TaskRepository.updateSchedule(id, {
			...data,
			startAt: data.startAt ? new Date(data.startAt) : undefined,
			endAt: data.endAt ? new Date(data.endAt) : undefined,
		});
	},

	async deleteSchedule(id: string) {
		return TaskRepository.deleteSchedule(id);
	},
};
