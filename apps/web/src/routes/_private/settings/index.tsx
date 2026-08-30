import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { createFileRoute } from "@tanstack/react-router";
import { ModeToggle } from "@/shared/components/mode-toggle";

export const Route = createFileRoute("/_private/settings/")({
	component: SettingsPage,
});

function SettingsPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-semibold text-2xl">Configurações</h1>
				<p className="text-muted-foreground text-sm">
					Personalize a sua experiência
				</p>
			</div>

			<div className="grid max-w-lg gap-4">
				<Card>
					<CardHeader>
						<CardTitle>Aparência</CardTitle>
						<CardDescription>Escolha o tema da aplicação</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex items-center gap-4">
							<span className="text-sm">Tema:</span>
							<ModeToggle />
						</div>
					</CardContent>
				</Card>

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

				<Card>
					<CardHeader>
						<CardTitle>Conta</CardTitle>
						<CardDescription>Gerira a sua conta</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground text-sm">
							Para alterar a sua password ou eliminar a sua conta, contacte o
							suporte.
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
