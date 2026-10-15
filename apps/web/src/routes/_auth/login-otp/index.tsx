import { Button } from "@muxima/ui/components/button";
import { Input } from "@muxima/ui/components/input";
import { Label } from "@muxima/ui/components/label";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { requestSignInOtp, verifySignInOtp } from "@/lib/auth-client";
import { handleApiError } from "@/shared/errors";
import { loginSchema } from "@/utils/auth-schemas";

export const Route = createFileRoute("/_auth/login-otp/")({
	validateSearch: z.object({
		returnTo: z.string().optional(),
	}),
	component: LoginOtpPage,
});

const otpSchema = z
	.string()
	.trim()
	.min(6, "O código tem 6 caracteres")
	.max(6, "O código tem 6 caracteres")
	.regex(/^[A-Za-z0-9]{6}$/, "Código inválido");

/** How long a user must wait before requesting a new code. */
const RESEND_WINDOW_SECONDS = 60;

function LoginOtpPage() {
	const { returnTo } = Route.useSearch();
	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [step, setStep] = useState<"send" | "verify">("send");
	const [isLoading, setIsLoading] = useState(false);
	const [resendIn, setResendIn] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (resendIn <= 0) return;
		const timer = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
		return () => window.clearTimeout(timer);
	}, [resendIn]);

	useEffect(() => {
		if (step === "verify") inputRef.current?.focus();
	}, [step]);

	function redirectAfterSignIn() {
		const origin = typeof window !== "undefined" ? window.location.origin : "";
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
	}

	async function sendCode(targetEmail: string) {
		setIsLoading(true);
		try {
			const { error } = await requestSignInOtp(targetEmail);
			if (error) {
				handleApiError(error, {
					fallbackMessage: "Não foi possível enviar o código",
				});
				return false;
			}
			return true;
		} catch (caught) {
			handleApiError(caught, {
				fallbackMessage: "Não foi possível enviar o código",
			});
			return false;
		} finally {
			setIsLoading(false);
		}
	}

	async function handleSendCode() {
		const parsed = loginSchema.pick({ email: true }).safeParse({ email });
		if (!parsed.success) {
			toast.error(parsed.error.issues[0].message);
			return;
		}
		const ok = await sendCode(parsed.data.email);
		if (!ok) return;
		setEmail(parsed.data.email);
		setStep("verify");
		setResendIn(RESEND_WINDOW_SECONDS);
		toast.success("Código enviado — verifique o seu email");
	}

	async function handleVerify() {
		const parsed = otpSchema.safeParse(code);
		if (!parsed.success) {
			toast.error(parsed.error.issues[0].message);
			return;
		}
		setIsLoading(true);
		try {
			const { error } = await verifySignInOtp(email, parsed.data);
			if (error) {
				handleApiError(error, { fallbackMessage: "Código inválido" });
				if (inputRef.current) inputRef.current.select();
				return;
			}
			toast.success("Sessão iniciada com sucesso");
			redirectAfterSignIn();
		} catch (caught) {
			handleApiError(caught, { fallbackMessage: "Erro ao iniciar sessão" });
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<div>
			<div className="mb-8 space-y-1.5">
				<h2 className="font-semibold text-2xl tracking-tight">
					Código de acesso
				</h2>
				<p className="text-muted-foreground text-sm">
					{step === "send"
						? "Receba um código no seu email para entrar sem palavra-passe."
						: `Introduza o código enviado para ${email}.`}
				</p>
			</div>

			{step === "send" ? (
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						void handleSendCode();
					}}
					className="space-y-5"
				>
					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							type="email"
							autoComplete="email"
							placeholder="seu@email.com"
							className="h-11"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							disabled={isLoading}
						/>
					</div>

					<Button type="submit" className="h-11 w-full" disabled={isLoading}>
						{isLoading ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<ShieldCheck className="mr-2 h-4 w-4" />
						)}
						Enviar código
					</Button>
				</form>
			) : (
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						void handleVerify();
					}}
					className="space-y-5"
				>
					<div className="space-y-2">
						<Label htmlFor="otp">Código de 6 caracteres</Label>
						<Input
							ref={inputRef}
							id="otp"
							inputMode="text"
							autoCapitalize="characters"
							autoComplete="one-time-code"
							placeholder="••••••"
							className="h-11 text-center font-mono text-lg tracking-[0.35em]"
							value={code}
							onChange={(e) =>
								setCode(e.target.value.toUpperCase().slice(0, 6))
							}
							disabled={isLoading}
						/>
						<p className="text-muted-foreground text-xs">
							“Confidencial”: nunca partilhe este código.
						</p>
					</div>

					<Button type="submit" className="h-11 w-full" disabled={isLoading}>
						{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Entrar
					</Button>

					<button
						type="button"
						onClick={() => void handleSendCode()}
						disabled={isLoading || resendIn > 0}
						className="w-full text-center text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
					>
						{resendIn > 0
							? `Reenviar código em ${resendIn}s`
							: "Reenviar código"}
					</button>

					<button
						type="button"
						onClick={() => {
							setStep("send");
							setCode("");
						}}
						disabled={isLoading}
						className="flex w-full items-center justify-center gap-1.5 text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline disabled:no-underline disabled:opacity-60"
					>
						<ArrowLeft className="h-3.5 w-3.5" />
						Usar outro email
					</button>
				</form>
			)}

			<p className="mt-8 text-center text-muted-foreground text-sm">
				Prefere a palavra-passe?{" "}
				<Link
					to="/login"
					search={{ returnTo }}
					className="font-medium text-foreground underline-offset-4 hover:underline"
				>
					Entrar com palavra-passe
				</Link>
			</p>
		</div>
	);
}
