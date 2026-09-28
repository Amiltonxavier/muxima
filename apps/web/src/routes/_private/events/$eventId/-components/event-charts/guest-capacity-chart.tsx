// event-charts/components/guest-capacity-chart.tsx

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Users } from "lucide-react";
import { PieCenter } from "@/components/charts/pie-center";
import { PieChart } from "@/components/charts/pie-chart";
import { PieSlice } from "@/components/charts/pie-slice";
import { ChartLegend } from "@/shared/components/charts";

interface GuestCapacityChartProps {
	data?: {
		capacity: number;
		invited: number;
		confirmed: number;
		remaining: number;
		percentage: number;
	};
}

export function GuestCapacityChart({ data }: GuestCapacityChartProps) {
	if (!data || data.capacity <= 0) {
		return null;
	}

	// Invites can exceed the capacity; clamp so the pie stays valid.
	const remaining = Math.max(data.remaining, 0);

	const chartData = [
		{ label: "Convidados", value: data.invited },
		{ label: "Disponíveis", value: remaining },
	];

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-sm">
					<Users className="h-4 w-4" />
					Capacidade de Convidados
				</CardTitle>
			</CardHeader>

			<CardContent className="space-y-4">
				<div className="flex justify-center">
					<PieChart data={chartData} innerRadius={55} size={180}>
						{chartData.map((slice, index) => (
							<PieSlice key={slice.label} index={index} />
						))}
						<PieCenter defaultLabel="capacidade" />
					</PieChart>
				</div>

				<ChartLegend
					items={[
						{
							label: "Convidados",
							color: "var(--chart-1)",
							value: data.invited,
						},
						{
							label: "Confirmados",
							color: "var(--chart-2)",
							value: data.confirmed,
						},
						{
							label: "Disponíveis",
							color: "var(--chart-3)",
							value: remaining,
						},
					]}
				/>
			</CardContent>
		</Card>
	);
}
