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
import type {
	AddMemberValues,
	AssignableMemberRole,
} from "../-types/member.types";
import {
	MEMBER_ROLE_DESCRIPTIONS,
	MEMBER_ROLE_OPTIONS,
} from "../-utils/member.utils";

export function AddMemberDialog({
	open,
	onOpenChange,
	onSubmit,
	isLoading,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: AddMemberValues) => void;
	isLoading: boolean;
}) {
	const form = useForm({
		defaultValues: { email: "", role: "EDITOR" as AssignableMemberRole },
		onSubmit: async ({ value }) => {
			if (!value.email.trim()) {
				toast.error("Email é obrigatório");
				return;
			}
			onSubmit({ ...value, email: value.email.trim() });
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Adicionar membro</DialogTitle>
					<DialogDescription>
						Convide um utilizador já registado para colaborar neste evento.
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
								<Label htmlFor="member-email">Email do utilizador</Label>
								<Input
									id="member-email"
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
								<Label htmlFor="member-role">Papel</Label>
								<Select
									value={field.state.value}
									onValueChange={(v) =>
										field.handleChange((v ?? "EDITOR") as AssignableMemberRole)
									}
								>
									<SelectTrigger id="member-role">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{MEMBER_ROLE_OPTIONS.map((item) => (
											<SelectItem key={item.value} value={item.value}>
												{item.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<p className="text-muted-foreground text-xs">
									{MEMBER_ROLE_DESCRIPTIONS[field.state.value]}
								</p>
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
