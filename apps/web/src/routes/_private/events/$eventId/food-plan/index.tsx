import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@muxima/ui/components/tabs";
import { createFileRoute } from "@tanstack/react-router";
import { ChartColumn, List } from "lucide-react";
import { useState } from "react";
import { FoodPlanAnalytics } from "./-components/food-plan-analytics";
import { FoodPlanDeleteDialog } from "./-components/food-plan-delete-dialog";
import { FoodPlanHeader } from "./-components/food-plan-header";
import { FoodPlanItemDialog } from "./-components/food-plan-item-dialog";
import { FoodPlanList } from "./-components/food-plan-list";
import { FoodPlanNotesDialog } from "./-components/food-plan-notes-dialog";
import { FoodPlanStats } from "./-components/food-plan-stats";
import { FoodPlanSupplierCta } from "./-components/food-plan-supplier-cta";
import { FoodPlanSupplierDialog } from "./-components/food-plan-supplier-dialog";
import type { FoodPlanItemRow } from "./-types/food-plan.types";

export const Route = createFileRoute("/_private/events/$eventId/food-plan/")({
	component: FoodPlanPage,
});

/**
 * O plano de alimentação não tem preços por desenho: o dinheiro do catering,
 * do bolo e dos doces vive no fornecedor, para o mesmo gasto nunca ser
 * contado duas vezes no orçamento. Aqui só se gere a lista, o fornecedor
 * único e a apresentação das estatísticas calculadas pela API.
 */
function FoodPlanPage() {
	const { eventId } = Route.useParams();

	const [itemDialogOpen, setItemDialogOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<FoodPlanItemRow | null>(null);
	const [deletingItem, setDeletingItem] = useState<FoodPlanItemRow | null>(
		null,
	);
	const [showSupplierDialog, setShowSupplierDialog] = useState(false);
	const [showNotesDialog, setShowNotesDialog] = useState(false);

	return (
		<div className="space-y-6">
			<FoodPlanHeader
				eventId={eventId}
				onNewItem={() => {
					setEditingItem(null);
					setItemDialogOpen(true);
				}}
				onNotes={() => setShowNotesDialog(true)}
			/>

			<FoodPlanStats eventId={eventId} />

			<FoodPlanSupplierCta
				eventId={eventId}
				onAssociate={() => setShowSupplierDialog(true)}
			/>

			<Tabs defaultValue="lista">
				<TabsList>
					<TabsTrigger value="lista">
						<List className="mr-2 h-4 w-4" />
						Lista
					</TabsTrigger>
					<TabsTrigger value="analytics">
						<ChartColumn className="mr-2 h-4 w-4" />
						Análise de dados
					</TabsTrigger>
				</TabsList>

				<TabsContent value="lista">
					<FoodPlanList
						eventId={eventId}
						onEdit={(item) => {
							setEditingItem(item);
							setItemDialogOpen(true);
						}}
						onDelete={setDeletingItem}
					/>
				</TabsContent>

				<TabsContent value="analytics">
					<FoodPlanAnalytics eventId={eventId} />
				</TabsContent>
			</Tabs>

			<FoodPlanItemDialog
				key={editingItem?.id ?? "new"}
				eventId={eventId}
				open={itemDialogOpen}
				onOpenChange={setItemDialogOpen}
				editingItem={editingItem}
			/>

			<FoodPlanSupplierDialog
				eventId={eventId}
				open={showSupplierDialog}
				onOpenChange={setShowSupplierDialog}
			/>

			<FoodPlanNotesDialog
				eventId={eventId}
				open={showNotesDialog}
				onOpenChange={setShowNotesDialog}
			/>

			<FoodPlanDeleteDialog
				eventId={eventId}
				item={deletingItem}
				open={deletingItem !== null}
				onOpenChange={(open) => {
					if (!open) setDeletingItem(null);
				}}
			/>
		</div>
	);
}
