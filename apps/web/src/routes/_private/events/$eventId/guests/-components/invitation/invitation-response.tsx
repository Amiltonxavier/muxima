import { Button } from "@muxima/ui/components/button";
import { Check, Clock, X } from "lucide-react";
import { formatDate } from "@/utils/format-date";
import { INVITATION_RESPONSE_LABELS } from "@/utils/status-helpers";

export function InvitationResponse({
	status,
	response,
	respondedAt,
	onConfirm,
	onMaybe,
	onDecline,
	isResponding,
	canRespond = true,
}: {
	status: string;
	response: string | null;
	respondedAt: Date | string | null;
	onConfirm: () => void;
	onMaybe: () => void;
	onDecline: () => void;
	isResponding: boolean;
	/**
	 * `invitations.respond` no evento. Sem ela só os botões desaparecem — a
	 * resposta já dada continua visível, porque é informação de leitura.
	 */
	canRespond?: boolean;
}) {
	return (
		<>
			{canRespond && status !== "RESPONDED" && status !== "EXPIRED" && (
				<section className="space-y-2 border-y py-4">
					<Button
						className="w-full bg-green-600 text-white hover:bg-green-700"
						onClick={onConfirm}
						disabled={isResponding}
					>
						<Check className="mr-2 h-4 w-4" />
						Confirmar presença
					</Button>
					<div className="flex gap-2">
						<Button
							variant="outline"
							className="flex-1"
							onClick={onMaybe}
							disabled={isResponding}
						>
							<Clock className="mr-2 h-4 w-4" />
							Talvez
						</Button>
						<Button
							variant="outline"
							className="flex-1"
							onClick={onDecline}
							disabled={isResponding}
						>
							<X className="mr-2 h-4 w-4" />
							Recusar
						</Button>
					</div>
				</section>
			)}

			{response && (
				<section className="border-y py-4">
					<p className="text-muted-foreground text-xs">Resposta</p>
					<p className="mt-1 font-medium text-sm">
						{INVITATION_RESPONSE_LABELS[response] ?? response}
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
