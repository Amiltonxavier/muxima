import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import type { ReactNode } from "react";

type StatsCardProps = {
	title: string;
	value: ReactNode;
	description?: ReactNode;
	icon?: ReactNode;
};

export function StatsCard({ title, value, description, icon }: StatsCardProps) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<CardTitle className="font-medium text-muted-foreground text-xs">
					{title}
				</CardTitle>
				{icon && (
					<div className="text-muted-foreground">{icon}</div>
				)}
			</CardHeader>

			<CardContent>
				<div className="font-semibold text-2xl">
					{value}

					{description && (
						<span className="ml-1 font-normal text-muted-foreground text-xs">
							{description}
						</span>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
