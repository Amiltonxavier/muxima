import { Button } from "@muxima/ui/components/button";
import { Card } from "@muxima/ui/components/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@muxima/ui/components/table";
import { Eye, Shield, Trash2 } from "lucide-react";
import { QueryState } from "@/shared/components/states";
import { StatusDot } from "@/shared/components/status-dot";
import { useEventLock } from "@/shared/hooks/use-event-lock";
import { getStatusLabel, getStatusTone } from "@/utils/status-helpers";
import type { MemberItem } from "../-types/member.types";
import {
	getMemberEmail,
	getMemberInitials,
	getMemberName,
	isInvitation,
	isOwnerRole,
	isSettledInvitation,
	MEMBER_ROLE_LABELS,
	MEMBER_ROLE_OPTIONS,
} from "../-utils/member.utils";

/**
 * Members as a table instead of a card grid: with search, role and status
 * filters a table is far easier to scan, and it matches the guests module.
 */
/**
 * `canChangeRole` / `canRemove` come from the caller's grants in THIS event, not
 * from their role name: `members.update-role` is OWNER-only while
 * `members.remove` also covers the tiers that manage the team, and the two must
 * not be collapsed into one "is an admin" check. Without them a VIEWER is shown
 * an editable role dropdown that fails with 403 on selection.
 */
export function MembersTable({
	members,
	isLoading,
	isError,

	onViewDetails,
	onRemove,
	disabledMemberId,
	canChangeRole,
	canRemove,
}: {
	members: MemberItem[];
	isLoading: boolean;
	isError: boolean;
	onViewDetails: (member: MemberItem) => void;
	onRemove: (memberId: string) => void;
	disabledMemberId?: string;
	canChangeRole: boolean;
	canRemove: boolean;
}) {
	const { isEventLocked, lockMessage } = useEventLock();

	return (
		<QueryState
			state={{
				isLoading,
				isError,
				isEmpty: members.length === 0,
				hasData: members.length > 0,
			}}
		>
			<Card>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Membro</TableHead>
							<TableHead>E-mail</TableHead>
							<TableHead className="w-[190px]">Papel</TableHead>
							<TableHead className="w-[130px]">Estado</TableHead>
							<TableHead className="w-24 text-right">Ações</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{members.map((member) => {
							const isOwner = isOwnerRole(member.role);
							// The owner has no assignable role, so its Select has no matching
							// option and must be rendered read-only.
							const memberRole = isOwner
								? MEMBER_ROLE_LABELS.OWNER
								: (MEMBER_ROLE_OPTIONS.find(
										(option) => option.value === member.role,
									)?.label ?? member.role);

							return (
								<TableRow key={member.id}>
									<TableCell>
										<div className="flex items-center gap-3">
											<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-xs">
												{getMemberInitials(member)}
											</div>
											<div className="min-w-0">
												<p className="truncate font-medium text-sm">
													{getMemberName(member)}
												</p>
											</div>
										</div>
									</TableCell>
									<TableCell>
										<p className="truncate text-muted-foreground text-xs">
											{getMemberEmail(member)}
										</p>
									</TableCell>
									<TableCell>
										{isOwner ? (
											<div className="flex h-8 w-auto items-center gap-1 text-xs">
												<Shield className="h-3 w-3" />
												{MEMBER_ROLE_LABELS.OWNER}
											</div>
										) : (
											<div className="flex h-8 w-auto items-center gap-1 text-xs">
												<Shield className="h-3 w-3" />
												{memberRole}
											</div>
										)}
									</TableCell>
									<TableCell>
										<StatusDot
											label={getStatusLabel(member.status, "member")}
											tone={getStatusTone(member.status)}
										/>
									</TableCell>
									<TableCell>
										<div className="flex justify-end gap-1">
											<Button
												variant="ghost"
												size="icon-sm"
												title="Ver detalhes"
												onClick={() => onViewDetails(member)}
											>
												<Eye className="h-3.5 w-3.5" />
											</Button>
											{isOwner ? (
												<Button
													variant="ghost"
													size="icon-sm"
													title="O proprietário não pode ser removido"
													disabled
												>
													<Trash2 className="h-3.5 w-3.5" />
												</Button>
											) : isSettledInvitation(member) ? null : (
												<Button
													variant="ghost"
													size="icon-sm"
													className="text-destructive"
													title={
														isEventLocked
															? (lockMessage ?? undefined)
															: isInvitation(member)
																? "Cancelar convite"
																: "Remover membro"
													}
													disabled={isEventLocked}
													onClick={() => onRemove(member.id)}
												>
													<Trash2 className="h-3.5 w-3.5" />
												</Button>
											)}
										</div>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</Card>
		</QueryState>
	);
}

export { MEMBER_ROLE_LABELS };
