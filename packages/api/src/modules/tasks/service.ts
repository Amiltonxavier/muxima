import { NotFoundError } from "../../shared/errors/app-error";
import { TaskRepository } from "./repository";

export const TaskService = {
	async findByEventId(eventId: string) {
		return TaskRepository.findByEventId(eventId);
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
			category: string;
			priority?: string;
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

	async update(id: string, data: Record<string, unknown>) {
		const task = await TaskRepository.findById(id);
		if (!task) throw new NotFoundError("Tarefa não encontrada");
		return TaskRepository.update(id, data);
	},

	async delete(id: string) {
		const task = await TaskRepository.findById(id);
		if (!task) throw new NotFoundError("Tarefa não encontrada");
		return TaskRepository.delete(id);
	},

	async getSchedules(eventId: string) {
		return TaskRepository.findSchedulesByEventId(eventId);
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

	async updateSchedule(id: string, data: Record<string, unknown>) {
		return TaskRepository.updateSchedule(id, data);
	},

	async deleteSchedule(id: string) {
		return TaskRepository.deleteSchedule(id);
	},
};
