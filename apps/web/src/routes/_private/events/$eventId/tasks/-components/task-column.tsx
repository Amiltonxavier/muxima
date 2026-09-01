import { Button } from "@muxima/ui/components/button";
import { useSelected } from "@/core/hooks/useSelected";
import type { SelectedItem } from "@/core/types";
import { ACTION_TYPES_TASK } from "../-constants";
import type { ActionTypeTask, Task } from "../-types";
import { DeleteDialog } from "./delete-dialog";
import { TaskDialog } from "./task-dialog";

interface TaskColumnProps {
	column: { status: string; title: string; color: string };
	tasks: Task[];
	updateTask: { mutate: (vars: any, opts: any) => void; isPending: boolean };
	deleteTask: { mutate: (vars: any, opts: any) => void; isPending: boolean };
}

export function TaskColumn({
	column,
	tasks,
	updateTask,
	deleteTask,
}: TaskColumnProps) {
	const { isSelected, selectedAction, selectedItem, onSelect, clearSelection } =
		useSelected<SelectedItem, ActionTypeTask>();

	const columnTasks = tasks.filter((t) => t.status === column.status);

	return (
		<>
			<div className="space-y-3">
				<div className="flex items-center gap-2">
					<div
						className="h-3 w-3 rounded-full"
						style={{ backgroundColor: column.color }}
					/>
					<h3 className="font-medium text-sm">{column.title}</h3>
					<span className="text-muted-foreground text-xs">
						({columnTasks.length})
					</span>
				</div>
				<div className="space-y-2">
					{columnTasks.map((task) => (
						<div
							key={task.id}
							className="cursor-pointer border p-3 hover:bg-muted/50"
							role="button"
							tabIndex={0}
							onClick={() =>
								onSelect(
									task as unknown as SelectedItem,
									ACTION_TYPES_TASK.UPDATE,
								)
							}
						>
							<p className="font-medium text-sm">{task.title}</p>
							<p className="mt-1 text-muted-foreground text-xs">
								{task.category || "Sem categoria"}
							</p>
						</div>
					))}
				</div>
			</div>

			{isSelected &&
				selectedAction === ACTION_TYPES_TASK.UPDATE &&
				selectedItem && (
					<TaskDialog
						open={isSelected}
						onOpenChange={clearSelection}
						initialValues={{
							title: (selectedItem as any).title || "",
							description: (selectedItem as any).description || "",
							status: (selectedItem as any).status || "PENDING",
							category: (selectedItem as any).category || "OTHER",
							priority: (selectedItem as any).priority || "MEDIUM",
							assignee: (selectedItem as any).assignee || "",
						}}
						onSubmit={(values) => {
							updateTask.mutate(
								{ id: (selectedItem as any).id, ...values } as never,
								{
									onSuccess: () => {
										clearSelection();
									},
									onError: (e: Error) => {},
								},
							);
						}}
						isLoading={updateTask.isPending}
					/>
				)}
		</>
	);
}
