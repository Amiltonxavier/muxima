import { Button } from "@muxima/ui/components/button";
import { Copy } from "lucide-react";

export function InvitationCode({
	code,
	onCopy,
}: {
	code: string;
	onCopy: () => void;
}) {
	return (
		<section className="flex items-center justify-between border-y py-4">
			<div>
				<p className="text-[11px] text-muted-foreground uppercase tracking-wider">
					Código de confirmação
				</p>
				<p className="mt-1 font-mono font-semibold text-lg tracking-[0.15em]">
					{String(code)}
				</p>
			</div>
			<Button
				variant="outline"
				size="sm"
				className="rounded-none"
				onClick={onCopy}
			>
				<Copy className="mr-2 h-3.5 w-3.5" />
				Copiar
			</Button>
		</section>
	);
}
