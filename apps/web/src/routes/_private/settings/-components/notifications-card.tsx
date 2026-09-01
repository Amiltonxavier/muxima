import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";

export function NotificationsCard() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Notificações</CardTitle>
				<CardDescription>
					Gerira as suas preferências de notificação
				</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="text-muted-foreground text-sm">
					As notificações estão configuradas para serem recebidas por email
					e na aplicação.
				</p>
			</CardContent>
		</Card>
	);
}
