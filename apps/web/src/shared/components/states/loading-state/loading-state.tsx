import { Loader2 } from "lucide-react";

export function LoadingState() {
	return (
		<div className="flex flex-col items-center justify-center gap-3 py-20">
			<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			<span className="text-muted-foreground text-sm">A carregar dados...</span>
		</div>
	);
}
