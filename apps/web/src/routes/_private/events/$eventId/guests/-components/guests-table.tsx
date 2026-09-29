import { Card } from "@muxima/ui/components/card";
import { Checkbox } from "@muxima/ui/components/checkbox";
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "@muxima/ui/components/table";
import { QueryState } from "@/shared/components/states";
import type { GuestItem } from "../-types/guest.types";
import { GuestsTableRow } from "./guests-table-row";

export function GuestsTable({
	guests,
	isLoading,
	isError,
	selectedIds,
	onToggleSelected,
	onToggleAll,
	onViewInvitation,
	onShareInvitation,
	onEditGuest,
	onDeleteGuest,
	onManageCompanions,
}: {
	guests: GuestItem[];
	isLoading: boolean;
	isError: boolean;
	selectedIds: string[];
	onToggleSelected: (guestId: string) => void;
	onToggleAll: () => void;
	onViewInvitation: (guestId: string) => void;
	onShareInvitation: (guest: GuestItem) => void;
	onEditGuest: (guest: GuestItem) => void;
	onDeleteGuest: (guest: GuestItem) => void;
	onManageCompanions: (guest: GuestItem) => void;
}) {
	return (
		<QueryState
			state={{
				isLoading,
				isError,
				isEmpty: guests.length === 0,
				hasData: guests.length > 0,
			}}
		>
			<Card>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-10">
								<Checkbox
									checked={
										guests.length > 0 && selectedIds.length === guests.length
									}
									onCheckedChange={onToggleAll}
									aria-label="Seleccionar todos os convidados"
								/>
							</TableHead>
							<TableHead>Nome</TableHead>
							<TableHead>Contacto</TableHead>
							<TableHead>Grupo</TableHead>
							<TableHead>Tipo</TableHead>
							<TableHead>Mesa</TableHead>
							<TableHead>Acomp.</TableHead>
							<TableHead>Estado</TableHead>
							<TableHead>Convite</TableHead>
							<TableHead className="w-32" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{guests.map((guest) => (
							<GuestsTableRow
								key={guest.id}
								guest={guest}
								isSelected={new Set(selectedIds).has(guest.id)}
								onToggleSelected={onToggleSelected}
								onViewInvitation={onViewInvitation}
								onShareInvitation={onShareInvitation}
								onEditGuest={onEditGuest}
								onDeleteGuest={onDeleteGuest}
								onManageCompanions={onManageCompanions}
							/>
						))}
					</TableBody>
				</Table>
			</Card>
		</QueryState>
	);
}
