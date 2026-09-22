import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import { TableCell, TableRow } from "@muxima/ui/components/table";
import {
	Eye,
	Mail,
	Pencil,
	Phone,
	Plus,
	Share2,
	Trash2,
	Users,
} from "lucide-react";
import { getStatusColor, getStatusLabel } from "@/utils/status-helpers";
import type { GuestItem } from "../-types/guest.types";
import {
	getGuestCompanions,
	getGuestTableName,
	getGuestTypeLabel,
} from "../-utils/guest.utils";

export function GuestsTableRow({
	guest,
	onViewInvitation,
	onShareInvitation,
	onEditGuest,
	onDeleteGuest,
	onManageCompanions,
}: {
	guest: GuestItem;
	onViewInvitation: (guestId: string) => void;
	onShareInvitation: (guest: GuestItem) => void;
	onEditGuest: (guest: GuestItem) => void;
	onDeleteGuest: (guest: GuestItem) => void;
	onManageCompanions: (guest: GuestItem) => void;
}) {
	const tableName = getGuestTableName(guest);
	const companions = getGuestCompanions(guest);

	return (
		<TableRow>
			<TableCell className="font-medium">{guest.name}</TableCell>
			<TableCell>
				<div className="flex flex-col gap-0.5 text-muted-foreground text-xs">
					{guest.phone ? (
						<span className="flex items-center gap-1">
							<Phone className="h-3 w-3" />
							{guest.phone}
						</span>
					) : null}
					{guest.email ? (
						<span className="flex items-center gap-1">
							<Mail className="h-3 w-3" />
							{guest.email}
						</span>
					) : null}
				</div>
			</TableCell>
			<TableCell>{guest.group || "—"}</TableCell>
			<TableCell>{getGuestTypeLabel(guest.type)}</TableCell>
			<TableCell>
				{tableName ? (
					<Badge className="bg-blue-50 text-blue-700">{tableName}</Badge>
				) : (
					<span className="text-muted-foreground text-xs">—</span>
				)}
			</TableCell>
			<TableCell>
				{companions.length > 0 ? (
					<Button
						variant="ghost"
						size="icon-sm"
						className="h-7 gap-1 text-xs"
						onClick={() => onManageCompanions(guest)}
					>
						<Users className="h-3.5 w-3.5" />
						{companions.length}
					</Button>
				) : (
					<Button
						variant="ghost"
						size="icon-sm"
						className="h-7 text-muted-foreground"
						onClick={() => onManageCompanions(guest)}
					>
						<Plus className="h-3.5 w-3.5" />
					</Button>
				)}
			</TableCell>
			<TableCell>
				<Badge className={getStatusColor(guest.status || "PENDING")}>
					{getStatusLabel(guest.status || "PENDING", "guest")}
				</Badge>
			</TableCell>
			<TableCell>
				<div className="flex gap-1">
					<Button
						variant="ghost"
						size="icon-sm"
						title="Ver convite"
						onClick={() => onViewInvitation(guest.id)}
					>
						<Eye className="h-3.5 w-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						title="Partilhar convite"
						onClick={() => onShareInvitation(guest)}
					>
						<Share2 className="h-3.5 w-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						title="Editar"
						onClick={() => onEditGuest(guest)}
					>
						<Pencil className="h-3.5 w-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						className="text-destructive"
						title="Eliminar"
						onClick={() => onDeleteGuest(guest)}
					>
						<Trash2 className="h-3.5 w-3.5" />
					</Button>
				</div>
			</TableCell>
		</TableRow>
	);
}
