import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import { Card } from "@muxima/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { Input } from "@muxima/ui/components/input";
import { Label } from "@muxima/ui/components/label";
import { Pagination } from "@muxima/ui/components/pagination";
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
import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/shared/components/back-to";
import { QueryState } from "@/shared/components/states";
import {
	useCreateDocument,
	useDeleteDocument,
	useDocuments,
} from "@/shared/queries/document-queries";
import {
	DOCUMENT_TYPE_LABELS,
	getStatusColor,
	getStatusLabel,
} from "@/utils/status-helpers";

export const Route = createFileRoute("/_private/events/$eventId/documents/")({
	component: DocumentsPage,
});

function DocumentsPage() {
	const { eventId } = Route.useParams();

	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);

	const docsQuery = useDocuments(eventId, { page, limit });
	const createDoc = useCreateDocument();
	const deleteDoc = useDeleteDocument();

	const [showCreate, setShowCreate] = useState(false);
	const [deleteId, setDeleteId] = useState<string | null>(null);

	const docs = docsQuery.data?.data ?? [];
	const meta = docsQuery.data?.meta;

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-2xl">Documentos</h1>
					<p className="text-muted-foreground text-sm">
						{docs.length} documentos
					</p>
				</div>
				<Button onClick={() => setShowCreate(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Adicionar documento
				</Button>
			</div>

			<QueryState
				state={{
					isLoading: docsQuery.isLoading,
					isError: docsQuery.isError,
					isEmpty: docs.length === 0,
					hasData: docs.length > 0,
				}}
			>
				<Card>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Nome</TableHead>
								<TableHead>Tipo</TableHead>
								<TableHead>Referência</TableHead>
								<TableHead>Estado</TableHead>
								<TableHead className="w-20" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{docs.map((doc) => (
								<TableRow key={doc.id}>
									<TableCell className="font-medium">{doc.name}</TableCell>
									<TableCell>
										{DOCUMENT_TYPE_LABELS[doc.type] || doc.type}
									</TableCell>
									<TableCell>{doc.reference || "—"}</TableCell>
									<TableCell>
										<Badge className={getStatusColor(doc.status || "ACTIVE")}>
											{getStatusLabel(doc.status || "ACTIVE", "document")}
										</Badge>
									</TableCell>
									<TableCell>
										<Button
											variant="ghost"
											size="icon-sm"
											className="text-destructive"
											onClick={() => setDeleteId(doc.id)}
										>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Card>
			</QueryState>

			{meta && (
				<Pagination
					meta={meta}
					onPageChange={setPage}
					onLimitChange={(l) => {
						setLimit(l);
						setPage(1);
					}}
					disabled={docsQuery.isLoading}
				/>
			)}

			<DocumentDialog
				open={showCreate}
				onOpenChange={setShowCreate}
				onSubmit={(values) => {
					createDoc.mutate(
						{ ...values, eventId },
						{
							onSuccess: () => {
								toast.success("Documento adicionado");
								setShowCreate(false);
							},
							onError: (e) => toast.error(e.message),
						},
					);
				}}
				isLoading={createDoc.isPending}
			/>

			<Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Eliminar documento</DialogTitle>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteId(null)}>
							Cancelar
						</Button>
						<Button
							variant="destructive"
							onClick={() => {
								if (deleteId)
									deleteDoc.mutate(
										{ id: deleteId },
										{
											onSuccess: () => {
												toast.success("Eliminado");
												setDeleteId(null);
											},
											onError: (e) => toast.error(e.message),
										},
									);
							}}
							disabled={deleteDoc.isPending}
						>
							Eliminar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function DocumentDialog({
	open,
	onOpenChange,
	onSubmit,
	isLoading,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	onSubmit: (v: {
		name: string;
		type: "OTHER" | "CONTRACT" | "RECEIPT" | "QUOTE";
		reference: string;
	}) => void;
	isLoading: boolean;
}) {
	const form = useForm({
		defaultValues: {
			name: "",
			type: "OTHER" as "OTHER" | "CONTRACT" | "RECEIPT" | "QUOTE",
			reference: "",
		},
		onSubmit: async ({ value }) => {
			onSubmit(value);
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Adicionar documento</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<form.Field name="name">
						{(field) => (
							<div className="space-y-2">
								<Label>Nome</Label>
								<Input
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>
					<div className="grid grid-cols-2 gap-4">
						<form.Field name="type">
							{(field) => (
								<div className="space-y-2">
									<Label>Tipo</Label>
									<Select
										items={Object.entries(DOCUMENT_TYPE_LABELS).map(
											([value, label]) => ({ value, label }),
										)}
										value={field.state.value}
										onValueChange={(v) =>
											field.handleChange(
												v as "OTHER" | "CONTRACT" | "RECEIPT" | "QUOTE",
											)
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{Object.entries(DOCUMENT_TYPE_LABELS).map(([k, l]) => (
												<SelectItem key={k} value={k}>
													{l}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>
						<form.Field name="reference">
							{(field) => (
								<div className="space-y-2">
									<Label>Referência</Label>
									<Input
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={isLoading}
									/>
								</div>
							)}
						</form.Field>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? "A adicionar..." : "Adicionar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
