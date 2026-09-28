import { Button } from "@muxima/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Link } from "@tanstack/react-router";
import { ArrowRight, FileText } from "lucide-react";
import { Bar } from "@/components/charts/bar";
import { BarChart } from "@/components/charts/bar-chart";
import { BarYAxis } from "@/components/charts/bar-y-axis";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip } from "@/components/charts/tooltip/chart-tooltip";

interface TasksStatsCardProps {
	eventId: string;
	stats?: {
		total: number;
		todo: number;
		inProgress: number;
		completed: number;
		completionRate: number;
	};
}

export function TasksStatsCard({ eventId, stats }: TasksStatsCardProps) {
	const total = stats?.total ?? 0;
	const todo = stats?.todo ?? 0;
	const inProgress = stats?.inProgress ?? 0;
	const completed = stats?.completed ?? 0;
	const completionRate = stats?.completionRate ?? 0;

	const chartData = [
		{
			status: "Por fazer",
			total: todo,
		},
		{
			status: "Em andamento",
			total: inProgress,
		},
		{
			status: "Concluídas",
			total: completed,
		},
	];

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between text-sm">
					<span className="flex items-center gap-2">
						<FileText className="h-4 w-4" />
						Tarefas
					</span>

					<span className="font-normal text-muted-foreground text-xs">
						{total} total
					</span>
				</CardTitle>
			</CardHeader>

			<CardContent className="space-y-4">
				{total > 0 ? (
					<>
						<BarChart
							data={chartData}
							xDataKey="status"
							orientation="horizontal"
							aspectRatio="2.5 / 1"
							margin={{
								top: 8,
								right: 16,
								bottom: 8,
								// Room for the `BarYAxis` status labels, which are
								// capped at 70px and truncate beyond that.
								left: 76,
							}}
						>
							{/* Bars run horizontally, so the value axis is the x one. */}
							<Grid horizontal={false} vertical />

							<Bar
								dataKey="total"
								fill="var(--chart-line-primary)"
								lineCap="round"
							/>

							<BarYAxis />
							<ChartTooltip />
						</BarChart>

						<div className="flex items-center justify-between border-t pt-3 text-xs">
							<span className="text-muted-foreground">Taxa de conclusão</span>

							<span className="font-medium">{completionRate}%</span>
						</div>
					</>
				) : (
					<div className="flex min-h-32 items-center justify-center text-center text-muted-foreground text-sm">
						Ainda não existem tarefas
					</div>
				)}

				<Button
					variant="ghost"
					size="sm"
					className="h-auto p-0"
					render={<Link to="/events/$eventId/tasks" params={{ eventId }} />}
				>
					Ver tarefas
					<ArrowRight className="ml-1 h-4 w-4" />
				</Button>
			</CardContent>
		</Card>
	);
}
