import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import { Card } from "@muxima/ui/components/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@muxima/ui/components/table";
import { MoreHorizontal, Shield, Trash2 } from "lucide-react";
import { QueryState } from "@/shared/components/states";
import type { AssignableMemberRole, MemberItem } from "../-types/member.types";
import {
	getMemberEmail,
	getMemberInitials,
	getMemberName,
	getMemberStatus,
	isOwnerRole,
	MEMBER_ROLE_LABELS,
	MEMBER_ROLE_OPTIONS,
	MEMBER_STATUS_BADGE_CLASSES,
	MEMBER_STATUS_LABELS,
} from "../-utils/member.utils";

/**
 * Members as a table instead of a card grid: with search, role and status
 * filters a table is far easier to scan, and it matches the guests module.
 */
export function MembersTable({
	members,
	isLoading,
	isError,
	onRoleChange,
	onViewDetails,
	onRemove,
	disabledMemberId,
}: {
	members: MemberItem[];
	isLoading: boolean;
	isError: boolean;
	onRoleChange: (memberId: string, role: AssignableMemberRole) => void;
	onViewDetails: (member: MemberItem) => void;
	onRemove: (memberId: string) => void;
	disabledMemberId?: string;
}) {
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
							const status = getMemberStatus(member);
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
											<Select
												value={memberRole}
												disabled={disabledMemberId === member.id}
												onValueChange={(v) => {
													if (v)
														onRoleChange(member.id, v as AssignableMemberRole);
												}}
											>
												<SelectTrigger className="h-8 w-auto gap-1 text-xs">
													<Shield className="h-3 w-3" />
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
										)}
									</TableCell>
									<TableCell>
										<Badge className={MEMBER_STATUS_BADGE_CLASSES[status]}>
											{MEMBER_STATUS_LABELS[status]}
										</Badge>
									</TableCell>
									<TableCell>
										<div className="flex justify-end gap-1">
											<Button
												variant="ghost"
												size="icon-sm"
												title="Ver detalhes"
												onClick={() => onViewDetails(member)}
											>
												<MoreHorizontal className="h-3.5 w-3.5" />
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
											) : (
												<Button
													variant="ghost"
													size="icon-sm"
													className="text-destructive"
													title="Remover membro"
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
