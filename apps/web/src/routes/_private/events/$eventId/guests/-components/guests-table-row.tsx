import { PERMISSIONS } from "@muxima/permissions";
import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import { Checkbox } from "@muxima/ui/components/checkbox";
import { TableCell, TableRow } from "@muxima/ui/components/table";
import {
	Eye,
	Globe,
	Mail,
	Pencil,
	Phone,
	Plus,
	Share2,
	Trash2,
	Users,
} from "lucide-react";
import { StatusDot } from "@/shared/components/status-dot";
import { useEventCan } from "@/shared/hooks/use-can";
import { useEventLock } from "@/shared/hooks/use-event-lock";
import { getStatusLabel, getStatusTone } from "@/utils/status-helpers";
import type { GuestItem } from "../-types/guest.types";
import {
	getGuestCompanions,
	getGuestInvitation,
	getGuestTableName,
	getGuestTypeLabel,
} from "../-utils/guest.utils";

export function GuestsTableRow({
	guest,
	isSelected,
	onToggleSelected,
	onViewInvitation,
	onShareInvitation,
	onEditGuest,
	onDeleteGuest,
	onManageCompanions,
}: {
	guest: GuestItem;
	isSelected: boolean;
	onToggleSelected: (guestId: string) => void;
	onViewInvitation: (guestId: string) => void;
	onShareInvitation: (guest: GuestItem) => void;
	onEditGuest: (guest: GuestItem) => void;
	onDeleteGuest: (guest: GuestItem) => void;
	onManageCompanions: (guest: GuestItem) => void;
}) {
	const tableName = getGuestTableName(guest);
	const companions = getGuestCompanions(guest);
	const status = guest.status || "PENDING";
	const invitation = getGuestInvitation(guest);
	const isInvitationPublished = Boolean(invitation?.publishedAt);
	// Companion rule: a guest whose invitation was declined may still have
	// companions added; other states keep the existing limit behaviour. The
	// backend enforces the same rule — this only shapes the UI.
	const canAddCompanion =
		invitation?.rsvpStatus === "DECLINED" ||
		companions.length < (guest.companionsLimit ?? 0);
	// Locked event: only viewing stays available — every mutation button is
	// disabled with the reason as feedback (the backend rejects it anyway).
	const { eventId, isEventLocked, lockMessage } = useEventLock();
	const lockedTitle = lockMessage ?? undefined;
	// Authorization, decided by the caller's grants in THIS event: editing the
	// guest (and their companions) and deleting are separate capabilities, so a
	// role may hold one without the other. Hidden while unknown, so a control
	// never flashes into view only to fail with 403.
	const canUpdate = useEventCan(eventId ?? undefined, PERMISSIONS.GUEST_UPDATE);
	const canDelete = useEventCan(eventId ?? undefined, PERMISSIONS.GUEST_DELETE);

	return (
		<TableRow data-state={isSelected ? "selected" : undefined}>
			<TableCell className="w-10">
				<Checkbox
					checked={isSelected}
					onCheckedChange={() => onToggleSelected(guest.id)}
					aria-label={`Seleccionar ${guest.name}`}
				/>
			</TableCell>
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
					<Badge>{tableName}</Badge>
				) : (
					<span className="text-muted-foreground text-xs">—</span>
				)}
			</TableCell>
			<TableCell>
				{canUpdate ? (
					companions.length > 0 ? (
						<Button
							variant="ghost"
							size="icon-sm"
							className="h-7 gap-1 text-xs"
							disabled={isEventLocked}
							title={isEventLocked ? lockedTitle : undefined}
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
							disabled={isEventLocked}
							onClick={() => onManageCompanions(guest)}
							title={
								isEventLocked
									? lockedTitle
									: canAddCompanion
										? "Adicionar acompanhante"
										: "Convite recusado — adicionar acompanhante"
							}
							aria-label={`Gerir acompanhantes de ${guest.name}`}
						>
							<Plus
								className={`h-3.5 w-3.5 ${canAddCompanion ? "" : "opacity-70"}`}
							/>
						</Button>
					)
				) : null}
			</TableCell>
			<TableCell>
				<StatusDot
					label={getStatusLabel(status, "guest")}
					tone={getStatusTone(status)}
				/>
			</TableCell>

			<TableCell>
				{invitation ? (
					<Badge
						variant={isInvitationPublished ? "success" : "secondary"}
						className="gap-1"
					>
						<Globe className="h-3 w-3" />
						{isInvitationPublished ? "Publicado" : "Privado"}
					</Badge>
				) : (
					<span className="text-muted-foreground text-xs">Sem convite</span>
				)}
			</TableCell>

			<TableCell>
				<div className="flex items-center gap-1">
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
						disabled={isEventLocked}
						title={isEventLocked ? lockedTitle : "Partilhar convite"}
						onClick={() => onShareInvitation(guest)}
					>
						<Share2 className="h-3.5 w-3.5" />
					</Button>
					{canUpdate && (
						<Button
							variant="ghost"
							size="icon-sm"
							disabled={isEventLocked}
							title={isEventLocked ? lockedTitle : "Editar"}
							onClick={() => onEditGuest(guest)}
						>
							<Pencil className="h-3.5 w-3.5" />
						</Button>
					)}
					{canDelete && (
						<Button
							variant="ghost"
							size="icon-sm"
							className="text-destructive"
							disabled={isEventLocked}
							title={isEventLocked ? lockedTitle : "Eliminar"}
							onClick={() => onDeleteGuest(guest)}
						>
							<Trash2 className="h-3.5 w-3.5" />
						</Button>
					)}
				</div>
			</TableCell>
		</TableRow>
	);
}
