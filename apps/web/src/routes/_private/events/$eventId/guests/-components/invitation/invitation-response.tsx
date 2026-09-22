import { Button } from "@muxima/ui/components/button";
import { Check, X } from "lucide-react";
import { formatDate } from "@/utils/format-date";

export function InvitationResponse({
	status,
	response,
	respondedAt,
	onConfirm,
	onDecline,
	isResponding,
}: {
	status: string;
	response: string | null;
	respondedAt: Date | string | null;
	onConfirm: () => void;
	onDecline: () => void;
	isResponding: boolean;
}) {
	return (
		<>
			{status !== "RESPONDED" && status !== "EXPIRED" && (
				<section className="flex gap-3 border-y py-4">
					<Button
						className="flex-1 bg-green-600 text-white hover:bg-green-700"
						onClick={onConfirm}
						disabled={isResponding}
					>
						<Check className="mr-2 h-4 w-4" />
						Confirmar presença
					</Button>
					<Button
						variant="outline"
						className="flex-1"
						onClick={onDecline}
						disabled={isResponding}
					>
						<X className="mr-2 h-4 w-4" />
						Recusar convite
					</Button>
				</section>
			)}

			{response && (
				<section className="border-y py-4">
					<p className="text-muted-foreground text-xs">Resposta</p>
					<p className="mt-1 font-medium text-sm">
						{response === "CONFIRM" ? "✅ Confirmado" : "❌ Recusado"}
						{respondedAt && (
							<span className="ml-2 text-muted-foreground text-xs">
								— {formatDate(String(respondedAt))}
							</span>
						)}
					</p>
				</section>
			)}
		</>
	);
}
