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
 * user's `EventMember` rows. Nothing is hardcoded or recomputed on the client —
 * the tab is a view, and authorization is enforced in the API regardless of
 * what is shown.
 */
export function ProfileRolesSection({ profile }: { profile: ProfileItem }) {
	const roles = profile.roles ?? [];
	const permissions = profile.permissions ?? [];

	return (
		<Card className="max-w-lg">
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
							Ainda não pertences a nenhum evento, por isso não tens roles
							atribuídas.
						</p>
					) : (
						<ul className="flex flex-wrap gap-2">
							{roles.map((role) => (
								<RoleBadges key={role.id} role={role} />
							))}
						</ul>
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
