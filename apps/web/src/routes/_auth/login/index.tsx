import { Button } from "@muxima/ui/components/button";
import { Input } from "@muxima/ui/components/input";
import { Label } from "@muxima/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { loginSchema } from "@/utils/auth-schemas";

export const Route = createFileRoute("/_auth/login/")({
	component: LoginPage,
});

function LoginPage() {
	const [isLoading, setIsLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);

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
		<div>
			<div className="mb-8 space-y-1.5">
				<h2 className="font-semibold text-2xl tracking-tight">
					Bem-vindo de volta
				</h2>
				<p className="text-muted-foreground text-sm">
					Entre na sua conta para continuar.
				</p>
			</div>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-5"
			>
				<form.Field name="email">
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor={field.name}>Email</Label>
							<Input
								id={field.name}
								type="email"
								autoComplete="email"
								placeholder="seu@email.com"
								className="h-11"
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
							<Label htmlFor={field.name}>Password</Label>
							<div className="relative">
								<Input
									id={field.name}
									type={showPassword ? "text" : "password"}
									autoComplete="current-password"
									placeholder="••••••••"
									className="h-10 pr-10"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isLoading}
								/>
								<button
									type="button"
									onClick={() => setShowPassword((v) => !v)}
									aria-label={
										showPassword ? "Ocultar password" : "Mostrar password"
									}
									className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
								>
									{showPassword ? (
										<EyeOff className="h-4 w-4" />
									) : (
										<Eye className="h-4 w-4" />
									)}
								</button>
							</div>
							{field.state.meta.errors.length > 0 && (
								<p className="text-destructive text-xs">
									{field.state.meta.errors[0]}
								</p>
							)}
						</div>
					)}
				</form.Field>

				<Button type="submit" className="h-11 w-full" disabled={isLoading}>
					{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
					Entrar
				</Button>
			</form>

			<p className="mt-8 text-center text-muted-foreground text-sm">
				Ainda não tem conta?{" "}
				<Link
					to="/register"
					className="font-medium text-foreground underline-offset-4 hover:underline"
				>
					Criar conta
				</Link>
			</p>
		</div>
	);
}
