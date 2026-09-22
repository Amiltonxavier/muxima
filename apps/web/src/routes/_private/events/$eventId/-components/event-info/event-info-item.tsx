import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@muxima/ui/components/card";

interface EventInfoItemProps {
	icon: LucideIcon;
	label: string;
	value: string;
}

export function EventInfoItem({
	icon: Icon,
	label,
	value,
}: EventInfoItemProps) {
	return (
		<Card>
			<CardContent className="flex items-center gap-3 p-4">
				<div className="flex h-10 w-10 items-center justify-center bg-slate-50">
					<Icon className="h-5 w-5 text-slate-600" />
				</div>

				<div>
					<p className="text-muted-foreground text-xs">{label}</p>

					<p className="font-medium text-sm">{value}</p>
				</div>
			</CardContent>
		</Card>
	);
}