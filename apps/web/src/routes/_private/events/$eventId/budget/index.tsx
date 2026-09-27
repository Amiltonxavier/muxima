import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { Label } from "@muxima/ui/components/label";
import { Progress } from "@muxima/ui/components/progress";
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
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@muxima/ui/components/tabs";
import { Textarea } from "@muxima/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChartColumn, ExternalLink, List, Pencil, Target } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/shared/components/back-to";
import { CurrencyInput } from "@/shared/components/currency-input";
import { QueryState } from "@/shared/components/states";
import { StatsCard } from "@/shared/components/stats-card/stats-card";
import {
	type BudgetSource,
	useBudget,
	useBudgetLines,
	useBudgetSummary,
	useUpdateBudgetTarget,
} from "@/shared/queries/budget-queries";
import { formatCurrency } from "@/utils/format-currency";
import { BudgetAnalytics } from "./-components/budget-analytics";

export const Route = createFileRoute("/_private/events/$eventId/budget/")({
	component: BudgetPage,
});

const SOURCE_LABELS: Record<BudgetSource, string> = {
	INVENTORY: "Inventário",
	SUPPLIER: "Fornecedores",
};

/**
 * The budget is a read model: the only thing a user can write here is the
 * planning target. Every total, percentage and breakdown below comes from
 * `budget.getByEventId` / `budget.getSummary`, computed by the API from the
 * Inventory and the Suppliers. Money rows are edited where they live, so each
 * line links to its own screen.
 */
