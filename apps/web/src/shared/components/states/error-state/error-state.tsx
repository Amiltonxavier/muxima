import { Button } from "@muxima/ui/components/button";
import { AlertTriangle } from "lucide-react";

type ErrorStateProps = {
	message?: string;
	/** When provided, offers a retry so the user can recover without reloading. */
	onRetry?: () => void;
};

export function ErrorState({
	message = "Ocorreu um erro ao carregar os dados.",
	onRetry,
}: ErrorStateProps) {
	return (
		<div className="flex flex-col items-center justify-center gap-3 py-20">
			<AlertTriangle className="h-8 w-8 text-destructive" />

			<p className="text-muted-foreground text-sm">{message}</p>

			{onRetry && (
				<Button variant="outline" size="sm" onClick={onRetry}>
					Tentar novamente
				</Button>
			)}
		</div>
	);
}
