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

type ViewTableDialogProps = {
	table: TableWithGuests;
	onClose: () => void;
};

export function ViewTableDialog({ table, onClose }: ViewTableDialogProps) {
	const guests = table.tableGuests || [];
	const capacity = table.capacity || 0;
	const occupied = guests.length;
	const rate = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0;

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
					<DialogDescription>Detalhes da mesa</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div className="border p-3 text-center">
							<p className="text-muted-foreground text-xs">Capacidade</p>
							<p className="font-semibold text-2xl">{capacity}</p>
						</div>
						<div className="border p-3 text-center">
							<p className="text-muted-foreground text-xs">Ocupados</p>
							<p className="font-semibold text-2xl">{occupied}</p>
						</div>
					</div>

					<div className="border p-3 text-center">
						<p className="text-muted-foreground text-xs">Disponíveis</p>
						<p
							className={`font-semibold text-2xl ${capacity - occupied <= 0 ? "text-red-600" : "text-green-600"}`}
						>
							{capacity - occupied}
						</p>
					</div>

					<div className="space-y-1">
						<div className="flex justify-between text-muted-foreground text-xs">
							<span>Ocupação</span>
							<span>{rate}%</span>
						</div>
						<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
							<div
								className="h-full rounded-full bg-blue-500 transition-all"
								style={{ width: `${Math.min(rate, 100)}%` }}
							/>
						</div>
					</div>

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
