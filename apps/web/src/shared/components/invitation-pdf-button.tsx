import { Button } from "@muxima/ui/components/button";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
	toastExportError,
	useExportPublicInvitation,
} from "@/shared/hooks/use-export-download";

interface InvitationPdfButtonProps {
	/** The public invitation code from the URL. */
	code: string;
	className?: string;
	variant?: "default" | "outline" | "ghost" | "secondary";
	size?: "default" | "sm" | "lg";
}

/**
 * Download button for the public invitation page.
 *
 * The endpoint needs no session, so this works on the same page a guest sees
 * before signing in. The button stays disabled while the PDF is being built,
 * which prevents the double-click that would otherwise start a second export.
 */
export function InvitationPdfButton({
	code,
	className,
	variant = "outline",
	size = "sm",
}: InvitationPdfButtonProps) {
	const { mutate, isPending } = useExportPublicInvitation({
		onSuccess: () => toast.success("Convite PDF gerado."),
	});

	return (
		<Button
			className={className}
			variant={variant}
			size={size}
			disabled={isPending}
			onClick={() => mutate({ code }, { onError: toastExportError })}
		>
			{isPending ? <Loader2 className="animate-spin" /> : <FileText />}
			{isPending ? "A preparar PDF" : "Descarregar convite"}
		</Button>
	);
}
