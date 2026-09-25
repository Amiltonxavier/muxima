import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { Input } from "@muxima/ui/components/input";
import {
	type DragEndEvent,
	KanbanBoard,
	KanbanCard,
	KanbanCards,
	KanbanHeader,
	KanbanProvider,
} from "@muxima/ui/components/kibo-ui/kanban";
import {
	ListGroup,
	ListHeader,
	ListItem,
	ListItems,
	ListProvider,
} from "@muxima/ui/components/kibo-ui/list";
import { Label } from "@muxima/ui/components/label";
import { Pagination } from "@muxima/ui/components/pagination";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@muxima/ui/components/tabs";
import { Textarea } from "@muxima/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import {
	ChartColumn,
	CheckCircle2,
	Circle,
	Clock,
	Columns3,
	GripVertical,
	List,
	Pencil,
	Plus,
	Search,
	Trash2,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/shared/components/back-to";
import { QueryState } from "@/shared/components/states";
import {
	useCreateTask,
	useDeleteTask,
	useTaskStats,
	useTasks,
	useUpdateTask,
} from "@/shared/queries/task-queries";
import { formatDate } from "@/utils/format-date";
import {
	getStatusColor,
	TASK_CATEGORY_LABELS,
	TASK_STATUS_LABELS,
} from "@/utils/status-helpers";
import { taskSchema } from "@/utils/task-schemas";
import { TaskAnalytics } from "./-components/task-analytics";

export const Route = createFileRoute("/_private/events/$eventId/tasks/")({
	component: TasksPage,
});

// ── Kanban column definitions ────────────────────────────────────

const KANBAN_COLUMNS = [
	{ id: "TODO", name: "Por fazer" },
	{ id: "IN_PROGRESS", name: "Em andamento" },
	{ id: "COMPLETED", name: "Concluído" },
];

const COLUMN_ICONS: Record<string, React.ReactNode> = {
	TODO: <Circle className="h-4 w-4 text-muted-foreground" />,
	IN_PROGRESS: <Clock className="h-4 w-4 text-blue-500" />,
	COMPLETED: <CheckCircle2 className="h-4 w-4 text-green-500" />,
};

const PRIORITY_COLORS: Record<string, string> = {
	LOW: "bg-blue-50 text-blue-700",
	MEDIUM: "bg-neutral-100 text-neutral-700",
	HIGH: "bg-amber-50 text-amber-700",
	URGENT: "bg-red-50 text-red-700",
};

const PRIORITY_LABELS: Record<string, string> = {
	LOW: "Baixa",
	MEDIUM: "Média",
	HIGH: "Alta",
	URGENT: "Urgente",
};

// ── Main Page ────────────────────────────────────────────────────

