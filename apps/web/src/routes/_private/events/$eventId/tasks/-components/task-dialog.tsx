import { Button } from "@muxima/ui/components/button";
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
import { toast } from "sonner";
import { taskSchema } from "@/shared/utils/task-schemas";

interface TaskDialogProps {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	initialValues?: {
		title: string;
		description: string;
		status: string;
		category: string;
		priority: string;
		assignee: string;
	};
	onSubmit: (v: Record<string, unknown>) => void;
	isLoading: boolean;
}

export function TaskDialog({
	open,
	onOpenChange,
	initialValues,
	onSubmit,
	isLoading,
}: TaskDialogProps) {
	const isEditing = !!initialValues;

	const form = useForm({
		defaultValues: {
			title: initialValues?.title || "",
			description: initialValues?.description || "",
			status: (initialValues?.status || "PENDING") as string,
			category: (initialValues?.category || "OTHER") as string,
			priority: (initialValues?.priority || "MEDIUM") as string,
			assignee: initialValues?.assignee || "",
		},
		onSubmit: async ({ value }) => {
			const r = taskSchema.safeParse(value);
			if (!r.success) {
				toast.error(r.error.issues[0].message);
				return;
			}
			onSubmit(r.data);
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>{isEditing ? "Editar" : "Criar"} tarefa</DialogTitle>
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
								<Label>Titulo</Label>
								<Input
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>
					<div className="grid grid-cols-2 gap-4">
						<form.Field name="status">
							{(field) => (
								<div className="space-y-2">
									<Label>Estado</Label>
									<Select
										value={field.state.value}
										onValueChange={(v) => field.handleChange(v ?? "PENDING")}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="PENDING">Pendente</SelectItem>
											<SelectItem value="IN_PROGRESS">Em andamento</SelectItem>
											<SelectItem value="COMPLETED">Concluido</SelectItem>
											<SelectItem value="CANCELLED">Cancelado</SelectItem>
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>
						<form.Field name="priority">
							{(field) => (
								<div className="space-y-2">
									<Label>Prioridade</Label>
									<Select
										value={field.state.value}
										onValueChange={(v) => field.handleChange(v ?? "MEDIUM")}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="LOW">Baixa</SelectItem>
											<SelectItem value="MEDIUM">Media</SelectItem>
											<SelectItem value="HIGH">Alta</SelectItem>
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<form.Field name="category">
							{(field) => (
								<div className="space-y-2">
									<Label>Categoria</Label>
									<Select
										value={field.state.value}
										onValueChange={(v) => field.handleChange(v ?? "OTHER")}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="DECORATION">Decoracao</SelectItem>
											<SelectItem value="CATERING">Gastronomia</SelectItem>
											<SelectItem value="MUSIC">Musica</SelectItem>
											<SelectItem value="FLOWERS">Flores</SelectItem>
											<SelectItem value="PHOTOGRAPHY">Fotografia</SelectItem>
											<SelectItem value="OTHER">Outros</SelectItem>
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>
						<form.Field name="assignee">
							{(field) => (
								<div className="space-y-2">
									<Label>Responsavel</Label>
									<Input
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={isLoading}
									/>
								</div>
							)}
						</form.Field>
					</div>
					<form.Field name="description">
						{(field) => (
							<div className="space-y-2">
								<Label>Descricao</Label>
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
