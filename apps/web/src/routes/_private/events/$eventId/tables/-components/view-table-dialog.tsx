import type { TableWithGuests } from "@muxima/api/shared/types/entities";
import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { MapPin, Users } from "lucide-react";
import { PieCenter } from "@/components/charts/pie-center";
import { PieChart } from "@/components/charts/pie-chart";
import { PieSlice } from "@/components/charts/pie-slice";
import { ChartLegend } from "@/shared/components/charts";

type ViewTableDialogProps = {
	table: TableWithGuests;
	onClose: () => void;
};

export function ViewTableDialog({ table, onClose }: ViewTableDialogProps) {
	const guests = table.tableGuests || [];
	const capacity = table.capacity || 0;
	const occupied = guests.length;
	const available = Math.max(capacity - occupied, 0);
	const rate = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0;

	// With nobody seated there is nothing to draw, so the chart is skipped
	// rather than rendering an empty ring.
	const hasSeats = capacity > 0;
	const data = [
		{ label: "Ocupados", value: occupied },
		{ label: "Disponíveis", value: available },
	];

	return (
		<Dialog open onOpenChange={() => onClose()}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						{table.name}
						{table.number ? (
							<Badge variant="secondary">#{table.number}</Badge>
						) : null}
					</DialogTitle>
					<DialogDescription>
						Detalhes da mesa
						{hasSeats ? ` · ${rate}% ocupada` : ""}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{hasSeats ? (
						<>
							<div className="flex justify-center">
								<PieChart
									data={data}
									innerRadius={55}
									size={200}
									startAngle={-90}
								>
									{data.map((slice, index) => (
										<PieSlice key={slice.label} index={index} />
									))}
									{/* The centre shows the seat total, matching the other
									    analytics charts; the rate is in the subtitle. */}
									<PieCenter defaultLabel="lugares" />
								</PieChart>
							</div>

							<ChartLegend
								items={[
									{
										label: "Ocupados",
										color: "var(--chart-1)",
										value: occupied,
									},
									{
										label: "Disponíveis",
										color: "var(--chart-2)",
										value: available,
									},
								]}
							/>
						</>
					) : (
						<p className="py-6 text-center text-muted-foreground text-sm">
							Esta mesa ainda não tem capacidade definida.
						</p>
					)}

					{table.location ? (
						<div className="flex items-center gap-2 text-muted-foreground text-sm">
							<MapPin className="h-4 w-4" />
							<span>{table.location}</span>
						</div>
					) : null}

					{table.notes ? (
						<div className="bg-muted/50 p-3 text-sm">
							<p className="text-muted-foreground text-xs">Notas</p>
							<p className="mt-1">{table.notes}</p>
						</div>
					) : null}

					<div>
						<div className="mb-2 flex items-center gap-2">
							<Users className="h-4 w-4 text-muted-foreground" />
							<p className="font-medium text-sm">Convidados ({occupied})</p>
						</div>
						{guests.length === 0 ? (
							<p className="py-4 text-center text-muted-foreground text-sm">
								Nenhum convidado atribuído.
							</p>
						) : (
							<div className="space-y-1">
								{guests.map((tg) => (
									<div
										key={tg.id}
										className="flex items-center justify-between border px-3 py-2"
									>
										<span className="text-sm">
											{tg.guest?.name || "Convidado"}
										</span>
										<Badge variant="outline" className="text-xs">
											{tg.guest?.status || "PENDING"}
										</Badge>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Fechar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
