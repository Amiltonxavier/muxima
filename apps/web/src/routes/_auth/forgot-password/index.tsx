import { Button } from "@muxima/ui/components/button";
import { Input } from "@muxima/ui/components/input";
import { Label } from "@muxima/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { forgotPasswordSchema } from "@/shared/utils/auth-schemas";

export const Route = createFileRoute("/_auth/forgot-password/")({
	component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
	const [isLoading, setIsLoading] = useState(false);
	const [sent, setSent] = useState(false);

	const form = useForm({
		defaultValues: {
			email: "",
		},
		onSubmit: async ({ value }) => {
			const result = forgotPasswordSchema.safeParse(value);
			if (!result.success) {
				toast.error(result.error.issues[0].message);
				return;
			}

			setIsLoading(true);
			try {
				setSent(true);
			} catch {
				toast.error("Erro ao enviar email de recuperação");
			} finally {
				setIsLoading(false);
			}
		},
	});

	if (sent) {
		return (
			<div className="rounded-lg border bg-card p-6 text-center shadow-sm">
				<div className="mb-4 flex justify-center">
					<div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
						<Mail className="h-6 w-6 text-primary" />
					</div>
				</div>
				<h2 className="font-semibold text-lg">Email enviado</h2>
				<p className="mt-2 text-muted-foreground text-sm">
					Verifique a sua caixa de entrada e siga as instruções para redefinir a
					sua password.
				</p>
				<Button className="mt-6 w-full" render={<Link to="/login" />}>
					Voltar ao login
				</Button>
			</div>
		);
	}

	return (
		<div className="rounded-lg border bg-card p-6 shadow-sm">
			<div className="mb-6 text-center">
				<h2 className="font-semibold text-lg">Esqueceu a password?</h2>
				<p className="text-muted-foreground text-sm">
					Introduza o seu email para receber instruções de recuperação
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
				<form.Field name="email">
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor={field.name}>Email</Label>
							<Input
								id={field.name}
								type="email"
								placeholder="seu@email.com"
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

				<Button type="submit" className="w-full" disabled={isLoading}>
					{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
					Enviar instruções
				</Button>
			</form>

			<p className="mt-6 text-center text-muted-foreground text-sm">
				Lembrou-se da password?{" "}
				<Link to="/login" className="font-medium text-primary hover:underline">
					Entrar
				</Link>
			</p>
		</div>
	);
}
