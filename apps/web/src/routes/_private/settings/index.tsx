import { createFileRoute } from "@tanstack/react-router";
import { AppearanceCard } from "./-components/appearance-card";
import { AccountCard } from "./-components/account-card";
import { NotificationsCard } from "./-components/notifications-card";

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
				<AppearanceCard />
				<NotificationsCard />
				<AccountCard />
			</div>
		</div>
	);
}
