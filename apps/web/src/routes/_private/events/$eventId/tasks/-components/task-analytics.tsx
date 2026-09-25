import type { TaskStats } from "@muxima/api/shared/types/entities";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { ChartColumn } from "lucide-react";
import { Bar } from "@/components/charts/bar";
import { BarChart } from "@/components/charts/bar-chart";
import { BarXAxis } from "@/components/charts/bar-x-axis";
import { QueryState } from "@/shared/components/states";

type TaskAnalyticsProps = {
	stats?: TaskStats | null;
	isLoading: boolean;
	isError: boolean;
};

const STATUS_META: {
	key: "todo" | "inProgress" | "completed" | "cancelled";
	label: string;
}[] = [
	{ key: "todo", label: "Por fazer" },
	{ key: "inProgress", label: "Em andamento" },
	{ key: "completed", label: "Concluídas" },
	{ key: "cancelled", label: "Canceladas" },
];

export function TaskAnalytics({
	stats,
	isLoading,
	isError,
}: TaskAnalyticsProps) {
	const data = STATUS_META.map(({ key, label }) => ({
		name: label,
		value: stats?.[key] ?? 0,
	}));

	const hasData = (stats?.total ?? 0) > 0;

	return (
		<QueryState
			state={{
				isLoading,
				isError,
				isEmpty: !hasData && !isLoading,
				hasData: hasData,
			}}
		>
			<div className="grid gap-4 lg:grid-cols-3">
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<ChartColumn className="h-4 w-4" />
							Tarefas por estado
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="mx-auto w-full max-w-2xl">
							<BarChart data={data} aspectRatio="2.4 / 1">
								<Bar dataKey="value" fill="var(--chart-1)" minBarHeight={4} />
								<BarXAxis />
							</BarChart>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Resumo</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-2 gap-2">
							<div className="border p-3 text-center">
								<p className="text-muted-foreground text-xs">Total</p>
								<p className="font-semibold text-2xl">{stats?.total ?? 0}</p>
							</div>
							<div className="border p-3 text-center">
								<p className="text-muted-foreground text-xs">Concluídas</p>
								<p className="font-semibold text-2xl">
									{stats?.completed ?? 0}
								</p>
							</div>
							<div className="border p-3 text-center">
								<p className="text-muted-foreground text-xs">Taxa</p>
								<p className="font-semibold text-2xl">
									{stats?.completionRate ?? 0}%
								</p>
							</div>
							<div className="border p-3 text-center">
								<p className="text-muted-foreground text-xs">Atrasadas</p>
								<p className="font-semibold text-2xl">{stats?.overdue ?? 0}</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</QueryState>
	);
}
