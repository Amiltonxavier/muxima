import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import { Card, CardContent } from "@muxima/ui/components/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import { Shield, Trash2 } from "lucide-react";
import { useSelected } from "@/core/hooks/useSelected";
import type { SelectedItem } from "@/core/types";
import {
	MEMBER_ROLE_LABELS,
	toSelectItems,
} from "@/shared/utils/status-helpers";
import { ACTION_TYPES_MEMBER } from "../-constants";
import type { ActionTypeMember, Member } from "../-types";
import { DeleteMemberDialog } from "./delete-member-dialog";

interface MemberCardProps {
	member: Member;
	onRoleChange: (memberId: string, role: string) => void;
}

export function MemberCard({ member, onRoleChange }: MemberCardProps) {
	const { isSelected, selectedAction, selectedItem, onSelect, clearSelection } =
		useSelected<SelectedItem, ActionTypeMember>();

	const userName = member.user?.name || "Utilizador";
	const userEmail = member.user?.email || "";
	const initials = userName
		.split(" ")
		.map((n: string) => n[0])
		.join("")
		.slice(0, 2);

	return (
		<>
			<Card>
				<CardContent className="p-4">
					<div className="flex items-start justify-between">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-medium text-sm">
								{initials}
							</div>
							<div className="min-w-0">
								<p className="truncate font-medium text-sm">{userName}</p>
								<p className="truncate text-muted-foreground text-xs">
									{userEmail}
								</p>
							</div>
						</div>
						<Button
							variant="ghost"
							size="icon-sm"
							className="text-destructive"
							title="Remover membro"
							onClick={() =>
								onSelect(
									member as unknown as SelectedItem,
									ACTION_TYPES_MEMBER.DELETE,
								)
							}
						>
							<Trash2 className="h-3.5 w-3.5" />
						</Button>
					</div>
					<div className="mt-3 flex items-center gap-2">
						<Select
							items={toSelectItems(MEMBER_ROLE_LABELS)}
							value={member.role}
							onValueChange={(v) => {
								if (v) onRoleChange(member.id, v);
							}}
						>
							<SelectTrigger className="h-8 w-auto text-xs">
								<Shield className="mr-1 h-3 w-3" />
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{toSelectItems(MEMBER_ROLE_LABELS).map((item) => (
									<SelectItem key={item.value} value={item.value}>
										{item.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Badge
							className={
								member.status === "ACTIVE"
									? "bg-green-50 text-green-700"
									: "bg-amber-50 text-amber-700"
							}
						>
							{member.status === "ACTIVE" ? "Ativo" : "Pendente"}
						</Badge>
					</div>
				</CardContent>
			</Card>

			{isSelected &&
				selectedAction === ACTION_TYPES_MEMBER.DELETE &&
				selectedItem && (
					<DeleteMemberDialog
						open={isSelected}
						onOpenChange={clearSelection}
						onConfirm={() => {
							clearSelection();
						}}
						isLoading={false}
					/>
				)}
		</>
	);
}
