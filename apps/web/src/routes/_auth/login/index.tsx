import { Button } from "@muxima/ui/components/button";
import { Input } from "@muxima/ui/components/input";
import { Label } from "@muxima/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { loginSchema } from "@/utils/auth-schemas";

export const Route = createFileRoute("/_auth/login/")({
	component: LoginPage,
});

function LoginPage() {
	const [isLoading, setIsLoading] = useState(false);

	const form = useForm({
		defaultValues: {
			email: "ana@muxima.ao",
			password: "Muxima@2024",
		},
		onSubmit: async ({ value }) => {
			const result = loginSchema.safeParse(value);
			if (!result.success) {
				toast.error(result.error.issues[0].message);
				return;
			}

			setIsLoading(true);
			try {
				const { error } = await authClient.signIn.email({
					email: value.email,
					password: value.password,
				});

				if (error) {
					toast.error(error.message || "Credenciais inválidas");
					return;
				}

				toast.success("Sessão iniciada com sucesso");
				window.location.href = "/";
			} catch {
				toast.error("Erro ao iniciar sessão");
			} finally {
				setIsLoading(false);
			}
		},
	});

	return (
		<div className="rounded-lg border bg-card p-6 shadow-sm">
			<div className="mb-6 text-center">
				<h2 className="font-semibold text-lg">Bem-vindo novamente</h2>
				<p className="text-muted-foreground text-sm">
					Entre na sua conta para continuar
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

				<form.Field name="password">
					{(field) => (
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label htmlFor={field.name}>Password</Label>
								<Link
									to="/forgot-password"
									className="text-primary text-xs hover:underline"
								>
									Esqueci a minha password
								</Link>
							</div>
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

				<Button type="submit" className="w-full" disabled={isLoading}>
					{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
					Entrar
				</Button>
			</form>

			<p className="mt-6 text-center text-muted-foreground text-sm">
				Ainda não possui uma conta?{" "}
				<Link
					to="/register"
					className="font-medium text-primary hover:underline"
				>
					Criar conta
				</Link>
			</p>
		</div>
	);
}
