import { Inbox } from "lucide-react";

type EmptyStateProps = {
	message?: string;
};

export function EmptyState({
	message = "Nenhum registo encontrado.",
}: EmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center gap-3 py-20">
			<Inbox className="h-8 w-8 text-muted-foreground" />

			<p className="text-muted-foreground text-sm">{message}</p>
		</div>
	);
}
