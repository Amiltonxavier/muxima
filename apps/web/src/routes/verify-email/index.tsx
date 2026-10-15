import { Button } from "@muxima/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CircleCheck, Loader2, MailWarning } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { verifyAccountEmail } from "@/lib/auth-client";
import { Logo } from "@/shared/components/logo";
import { ResendVerification } from "@/shared/components/resend-verification";
import { parseApiError } from "@/shared/errors";

export const Route = createFileRoute("/verify-email/")({
	validateSearch: z.object({
		/** One-time token carried by the confirmation e-mail link. */
		token: z.string().optional(),
		/** Optional address, pre-filled when the link failed and a resend is offered. */
		email: z.string().optional(),
	}),
	component: VerifyEmailPage,
});

type Status = "loading" | "success" | "error";

const MISSING_TOKEN_MESSAGE =
	"O link de confirmação é inválido ou já não está disponível.";

/**
 * Landing page for the confirmation link. It runs the verification on mount:
 * the backend marks the address verified and, because
 * `autoSignInAfterVerification` is on, opens the session in the same round
 * trip — this page never mints a session itself. Expired, tampered or already
 * consumed links land on the error state, which offers a resend.
 */
function VerifyEmailPage() {
	const { token, email } = Route.useSearch();
	const [status, setStatus] = useState<Status>(token ? "loading" : "error");
	const [message, setMessage] = useState(token ? "" : MISSING_TOKEN_MESSAGE);

	useEffect(() => {
		if (!token) return;
		let active = true;

		verifyAccountEmail(token)
			.then(({ error }) => {
				if (!active) return;
				if (error) {
					setMessage(parseApiError(error).message);
					setStatus("error");
					return;
				}
				setStatus("success");
			})
			.catch((caught) => {
				if (!active) return;
				setMessage(parseApiError(caught).message);
				setStatus("error");
			});

		return () => {
			active = false;
		};
	}, [token]);

	return (
		<div className="flex min-h-svh items-center justify-center bg-background px-6 py-12">
			<div className="w-full max-w-sm text-center">
				<div className="mb-10 flex items-center justify-center gap-2.5">
					<Logo className="h-5 text-foreground" />
					<span className="font-display text-xl">Muxima</span>
				</div>

				{status === "loading" && (
					<div>
						<Loader2 className="mx-auto mb-6 h-8 w-8 animate-spin text-primary" />
						<h2 className="font-semibold text-2xl tracking-tight">
							A confirmar o teu e-mail…
						</h2>
						<p className="mt-3 text-muted-foreground text-sm">
							Só um instante. Estamos a ativar a tua conta.
						</p>
					</div>
				)}

				{status === "success" && (
					<div>
						<div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
							<CircleCheck className="h-7 w-7" />
						</div>
						<h2 className="font-semibold text-2xl tracking-tight">
							E-mail confirmado!
						</h2>
						<p className="mt-3 text-muted-foreground text-sm">
							A tua conta está ativa e a sessão foi iniciada automaticamente. Já
							podes começar a planear.
						</p>
						<Button
							type="button"
							className="mt-6 h-11 w-full"
							onClick={() => {
								window.location.href = "/";
							}}
						>
							Continuar para a aplicação
						</Button>
					</div>
				)}

				{status === "error" && (
					<div>
						<div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
							<MailWarning className="h-7 w-7" />
						</div>
						<h2 className="font-semibold text-2xl tracking-tight">
							Não foi possível confirmar
						</h2>
						<p className="mt-3 text-muted-foreground text-sm">{message}</p>
						<p className="mt-3 text-muted-foreground text-sm">
							Pede um novo link de confirmação para o teu e-mail.
						</p>

						<ResendVerification
							email={email}
							withInput
							className="mt-6 text-left"
						/>

						<p className="mt-6 text-center text-muted-foreground text-sm">
							Já tens a conta confirmada?{" "}
							<Link
								to="/login"
								className="font-medium text-primary hover:underline"
							>
								Entrar
							</Link>
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
