import { Pagination } from "@muxima/ui/components/pagination";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@muxima/ui/components/tabs";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarRange, List } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/shared/components/back-to";
import { ScheduleDeleteDialog } from "./-components/schedule-delete-dialog";
import { ScheduleDialog } from "./-components/schedule-dialog";
import { ScheduleGantt } from "./-components/schedule-gantt";
import { ScheduleHeader } from "./-components/schedule-header";
import { ScheduleList } from "./-components/schedule-list";
import { useScheduleTab, useScheduleView } from "./-hooks/use-schedule-view";
import { useCreateSchedule, useSchedules } from "./-queries/schedule-queries";
import type { ScheduleItem } from "./-types/schedule.types";

export const Route = createFileRoute("/_private/events/$eventId/schedule/")({
	component: SchedulePage,
});

function SchedulePage() {
	const { eventId } = Route.useParams();

	const { page, limit, setPage, setLimit } = useScheduleView();
	const { activeTab, setActiveTab } = useScheduleTab();

	const [showCreate, setShowCreate] = useState(false);
	const [deleting, setDeleting] = useState<ScheduleItem | null>(null);

	const schedulesQuery = useSchedules(eventId, { page, limit });
	const createSchedule = useCreateSchedule();

	const schedules = schedulesQuery.data?.data ?? [];
	const meta = schedulesQuery.data?.meta;

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />

			<ScheduleHeader
				activityCount={schedules.length}
				onAddActivity={() => setShowCreate(true)}
			/>

			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList>
					<TabsTrigger value="gantt">
						<CalendarRange className="mr-2 h-4 w-4" />
						Gantt
					</TabsTrigger>
					<TabsTrigger value="lista">
						<List className="mr-2 h-4 w-4" />
						Lista
					</TabsTrigger>
				</TabsList>

				<TabsContent value="gantt">
					<ScheduleGantt
						schedules={schedules}
						isLoading={schedulesQuery.isLoading}
						isError={schedulesQuery.isError}
					/>
				</TabsContent>

				<TabsContent value="lista">
					<div className="space-y-6">
						<ScheduleList
							schedules={schedules}
							isLoading={schedulesQuery.isLoading}
							isError={schedulesQuery.isError}
							onDelete={setDeleting}
						/>

						{meta && (
							<Pagination
								meta={meta}
								onPageChange={setPage}
								onLimitChange={setLimit}
								disabled={schedulesQuery.isLoading}
							/>
						)}
					</div>
				</TabsContent>
			</Tabs>

			<ScheduleDialog
				open={showCreate}
				onOpenChange={setShowCreate}
				onSubmit={(values) => {
					createSchedule.mutate(
						{ ...values, eventId },
						{
							onSuccess: () => {
								toast.success("Atividade criada");
								setShowCreate(false);
							},
							onError: (error) => toast.error(error.message),
						},
					);
				}}
				isLoading={createSchedule.isPending}
			/>

			<ScheduleDeleteDialog
				schedule={deleting}
				onOpenChange={(open) => {
					if (!open) setDeleting(null);
				}}
			/>
		</div>
	);
}
