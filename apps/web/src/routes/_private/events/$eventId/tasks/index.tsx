import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import { Card, CardContent } from "@muxima/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { Input } from "@muxima/ui/components/input";
import { Label } from "@muxima/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import { Textarea } from "@muxima/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Circle, Clock, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/shared/components/back-to";
import { QueryState } from "@/shared/components/states";
import {
	useCreateTask,
	useDeleteTask,
	useTasks,
	useUpdateTask,
} from "@/shared/queries/task-queries";
import { formatDate } from "@/utils/format-date";
import { getStatusColor, TASK_CATEGORY_LABELS } from "@/utils/status-helpers";
import { taskSchema } from "@/utils/task-schemas";

export const Route = createFileRoute("/_private/events/$eventId/tasks/")({
	component: TasksPage,
});

function TasksPage() {
	const { eventId } = Route.useParams();

	const tasksQuery = useTasks(eventId);
	const createTask = useCreateTask();
	const updateTask = useUpdateTask();
	const deleteTask = useDeleteTask();

	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [editingTask, setEditingTask] = useState<Record<
		string,
		unknown
	> | null>(null);
	const [deleteId, setDeleteId] = useState<string | null>(null);

	const tasks = tasksQuery.data ?? [];
	const todoTasks = tasks.filter(
		(t: Record<string, unknown>) => t.status === "TODO",
	);
	const inProgressTasks = tasks.filter(
		(t: Record<string, unknown>) => t.status === "IN_PROGRESS",
	);
	const completedTasks = tasks.filter(
		(t: Record<string, unknown>) => t.status === "COMPLETED",
	);

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-2xl">Tarefas</h1>
					<p className="text-muted-foreground text-sm">
						{todoTasks.length} por fazer
					</p>
				</div>
				<Button onClick={() => setShowCreateDialog(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Criar tarefa
				</Button>
			</div>

			<QueryState
				state={{
					isLoading: tasksQuery.isLoading,
					isError: tasksQuery.isError,
					isEmpty: tasks.length === 0,
					hasData: tasks.length > 0,
				}}
			>
				<div className="grid gap-6 lg:grid-cols-3">
					<TaskColumn
						title="Por fazer"
						icon={<Circle className="h-4 w-4 text-muted-foreground" />}
						tasks={todoTasks}
						onEdit={setEditingTask}
						onDelete={setDeleteId}
						onToggleStatus={(task) => {
							updateTask.mutate({
								id: task.id as string,
								status: "IN_PROGRESS",
							});
						}}
					/>
					<TaskColumn
						title="Em andamento"
						icon={<Clock className="h-4 w-4 text-blue-500" />}
						tasks={inProgressTasks}
						onEdit={setEditingTask}
						onDelete={setDeleteId}
						onToggleStatus={(task) => {
							updateTask.mutate({
								id: task.id as string,
								status: "COMPLETED",
							});
						}}
					/>
					<TaskColumn
						title="Concluído"
						icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
						tasks={completedTasks}
						onEdit={setEditingTask}
						onDelete={setDeleteId}
						onToggleStatus={(task) => {
							updateTask.mutate({
								id: task.id as string,
								status: "TODO",
							});
						}}
					/>
				</div>
			</QueryState>

			<TaskDialog
				open={showCreateDialog}
				onOpenChange={setShowCreateDialog}
				onSubmit={(values) => {
					createTask.mutate(
						{ ...values, eventId },
						{
							onSuccess: () => {
								toast.success("Tarefa criada");
								setShowCreateDialog(false);
							},
							onError: (e) => toast.error(e.message),
						},
					);
				}}
				isLoading={createTask.isPending}
			/>

			{editingTask && (
				<TaskDialog
					open={!!editingTask}
					onOpenChange={() => setEditingTask(null)}
					initialValues={{
						title: (editingTask.title as string) || "",
						description: (editingTask.description as string) || "",
						category: (editingTask.category as string) || "OTHER",
						priority: (editingTask.priority as string) || "MEDIUM",
						status: (editingTask.status as string) || "TODO",
						dueDate: editingTask.dueDate
							? (editingTask.dueDate as string).split("T")[0]
							: "",
					}}
					onSubmit={(values) => {
						updateTask.mutate(
							{ id: editingTask.id as string, ...values },
							{
								onSuccess: () => {
									toast.success("Tarefa atualizada");
									setEditingTask(null);
								},
								onError: (e) => toast.error(e.message),
							},
						);
					}}
					isLoading={updateTask.isPending}
				/>
			)}

			<Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Eliminar tarefa</DialogTitle>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteId(null)}>
							Cancelar
						</Button>
						<Button
							variant="destructive"
							onClick={() => {
								if (deleteId) {
									deleteTask.mutate(
										{ id: deleteId },
										{
											onSuccess: () => {
												toast.success("Tarefa eliminada");
												setDeleteId(null);
											},
											onError: (e) => toast.error(e.message),
										},
									);
								}
							}}
							disabled={deleteTask.isPending}
						>
							Eliminar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function TaskColumn({
	title,
	icon,
	tasks,
	onEdit,
	onDelete,
	onToggleStatus,
}: {
	title: string;
	icon: React.ReactNode;
	tasks: Record<string, unknown>[];
	onEdit: (task: Record<string, unknown>) => void;
	onDelete: (id: string) => void;
	onToggleStatus: (task: Record<string, unknown>) => void;
}) {
	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2">
				{icon}
				<h3 className="font-medium text-sm">{title}</h3>
				<Badge variant="secondary" className="ml-auto">
					{tasks.length}
				</Badge>
			</div>
			<div className="space-y-2">
				{tasks.map((task) => (
					<Card key={task.id as string}>
						<CardContent className="p-4">
							<div className="space-y-2">
								<div className="flex items-start justify-between">
									<p className="font-medium text-sm">{task.title as string}</p>
									<Badge
										className={getStatusColor(
											(task.priority as string) || "MEDIUM",
										)}
									>
										{task.priority as string}
									</Badge>
								</div>
								{(task.description as string) && (
									<p className="text-muted-foreground text-xs">
										{task.description as string}
									</p>
								)}
								<div className="flex items-center gap-2 text-muted-foreground text-xs">
									<span>
										{TASK_CATEGORY_LABELS[task.category as string] ||
											(task.category as string)}
									</span>
									{Boolean(task.dueDate) && (
										<>
											<span>·</span>
											<span>{formatDate(task.dueDate as string)}</span>
										</>
									)}
								</div>
								<div className="flex items-center justify-between pt-1">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => onToggleStatus(task)}
									>
										Avançar →
									</Button>
									<div className="flex gap-1">
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() => onEdit(task)}
										>
											<Plus className="h-3.5 w-3.5" />
										</Button>
										<Button
											variant="ghost"
											size="icon-sm"
											className="text-destructive"
											onClick={() => onDelete(task.id as string)}
										>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				))}
				{tasks.length === 0 && (
					<p className="py-4 text-center text-muted-foreground text-xs">
						Nenhuma tarefa
					</p>
				)}
			</div>
		</div>
	);
}

