import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Progress } from "@muxima/ui/components/progress";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@muxima/ui/components/table";
import { AlertTriangle, CircleDollarSign, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import {
	ChartLegend,
	DonutChart,
	ProgressDonut,
	StatChart,
} from "@/shared/components/charts";
import { QueryState } from "@/shared/components/states";
import { formatCurrency } from "@/utils/format-currency";
import { formatDate } from "@/utils/format-date";

/**
 * Everything rendered here is computed by the API (`budget.getSummary`).
 * The component only formats and lays out the totals and the breakdowns — it
 * never sums money itself.
 */
type BudgetAnalyticsProps = {
	summary?: {
		totals: {
			totalBudget: number;
			reserve: number;
			available: number;
			planned: number;
			spent: number;
			pending: number;
			overdue: number;
			remaining: number;
			usagePercentage: number;
			paymentPercentage: number;
			currency: string;
		};
		breakdown: {
			bySource: BudgetEntry[];
			byCategory: BudgetEntry[];
			byPaymentStatus: BudgetEntry[];
			topPendingSuppliers: Array<{
				id: string;
				name: string;
				category: string;
				planned: number;
				pending: number;
				paymentStatus: string;
				nextDueDate: string | Date | null;
			}>;
			overdueSuppliers: Array<{
				id: string;
				name: string;
				overdueAmount: number;
				nextDueDate: string | Date | null;
			}>;
			monthlySpend: Array<{ month: string; amount: number }>;
		};
		hasTarget: boolean;
	} | null;
	isLoading: boolean;
	isError: boolean;
};

type BudgetEntry = {
	key: string;
	label: string;
	planned: number;
	paid: number;
	pending: number;
	percentage: number;
	count: number;
};

function BreakdownList({
	title,
	icon,
	entries,
	emptyLabel,
}: {
	title: string;
	icon: ReactNode;
	entries: BudgetEntry[];
	emptyLabel: string;
}) {
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="flex items-center gap-2 text-sm">
					{icon}
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent>
				{entries.length === 0 ? (
					<p className="text-muted-foreground text-sm">{emptyLabel}</p>
				) : (
					<ul className="space-y-3">
						{entries.map((entry) => (
							<li key={entry.key} className="space-y-1">
								<div className="flex items-baseline justify-between gap-2 text-sm">
									<span className="truncate">
										{entry.label}
										<span className="text-muted-foreground text-xs">
											{" "}
											· {entry.count}
										</span>
									</span>
									<span className="shrink-0 font-medium">
										{formatCurrency(entry.planned)}
									</span>
								</div>
								<Progress value={entry.percentage} />
								<p className="text-muted-foreground text-xs">
									{entry.percentage}% pago · {formatCurrency(entry.pending)} por
									pagar
								</p>
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}

export function BudgetAnalytics({
	summary,
	isLoading,
	isError,
}: BudgetAnalyticsProps) {
	const totals = summary?.totals;
	const breakdown = summary?.breakdown;

	const spent = totals?.spent ?? 0;
	const pending = totals?.pending ?? 0;
	const available = totals?.available ?? 0;
	const planned = totals?.planned ?? 0;

	const segments = [
		{ label: "Gasto", value: Math.max(spent, 0), color: "var(--chart-1)" },
		{
			label: "Por pagar",
			value: Math.max(pending, 0),
			color: "var(--chart-2)",
		},
		{
			label: "Disponível",
			value: Math.max(available, 0),
			color: "var(--chart-3)",
		},
	];

	const paymentRate = totals?.paymentPercentage ?? 0;
	const hasData = planned > 0 || spent > 0 || pending > 0;

	return (
		<QueryState
			state={{
				isLoading,
				isError,
				isEmpty: !hasData,
				hasData,
			}}
		>
			<div className="space-y-4">
				<div className="grid gap-4 lg:grid-cols-3">
					<Card className="lg:col-span-2">
						<CardHeader className="flex flex-row items-center justify-between">
							<CardTitle className="flex items-center gap-2">
								<Wallet className="h-4 w-4" />
								Aproveitamento do orçamento
							</CardTitle>
							<span className="text-muted-foreground text-sm">
								{totals?.usagePercentage ?? 0}% utilizado
							</span>
						</CardHeader>
						<CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
							<DonutChart
								segments={segments}
								size={170}
								centerLabel="disponível"
								centerValue={formatCurrency(Math.max(available, 0))}
							/>
							<div className="w-full max-w-[220px] space-y-4">
								<ChartLegend
									items={[
										{
											label: "Gasto",
											color: "var(--chart-1)",
											value: formatCurrency(spent),
										},
										{
											label: "Por pagar",
											color: "var(--chart-2)",
											value: formatCurrency(pending),
										},
										{
											label: "Disponível",
											color: "var(--chart-3)",
											value: formatCurrency(Math.max(available, 0)),
										},
										{
											label: "Reserva",
											color: "var(--chart-4)",
											value: formatCurrency(totals?.reserve ?? 0),
										},
									]}
								/>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<CircleDollarSign className="h-4 w-4" />
								Pagamentos
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex justify-center">
								<ProgressDonut
									value={paymentRate}
									max={100}
									color="var(--chart-2)"
									size={140}
									centerLabel="de pagamento"
								/>
							</div>

							<div className="grid grid-cols-2 gap-2 text-center">
								<div className="border p-2">
									<p className="text-muted-foreground text-xs">Pago</p>
									<p className="font-semibold">{paymentRate}%</p>
								</div>
								<div className="border p-2">
									<p className="text-muted-foreground text-xs">Em atraso</p>
									<p className="font-semibold text-destructive">
										{formatCurrency(totals?.overdue ?? 0)}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="grid gap-4 lg:grid-cols-3">
					<BreakdownList
						title="Por origem"
						icon={<Wallet className="h-4 w-4" />}
						entries={breakdown?.bySource ?? []}
						emptyLabel="Sem dados."
					/>
					<BreakdownList
						title="Por categoria"
						icon={<CircleDollarSign className="h-4 w-4" />}
						entries={breakdown?.byCategory ?? []}
						emptyLabel="Sem dados."
					/>
					<BreakdownList
						title="Por estado de pagamento"
						icon={<CircleDollarSign className="h-4 w-4" />}
						entries={breakdown?.byPaymentStatus ?? []}
						emptyLabel="Sem dados."
					/>
				</div>

				<div className="grid gap-4 lg:grid-cols-2">
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm">Pagamentos por mês</CardTitle>
						</CardHeader>
						<CardContent>
							{breakdown?.monthlySpend.length ? (
								<StatChart
									data={breakdown.monthlySpend.map((entry) => ({
										label: entry.month,
										value: entry.amount,
									}))}
								/>
							) : (
								<p className="text-muted-foreground text-sm">
									Ainda não há pagamentos registados.
								</p>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="flex items-center gap-2 text-sm">
								<AlertTriangle className="h-4 w-4" />
								Fornecedores em atraso
							</CardTitle>
						</CardHeader>
						<CardContent>
							{breakdown?.overdueSuppliers.length ? (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Fornecedor</TableHead>
											<TableHead className="text-right">Em atraso</TableHead>
											<TableHead className="text-right">Próximo</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{breakdown.overdueSuppliers.map((supplier) => (
											<TableRow key={supplier.id}>
												<TableCell>{supplier.name}</TableCell>
												<TableCell className="text-right font-medium">
													{formatCurrency(supplier.overdueAmount)}
												</TableCell>
												<TableCell className="text-right text-muted-foreground text-xs">
													{supplier.nextDueDate
														? formatDate(supplier.nextDueDate)
														: "—"}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							) : (
								<p className="text-muted-foreground text-sm">
									Nenhum fornecedor em atraso.
								</p>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</QueryState>
	);
}
