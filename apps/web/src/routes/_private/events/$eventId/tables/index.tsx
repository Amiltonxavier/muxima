import { Button } from "@muxima/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/shared/components/back-to";
import { QueryState } from "@/shared/components/states";
import {
	useCreateTable,
	useDeleteTable,
	useTables,
	useUpdateTable,
} from "@/shared/queries/table-queries";
import { TableDialog } from "./-components/table-dialog";
import { TablesGrid } from "./-components/tables-grid";
import type { TableItem } from "./-types";

export const Route = createFileRoute("/_private/events/$eventId/tables/")({
	component: TablesPage,
});

function TablesPage() {
	const { eventId } = Route.useParams();

	const tablesQuery = useTables({ eventId });
	const createTable = useCreateTable();
	const updateTable = useUpdateTable();
	const deleteTable = useDeleteTable();

	const [showCreate, setShowCreate] = useState(false);

	const tables = (tablesQuery.data?.data ?? []) as unknown as TableItem[];

	const totalCapacity = tables.reduce((sum, t) => sum + (t.capacity || 0), 0);
	const totalOccupied = tables.reduce(
		(sum, t) => sum + (t.tableGuests?.length || 0),
		0,
	);

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-2xl">Mesas</h1>
					<p className="text-muted-foreground text-sm">
						{tables.length} mesas &middot; {totalOccupied}/{totalCapacity}{" "}
						lugares
					</p>
				</div>
				<Button onClick={() => setShowCreate(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Criar mesa
				</Button>
			</div>

			<QueryState
				state={{
					isLoading: tablesQuery.isLoading,
					isError: tablesQuery.isError,
					isEmpty: tables.length === 0,
					hasData: tables.length > 0,
				}}
			>
				<TablesGrid
					tables={tables}
					updateTable={updateTable}
					deleteTable={deleteTable}
				/>
			</QueryState>

			<TableDialog
				open={showCreate}
				onOpenChange={setShowCreate}
				onSubmit={(values) => {
					createTable.mutate({ ...values, eventId } as never, {
						onSuccess: () => {
							toast.success("Mesa criada");
							setShowCreate(false);
						},
						onError: (e) => toast.error(e.message),
					});
				}}
				isLoading={createTable.isPending}
			/>
		</div>
	);
}
