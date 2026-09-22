import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function InviteMessage({
	icon,
	title,
	description,
}: {
	icon: LucideIcon;
	title: string;
	description: ReactNode;
}) {
	const Icon = icon;
	return (
		<Card className="text-center">
			<CardHeader className="items-center">
				<div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
					<Icon className="h-6 w-6 text-muted-foreground" />
				</div>
				<CardTitle className="text-base">{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-2 text-muted-foreground text-xs">
				<p>Se achas que isto é um erro, contacta o anfitrião do evento.</p>
			</CardContent>
		</Card>
	);
}