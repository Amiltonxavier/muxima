import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { MapPin } from "lucide-react";

interface EventLocationProps {
	address?: string | null;
	neighborhood?: string | null;
	municipality?: string | null;
	province?: string | null;
	reference?: string | null;
}

export function EventLocation({
	address,
	neighborhood,
	municipality,
	province,
	reference,
}: EventLocationProps) {
	const location = [address, neighborhood, municipality, province]
		.filter(Boolean)
		.join(", ");

	if (!location) {
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-sm">
					<MapPin className="h-4 w-4" />
					Morada
				</CardTitle>
			</CardHeader>

			<CardContent>
				<p className="text-sm">{location}</p>

				{reference && (
					<p className="mt-1 text-muted-foreground text-xs">
						Referência: {reference}
					</p>
				)}
			</CardContent>
		</Card>
	);
}
