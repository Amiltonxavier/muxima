import { cn } from "@muxima/ui/lib/utils";
import { QrCode, RefreshCw } from "lucide-react";

/**
 * Renders the QR Code produced by the backend.
 *
 * There is deliberately no QR generation logic here: the SVG comes from
 * `GuestInvitation.qrCode`, which the API generates with the `qrcode` library
 * when the invitation is created (and backfills when it is published). This
 * component only decides how to display it, so every surface — the public
 * invitation, the guests preview and the bulk publish preview — shows the exact
 * same code.
 */
export function InvitationQrCode({
	qrCode,
	className,
	size = 192,
	showCaption = true,
}: {
	qrCode?: string | null;
	className?: string;
	size?: number;
	showCaption?: boolean;
}) {
	if (!qrCode) {
		return (
			<div
				className={cn(
					"flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center",
					className,
				)}
				style={{ width: size, height: size }}
			>
				<RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
				<p className="text-muted-foreground text-xs">
					QR Code ainda não gerado
				</p>
			</div>
		);
	}

	return (
		<figure className={cn("flex flex-col items-center gap-2", className)}>
			{/*
			 * The backend already returned a sanitised SVG string. It is inlined
			 * (instead of an <img src="data:...">) so it scales to any size
			 * without re-downloading a base64 payload. `[&>svg]` overrides the
			 * intrinsic width/height attributes the generator emits.
			 */}
			<div
				className="rounded-lg border bg-white p-2 [&>svg]:h-full [&>svg]:w-full"
				style={{ width: size, height: size }}
				// biome-ignore lint/security/noDangerouslySetInnerHtml: trusted SVG produced by our own API from the invitation token only
				dangerouslySetInnerHTML={{ __html: qrCode }}
				role="img"
				aria-label="QR Code do convite"
			/>
			{showCaption && (
				<figcaption className="flex max-w-[16rem] items-center gap-1 text-center text-muted-foreground text-xs">
					<QrCode className="h-3 w-3 shrink-0" />
					<span>Aponte a câmara para abrir o convite</span>
				</figcaption>
			)}
		</figure>
	);
}
