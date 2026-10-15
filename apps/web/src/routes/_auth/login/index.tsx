import { Button } from "@muxima/ui/components/button";
import { Input } from "@muxima/ui/components/input";
import { Label } from "@muxima/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { ResendVerification } from "@/shared/components/resend-verification";
import { AUTH_CODES, handleApiError, parseApiError } from "@/shared/errors";
import { loginSchema } from "@/utils/auth-schemas";

export const Route = createFileRoute("/_auth/login/")({
	validateSearch: z.object({
		returnTo: z.string().optional(),
	}),
	component: LoginPage,
});

function LoginPage() {
	const { returnTo } = Route.useSearch();
	const [isLoading, setIsLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

	const form = useForm({
		defaultValues: {
			email: "amilton.seed@muxima.test",
			password: "Muxima@2026Seed01",
		},
		onSubmit: async ({ value }) => {
			const result = loginSchema.safeParse(value);
			if (!result.success) {
				toast.error(result.error.issues[0].message);
				return;
			}

			setIsLoading(true);
			setUnverifiedEmail(null);
			try {
				const { error } = await authClient.signIn.email({
					email: value.email,
					password: value.password,
				});

				if (error) {
					// A conta existe mas o e-mail ainda não foi confirmado: em vez
					// de um erro genérico, explicamos o passo em falta e damos um
					// caminho para reenviar o link.
					if (parseApiError(error).code === AUTH_CODES.EMAIL_NOT_VERIFIED) {
						setUnverifiedEmail(value.email.trim());
						return;
					}

					// The API boundary already answers in PT-PT; the fallback only
					// covers a shape with nothing usable.
					handleApiError(error, {
						fallbackMessage: "Email ou palavra-passe incorretos.",
					});
					return;
				}

				toast.success("Sessão iniciada com sucesso");
				const origin =
					typeof window !== "undefined" ? window.location.origin : "";
				let target = "/";
				if (returnTo && origin) {
					try {
						const decoded = decodeURIComponent(returnTo);
						const u = new URL(decoded, origin);
						if (u.origin === origin && u.pathname.startsWith("/")) {
							target = u.pathname + u.search + u.hash;
						}
					} catch {
						target = "/";
					}
				}
				window.location.href = target;
			} catch (caught) {
				handleApiError(caught, { fallbackMessage: "Erro ao iniciar sessão" });
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

			{unverifiedEmail && (
				<div className="mb-6 rounded-md border border-border bg-muted/40 p-4">
					<p className="text-sm">
						A tua conta ainda não está confirmada. Verifica o e-mail{" "}
						<span className="font-medium text-foreground">
							{unverifiedEmail}
						</span>{" "}
						— enviámos-te um link de confirmação.
					</p>
					<ResendVerification email={unverifiedEmail} className="mt-3" />
				</div>
			)}

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

			<div className="mt-4 flex items-center justify-center gap-3 text-muted-foreground text-xs">
				<span className="h-px w-12 bg-border" aria-hidden="true" />
				ou
				<span className="h-px w-12 bg-border" aria-hidden="true" />
			</div>

			<p className="mt-4 text-center text-sm">
				<Link
					to="/login-otp"
					search={{
						returnTo: returnTo ? String(returnTo).slice(0, 2000) : undefined,
					}}
					className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
				>
					Entrar com código por email
				</Link>
			</p>
		</div>
	);
}
