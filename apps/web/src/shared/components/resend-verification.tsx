import { Button } from "@muxima/ui/components/button";
import { Input } from "@muxima/ui/components/input";
import { Label } from "@muxima/ui/components/label";
import { Loader2, Mail, MailCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { resendVerificationEmail } from "@/lib/auth-client";
import { handleApiError } from "@/shared/errors";

type ResendVerificationProps = {
	/** Pre-filled recipient; required when `withInput` is false. */
	email?: string;
	/** Show an editable e-mail field (for links where the address is unknown). */
	withInput?: boolean;
	className?: string;
};

/**
 * Re-sends the confirmation e-mail. Used both when a fresh account lands on the
 * "verify your e-mail" screen (address known) and when a verification link
 * fails and the visitor must type the address again.
 */
export function ResendVerification({
	email,
	withInput = false,
	className,
}: ResendVerificationProps) {
	const [value, setValue] = useState(email ?? "");
	const [isLoading, setIsLoading] = useState(false);
	const [sent, setSent] = useState(false);

	const handleResend = async () => {
		const target = value.trim();
		if (!target) {
			toast.error("Indique o seu email.");
			return;
		}

		setIsLoading(true);
		try {
			const { error } = await resendVerificationEmail(target);
			if (error) {
				handleApiError(error, {
					fallbackMessage: "Não foi possível reenviar o email",
				});
				return;
			}

			setSent(true);
			toast.success("Enviámos um novo link de confirmação.");
		} catch (caught) {
			handleApiError(caught, {
				fallbackMessage: "Não foi possível reenviar o email",
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className={className}>
			{withInput && (
				<div className="space-y-2 text-left">
					<Label htmlFor="resend-email">Email</Label>
					<Input
						id="resend-email"
						type="email"
						autoComplete="email"
						placeholder="seu@email.com"
						className="h-11"
						value={value}
						onChange={(e) => {
							setValue(e.target.value);
							setSent(false);
						}}
						disabled={isLoading}
					/>
				</div>
			)}

			<Button
				type="button"
				variant="outline"
				className="mt-3 h-11 w-full"
				onClick={handleResend}
				disabled={isLoading}
			>
				{isLoading ? (
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
				) : sent ? (
					<MailCheck className="mr-2 h-4 w-4" />
				) : (
					<Mail className="mr-2 h-4 w-4" />
				)}
				{sent ? "Reenviar novamente" : "Reenviar email de confirmação"}
			</Button>
		</div>
	);
}
