import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import { Mail, Shield, Trash2 } from "lucide-react";
import { useState } from "react";
import type { AssignableMemberRole, MemberItem } from "../-types/member.types";
import {
	getMemberEmail,
	getMemberInitials,
	getMemberName,
	getMemberStatus,
	isOwnerRole,
	MEMBER_ROLE_DESCRIPTIONS,
	MEMBER_ROLE_LABELS,
	MEMBER_ROLE_OPTIONS,
	MEMBER_STATUS_BADGE_CLASSES,
	MEMBER_STATUS_LABELS,
} from "../-utils/member.utils";

/**
 * Member details — the card view collapsed into a dialog, so the table can
 * carry the full picture without a grid of 200 cards.
 */
export function MemberDetailsDialog({
	member,
	onClose,
	onRoleChange,
	onRemove,
	isUpdating,
	isRemoving,
}: {
	member: MemberItem;
	onClose: () => void;
	onRoleChange: (memberId: string, role: AssignableMemberRole) => void;
	onRemove: (memberId: string) => void;
	isUpdating: boolean;
	isRemoving: boolean;
}) {
	const isOwner = isOwnerRole(member.role);
	// The owner cannot be re-assigned, so there is no assignable role to seed.
	// The guard is repeated inline because narrowing through the `isOwner`
	// const alias would need a cast.
	const [role, setRole] = useState<AssignableMemberRole>(
		isOwnerRole(member.role) ? MEMBER_ROLE_OPTIONS[0].value : member.role,
	);
	const status = getMemberStatus(member);
	const roleChanged = !isOwner && role !== member.role;

	return (
		<Dialog open onOpenChange={() => onClose()}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Detalhes do membro</DialogTitle>
					<DialogDescription>
						Gerir o acesso de {getMemberName(member)} a este evento.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="flex items-center gap-3 rounded-lg border p-3">
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted font-medium">
							{getMemberInitials(member)}
						</div>
						<div className="min-w-0 flex-1">
							<p className="truncate font-medium text-sm">
								{getMemberName(member)}
							</p>
							<p className="flex items-center gap-1 truncate text-muted-foreground text-xs">
								<Mail className="h-3 w-3 shrink-0" />
								{getMemberEmail(member)}
							</p>
						</div>
						<Badge className={MEMBER_STATUS_BADGE_CLASSES[status]}>
							{MEMBER_STATUS_LABELS[status]}
						</Badge>
					</div>

					<div className="space-y-2">
						<label
							htmlFor="member-role"
							className="flex items-center gap-1.5 font-medium text-sm"
						>
							<Shield className="h-3.5 w-3.5" />
							Papel no evento
						</label>
						{isOwner ? (
							<>
								<div
									id="member-role"
									className="flex h-9 w-full items-center rounded-md border bg-muted px-3 text-sm"
								>
									{MEMBER_ROLE_LABELS.OWNER}
								</div>
								<p className="text-muted-foreground text-xs">
									{MEMBER_ROLE_DESCRIPTIONS.OWNER}
								</p>
							</>
						) : (
							<>
								<Select
									value={role}
									disabled={isUpdating}
									onValueChange={(v) => setRole(v as AssignableMemberRole)}
								>
									<SelectTrigger id="member-role">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{MEMBER_ROLE_OPTIONS.map((item) => (
											<SelectItem key={item.value} value={item.value}>
												{item.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<p className="text-muted-foreground text-xs">
									{MEMBER_ROLE_DESCRIPTIONS[role]}
								</p>
							</>
						)}
					</div>

					{roleChanged && (
						<Button
							className="w-full"
							disabled={isUpdating}
							onClick={() => onRoleChange(member.id, role)}
						>
							{isUpdating ? "A guardar..." : "Guardar novo papel"}
						</Button>
					)}
				</div>

				<DialogFooter className="border-t pt-4">
					{isOwner ? (
						<Button
							variant="outline"
							className="text-muted-foreground"
							disabled
							title="O proprietário não pode ser removido"
						>
							<Trash2 className="mr-2 h-4 w-4" />
							Não pode remover o proprietário
						</Button>
					) : (
						<Button
							variant="outline"
							className="text-destructive"
							disabled={isRemoving}
							onClick={() => onRemove(member.id)}
						>
							<Trash2 className="mr-2 h-4 w-4" />
							{isRemoving ? "A remover..." : "Remover membro"}
						</Button>
					)}
					<Button variant="outline" onClick={onClose}>
						Fechar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
