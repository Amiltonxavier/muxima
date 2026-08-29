import { AlertTriangle } from "lucide-react";

type ErrorStateProps = {
	message?: string;
};

export function ErrorState({
	message = "Ocorreu um erro ao carregar os dados.",
}: ErrorStateProps) {
	return (
		<div className="flex flex-col items-center justify-center gap-3 py-20">
			<AlertTriangle className="h-8 w-8 text-destructive" />

			<p className="text-muted-foreground text-sm">{message}</p>
		</div>
	);
}
