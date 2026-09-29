import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import { Checkbox } from "@muxima/ui/components/checkbox";
import { TableCell, TableRow } from "@muxima/ui/components/table";
import { Eye, EyeOff, Globe, QrCode, Share2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/utils/format-date";
import {
	getStatusColor,
	INVITATION_RESPONSE_LABELS,
	INVITATION_STATUS_LABELS,
} from "@/utils/status-helpers";
import {
	usePublishInvitation,
	useUnpublishInvitation,
} from "../../-queries/invitation-queries";
import type { InvitationItem } from "../../-types/invitation.types";
import {
	isInvitationPublishable,
	resolveInvitationUrl,
} from "../../-utils/invitation.utils";

export function InvitationTableRow({
	invitation,
	isSelected,
	onToggleSelected,
	onView,
}: {
	invitation: InvitationItem;
	isSelected: boolean;
	onToggleSelected: (invitationId: string) => void;
	onView: (guestId: string) => void;
}) {
	const publish = usePublishInvitation();
	const unpublish = useUnpublishInvitation();

	const guests = invitation.guests.map(({ guest }) => guest);
	const guestSummary =
		guests.length === 0
			? "—"
			: guests.length === 1
				? (guests[0]?.name ?? "—")
				: `${guests[0]?.name ?? "—"} +${guests.length - 1}`;

	const isPublished = Boolean(invitation.publishedAt);
	const canPublish = isInvitationPublishable(invitation);
	const invitationUrl = resolveInvitationUrl(invitation);
	const primaryGuestId = guests[0]?.id;

	const handleShare = () => {
		if (!invitationUrl) return;
		navigator.clipboard.writeText(invitationUrl);
		toast.success("Link do convite copiado!");
	};

	const handleTogglePublish = () => {
		if (isPublished) {
			unpublish.mutate(
				{ eventId: invitation.eventId, invitationId: invitation.id },
				{
					onError: (e: Error) => toast.error(e.message),
					onSuccess: () => toast.success("Convite retirado da publicação"),
				},
			);
			return;
		}

		publish.mutate(
			{ eventId: invitation.eventId, invitationId: invitation.id },
			{
				onError: (e: Error) =>
					toast.error(e.message || "Não foi possível publicar o convite"),
				onSuccess: () => toast.success("Convite publicado!"),
			},
		);
	};

	const isBusy = publish.isPending || unpublish.isPending;

	return (
		<TableRow
			data-state={isSelected ? "selected" : undefined}
			data-testid="invitation-row"
		>
			<TableCell className="w-10">
				<Checkbox
					checked={isSelected}
					onCheckedChange={() => onToggleSelected(invitation.id)}
					aria-label={`Seleccionar convite de ${guestSummary}`}
				/>
			</TableCell>
			<TableCell className="font-medium">{guestSummary}</TableCell>
			<TableCell>
				<span className="font-mono text-xs">{invitation.code}</span>
			</TableCell>
			<TableCell>
				{invitation.status === "RESPONDED" && invitation.response ? (
					<Badge className={getStatusColor(invitation.status)}>
						{INVITATION_RESPONSE_LABELS[invitation.response] ??
							invitation.response}
					</Badge>
				) : (
					<span className="text-muted-foreground text-xs">Sem resposta</span>
				)}
			</TableCell>
			<TableCell>
				<Badge variant="outline">
					{INVITATION_STATUS_LABELS[invitation.status] ?? invitation.status}
				</Badge>
			</TableCell>
			<TableCell>
				{invitation.respondedAt ? (
					<span className="text-muted-foreground text-xs">
						{formatDate(invitation.respondedAt)}
					</span>
				) : (
					<span className="text-muted-foreground text-xs">—</span>
				)}
			</TableCell>
			<TableCell>
				<div className="flex flex-col gap-1">
					<Badge variant={isPublished ? "success" : "secondary"}>
						{isPublished ? "Publicado" : "Privado"}
					</Badge>
					{invitation.qrCode ? (
						<span className="flex items-center gap-1 text-[11px] text-muted-foreground">
							<QrCode className="h-3 w-3" /> QR pronto
						</span>
					) : null}
				</div>
			</TableCell>
			<TableCell>
				<div className="flex gap-1">
					{primaryGuestId && (
						<Button
							variant="ghost"
							size="icon-sm"
							title="Ver convite"
							onClick={() => onView(primaryGuestId)}
						>
							<Eye className="h-3.5 w-3.5" />
						</Button>
					)}
					<Button
						variant="ghost"
						size="icon-sm"
						title={isPublished ? "Retirar publicação" : "Publicar convite"}
						disabled={isBusy || (!isPublished && !canPublish)}
						onClick={handleTogglePublish}
					>
						{isPublished ? (
							<EyeOff className="h-3.5 w-3.5" />
						) : (
							<Globe className="h-3.5 w-3.5" />
						)}
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						title="Copiar link do convite"
						disabled={!invitationUrl}
						onClick={handleShare}
					>
						<Share2 className="h-3.5 w-3.5" />
					</Button>
				</div>
			</TableCell>
		</TableRow>
	);
}
