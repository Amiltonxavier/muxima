import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import { TableCell, TableRow } from "@muxima/ui/components/table";
import { EyeOff, Globe, Share2 } from "lucide-react";
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
} from "../-queries/invitation-queries";
import type { InvitationItem } from "../-types/invitation.types";
import { buildInvitationLink } from "../-utils/invitation.utils";

export function InvitationTableRow({
	invitation,
}: {
	invitation: InvitationItem;
}) {
	const publish = usePublishInvitation();
	const unpublish = useUnpublishInvitation();

	const guests = invitation.guests.map(({ guest }) => guest);
	const guestSummary =
		guests.length === 0
			? "—"
			: guests.length === 1
				? guests[0]?.name || "—"
				: `${guests[0]?.name || "—"} +${guests.length - 1}`;

	const isPublished = Boolean(invitation.publishedAt);

	const handleShare = () => {
		navigator.clipboard.writeText(buildInvitationLink(invitation.code));
		toast.success("Link do convite copiado!");
	};

	const handleTogglePublish = () => {
		if (isPublished) {
			unpublish.mutate(
				{ invitationId: invitation.id },
				{
					onError: (e) => toast.error(e.message),
					onSuccess: () => toast.success("Convite retirado da publicação"),
				},
			);
		} else {
			publish.mutate(
				{ invitationId: invitation.id },
				{
					onError: (e) => toast.error(e.message),
					onSuccess: () => toast.success("Convite publicado!"),
				},
			);
		}
	};

	const isBusy = publish.isPending || unpublish.isPending;

	return (
		<TableRow>
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
				<Badge variant={isPublished ? "success" : "secondary"}>
					{isPublished ? "Publicado" : "Privado"}
				</Badge>
			</TableCell>
			<TableCell>
				<div className="flex gap-1">
					<Button
						variant="ghost"
						size="icon-sm"
						title={isPublished ? "Retirar publicação" : "Publicar convite"}
						disabled={isBusy}
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
						onClick={handleShare}
					>
						<Share2 className="h-3.5 w-3.5" />
					</Button>
				</div>
			</TableCell>
		</TableRow>
	);
}
