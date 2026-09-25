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

export type TableFormValues = {
	name: string;
	number: number;
	capacity: number;
	location: string;
	notes: string;
};

type TableDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialValues?: TableFormValues;
	onSubmit: (values: TableFormValues) => void;
	isLoading: boolean;
};

export function TableDialog({
	open,
	onOpenChange,
	initialValues,
	onSubmit,
	isLoading,
}: TableDialogProps) {
	const isEditing = !!initialValues;

	const form = useForm({
		defaultValues: {
			name: initialValues?.name || "",
			number: initialValues?.number || 0,
			capacity: initialValues?.capacity || 8,
			location: initialValues?.location || "",
			notes: initialValues?.notes || "",
		},
		onSubmit: async ({ value }) => {
			onSubmit({
				name: value.name,
				number: value.number,
				capacity: value.capacity,
				location: value.location,
				notes: value.notes,
			});
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>{isEditing ? "Editar mesa" : "Criar mesa"}</DialogTitle>
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
								<Label>Nome</Label>
								<Input
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>
					<div className="grid grid-cols-2 gap-4">
						<form.Field name="number">
							{(field) => (
								<div className="space-y-2">
									<Label>Número</Label>
									<Input
										type="number"
										value={field.state.value || ""}
										onChange={(e) =>
											field.handleChange(Number(e.target.value) || 0)
										}
										disabled={isLoading}
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="capacity">
							{(field) => (
								<div className="space-y-2">
									<Label>Capacidade</Label>
									<Input
										type="number"
										value={field.state.value || ""}
										onChange={(e) =>
											field.handleChange(Number(e.target.value) || 0)
										}
										disabled={isLoading}
									/>
								</div>
							)}
						</form.Field>
					</div>
					<form.Field name="location">
						{(field) => (
							<div className="space-y-2">
								<Label>Localização</Label>
								<Input
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>
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
									: "A criar..."
								: isEditing
									? "Guardar"
									: "Criar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
