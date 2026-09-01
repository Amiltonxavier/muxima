import { Button } from "@muxima/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/shared/components/back-to";
import { QueryState } from "@/shared/components/states";
import { useCreateVendor, useVendors } from "@/shared/queries/vendor-queries";
import { SuppliersTable } from "./-components/suppliers-table";
import { VendorDialog } from "./-components/vendor-dialog";
import type { Vendor } from "./-types";

export const Route = createFileRoute("/_private/events/$eventId/suppliers/")({
	component: SuppliersPage,
});

function SuppliersPage() {
	const { eventId } = Route.useParams();

	const vendorsQuery = useVendors({ eventId });
	const createVendor = useCreateVendor();

	const [showCreateDialog, setShowCreateDialog] = useState(false);

	const vendors = (vendorsQuery.data?.data ?? []) as unknown as Vendor[];

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-2xl">Fornecedores</h1>
					<p className="text-muted-foreground text-sm">
						{vendors.length} fornecedores
					</p>
				</div>
				<Button onClick={() => setShowCreateDialog(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Adicionar fornecedor
				</Button>
			</div>

			<QueryState
				state={{
					isLoading: vendorsQuery.isLoading,
					isError: vendorsQuery.isError,
					isEmpty: vendors.length === 0,
					hasData: vendors.length > 0,
				}}
			>
				<SuppliersTable vendors={vendors} eventId={eventId} />
			</QueryState>

			<VendorDialog
				open={showCreateDialog}
				onOpenChange={setShowCreateDialog}
				onSubmit={(values) => {
					createVendor.mutate(
						{ ...values, eventId },
						{
							onSuccess: () => {
								toast.success("Fornecedor adicionado");
								setShowCreateDialog(false);
							},
							onError: (e) => toast.error(e.message),
						},
					);
				}}
				isLoading={createVendor.isPending}
			/>
		</div>
	);
}
