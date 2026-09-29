import { Button } from "@muxima/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { FolderKanban, UserPlus } from "lucide-react";
import type { ProfileItem } from "../-types/profile.types";

/**
 * Danger zone.
 *
 * Blocking is irreversible from the account itself: the API revokes every
 * session, so this action needs an explicit confirmation and a redirect to the
 * sign-in screen afterwards.
 */
export function ProfileDangerZone({
	profile,
	isBlocking,
	onBlock,
}: {
	profile: ProfileItem;
	isBlocking: boolean;
	onBlock: (reason?: string) => void;
}) {
	const activity = profile.activity;
	const ownedEvents = activity?.ownedEvents ?? 0;
	const memberships = activity?.eventMemberships ?? 0;
	const hasActivity = ownedEvents > 0 || memberships > 1;

	return (
		<Card className="max-w-lg border-destructive/40">
			<CardHeader>
				<CardTitle className="text-destructive">Zona de risco</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{activity && (
					<div className="flex items-center gap-3 rounded-md bg-muted/50 p-3 text-sm">
						<FolderKanban className="h-4 w-4 shrink-0 text-muted-foreground" />
						<div className="flex-1">
							<p className="font-medium">
								{ownedEvents} evento(s) e {memberships} membro(s)
							</p>
							<p className="text-muted-foreground text-xs">
								{hasActivity
									? "Estes dados permanecem, mas deixam de ser geridos por ti."
									: "Ainda não geres eventos com esta conta."}
							</p>
						</div>
					</div>
				)}

				<div className="space-y-2">
					<p className="font-medium text-sm">Bloquear conta</p>
					<p className="text-muted-foreground text-sm">
						Encerra imediatamente a sessão em todos os dispositivos e impede
						novos inícios de sessão com esta conta. Os teus eventos e convidados
						não são eliminados.
					</p>
					<Button
						variant="destructive"
						disabled={isBlocking}
						onClick={() => onBlock()}
					>
						<UserPlus className="mr-2 h-4 w-4 rotate-180" />
						{isBlocking ? "A bloquear..." : "Bloquear a minha conta"}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
