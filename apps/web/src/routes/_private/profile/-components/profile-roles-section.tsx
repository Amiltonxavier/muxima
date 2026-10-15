import { DEFAULT_ACCOUNT_ROLE } from "@muxima/permissions";
import { Badge } from "@muxima/ui/components/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { KeyRound, ShieldCheck } from "lucide-react";
import type { ProfileItem, ProfileRole } from "../-types/profile.types";

/**
 * Roles and permissions.
 *
 * Everything rendered here comes straight from the API response: `role.name` is
 * the backend's label and `permissions` is the list the server derived from the
 * account's default role plus the user's `EventMember` rows. Nothing is
 * hardcoded or recomputed on the client — the tab is a view, and authorization
 * is enforced in the API regardless of what is shown.
 */
export function ProfileRolesSection({ profile }: { profile: ProfileItem }) {
	const roles = profile.roles ?? [];
	const permissions = profile.permissions ?? [];
	// Every account holds the base `USER` role from sign-up; a role beyond it
	// means the user actually belongs to at least one event.
	const hasEventRole = roles.some((role) => role.id !== DEFAULT_ACCOUNT_ROLE);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<ShieldCheck className="h-4 w-4" />
					Roles e permissões
				</CardTitle>
				<CardDescription>
					As permissões que o teu perfil possui hoje.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<p className="font-medium text-sm">Roles</p>
					{roles.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							Sem roles atribuídas.
						</p>
					) : (
						<div className="space-y-2">
							<ul className="flex flex-wrap gap-2">
								{roles.map((role) => (
									<RoleBadges key={role.id} role={role} />
								))}
							</ul>
							{!hasEventRole && (
								<p className="text-muted-foreground text-sm">
									Ainda não pertences a nenhum evento. Ao criar o teu primeiro
									evento, passas a ser o seu proprietário — com acesso total a
									ele.
								</p>
							)}
						</div>
					)}
				</div>

				<div className="space-y-2 border-t pt-4">
					<p className="flex items-center gap-2 font-medium text-sm">
						<KeyRound className="h-4 w-4 text-muted-foreground" />
						Permissões ({permissions.length})
					</p>
					{permissions.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							Sem permissões atribuídas.
						</p>
					) : (
						<ul className="flex flex-wrap gap-2">
							{permissions.map((permission) => (
								<li key={permission}>
									<Badge variant="outline" className="font-mono">
										{permission}
									</Badge>
								</li>
							))}
						</ul>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

/**
 * A role and the permissions it carries, inlined so a role with many
 * permissions stays visually attached to the role that granted them.
 */
function RoleBadges({ role }: { role: ProfileRole }) {
	return (
		<li className="flex flex-wrap items-center gap-2">
			<Badge variant="secondary">{role.name}</Badge>
			<span className="text-muted-foreground text-xs">
				{role.permissions.length} permissão(ões)
			</span>
		</li>
	);
}
