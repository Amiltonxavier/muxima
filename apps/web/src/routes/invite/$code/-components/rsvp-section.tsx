import type { PublicInvitation } from "@muxima/api/shared/types/entities";
import { Button } from "@muxima/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Check, Clock, X } from "lucide-react";
import { formatDate } from "@/utils/format-date";
import { INVITATION_RESPONSE_LABELS } from "@/utils/status-helpers";

export const RSVP_RESPONSES = [
	{
		value: "CONFIRM",
		label: "Confirmar presença",
		description: "Conto contigo!",
		icon: Check,
	},
	{
		value: "MAYBE",
		label: "Talvez",
		description: "Ainda vou decidir",
		icon: Clock,
	},
	{
		value: "DECLINE",
		label: "Recusar",
		description: "Não vou conseguir ir",
		icon: X,
	},
] as const;

export function RsvpSection({
	invitation,
	isResponding,
	onRespond,
}: {
	invitation: PublicInvitation;
	isResponding: boolean;
	onRespond: (response: "CONFIRM" | "DECLINE" | "MAYBE") => void;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Confirma a tua presença</CardTitle>
				<CardDescription>
					{invitation.canRespond
						? "A tua resposta ajuda o anfitrião a preparar tudo ao pormenor."
						: "Já não é possível alterar a resposta a este convite."}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-2">
				{RSVP_RESPONSES.map((option) => {
					const selected = invitation.response === option.value;
					return (
						<Button
							key={option.value}
							variant={selected ? "default" : "outline"}
							disabled={!invitation.canRespond || isResponding}
							onClick={() =>
								onRespond(option.value as "CONFIRM" | "DECLINE" | "MAYBE")
							}
							className="flex h-auto w-full flex-col items-start gap-0.5 py-3 text-left"
						>
							<span className="flex items-center">
								<option.icon className="mr-2 h-4 w-4" />
								{option.label}
							</span>
							<span className="text-muted-foreground text-xs">
								{option.description}
							</span>
						</Button>
					);
				})}

				{invitation.response && (
					<p className="pt-2 text-center text-muted-foreground text-xs">
						A tua resposta:{" "}
						<span className="font-medium text-foreground">
							{INVITATION_RESPONSE_LABELS[invitation.response] ??
								invitation.response}
						</span>
						{invitation.respondedAt &&
							` · ${formatDate(invitation.respondedAt)}`}
					</p>
				)}
			</CardContent>
		</Card>
	);
}