function BudgetPage() {
	const { eventId } = Route.useParams();

	const [source, setSource] = useState<BudgetSource | undefined>(undefined);
	const [showTargetDialog, setShowTargetDialog] = useState(false);

	const budgetQuery = useBudget(eventId);
	const summaryQuery = useBudgetSummary(eventId);
	const linesQuery = useBudgetLines(eventId, source);
	const updateTarget = useUpdateBudgetTarget();

	const budget = budgetQuery.data;
	const totals = summaryQuery.data?.totals;
	const lines = linesQuery.data?.data ?? [];

	const isOverBudget = (totals?.remaining ?? 0) < 0;

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />

			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="font-semibold text-2xl">Orçamento</h1>
					<p className="text-muted-foreground text-sm">
						Os totais são calculados a partir do inventário e dos fornecedores.
						Aqui só define a meta.
					</p>
				</div>
				<Button
					variant={budget ? "outline" : "default"}
					onClick={() => setShowTargetDialog(true)}
				>
					<Pencil className="mr-2 h-4 w-4" />
					{budget ? "Editar meta" : "Definir meta"}
				</Button>
			</div>

			{summaryQuery.isLoading ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{["card-1", "card-2", "card-3", "card-4"].map((id) => (
						<Card key={id}>
							<CardHeader>
								<div className="h-4 w-20 animate-pulse rounded bg-muted" />
							</CardHeader>
							<CardContent>
								<div className="h-8 w-28 animate-pulse rounded bg-muted" />
							</CardContent>
						</Card>
					))}
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<StatsCard
						title="Meta"
						value={formatCurrency(totals?.totalBudget ?? 0)}
						description={
							(totals?.reserve ?? 0) > 0
								? `reserva ${formatCurrency(totals?.reserve ?? 0)}`
								: undefined
						}
						icon={<Target className="h-4 w-4" />}
					/>
					<StatsCard
						title="Planeado"
						value={formatCurrency(totals?.planned ?? 0)}
						description={`${totals?.usagePercentage ?? 0}% da meta`}
					/>
					<StatsCard
						title="Pago"
						value={formatCurrency(totals?.spent ?? 0)}
						description={`${totals?.paymentPercentage ?? 0}% do planeado`}
					/>
					<StatsCard
						title="Por pagar"
						value={formatCurrency(totals?.pending ?? 0)}
						description={
							(totals?.overdue ?? 0) > 0
								? `${formatCurrency(totals?.overdue ?? 0)} em atraso`
								: undefined
						}
					/>
				</div>
			)}

			{totals && (
				<Card>
					<CardContent className="space-y-2 pt-6">
						<div className="flex items-baseline justify-between text-sm">
							<span className="text-muted-foreground">
								Disponível para planeamento
							</span>
							<span
								className={
									isOverBudget
										? "font-semibold text-destructive"
										: "font-semibold"
								}
							>
								{formatCurrency(totals.remaining ?? 0)}
							</span>
						</div>
						<Progress value={totals.usagePercentage} />
						{isOverBudget && (
							<p className="text-destructive text-xs">
								O planeado ultrapassa o disponível. Ajuste a meta ou revise os
								itens do inventário e os fornecedores.
							</p>
						)}
					</CardContent>
				</Card>
			)}

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
						<div className="flex items-center gap-2">
							<Select
								value={source ?? "todas"}
								onValueChange={(v) =>
									setSource(v === "todas" ? undefined : (v as BudgetSource))
								}
							>
								<SelectTrigger className="w-48">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="todas">Todas as origens</SelectItem>
									{Object.entries(SOURCE_LABELS).map(([value, label]) => (
										<SelectItem key={value} value={value}>
											{label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<QueryState
							state={{
								isLoading: linesQuery.isLoading,
								isError: linesQuery.isError,
								isEmpty: lines.length === 0,
								hasData: lines.length > 0,
							}}
						>
							<Card>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Origem</TableHead>
											<TableHead>Descrição</TableHead>
											<TableHead className="text-right">Planeado</TableHead>
											<TableHead className="text-right">Pago</TableHead>
											<TableHead className="text-right">Por pagar</TableHead>
											<TableHead className="w-40">Progresso</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{lines.map((line) => (
											<TableRow key={`${line.source}-${line.id}`}>
												<TableCell>
													<Badge variant="outline">
														{SOURCE_LABELS[line.source]}
													</Badge>
												</TableCell>
												<TableCell className="font-medium">
													{line.label}
												</TableCell>
												<TableCell className="text-right">
													{formatCurrency(line.planned)}
												</TableCell>
												<TableCell className="text-right">
													{formatCurrency(line.paid)}
												</TableCell>
												<TableCell className="text-right">
													{formatCurrency(line.pending)}
												</TableCell>
												<TableCell>
													<div className="space-y-1">
														<Progress value={line.percentage} />
														<span className="text-muted-foreground text-xs">
															{line.percentage}%
														</span>
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</Card>
						</QueryState>

						{lines.length > 0 && (
							<p className="flex items-center gap-2 text-muted-foreground text-xs">
								Os valores são editados na origem:
								<Link
									to="/events/$eventId/inventory"
									params={{ eventId }}
									className="inline-flex items-center gap-1 underline"
								>
									Inventário <ExternalLink className="h-3 w-3" />
								</Link>
								ou
								<Link
									to="/events/$eventId/suppliers"
									params={{ eventId }}
									className="inline-flex items-center gap-1 underline"
								>
									Fornecedores <ExternalLink className="h-3 w-3" />
								</Link>
							</p>
						)}
					</div>
				</TabsContent>

				<TabsContent value="analytics">
					<BudgetAnalytics
						summary={summaryQuery.data}
						isLoading={summaryQuery.isLoading}
						isError={summaryQuery.isError}
					/>
				</TabsContent>
			</Tabs>

			<TargetDialog
				open={showTargetDialog}
				onOpenChange={setShowTargetDialog}
				initialValues={{
					plannedAmount: Number(budget?.plannedAmount ?? 0),
					reserveAmount: Number(budget?.reserveAmount ?? 0),
					notes: budget?.notes ?? "",
				}}
				isLoading={updateTarget.isPending}
				onSubmit={(values) => {
					updateTarget.mutate(
						{ eventId, ...values },
						{
							onSuccess: () => {
								toast.success("Meta actualizada");
								setShowTargetDialog(false);
							},
							onError: (error) => toast.error(error.message),
						},
					);
				}}
			/>
		</div>
	);
}

// ========================
// Target Dialog
// ========================
function TargetDialog({
	open,
	onOpenChange,
	initialValues,
	onSubmit,
	isLoading,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	initialValues: {
		plannedAmount: number;
		reserveAmount: number;
		notes: string;
	};
	onSubmit: (values: {
		plannedAmount: number;
		reserveAmount?: number;
		notes?: string;
	}) => void;
	isLoading: boolean;
}) {
	const form = useForm({
		defaultValues: initialValues,
		onSubmit: async ({ value }) => {
			if (value.plannedAmount <= 0) {
				toast.error("A meta deve ser maior que zero");
				return;
			}
			if (value.reserveAmount > value.plannedAmount) {
				toast.error("A reserva não pode ultrapassar a meta");
				return;
			}
			onSubmit({
				plannedAmount: value.plannedAmount,
				reserveAmount: value.reserveAmount || undefined,
				notes: value.notes || undefined,
			});
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Meta do orçamento</DialogTitle>
					<DialogDescription>
						O valor total planeado para o evento. Os totais, o aproveitamento e
						as categorias são calculados pelo servidor a partir do inventário e
						dos fornecedores.
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<form.Field name="plannedAmount">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="planned-amount">Valor planeado (Kz)</Label>
								<CurrencyInput
									id="planned-amount"
									value={field.state.value || 0}
									onChange={(v) => field.handleChange(v)}
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>
					<form.Field name="reserveAmount">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="reserve-amount">Reserva (Kz)</Label>
								<CurrencyInput
									id="reserve-amount"
									value={field.state.value || 0}
									onChange={(v) => field.handleChange(v)}
									disabled={isLoading}
								/>
								<p className="text-muted-foreground text-xs">
									Fica de fora do valor disponível para planeamento.
								</p>
							</div>
						)}
					</form.Field>
					<form.Field name="notes">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="budget-notes">Notas</Label>
								<Textarea
									id="budget-notes"
									placeholder="Observações sobre o orçamento (opcional)"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? "A guardar..." : "Guardar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
