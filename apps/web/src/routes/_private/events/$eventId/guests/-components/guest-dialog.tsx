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
import { Textarea } from "@muxima/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { CATEGORY_OPTIONS, STATUS_OPTIONS } from "../-types";

interface GuestDialogProps {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	initialValues?: {
		name: string;
		email: string;
		phone: string;
		category: string;
		status: string;
		attendance: string;
		notes: string;
		plusOne: boolean;
	};
	onSubmit: (v: Record<string, unknown>) => void;
	isLoading: boolean;
}

export function GuestDialog({
	open,
	onOpenChange,
	initialValues,
	onSubmit,
	isLoading,
}: GuestDialogProps) {
	const isEditing = !!initialValues;

	const form = useForm({
		defaultValues: {
			name: initialValues?.name || "",
			email: initialValues?.email || "",
			phone: initialValues?.phone || "",
			category: initialValues?.category || "OTHER",
			status: initialValues?.status || "PENDING",
			attendance: initialValues?.attendance || "NOT_SENT",
			notes: initialValues?.notes || "",
			plusOne: initialValues?.plusOne || false,
		},
		onSubmit: async ({ value }) => {
			if (!value.name) {
				toast.error("Nome obrigatorio");
				return;
			}
			onSubmit(value);
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{isEditing ? "Editar convidado" : "Adicionar convidado"}
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
					<form.Field name="name">
						{(field) => (
							<div className="space-y-2">
								<Label>Nome *</Label>
								<Input
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>
					<div className="grid grid-cols-2 gap-4">
						<form.Field name="email">
							{(field) => (
								<div className="space-y-2">
									<Label>Email</Label>
									<Input
										type="email"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={isLoading}
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="phone">
							{(field) => (
								<div className="space-y-2">
									<Label>Telefone</Label>
									<Input
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={isLoading}
									/>
								</div>
							)}
						</form.Field>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<form.Field name="category">
							{(field) => (
								<div className="space-y-2">
									<Label>Categoria</Label>
									<select
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										className="w-full border p-2"
										disabled={isLoading}
									>
										{CATEGORY_OPTIONS.map((o) => (
											<option key={o.value} value={o.value}>
												{o.label}
											</option>
										))}
									</select>
								</div>
							)}
						</form.Field>
						<form.Field name="status">
							{(field) => (
								<div className="space-y-2">
									<Label>Estado</Label>
									<select
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										className="w-full border p-2"
										disabled={isLoading}
									>
										{STATUS_OPTIONS.map((o) => (
											<option key={o.value} value={o.value}>
												{o.label}
											</option>
										))}
									</select>
								</div>
							)}
						</form.Field>
					</div>
					<form.Field name="notes">
						{(field) => (
							<div className="space-y-2">
								<Label>Notas</Label>
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
							{isLoading
								? isEditing
									? "A guardar..."
									: "A adicionar..."
								: isEditing
									? "Guardar"
									: "Adicionar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
