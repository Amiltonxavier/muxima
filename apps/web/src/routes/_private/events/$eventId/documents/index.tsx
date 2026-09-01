import { Button } from "@muxima/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/shared/components/back-to";
import { QueryState } from "@/shared/components/states";
import {
	useCreateDocument,
	useDocuments,
} from "@/shared/queries/document-queries";
import { DocumentDialog } from "./-components/document-dialog";
import { DocumentsTable } from "./-components/documents-table";
import type { Document } from "./-types";

export const Route = createFileRoute("/_private/events/$eventId/documents/")({
	component: DocumentsPage,
});

function DocumentsPage() {
	const { eventId } = Route.useParams();

	const docsQuery = useDocuments({ eventId });
	const createDoc = useCreateDocument();

	const [showCreate, setShowCreate] = useState(false);

	const docs = (docsQuery.data?.data ?? []) as unknown as Document[];

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
				<DocumentsTable documents={docs} />
			</QueryState>

			<DocumentDialog
				open={showCreate}
				onOpenChange={setShowCreate}
				onSubmit={(values) => {
					createDoc.mutate({ ...values, eventId } as never, {
						onSuccess: () => {
							toast.success("Documento adicionado");
							setShowCreate(false);
						},
						onError: (e) => toast.error(e.message),
					});
				}}
				isLoading={createDoc.isPending}
			/>
		</div>
	);
}
