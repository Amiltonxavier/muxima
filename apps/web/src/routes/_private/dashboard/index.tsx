import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Progress } from "@muxima/ui/components/progress";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	AlertTriangle,
	Calendar,
	CreditCard,
	Gift,
	LayoutGrid,
	Package,
	Plus,
	Users,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { QueryState } from "@/shared/components/states";
import { formatCurrency } from "@/utils/format-currency";
import { formatDate, getDaysRemaining } from "@/utils/format-date";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_private/dashboard/")({
	component: DashboardPage,
});

function DashboardPage() {
	const { data: session } = authClient.useSession();
	const eventsQuery = useQuery(orpc.events.list.queryOptions());

	const events = eventsQuery.data ?? [];
	const currentEvent = events[0];

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-semibold text-2xl">
					Bom dia, {session?.user.name?.split(" ")[0] || "Utilizador"}
				</h1>
				<p className="text-muted-foreground text-sm">
					Aqui está o estado da preparação do seu evento.
				</p>
			</div>

			<QueryState
				state={{
					isLoading: eventsQuery.isLoading,
					isError: eventsQuery.isError,
					isEmpty: events.length === 0,
					hasData: events.length > 0,
				}}
			>
				{currentEvent && <DashboardContent event={currentEvent} />}
			</QueryState>

			{events.length === 0 && !eventsQuery.isLoading && (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
					<Gift className="mb-4 h-12 w-12 text-muted-foreground" />
					<h3 className="font-medium text-lg">Ainda não possui eventos</h3>
					<p className="mb-4 text-muted-foreground text-sm">
						Crie o seu primeiro evento para começar a planear
					</p>
					<Button render={<Link to="/events" />}>
						<Plus className="mr-2 h-4 w-4" />
						Criar evento
					</Button>
				</div>
			)}
		</div>
	);
}

function DashboardContent({ event }: { event: Record<string, unknown> }) {
	const guestsQuery = useQuery(
		orpc.guests.list.queryOptions({ input: { eventId: event.id } }),
	);

	const tasksQuery = useQuery(
		orpc.tasks.list.queryOptions({ input: { eventId: event.id } }),
	);

	const budgetQuery = useQuery(
		orpc.budget.getSummary.queryOptions({ input: { eventId: event.id } }),
	);

	const guests = guestsQuery.data ?? [];
	const tasks = tasksQuery.data ?? [];
	const summary = budgetQuery.data;

	const daysRemaining = event.eventDate
		? getDaysRemaining(event.eventDate)
		: null;

	const budget = summary?.budget ?? 0;
	const paid = summary?.totalExpenses ?? 0;
	const pending = budget - paid;
	const budgetPercent = budget > 0 ? Math.round((paid / budget) * 100) : 0;

	const pendingTasks = tasks.filter(
		(t: Record<string, unknown>) => t.status === "TODO",
	).length;

	return (
		<>
			{/* Event Header Card */}
			<Card>
				<CardContent className="p-6">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<Badge variant="outline" className="mb-2">
								{event.type === "WEDDING" ? "Casamento" : "Noivado"}
							</Badge>
							<h2 className="font-semibold text-xl">{event.name}</h2>
							<div className="mt-1 flex items-center gap-2 text-muted-foreground text-sm">
								<Calendar className="h-4 w-4" />
								<span>
									{event.eventDate
										? formatDate(event.eventDate)
										: "Data não definida"}
								</span>
								{event.venueName && (
									<>
										<span>·</span>
										<span>{event.venueName}</span>
									</>
								)}
							</div>
						</div>
						{daysRemaining !== null && (
							<div className="text-center">
								<div className="font-bold text-3xl">
									{daysRemaining > 0 ? daysRemaining : 0}
								</div>
								<div className="text-muted-foreground text-sm">
									{daysRemaining > 0
										? "dias restantes"
										: daysRemaining === 0
											? "É hoje!"
											: "Evento realizado"}
								</div>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Financial Summary */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="font-medium text-sm">Orçamento</CardTitle>
						<CreditCard className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-semibold text-2xl">
							{formatCurrency(budget)}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="font-medium text-sm">Pago</CardTitle>
						<CreditCard className="h-4 w-4 text-green-500" />
					</CardHeader>
					<CardContent>
						<div className="font-semibold text-2xl text-green-600">
							{formatCurrency(paid)}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="font-medium text-sm">Pendente</CardTitle>
						<CreditCard className="h-4 w-4 text-amber-500" />
					</CardHeader>
					<CardContent>
						<div className="font-semibold text-2xl text-amber-600">
							{formatCurrency(pending > 0 ? pending : 0)}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="font-medium text-sm">Utilização</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-semibold text-2xl">{budgetPercent}%</div>
						<Progress value={budgetPercent} className="mt-2" />
					</CardContent>
				</Card>
			</div>

			{/* Quick Stats */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="font-medium text-sm">Convidados</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-semibold text-2xl">{guests.length}</div>
						<Button
							variant="ghost"
							size="sm"
							className="mt-2 h-auto p-0"
							render={<Link to="/guests" />}
						>
							Ver convidados →
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="font-medium text-sm">
							Tarefas pendentes
						</CardTitle>
						<LayoutGrid className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-semibold text-2xl">{pendingTasks}</div>
						<Button
							variant="ghost"
							size="sm"
							className="mt-2 h-auto p-0"
							render={<Link to="/tasks" />}
						>
							Ver tarefas →
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="font-medium text-sm">Fornecedores</CardTitle>
						<Package className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-semibold text-2xl">
							{summary?.totalVendors ?? 0}
						</div>
						<Button
							variant="ghost"
							size="sm"
							className="mt-2 h-auto p-0"
							render={<Link to="/vendors" />}
						>
							Ver fornecedores →
						</Button>
					</CardContent>
				</Card>
			</div>

			{/* Alerts */}
			{pendingTasks > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 font-medium text-sm">
							<AlertTriangle className="h-4 w-4 text-amber-500" />
							Requer atenção
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="flex items-center justify-between rounded-md border p-3">
							<div>
								<p className="font-medium text-sm">
									{pendingTasks} tarefas pendentes
								</p>
								<p className="text-muted-foreground text-xs">
									Complete as tarefas antes do grande dia
								</p>
							</div>
							<Button variant="ghost" size="sm" render={<Link to="/tasks" />}>
								Ver tarefas
							</Button>
						</div>
					</CardContent>
				</Card>
			)}
		</>
	);
}
