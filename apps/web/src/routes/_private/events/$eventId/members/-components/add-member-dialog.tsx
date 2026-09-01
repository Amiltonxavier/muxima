import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
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
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import {
	MEMBER_ROLE_LABELS,
	toSelectItems,
} from "@/shared/utils/status-helpers";

interface AddMemberDialogProps {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	onSubmit: (values: {
		email: string;
		role: "PARTNER" | "ADMIN" | "EDITOR" | "VIEWER";
	}) => void;
	isLoading: boolean;
}

export function AddMemberDialog({
	open,
	onOpenChange,
	onSubmit,
	isLoading,
}: AddMemberDialogProps) {
	const form = useForm({
		defaultValues: {
			email: "",
			role: "EDITOR" as "PARTNER" | "ADMIN" | "EDITOR" | "VIEWER",
		},
		onSubmit: async ({ value }) => {
			if (!value.email) {
				toast.error("Email e obrigatorio");
				return;
			}
			onSubmit(value);
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Adicionar membro</DialogTitle>
					<DialogDescription>
						Convide um utilizador para colaborar neste evento
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<form.Field name="email">
						{(field) => (
							<div className="space-y-2">
								<Label>Email do utilizador</Label>
								<Input
									type="email"
									placeholder="email@exemplo.com"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>
					<form.Field name="role">
						{(field) => (
							<div className="space-y-2">
								<Label>Papel</Label>
								<Select
									items={toSelectItems(MEMBER_ROLE_LABELS)}
									value={field.state.value}
									onValueChange={(v) =>
										field.handleChange(
											v as "PARTNER" | "ADMIN" | "EDITOR" | "VIEWER",
										)
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{toSelectItems(MEMBER_ROLE_LABELS).map((item) => (
											<SelectItem key={item.value} value={item.value}>
												{item.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
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
							{isLoading ? "A adicionar..." : "Adicionar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
