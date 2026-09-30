import { Button } from "@muxima/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Input } from "@muxima/ui/components/input";
import { Label } from "@muxima/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { changePasswordSchema } from "@/utils/auth-schemas";
import { useChangePassword } from "../-queries/user-queries";

/**
 * Change-password form.
 *
 * The values live only in this component's form state and are posted straight to
 * the API — nothing is written to a store, a query key or the URL, and the
 * fields are cleared on success so the credentials do not linger on screen. The
 * complexity rules come from the shared schema, which is the same one the API
 * validates with.
 */
export function ChangePasswordForm() {
	const changePassword = useChangePassword();
	const [done, setDone] = useState(false);

	const form = useForm({
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmNewPassword: "",
		},
		onSubmit: async ({ value }) => {
			// Validate before hitting the network so the user gets immediate,
			// field-level feedback identical to the server's rules.
			const parsed = changePasswordSchema.safeParse(value);
			if (!parsed.success) {
				toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
				return;
			}

			changePassword.mutate(
				{
					currentPassword: parsed.data.currentPassword,
					newPassword: parsed.data.newPassword,
					confirmNewPassword: parsed.data.confirmNewPassword,
				},
				{
					onSuccess: () => {
						form.reset();
						setDone(true);
						toast.success(
							"Palavra-passe alterada. As outras sessões foram encerradas.",
						);
					},
					onError: (error: Error) =>
						toast.error(
							error.message || "Não foi possível alterar a palavra-passe",
						),
				},
			);
		},
	});

	const isPending = changePassword.isPending;

	return (
		<Card className="max-w-lg">
			<CardHeader>
				<CardTitle>Alterar palavra-passe</CardTitle>
				<CardDescription>
					Ao alterar a palavra-passe, todas as outras sessões são encerradas.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<form.Field name="currentPassword">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="current-password">Palavra-passe atual</Label>
								<Input
									id="current-password"
									type="password"
									autoComplete="current-password"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isPending}
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="newPassword">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="new-password">Nova palavra-passe</Label>
								<Input
									id="new-password"
									type="password"
									autoComplete="new-password"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isPending}
								/>
								<p className="text-muted-foreground text-xs">
									Mínimo de 8 caracteres, com maiúscula, minúscula e número.
								</p>
							</div>
						)}
					</form.Field>

					<form.Field name="confirmNewPassword">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="confirm-new-password">
									Confirmar nova palavra-passe
								</Label>
								<Input
									id="confirm-new-password"
									type="password"
									autoComplete="new-password"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isPending}
								/>
							</div>
						)}
					</form.Field>

					{done && !isPending && (
						<p className="text-muted-foreground text-sm">
							A tua palavra-passe foi atualizada com sucesso.
						</p>
					)}

					<Button type="submit" disabled={isPending}>
						{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{isPending ? "A alterar..." : "Alterar palavra-passe"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
