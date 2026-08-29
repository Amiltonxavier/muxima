import { Button } from "@muxima/ui/components/button";
import { Input } from "@muxima/ui/components/input";
import { Label } from "@muxima/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { resetPasswordSchema } from "@/utils/auth-schemas";

export const Route = createFileRoute("/_auth/reset-password/")({
	validateSearch: (search: Record<string, unknown>) => ({
		token: (search.token as string) || "",
	}),
	component: ResetPasswordPage,
});

function ResetPasswordPage() {
	const { token } = Route.useSearch();
	const [isLoading, setIsLoading] = useState(false);
	const [success, setSuccess] = useState(false);

	const form = useForm({
		defaultValues: {
			password: "",
			confirmPassword: "",
		},
		onSubmit: async ({ value }) => {
			const result = resetPasswordSchema.safeParse(value);
			if (!result.success) {
				toast.error(result.error.issues[0].message);
				return;
			}

			if (!token) {
				toast.error("Token de recuperação inválido");
				return;
			}

			setIsLoading(true);
			try {
				const { error } = await authClient.resetPassword({
					newPassword: value.password,
					token,
				});

				if (error) {
					toast.error(error.message || "Erro ao redefinir password");
					return;
				}

				setSuccess(true);
				toast.success("Password redefinida com sucesso");
			} catch {
				toast.error("Erro ao redefinir password");
			} finally {
				setIsLoading(false);
			}
		},
	});

	if (success) {
		return (
			<div className="rounded-lg border bg-card p-6 text-center shadow-sm">
				<div className="mb-4 flex justify-center">
					<div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
						<CheckCircle className="h-6 w-6 text-green-500" />
					</div>
				</div>
				<h2 className="font-semibold text-lg">Password redefinida</h2>
				<p className="mt-2 text-muted-foreground text-sm">
					A sua password foi redefinida com sucesso. Pode agora iniciar sessão.
				</p>
				<Button className="mt-6 w-full" render={<Link to="/login" />}>
					Iniciar sessão
				</Button>
			</div>
		);
	}

	return (
		<div className="rounded-lg border bg-card p-6 shadow-sm">
			<div className="mb-6 text-center">
				<h2 className="font-semibold text-lg">Redefinir password</h2>
				<p className="text-muted-foreground text-sm">
					Introduza a sua nova password
				</p>
			</div>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-4"
			>
				<form.Field name="password">
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor={field.name}>Nova password</Label>
							<Input
								id={field.name}
								type="password"
								placeholder="••••••••"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								disabled={isLoading}
							/>
							{field.state.meta.errors.length > 0 && (
								<p className="text-destructive text-xs">
									{field.state.meta.errors[0]}
								</p>
							)}
						</div>
					)}
				</form.Field>

				<form.Field name="confirmPassword">
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor={field.name}>Confirmar password</Label>
							<Input
								id={field.name}
								type="password"
								placeholder="••••••••"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								disabled={isLoading}
							/>
							{field.state.meta.errors.length > 0 && (
								<p className="text-destructive text-xs">
									{field.state.meta.errors[0]}
								</p>
							)}
						</div>
					)}
				</form.Field>

				<Button type="submit" className="w-full" disabled={isLoading || !token}>
					{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
					Redefinir password
				</Button>
			</form>
		</div>
	);
}
