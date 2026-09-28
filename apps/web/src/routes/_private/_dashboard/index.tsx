import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Calendar,
	Mail,
	MapPin,
	Plus,
	ShoppingCart,
	Users,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { MetricCard, StatsGrid } from "@/shared/components/metrics";
import { QueryState } from "@/shared/components/states";
import { dateHelper } from "@/shared/utils/date-helper";
import { orpc } from "@/utils/orpc";
import { getStatusColor, getStatusLabel } from "@/utils/status-helpers";
import { useEvents } from "../events/-queries/event-queries";

export const Route = createFileRoute("/_private/_dashboard/")({
	component: DashboardPage,
});

function DashboardPage() {
	const { data: session } = authClient.useSession();
	const eventsQuery = useEvents({ page: 1, limit: 6 });

	// Totais da plataforma, pré-calculados pela API (dashboard.getGlobalStats).
	const globalStatsQuery = useQuery(
		orpc.dashboard.getGlobalStats.queryOptions(),
	);
	const globalStats = globalStatsQuery.data;

	const events = eventsQuery.data?.data ?? [];

	function getGreeting() {
		const hour = new Date().getHours();

		if (hour < 12) return "Bom dia";
		if (hour < 18) return "Boa tarde";

		return "Boa noite";
	}

	const greeting = getGreeting();
	const firstName = session?.user.name?.split(" ")[0] || "Utilizador";

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-semibold text-2xl">
					{greeting}, {firstName}
				</h1>
				<p className="text-muted-foreground text-sm">
					Resumo geral da plataforma
				</p>
			</div>
		</div>
	);
}
