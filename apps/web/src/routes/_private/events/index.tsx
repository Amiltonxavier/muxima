import { createFileRoute } from '@tanstack/react-router'

import { Button } from "@muxima/ui/components/button";
import { Input } from "@muxima/ui/components/input";
import { Gift, Plus } from "lucide-react";
import { useState } from "react";

import { QueryState } from "@/shared/components/states";
import { Pagination } from "@/shared/components/pagination";

import {
	useEvents,
	type EventListParams,
} from "./-queries/event-queries";
import { EventCard } from "./-components/event-card";
import { CreateEventDialog } from "./-components/create-event-dialog";

export const Route = createFileRoute("/_private/events/")({
	component: EventsPage,
});

function EventsPage() {
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [params, setParams] = useState<EventListParams>({
		page: 1,
		limit: 12,
	});

	const eventsQuery = useEvents(params);
	const events = eventsQuery.data?.data ?? [];
	const pagination = eventsQuery.data?.pagination;

	return (
		<>
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="font-semibold text-2xl">Eventos</h1>
						<p className="text-muted-foreground text-sm">
							Gira os seus eventos de noivado e casamento
						</p>
					</div>
					<Button onClick={() => setShowCreateDialog(true)}>
						<Plus className="mr-2 h-4 w-4" />
						Criar evento
					</Button>
				</div>

				<div className="flex items-center gap-3">
					<Input
						placeholder="Pesquisar eventos..."
						className="max-w-sm"
						value={params.search ?? ""}
						onChange={(e) =>
							setParams((prev) => ({
								...prev,
								search: e.target.value || undefined,
								page: 1,
							}))
						}
					/>
					<select
						className="h-9 rounded-md border bg-transparent px-3 text-sm"
						value={params.status ?? ""}
						onChange={(e) =>
							setParams((prev) => ({
								...prev,
								status: (e.target.value || undefined) as EventListParams["status"],
								page: 1,
							}))
						}
					>
						<option value="">Todos os estados</option>
						<option value="DRAFT">Rascunho</option>
						<option value="PLANNING">Planeamento</option>
						<option value="CONFIRMED">Confirmado</option>
						<option value="COMPLETED">Concluído</option>
						<option value="CANCELLED">Cancelado</option>
					</select>
				</div>

				<QueryState
					state={{
						isLoading: eventsQuery.isLoading,
						isError: eventsQuery.isError,
						isEmpty: events.length === 0,
						hasData: events.length > 0,
					}}
				>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{events.map((event: Record<string, unknown>) => {
							return (
								<EventCard key={event.id as string} event={event} />
							);
						})}
					</div>
				</QueryState>

				{events.length === 0 && !eventsQuery.isLoading && (
					<div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
						<Gift className="mb-4 h-12 w-12 text-muted-foreground" />
						<h3 className="font-medium text-lg">Ainda não possui eventos</h3>
						<p className="mb-4 text-muted-foreground text-sm">
							Crie o seu primeiro evento para começar a planear
						</p>
						<Button onClick={() => setShowCreateDialog(true)}>
							<Plus className="mr-2 h-4 w-4" />
							Criar evento
						</Button>
					</div>
				)}

				{pagination && (
					<Pagination
						pagination={pagination}
						onPageChange={(page) => setParams((prev) => ({ ...prev, page }))}
					/>
				)}
			</div>

			{showCreateDialog && <CreateEventDialog onOpenChange={() => setShowCreateDialog(false)} open={showCreateDialog} />}
		</>
	);
}
