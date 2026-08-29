import { Button } from "@muxima/ui/components/button";
import { Input } from "@muxima/ui/components/input";
import { Label } from "@muxima/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { registerSchema } from "@/utils/auth-schemas";

export const Route = createFileRoute("/_auth/register/")({
	component: RegisterPage,
});

function RegisterPage() {
	const [isLoading, setIsLoading] = useState(false);

	const form = useForm({
		defaultValues: {
			name: "",
			email: "",
			password: "",
			confirmPassword: "",
		},
		onSubmit: async ({ value }) => {
			const result = registerSchema.safeParse(value);
			if (!result.success) {
				toast.error(result.error.errors[0].message);
				return;
			}

			setIsLoading(true);
			try {
				const { error } = await authClient.signUp.email({
					name: value.name,
					email: value.email,
					password: value.password,
				});

				if (error) {
					toast.error(error.message || "Erro ao criar conta");
					return;
				}

				// Sign out after registration to ensure single auth point at /login
				await authClient.signOut();

				toast.success("Conta criada com sucesso");
				window.location.href = "/login";
			} catch {
				toast.error("Erro ao criar conta");
			} finally {
				setIsLoading(false);
			}
		},
	});

	return (
		<div className="rounded-lg border bg-card p-6 shadow-sm">
			<div className="mb-6 text-center">
				<h2 className="font-semibold text-lg">Criar conta</h2>
				<p className="text-muted-foreground text-sm">
					Comece a planear o seu grande dia
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
				<form.Field name="name">
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor={field.name}>Nome</Label>
							<Input
								id={field.name}
								placeholder="O seu nome"
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
							<Label htmlFor={field.name}>Password</Label>
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

				<Button type="submit" className="w-full" disabled={isLoading}>
					{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
					Criar conta
				</Button>
			</form>

			<p className="mt-6 text-center text-muted-foreground text-sm">
				Já possui uma conta?{" "}
				<Link to="/login" className="font-medium text-primary hover:underline">
					Entrar
				</Link>
			</p>
		</div>
	);
}
