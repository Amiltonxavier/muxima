import type { DedicationListItem } from "@muxima/api/shared/types/entities";
import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@muxima/ui/components/table";
import { Eye, Lock, Pencil, Share2, Trash2, Unlock } from "lucide-react";
import { dateHelper } from "@/shared/utils/date-helper";
import { formatDate } from "@/utils/format-date";
import {
	DEDICATION_STATUS_LABELS,
	DEDICATION_TYPE_LABELS,
	getStatusColor,
} from "@/utils/status-helpers";

type Props = {
	dedications: DedicationListItem[];
	onView: (id: string) => void;
	onEdit: (id: string) => void;
	onShare: (id: string) => void;
	onDelete: (id: string) => void;
};

export function DedicationsTable({
	dedications,
	onView,
	onEdit,
	onShare,
	onDelete,
}: Props) {
	return (
		<div className="overflow-x-auto border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Título</TableHead>
						<TableHead>Tipo</TableHead>
						<TableHead>Estado</TableHead>
						<TableHead>Visibilidade</TableHead>
						<TableHead>Actualizado</TableHead>
						<TableHead className="text-right">Ações</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{dedications.map((dedication) => (
						<TableRow key={dedication.id}>
							<TableCell>
								<button
									type="button"
									className="text-left font-medium hover:underline"
									onClick={() => onView(dedication.id)}
								>
									{dedication.title}
								</button>
							</TableCell>
							<TableCell className="text-sm">
								{DEDICATION_TYPE_LABELS[dedication.type] ?? dedication.type}
							</TableCell>
							<TableCell>
								<Badge
									variant="secondary"
									className={getStatusColor(dedication.status)}
								>
									{DEDICATION_STATUS_LABELS[dedication.status] ??
										dedication.status}
								</Badge>
							</TableCell>
							<TableCell>
								<Badge
									variant="secondary"
									className={
										dedication.isLocked ? "" : "bg-gray-50 text-gray-700"
									}
								>
									{dedication.isLocked ? (
										<>
											<Lock className="mr-1 h-3 w-3" />
											Privada
										</>
									) : (
										<>
											<Unlock className="mr-1 h-3 w-3" />
											Partilhada
										</>
									)}
								</Badge>
							</TableCell>
							<TableCell className="text-muted-foreground text-sm">
								{dateHelper.formatShort(dedication.updatedAt)}
							</TableCell>
							<TableCell>
								<div className="flex items-center justify-end gap-1">
									<Button
										variant="ghost"
										size="icon-sm"
										aria-label={`Ver ${dedication.title}`}
										onClick={() => onView(dedication.id)}
									>
										<Eye className="h-3.5 w-3.5" />
									</Button>
									{/* Only the author may change, share or delete. */}
									{dedication.access === "OWNER" ? (
										<>
											<Button
												variant="ghost"
												size="icon-sm"
												aria-label={`Editar ${dedication.title}`}
												onClick={() => onEdit(dedication.id)}
											>
												<Pencil className="h-3.5 w-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="icon-sm"
												aria-label={`Partilhar ${dedication.title}`}
												onClick={() => onShare(dedication.id)}
											>
												<Share2 className="h-3.5 w-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="icon-sm"
												className="text-destructive"
												aria-label={`Eliminar ${dedication.title}`}
												onClick={() => onDelete(dedication.id)}
											>
												<Trash2 className="h-3.5 w-3.5" />
											</Button>
										</>
									) : null}
								</div>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
