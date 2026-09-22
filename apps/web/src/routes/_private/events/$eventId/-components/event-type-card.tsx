// -components/event-type-card.tsx

import { Gift } from "lucide-react";

import {
	Card,
	CardContent,
} from "@muxima/ui/components/card";

interface EventTypeCardProps {
	type: "WEDDING" | "ENGAGEMENT";
}

export function EventTypeCard({ type }: EventTypeCardProps) {
	return (
		<Card>
			<CardContent className="flex items-center gap-3 p-4">
				<div className="flex h-10 w-10 items-center justify-center bg-pink-50">
					<Gift className="h-5 w-5 text-pink-600" />
				</div>

				<div>
					<p className="text-muted-foreground text-xs">
						Tipo de evento
					</p>

					<p className="font-medium text-sm">
						{type === "WEDDING" ? "Casamento" : "Noivado"}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}