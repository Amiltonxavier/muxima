import type { TableWithGuests } from "@muxima/api/shared/types/entities";
import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
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

const GUEST_STATUS_LABELS: Record<string, string> = {
	PENDING: "Pendente",
	CONFIRMED: "Confirmado",
	DECLINED: "Recusado",
	WAITING: "Em espera",
};

function getGuestStatusLabel(status?: string) {
	return status ? (GUEST_STATUS_LABELS[status] ?? status) : "Pendente";
}

export function ViewTableDialog({ table, onClose }: ViewTableDialogProps) {
	const guests = table.tableGuests ?? [];
	const capacity = table.capacity ?? 0;
	const occupied = guests.length;
	const available = Math.max(capacity - occupied, 0);
	const rate = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0;

	const hasCapacity = capacity > 0;

	const data = [
		{ label: "Ocupados", value: occupied },
		{ label: "Disponíveis", value: available },
	];

	return (
		<Dialog open onOpenChange={onClose}>
			<DialogContent className="max-w-4xl">
				<DialogHeader className="border-b pb-4">
					<div className="flex items-start justify-between gap-4">
						<div className="min-w-0">
							<DialogTitle className="text-lg">
								{table.name}
								{table.number ? (
									<span className="ml-2 font-normal text-muted-foreground">
										#{table.number}
									</span>
								) : null}
							</DialogTitle>

							{table.location ? (
								<div className="mt-1 flex items-center gap-1.5 text-muted-foreground text-sm">
									<MapPin className="size-3.5" />
									<span>{table.location}</span>
								</div>
							) : null}
						</div>

						{hasCapacity ? (
							<div className="shrink-0 text-right">
								<p className="font-semibold text-lg">{rate}%</p>
								<p className="text-muted-foreground text-xs">ocupação</p>
							</div>
						) : null}
					</div>
				</DialogHeader>

				<div className="grid gap-6 py-2 md:grid-cols-[0.9fr_1.1fr]">
					{/* ANALYTICS */}
					<section className="space-y-5 md:border-r md:pr-6">
						<div>
							<h3 className="font-medium text-sm">Ocupação da mesa</h3>
							<p className="mt-1 text-muted-foreground text-xs">
								Distribuição dos lugares desta mesa.
							</p>
						</div>

						{hasCapacity ? (
							<>
								<div className="flex justify-center py-2">
									<PieChart
										data={data}
										innerRadius={58}
										size={190}
										startAngle={-90}
									>
										{data.map((slice, index) => (
											<PieSlice key={slice.label} index={index} />
										))}

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

								<div className="grid grid-cols-3 border-y py-3">
									<div>
										<p className="font-semibold">{capacity}</p>
										<p className="text-muted-foreground text-xs">Capacidade</p>
									</div>

									<div>
										<p className="font-semibold">{occupied}</p>
										<p className="text-muted-foreground text-xs">Ocupados</p>
									</div>

									<div>
										<p className="font-semibold">{available}</p>
										<p className="text-muted-foreground text-xs">Disponíveis</p>
									</div>
								</div>
							</>
						) : (
							<div className="py-8 text-center text-muted-foreground text-sm">
								<p className="font-medium text-foreground">
									Capacidade não definida
								</p>
								<p className="mt-1 text-xs">
									Defina a capacidade da mesa para acompanhar a ocupação.
								</p>
							</div>
						)}

						{table.notes ? (
							<div className="border-t pt-4">
								<p className="text-muted-foreground text-xs">Notas</p>
								<p className="mt-1 text-sm">{table.notes}</p>
							</div>
						) : null}
					</section>

					{/* GUESTS */}
					<section className="min-w-0">
						<div className="mb-4 flex items-center justify-between">
							<div>
								<h3 className="font-medium text-sm">Pessoas sentadas</h3>
								<p className="mt-1 text-muted-foreground text-xs">
									{occupied === 0
										? "Ainda não existem pessoas atribuídas."
										: `${occupied} ${occupied === 1 ? "pessoa atribuída" : "pessoas atribuídas"}.`}
								</p>
							</div>

							<Users className="size-4 text-muted-foreground" />
						</div>

						{guests.length === 0 ? (
							<div className="flex min-h-48 items-center justify-center border border-dashed">
								<div className="text-center">
									<Users className="mx-auto size-5 text-muted-foreground" />
									<p className="mt-2 font-medium text-sm">
										Nenhuma pessoa atribuída
									</p>
									<p className="mt-1 text-muted-foreground text-xs">
										Adicione convidados a esta mesa para os visualizar aqui.
									</p>
								</div>
							</div>
						) : (
							<div className="max-h-80 space-y-1.5 overflow-y-auto">
								{guests.map((tableGuest) => {
									const guestName = tableGuest.guest?.name ?? "Convidado";

									return (
										<div
											key={tableGuest.id}
											className="flex items-center justify-between gap-3 border px-3 py-2.5"
										>
											<div className="min-w-0">
												<p className="truncate font-medium text-sm">
													{guestName}
												</p>
											</div>

											<span className="shrink-0 text-muted-foreground text-xs">
												{getGuestStatusLabel(tableGuest.guest?.status)}
											</span>
										</div>
									);
								})}
							</div>
						)}
					</section>
				</div>

				<DialogFooter className="border-t pt-4">
					<Button variant="outline" onClick={onClose}>
						Fechar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
