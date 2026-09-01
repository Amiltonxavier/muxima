import { Button } from "@muxima/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
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
import { TaskColumn } from "./-components/task-column";
import { TaskDialog } from "./-components/task-dialog";
import { COLUMNS } from "./-constants";
import type { Task } from "./-types";

export const Route = createFileRoute("/_private/events/$eventId/tasks/")({
	component: TasksPage,
});

function TasksPage() {
	const { eventId } = Route.useParams();

	const tasksQuery = useTasks(eventId);
	const createTask = useCreateTask();
	const updateTask = useUpdateTask();
	const deleteTask = useDeleteTask();

	const [showCreate, setShowCreate] = useState(false);

	const tasks = (tasksQuery.data?.data ?? []) as unknown as Task[];

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-2xl">Tarefas</h1>
					<p className="text-muted-foreground text-sm">
						{tasks.length} tarefas
					</p>
				</div>
				<Button onClick={() => setShowCreate(true)}>
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
				<div className="grid gap-4 md:grid-cols-3">
					{COLUMNS.map((column) => (
						<TaskColumn
							key={column.status}
							column={column}
							tasks={tasks}
							updateTask={updateTask}
							deleteTask={deleteTask}
						/>
					))}
				</div>
			</QueryState>

			<TaskDialog
				open={showCreate}
				onOpenChange={setShowCreate}
				onSubmit={(values) => {
					createTask.mutate({ ...values, eventId } as never, {
						onSuccess: () => {
							toast.success("Tarefa criada");
							setShowCreate(false);
						},
						onError: (e) => toast.error(e.message),
					});
				}}
				isLoading={createTask.isPending}
			/>
		</div>
	);
}
