import { Button } from "@muxima/ui/components/button";
import { Card } from "@muxima/ui/components/card";
import { StatusBadge } from "@muxima/ui/components/kibo-ui/status";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@muxima/ui/components/table";
import { Trash2 } from "lucide-react";
import { useSelected } from "@/core/hooks/useSelected";
import type { SelectedItem } from "@/core/types";
import {
	DOCUMENT_TYPE_LABELS,
	getStatusLabel,
} from "@/shared/utils/status-helpers";
import { ACTION_TYPES_DOCUMENT } from "../-constants";
import type { ActionTypeDocument, Document } from "../-types";
import { DeleteDialog } from "./delete-dialog";

interface DocumentsTableProps {
	documents: Document[];
}

export function DocumentsTable({ documents }: DocumentsTableProps) {
	const { isSelected, selectedAction, selectedItem, onSelect, clearSelection } =
		useSelected<SelectedItem, ActionTypeDocument>();

	return (
		<>
			<Card>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Nome</TableHead>
							<TableHead>Tipo</TableHead>
							<TableHead>Referencia</TableHead>
							<TableHead>Estado</TableHead>
							<TableHead className="w-20" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{documents.map((doc) => (
							<TableRow key={doc.id}>
								<TableCell className="font-medium">{doc.name}</TableCell>
								<TableCell>
									{DOCUMENT_TYPE_LABELS[doc.type] || doc.type}
								</TableCell>
								<TableCell>{doc.reference || "\u2014"}</TableCell>
								<TableCell>
									<StatusBadge
										status={(doc.status as any) || "ACTIVE"}
										label={getStatusLabel(doc.status || "ACTIVE", "document")}
									/>
								</TableCell>
								<TableCell>
									<Button
										variant="ghost"
										size="icon-sm"
										className="text-destructive"
										onClick={() =>
											onSelect(
												doc as unknown as SelectedItem,
												ACTION_TYPES_DOCUMENT.DELETE,
											)
										}
									>
										<Trash2 className="h-3.5 w-3.5" />
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</Card>

			{isSelected &&
				selectedAction === ACTION_TYPES_DOCUMENT.DELETE &&
				selectedItem && (
					<DeleteDialog
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
