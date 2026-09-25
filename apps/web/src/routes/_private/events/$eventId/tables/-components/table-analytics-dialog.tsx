import type { TableStats } from "@muxima/api/shared/types/entities";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { ChartPie } from "lucide-react";
import { PieCenter } from "@/components/charts/pie-center";
import { PieChart } from "@/components/charts/pie-chart";
import { PieSlice } from "@/components/charts/pie-slice";
import { ChartLegend } from "@/shared/components/charts";

type TableAnalyticsDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	stats?: TableStats | null;
};

export function TableAnalyticsDialog({
	open,
	onOpenChange,
	stats,
}: TableAnalyticsDialogProps) {
	const full = stats?.fullTables ?? 0;
	const partial = stats?.partialTables ?? 0;
	const empty = stats?.emptyTables ?? 0;

	const data = [
		{ label: "Mesas cheias", value: full },
		{ label: "Mesas parciais", value: partial },
		{ label: "Mesas vazias", value: empty },
	];

	const total = stats?.total ?? 0;

	if (total === 0) {
		return null;
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<ChartPie className="h-4 w-4" />
						Analytics de mesas
					</DialogTitle>
					<DialogDescription>
						Distribuição da ocupação das {total} mesas do evento.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="flex justify-center">
						<PieChart data={data} innerRadius={55} size={220} startAngle={-90}>
							{data.map((slice, index) => (
								<PieSlice key={slice.label} index={index} />
							))}
							<PieCenter defaultLabel="mesas" />
						</PieChart>
					</div>

					<ChartLegend
						items={[
							{ label: "Cheias", color: "var(--chart-1)", value: full },
							{ label: "Parciais", color: "var(--chart-2)", value: partial },
							{ label: "Vazias", color: "var(--chart-3)", value: empty },
						]}
					/>

					<div className="space-y-1">
						<div className="flex items-center justify-between text-sm">
							<span className="text-muted-foreground">Taxa de ocupação</span>
							<span className="font-medium">{stats?.occupancyRate ?? 0}%</span>
						</div>
						<div
							className="h-2 w-full overflow-hidden rounded-full bg-muted"
							role="progressbar"
							aria-valuenow={stats?.occupancyRate ?? 0}
							aria-valuemin={0}
							aria-valuemax={100}
							aria-label="Taxa de ocupação das mesas"
						>
							<div
								className="h-full rounded-full bg-blue-500 transition-all"
								style={{ width: `${stats?.occupancyRate ?? 0}%` }}
							/>
						</div>
					</div>

					<div className="grid grid-cols-3 gap-2 text-center">
						<div className="border p-3">
							<p className="text-muted-foreground text-xs">Lugares</p>
							<p className="font-semibold">{stats?.totalCapacity ?? 0}</p>
						</div>
						<div className="border p-3">
							<p className="text-muted-foreground text-xs">Ocupados</p>
							<p className="font-semibold">{stats?.totalOccupied ?? 0}</p>
						</div>
						<div className="border p-3">
							<p className="text-muted-foreground text-xs">Disponíveis</p>
							<p className="font-semibold">{stats?.available ?? 0}</p>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
