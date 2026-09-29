import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import { Copy, Link2 } from "lucide-react";

/**
 * Public link of the invitation.
 *
 * The URL is built by the backend (and is the exact payload encoded in the QR
 * Code), so copying it here always matches what the guest will scan.
 */
export function InvitationLink({
	url,
	onCopy,
}: {
	url: string | null;
	onCopy: () => void;
}) {
	return (
		<section className="space-y-2 border-b py-4">
			<div className="flex items-center justify-between">
				<p className="text-[11px] text-muted-foreground uppercase tracking-wider">
					Link do convite
				</p>
				<Badge variant={url ? "success" : "secondary"}>
					{url ? "Pronto a partilhar" : "Indisponível"}
				</Badge>
			</div>
			<div className="flex items-center gap-2">
				<p className="min-w-0 flex-1 truncate font-mono text-xs">
					{url ?? "—"}
				</p>
				<Button
					variant="outline"
					size="sm"
					className="rounded-none"
					disabled={!url}
					onClick={onCopy}
				>
					<Copy className="mr-2 h-3.5 w-3.5" />
					Copiar
				</Button>
			</div>
			<p className="flex items-center gap-1 text-[11px] text-muted-foreground">
				<Link2 className="h-3 w-3" />O QR Code abaixo aponta para este mesmo
				endereço.
			</p>
		</section>
	);
}