function TasksPage() {
	const { eventId } = Route.useParams();
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);
	const [search, setSearch] = useState("");
	const [filterStatus, setFilterStatus] = useState<
		"ALL" | "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
	>("ALL");
	const [filterCategory, setFilterCategory] = useState<
		| "ALL"
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
		| "OTHER"
	>("ALL");
	const [filterPriority, setFilterPriority] = useState<
		"ALL" | "LOW" | "MEDIUM" | "HIGH" | "URGENT"
	>("ALL");
	const resetPage = useCallback(() => setPage(1), []);

	const tasksQuery = useTasks(eventId, {
		page,
		limit,
		search: search || undefined,
		status: filterStatus !== "ALL" ? filterStatus : undefined,
		category: filterCategory !== "ALL" ? filterCategory : undefined,
		priority: filterPriority !== "ALL" ? filterPriority : undefined,
	});
	const createTask = useCreateTask();
	const updateTask = useUpdateTask();
	const deleteTask = useDeleteTask();

	const taskStatsQuery = useTaskStats(eventId);
	const taskStats = taskStatsQuery.data;

	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [editingTask, setEditingTask] = useState<KanbanTaskItem | null>(null);
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState("kanban");

	const tasks = tasksQuery.data?.data ?? [];
	const meta = tasksQuery.data?.meta;

	// ── Kanban drag-end handler ───────────────────────────────────

	const handleKanbanDragEnd = useCallback(
		(event: DragEndEvent) => {
			const { active, over } = event;
			if (!over) return;

			const taskId = active.id as string;
			const newStatus = over.id as string;

			// Only update if dragged to a column (not another card)
			if (!KANBAN_COLUMNS.find((c) => c.id === newStatus)) return;

			const task = tasks.find((t) => t.id === taskId);
			if (task && task.status !== newStatus) {
				updateTask.mutate(
					{
						id: taskId,
						status: newStatus as
							| "TODO"
							| "IN_PROGRESS"
							| "COMPLETED"
							| "CANCELLED",
					},
					{
						onSuccess: () => {
							toast.success(
								`Tarefa movida para "${TASK_STATUS_LABELS[newStatus] || newStatus}"`,
							);
						},
						onError: (e) => toast.error(e.message),
					},
				);
			}
		},
		[tasks, updateTask],
	);

	// ── Kanban data mapping ──────────────────────────────────────

	type KanbanTaskItem = {
		id: string;
		name: string;
		column: string;
		description?: string;
		category?: string;
		priority?: string;
		dueDate?: string;
	};

	const kanbanData: KanbanTaskItem[] = tasks.map((t) => ({
		id: t.id,
		name: t.title,
		column: t.status || "TODO",
		description: t.description ?? undefined,
		category: t.category ?? undefined,
		priority: t.priority ?? undefined,
		dueDate: t.dueDate ? String(t.dueDate) : undefined,
	}));

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />

			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-2xl">Tarefas</h1>
					<p className="text-muted-foreground text-sm">
						{tasks.length} tarefa{tasks.length !== 1 ? "s" : ""}
					</p>
				</div>
				<Button onClick={() => setShowCreateDialog(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Criar tarefa
				</Button>
			</div>

			{/* Filters */}
			<div className="flex flex-wrap items-center gap-3">
				<div className="relative min-w-[200px] max-w-sm flex-1">
					<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Pesquisar tarefas..."
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							resetPage();
						}}
						className="pl-9"
					/>
				</div>
				<Select
					value={filterStatus}
					onValueChange={(v) => {
						if (v) setFilterStatus(v as typeof filterStatus);
						resetPage();
					}}
				>
					<SelectTrigger className="w-[160px]">
						<SelectValue placeholder="Estado" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">Todos os estados</SelectItem>
						{Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
							<SelectItem key={value} value={value}>
								{label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select
					value={filterCategory}
					onValueChange={(v) => {
						if (v) setFilterCategory(v as typeof filterCategory);
						resetPage();
					}}
				>
					<SelectTrigger className="w-[160px]">
						<SelectValue placeholder="Categoria" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">Todas</SelectItem>
						{Object.entries(TASK_CATEGORY_LABELS).map(([value, label]) => (
							<SelectItem key={value} value={value}>
								{label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select
					value={filterPriority}
					onValueChange={(v) => {
						if (v) setFilterPriority(v as typeof filterPriority);
						resetPage();
					}}
				>
					<SelectTrigger className="w-[140px]">
						<SelectValue placeholder="Prioridade" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">Todas</SelectItem>
						{Object.entries(PRIORITY_LABELS).map(([value, label]) => (
							<SelectItem key={value} value={value}>
								{label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as string)}>
				<TabsList>
					<TabsTrigger value="kanban">
						<Columns3 className="mr-2 h-4 w-4" />
						Kanban
					</TabsTrigger>
					<TabsTrigger value="list">
						<List className="mr-2 h-4 w-4" />
						Lista
					</TabsTrigger>
					<TabsTrigger value="analytics">
						<ChartColumn className="mr-2 h-4 w-4" />
						Analytics
					</TabsTrigger>
				</TabsList>

				{/* ── Kanban View ─────────────────────────────────── */}
				<TabsContent value="kanban">
					<QueryState
						state={{
							isLoading: tasksQuery.isLoading,
							isError: tasksQuery.isError,
							isEmpty: tasks.length === 0,
							hasData: tasks.length > 0,
						}}
					>
						<KanbanProvider
							columns={KANBAN_COLUMNS}
							data={kanbanData}
							onDragEnd={handleKanbanDragEnd}
						>
							{(column) => (
								<KanbanBoard key={column.id} id={column.id}>
									<KanbanHeader>
										<div className="flex items-center gap-2">
											{COLUMN_ICONS[column.id]}
											<span>{column.name}</span>
											<Badge variant="secondary" className="ml-auto">
												{
													kanbanData.filter((t) => t.column === column.id)
														.length
												}
											</Badge>
										</div>
									</KanbanHeader>{" "}
									<KanbanCards id={column.id}>
										{(item: KanbanTaskItem) => (
											<KanbanCard
												key={item.id}
												id={item.id}
												name={item.name}
												column={item.column}
											>
												<div className="space-y-2">
													<div className="flex items-start justify-between gap-2">
														<p className="m-0 font-medium text-sm">
															{item.name}
														</p>
														{item.priority && (
															<Badge
																className={PRIORITY_COLORS[item.priority] || ""}
																variant="secondary"
															>
																{PRIORITY_LABELS[item.priority] ||
																	item.priority}
															</Badge>
														)}
													</div>
													{item.description && (
														<p className="m-0 line-clamp-2 text-muted-foreground text-xs">
															{item.description}
														</p>
													)}
													<div className="flex items-center gap-2 text-muted-foreground text-xs">
														{item.category && (
															<span>
																{TASK_CATEGORY_LABELS[item.category] ||
																	item.category}
															</span>
														)}
														{item.dueDate && (
															<>
																<span>·</span>
																<span>{formatDate(item.dueDate)}</span>
															</>
														)}
													</div>
													<div className="flex justify-end gap-1 pt-1">
														<Button
															variant="ghost"
															size="icon-sm"
															onClick={(e) => {
																e.stopPropagation();
																setEditingTask(item);
															}}
														>
															<Pencil
																className="h-3.5 w-3.5"
																aria-label="Editar tarefa"
															/>
														</Button>
														<Button
															variant="ghost"
															size="icon-sm"
															className="text-destructive"
															onClick={(e) => {
																e.stopPropagation();
																setDeleteId(item.id);
															}}
														>
															<Trash2 className="h-3.5 w-3.5" />
														</Button>
													</div>
												</div>
											</KanbanCard>
										)}
									</KanbanCards>
								</KanbanBoard>
							)}
						</KanbanProvider>
					</QueryState>
				</TabsContent>

				{/* ── List View ───────────────────────────────────── */}
				<TabsContent value="list">
					<QueryState
						state={{
							isLoading: tasksQuery.isLoading,
							isError: tasksQuery.isError,
							isEmpty: tasks.length === 0,
							hasData: tasks.length > 0,
						}}
					>
						<ListProvider onDragEnd={() => {}}>
							<div className="space-y-4">
								{KANBAN_COLUMNS.map((col) => {
									const colTasks = kanbanData.filter(
										(t) => t.column === col.id,
									);
									return (
										<ListGroup key={col.id} id={col.id}>
											<ListHeader
												name={col.name}
												color={getStatusColor(col.id)}
											/>
											<ListItems>
												{colTasks.length === 0 ? (
													<p className="py-4 text-center text-muted-foreground text-xs">
														Nenhuma tarefa
													</p>
												) : (
													colTasks.map((task, index) => (
														<ListItem
															key={task.id}
															id={task.id}
															name={task.name}
															index={index}
															parent={col.id}
														>
															<div className="flex w-full items-center gap-2">
																<GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
																<div className="min-w-0 flex-1">
																	<p className="m-0 truncate font-medium text-sm">
																		{task.name}
																	</p>
																	<div className="flex items-center gap-2 text-muted-foreground text-xs">
																		{task.category && (
																			<span>
																				{TASK_CATEGORY_LABELS[task.category] ||
																					task.category}
																			</span>
																		)}
																		{task.dueDate && (
																			<>
																				<span>·</span>
																				<span>{formatDate(task.dueDate)}</span>
																			</>
																		)}
																	</div>
																</div>
																{task.priority && (
																	<Badge
																		className={
																			PRIORITY_COLORS[task.priority] || ""
																		}
																		variant="secondary"
																	>
																		{PRIORITY_LABELS[task.priority] ||
																			task.priority}
																	</Badge>
																)}
																<Button
																	variant="ghost"
																	size="icon-sm"
																	onClick={() =>
																		setEditingTask(
																			kanbanData.find(
																				(k) => k.id === task.id,
																			) ?? null,
																		)
																	}
																>
																	<Pencil
																		className="h-3.5 w-3.5"
																		aria-label="Editar tarefa"
																	/>
																</Button>
																<Button
																	variant="ghost"
																	size="icon-sm"
																	className="text-destructive"
																	onClick={() => setDeleteId(task.id)}
																>
																	<Trash2 className="h-3.5 w-3.5" />
																</Button>
															</div>
														</ListItem>
													))
												)}
											</ListItems>
										</ListGroup>
									);
								})}
							</div>
						</ListProvider>
					</QueryState>
				</TabsContent>

				{/* ── Analytics View ─────────────────────────────── */}
				<TabsContent value="analytics">
					<TaskAnalytics
						stats={taskStats}
						isLoading={taskStatsQuery.isLoading}
						isError={taskStatsQuery.isError}
					/>
				</TabsContent>
			</Tabs>

			{meta && activeTab === "list" && (
				<Pagination
					meta={meta}
					onPageChange={setPage}
					onLimitChange={(l) => {
						setLimit(l);
						setPage(1);
					}}
					disabled={tasksQuery.isLoading}
				/>
			)}

			{/* ── Create Dialog ────────────────────────────────────── */}
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

			{/* ── Edit Dialog ──────────────────────────────────────── */}
			{editingTask && (
				<TaskDialog
					open={!!editingTask}
					onOpenChange={() => setEditingTask(null)}
					initialValues={{
						title: editingTask.name || "",
						description: editingTask.description || "",
						category: editingTask.category || "OTHER",
						priority: editingTask.priority || "MEDIUM",
						status: editingTask.column || "TODO",
						dueDate: editingTask.dueDate || "",
					}}
					onSubmit={(values) => {
						updateTask.mutate(
							{ id: editingTask.id, ...values },
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

			{/* ── Delete Dialog ────────────────────────────────────── */}
			<Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Eliminar tarefa</DialogTitle>
					</DialogHeader>
					<p className="text-muted-foreground text-sm">
						Tem certeza que deseja eliminar esta tarefa? Esta ação não pode ser
						desfeita.
					</p>
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

// ── Task Dialog ──────────────────────────────────────────────────

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
			category: (initialValues?.category || "OTHER") as
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
				| "OTHER",
			priority: (initialValues?.priority || "MEDIUM") as
				| "LOW"
				| "MEDIUM"
				| "HIGH"
				| "URGENT",
			status: (initialValues?.status || "TODO") as
				| "TODO"
				| "IN_PROGRESS"
				| "COMPLETED"
				| "CANCELLED",
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
										onValueChange={(v) =>
											field.handleChange(
												v as
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
													| "OTHER",
											)
										}
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
										onValueChange={(v) =>
											field.handleChange(
												v as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
											)
										}
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

					{isEditing && (
						<form.Field name="status">
							{(field) => (
								<div className="space-y-2">
									<Label>Estado</Label>{" "}
									<Select
										items={[
											{ value: "TODO", label: "Por fazer" },
											{ value: "IN_PROGRESS", label: "Em andamento" },
											{ value: "COMPLETED", label: "Concluído" },
											{ value: "CANCELLED", label: "Cancelado" },
										]}
										value={field.state.value}
										onValueChange={(v) =>
											field.handleChange(
												v as "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED",
											)
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="TODO">Por fazer</SelectItem>
											<SelectItem value="IN_PROGRESS">Em andamento</SelectItem>
											<SelectItem value="COMPLETED">Concluído</SelectItem>
											<SelectItem value="CANCELLED">Cancelado</SelectItem>
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>
					)}

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
