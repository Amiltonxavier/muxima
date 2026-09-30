import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@muxima/ui/components/tabs";
import { createFileRoute } from "@tanstack/react-router";
import { ChartColumn, List } from "lucide-react";
import { useState } from "react";
import { BackButton } from "@/shared/components/back-to";
import { BudgetAnalytics } from "./-components/budget-analytics";
import { BudgetHeader } from "./-components/budget-header";
import { BudgetLinesNote } from "./-components/budget-lines-note";
import { BudgetLinesTable } from "./-components/budget-lines-table";
import { BudgetSourceFilter } from "./-components/budget-source-filter";
import { BudgetStats } from "./-components/budget-stats";
import { BudgetTargetDialog } from "./-components/budget-target-dialog";
import {
	useBudget,
	useBudgetLines,
	useBudgetSummary,
} from "./-queries/budget-queries";
import type { BudgetSourceFilter as SourceFilter } from "./-types/budget.types";

export const Route = createFileRoute("/_private/events/$eventId/budget/")({
	component: BudgetPage,
});

/**
 * The budget is a read model: the only thing a user can write here is the
 * planning target. Every total, percentage and breakdown below comes from
 * `budget.getByEventId` / `budget.getSummary`, computed by the API from the
 * Inventory and the Suppliers. Money rows are edited where they live, so each
 * line links to its own screen.
 */
function BudgetPage() {
	const { eventId } = Route.useParams();

	const [source, setSource] = useState<SourceFilter>("ALL");
	const [showTargetDialog, setShowTargetDialog] = useState(false);

	const budgetQuery = useBudget(eventId);
	const summaryQuery = useBudgetSummary(eventId);
	const linesQuery = useBudgetLines(
		eventId,
		source === "ALL" ? undefined : source,
	);

	const budget = budgetQuery.data;
	const totals = summaryQuery.data?.totals;
	const lines = linesQuery.data?.data ?? [];

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />

			<BudgetHeader
				hasBudget={!!budget}
				onEditTarget={() => setShowTargetDialog(true)}
			/>

			<BudgetStats totals={totals} isLoading={summaryQuery.isLoading} />

			<Tabs defaultValue="lista">
				<TabsList>
					<TabsTrigger value="lista">
						<List className="mr-2 h-4 w-4" />
						Itens
					</TabsTrigger>
					<TabsTrigger value="analytics">
						<ChartColumn className="mr-2 h-4 w-4" />
						Analytics
					</TabsTrigger>
				</TabsList>

				<TabsContent value="lista">
					<div className="space-y-4">
						<BudgetSourceFilter source={source} onSourceChange={setSource} />

						<BudgetLinesTable
							lines={lines}
							isLoading={linesQuery.isLoading}
							isError={linesQuery.isError}
							hasActiveFilter={source !== "ALL"}
						/>

						{lines.length > 0 && <BudgetLinesNote eventId={eventId} />}
					</div>
				</TabsContent>

				<TabsContent value="analytics">
					<BudgetAnalytics
						eventId={eventId}
						summary={summaryQuery.data}
						isLoading={summaryQuery.isLoading}
						isError={summaryQuery.isError}
					/>
				</TabsContent>
			</Tabs>

			<BudgetTargetDialog
				open={showTargetDialog}
				onOpenChange={setShowTargetDialog}
				eventId={eventId}
				budget={budget}
			/>
		</div>
	);
}
