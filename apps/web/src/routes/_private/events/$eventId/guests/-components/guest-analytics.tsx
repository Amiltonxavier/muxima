import type { GuestStats } from "@muxima/api/shared/types/entities";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Users } from "lucide-react";
import { QueryState } from "@/shared/components/states";
import { GUEST_TYPE_LABELS } from "@/utils/status-helpers";
import { GuestDistributionRadar } from "./guest-distribution-radar";

type GuestAnalyticsProps = {
	stats?: GuestStats | null;
	isLoading: boolean;
	isError: boolean;
};

const GUEST_TYPES = ["FAMILY", "FRIEND", "COLLEAGUE", "VIP", "OTHER"] as const;

export function GuestAnalytics({
	stats,
	isLoading,
	isError,
}: GuestAnalyticsProps) {
	return (
		<QueryState
			state={{
				isLoading,
				isError,
				isEmpty: !stats || stats.totalGuests === 0,
				hasData: !!stats,
			}}
		>
			<div className="grid gap-4 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-sm">
							<Users className="h-4 w-4" />
							Distribuição por tipo de convidado
						</CardTitle>
					</CardHeader>
					<CardContent>
						<GuestDistributionRadar stats={stats} />
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-sm">
							<Users className="h-4 w-4" />
							Confirmações por tipo
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-3 gap-3">
							<div className="border p-3 text-center">
								<p className="text-muted-foreground text-xs">
									Taxa de confirmação
								</p>
								<p className="font-semibold text-lg">
									{stats?.confirmationRate ?? 0}%
								</p>
							</div>
							<div className="border p-3 text-center">
								<p className="text-muted-foreground text-xs">Confirmados</p>
								<p className="font-semibold text-lg">
									{stats?.totalConfirmedPeople ?? 0}
								</p>
							</div>
							<div className="border p-3 text-center">
								<p className="text-muted-foreground text-xs">Pendentes</p>
								<p className="font-semibold text-lg">{stats?.pending ?? 0}</p>
							</div>
						</div>

						<ul className="space-y-3">
							{GUEST_TYPES.map((type) => {
								const byType = stats?.byType?.[type];
								const total = byType?.total ?? 0;
								const confirmed = byType?.confirmed ?? 0;
								const rate =
									total > 0 ? Math.round((confirmed / total) * 100) : 0;

								return (
									<li key={type} className="space-y-1">
										<div className="flex items-center justify-between text-sm">
											<span>{GUEST_TYPE_LABELS[type] ?? type}</span>
											<span className="text-muted-foreground">
												{confirmed} de {total} confirmados · {rate}%
											</span>
										</div>
										<div
											className="h-2 w-full overflow-hidden rounded-full bg-muted"
											role="progressbar"
											aria-valuenow={rate}
											aria-valuemin={0}
											aria-valuemax={100}
											aria-label={`Confirmações de ${GUEST_TYPE_LABELS[type] ?? type}`}
										>
											<div
												className="h-full rounded-full bg-blue-500 transition-all"
												style={{ width: `${rate}%` }}
											/>
										</div>
									</li>
								);
							})}
						</ul>
					</CardContent>
				</Card>
			</div>
		</QueryState>
	);
}