function TaskDialog({
	open,
	onOpenChange,
	initialValues,
	onSubmit,
	isLoading,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialValues?: {
		title: string;
		description?: string;
		category?: string;
		priority?: string;
		status?: string;
		dueDate?: string;
	};
	onSubmit: (values: {
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
		status?: "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
		dueDate?: string;
	}) => void;
	isLoading: boolean;
}) {
	const isEditing = !!initialValues;

	const form = useForm({
		defaultValues: {
			title: initialValues?.title || "",
			description: initialValues?.description || "",
			category: (initialValues?.category || "OTHER") as any,
			priority: (initialValues?.priority || "MEDIUM") as any,
			status: (initialValues?.status || "TODO") as any,
			dueDate: initialValues?.dueDate || "",
		},
		onSubmit: async ({ value }) => {
			const result = taskSchema.safeParse(value);
			if (!result.success) {
				toast.error(result.error.issues[0].message);
				return;
			}
			onSubmit(result.data);
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{isEditing ? "Editar tarefa" : "Criar tarefa"}
					</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<form.Field name="title">
						{(field) => (
							<div className="space-y-2">
								<Label>Título</Label>
								<Input
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>

					<div className="grid grid-cols-2 gap-4">
						<form.Field name="category">
							{(field) => (
								<div className="space-y-2">
									<Label>Categoria</Label>{" "}
									<Select
										items={Object.entries(TASK_CATEGORY_LABELS).map(
											([value, label]) => ({ value, label }),
										)}
										value={field.state.value}
										onValueChange={(v) => field.handleChange(v as any)}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{Object.entries(TASK_CATEGORY_LABELS).map(
												([key, label]) => (
													<SelectItem key={key} value={key}>
														{label}
													</SelectItem>
												),
											)}
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>
						<form.Field name="priority">
							{(field) => (
								<div className="space-y-2">
									<Label>Prioridade</Label>{" "}
									<Select
										items={[
											{ value: "LOW", label: "Baixa" },
											{ value: "MEDIUM", label: "Média" },
											{ value: "HIGH", label: "Alta" },
											{ value: "URGENT", label: "Urgente" },
										]}
										value={field.state.value}
										onValueChange={(v) => field.handleChange(v as any)}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="LOW">Baixa</SelectItem>
											<SelectItem value="MEDIUM">Média</SelectItem>
											<SelectItem value="HIGH">Alta</SelectItem>
											<SelectItem value="URGENT">Urgente</SelectItem>
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>
					</div>

					<form.Field name="dueDate">
						{(field) => (
							<div className="space-y-2">
								<Label>Data limite</Label>
								<Input
									type="date"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="description">
						{(field) => (
							<div className="space-y-2">
								<Label>Descrição</Label>
								<Textarea
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? "A guardar..." : isEditing ? "Guardar" : "Criar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
