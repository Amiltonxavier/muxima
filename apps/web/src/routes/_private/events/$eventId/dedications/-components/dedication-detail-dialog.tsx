import { Badge } from "@muxima/ui/components/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { Skeleton } from "@muxima/ui/components/skeleton";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@muxima/ui/components/tabs";
import { RichTextEditor } from "@/shared/components/rich-text-editor";
import {
	useDedication,
	useDedicationHistory,
} from "@/shared/queries/dedication-queries";
import { formatDate } from "@/utils/format-date";
import { isRichTextEmpty } from "@/utils/rich-text";
import {
	DEDICATION_STATUS_LABELS,
	DEDICATION_TYPE_LABELS,
	getStatusColor,
} from "@/utils/status-helpers";

const ACTION_LABELS: Record<string, string> = {
	CREATED: "Criada",
	UPDATED: "Editada",
	STATUS_CHANGED: "Estado alterado",
	LOCKED: "Bloqueada",
	UNLOCKED: "Desbloqueada",
	VIEWER_ADDED: "Acesso concedido",
	VIEWER_REMOVED: "Acesso removido",
	OPENED: "Aberta",
	DELETED: "Eliminada",
};

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	eventId: string;
	dedicationId: string | null;
	fallbackTitle: string;
};

export function DedicationDetailDialog({
	open,
	onOpenChange,
	eventId,
	dedicationId,
	fallbackTitle,
}: Props) {
	// Mounted only while the dialog is open: `get` writes an `OPENED` audit
	// row, so it must never run for a list row or a prefetch.
	const detailQuery = useDedication(eventId, open ? dedicationId : null);
	const historyQuery = useDedicationHistory(
		eventId,
		open ? dedicationId : null,
	);

	const detail = detailQuery.data;
	const history = historyQuery.data ?? [];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>{detail?.title ?? fallbackTitle}</DialogTitle>
					<DialogDescription className="flex flex-wrap items-center gap-2">
						{detail ? (
							<>
								<Badge
									variant="secondary"
									className={getStatusColor(detail.status)}
								>
									{DEDICATION_STATUS_LABELS[detail.status] ?? detail.status}
								</Badge>
								<Badge variant="secondary">
									{DEDICATION_TYPE_LABELS[detail.type] ?? detail.type}
								</Badge>
								<Badge
									variant="secondary"
									className={detail.isLocked ? "" : "bg-blue-50 text-blue-700"}
								>
									{detail.isLocked ? "Privada" : "Partilhada"}
								</Badge>
								<span>
									{detail.access === "OWNER" ? "Autor" : "Partilhada consigo"}
								</span>
							</>
						) : (
							"A carregar..."
						)}
					</DialogDescription>
				</DialogHeader>

				<Tabs defaultValue="content">
					<TabsList>
						<TabsTrigger value="content">Conteúdo</TabsTrigger>
						<TabsTrigger value="history">Histórico</TabsTrigger>
					</TabsList>

					<TabsContent value="content" className="mt-4">
						{detailQuery.isLoading ? (
							<div className="space-y-2">
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-3/4" />
								<Skeleton className="h-4 w-1/2" />
							</div>
						) : detailQuery.isError ? (
							<p className="text-destructive text-sm">
								Não foi possível carregar a dedicatória.
							</p>
						) : detail && !isRichTextEmpty(detail.content) ? (
							<div className="max-h-[50vh] overflow-y-auto rounded-md border">
								<RichTextEditor value={detail.content} readOnly />
							</div>
						) : (
							<p className="py-6 text-center text-muted-foreground text-sm">
								Esta dedicatória ainda não tem texto escrito.
							</p>
						)}

						{detail && !detail.isLocked && detail.viewerLastOpenedAt ? (
							<p className="mt-3 text-muted-foreground text-xs">
								Aberto por si em {formatDate(detail.viewerLastOpenedAt)}
							</p>
						) : null}
					</TabsContent>

					<TabsContent value="history" className="mt-4">
						{historyQuery.isLoading ? (
							<div className="space-y-2">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
							</div>
						) : history.length === 0 ? (
							<p className="py-6 text-center text-muted-foreground text-sm">
								Sem registos de atividade.
							</p>
						) : (
							<ol className="max-h-[50vh] space-y-2 overflow-y-auto">
								{history.map((entry) => (
									<li
										key={entry.id}
										className="flex items-start justify-between gap-3 rounded-md border p-3"
									>
										<div className="min-w-0">
											<p className="font-medium text-sm">
												{ACTION_LABELS[entry.action] ?? entry.action}
											</p>
											<p className="text-muted-foreground text-xs">
												{entry.message}
											</p>
										</div>
										<div className="shrink-0 text-right">
											<p className="font-medium text-xs">
												{entry.actor?.name ?? "Sistema"}
											</p>
											<p className="text-muted-foreground text-xs">
												{formatDate(entry.createdAt)}
											</p>
										</div>
									</li>
								))}
							</ol>
						)}
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
