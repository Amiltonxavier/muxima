import { Button } from "@muxima/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/shared/components/back-to";
import { QueryState } from "@/shared/components/states";
import {
	useCreateGuest,
	useDeleteGuest,
	useGuests,
	useUpdateGuest,
} from "@/shared/queries/guest-queries";
import { GuestDialog } from "./-components/guest-dialog";
import { GuestList } from "./-components/guest-list";
import type { Guest } from "./-types";

export const Route = createFileRoute("/_private/events/$eventId/guests/")({
	component: GuestsPage,
});

function GuestsPage() {
	const { eventId } = Route.useParams();

	const guestsQuery = useGuests({ eventId });
	const createGuest = useCreateGuest();
	const updateGuest = useUpdateGuest();
	const deleteGuest = useDeleteGuest();

	const [showCreate, setShowCreate] = useState(false);

	const guests = (guestsQuery.data?.data ?? []) as unknown as Guest[];

	const confirmedCount = useMemo(
		() => guests.filter((g) => g.status === "CONFIRMED").length,
		[guests],
	);
	const pendingCount = useMemo(
		() => guests.filter((g) => g.status === "PENDING").length,
		[guests],
	);

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-2xl">Convidados</h1>
					<p className="text-muted-foreground text-sm">
						{guests.length} convidados
					</p>
				</div>
				<Button onClick={() => setShowCreate(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Adicionar convidado
				</Button>
			</div>

			<div className="grid gap-4 sm:grid-cols-3">
				<div className="border p-4">
					<p className="text-muted-foreground text-sm">Total</p>
					<p className="font-semibold text-2xl">{guests.length}</p>
				</div>
				<div className="border p-4">
					<p className="text-muted-foreground text-sm">Confirmados</p>
					<p className="font-semibold text-2xl text-green-600">
						{confirmedCount}
					</p>
				</div>
				<div className="border p-4">
					<p className="text-muted-foreground text-sm">Pendentes</p>
					<p className="font-semibold text-2xl text-amber-600">
						{pendingCount}
					</p>
				</div>
			</div>

			<QueryState
				state={{
					isLoading: guestsQuery.isLoading,
					isError: guestsQuery.isError,
					isEmpty: guests.length === 0,
					hasData: guests.length > 0,
				}}
			>
				<GuestList
					guests={guests}
					updateGuest={updateGuest}
					deleteGuest={deleteGuest}
				/>
			</QueryState>

			<GuestDialog
				open={showCreate}
				onOpenChange={setShowCreate}
				onSubmit={(values) => {
					createGuest.mutate({ ...values, eventId } as never, {
						onSuccess: () => {
							toast.success("Convidado adicionado");
							setShowCreate(false);
						},
						onError: (e) => toast.error(e.message),
					});
				}}
				isLoading={createGuest.isPending}
			/>
		</div>
	);
}
