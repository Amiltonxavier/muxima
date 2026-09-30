import type { ActivityLog } from "@muxima/api/shared/types/entities";
import { Button } from "@muxima/ui/components/button";
import { Pagination } from "@muxima/ui/components/pagination";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@muxima/ui/components/table";
import { Eye } from "lucide-react";
import { useCallback, useState } from "react";
import { QueryState } from "@/shared/components/states";
import { formatDateTime } from "@/utils/format-date";
import {
	ACTIVITY_PAGE_SIZES,
	activityActionLabel,
	activityResourceLabel,
} from "../-constants/activity-labels";
import { useActivityLogs } from "../-queries/activity-queries";
import { ActivityDetailsDialog } from "./activity-details-dialog";

const DEFAULT_LIMIT = 20;

/**
 * The activity history table.
 *
 * Paging is server-side: the page and limit go to the API, which returns one
 * page plus the total, and `Pagination` turns that meta back into navigation.
 * The component never holds more than one page of rows, so the trail can grow
 * without the tab slowing down.
 */
export function ActivityHistoryTable() {
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(DEFAULT_LIMIT);
	const [selected, setSelected] = useState<ActivityLog | null>(null);

	const logsQuery = useActivityLogs({ page, limit });
	const logs = logsQuery.data?.data ?? [];
	const meta = logsQuery.data?.meta;

	// Returning to page 1 whenever the page size changes keeps the user inside
	// the result set instead of landing on a page that no longer exists.
	const handleLimitChange = useCallback((nextLimit: number) => {
		setLimit(nextLimit);
		setPage(1);
	}, []);

	return (
		<div className="space-y-4">
			<QueryState
				state={{
					isLoading: logsQuery.isLoading,
					isError: logsQuery.isError,
					isEmpty: logs.length === 0,
					hasData: logs.length > 0,
					error: logsQuery.error,
				}}
				emptyMessage="Ainda não há atividade registada. As tuas ações aparecem aqui."
				errorMessage="Não foi possível carregar o histórico. Verifica a ligação e tenta novamente."
				onRetry={() => void logsQuery.refetch()}
			>
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Data</TableHead>
								<TableHead>Atividade</TableHead>
								<TableHead>Recurso</TableHead>
								<TableHead>Descrição</TableHead>
								<TableHead className="text-right">Ações</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{logs.map((log) => (
								<TableRow key={log.id}>
									<TableCell className="whitespace-nowrap text-muted-foreground text-sm">
										{formatDateTime(String(log.createdAt))}
									</TableCell>
									<TableCell className="font-medium text-sm">
										{activityActionLabel(log.action)}
									</TableCell>
									<TableCell className="text-muted-foreground text-sm">
										{activityResourceLabel(log.resource)}
									</TableCell>
									<TableCell className="max-w-[28rem] truncate text-sm">
										{log.description}
									</TableCell>
									<TableCell className="text-right">
										<Button
											variant="ghost"
											size="sm"
											onClick={() => setSelected(log)}
										>
											<Eye className="mr-2 h-4 w-4" />
											Ver detalhes
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</QueryState>

			{meta && (
				<Pagination
					meta={meta}
					pageSizes={[...ACTIVITY_PAGE_SIZES]}
					onPageChange={setPage}
					onLimitChange={handleLimitChange}
					disabled={logsQuery.isLoading}
				/>
			)}

			<ActivityDetailsDialog log={selected} onClose={() => setSelected(null)} />
		</div>
	);
}
