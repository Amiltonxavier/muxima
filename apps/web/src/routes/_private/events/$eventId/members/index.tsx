import { Pagination } from "@muxima/ui/components/pagination";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BackButton } from "@/shared/components/back-to";
import { AddMemberDialog } from "./-components/add-member-dialog";
import { MemberDetailsDialog } from "./-components/member-details-dialog";
import { MembersFilters } from "./-components/members-filters";
import { MembersHeader } from "./-components/members-header";
import { MembersTable } from "./-components/members-table";
import { RemoveMemberDialog } from "./-components/remove-member-dialog";
import { useMembersFilters } from "./-hooks/use-members-filters";
import {
	useAddMember,
	useMembers,
	useRemoveMember,
	useUpdateMemberRole,
} from "./-queries/member-queries";
import type { AssignableMemberRole, MemberItem } from "./-types/member.types";

export const Route = createFileRoute("/_private/events/$eventId/members/")({
	component: MembersPage,
});

function MembersPage() {
	const { eventId } = Route.useParams();

	const filters = useMembersFilters();
	const membersQuery = useMembers(eventId, {
		page: filters.page,
		limit: filters.limit,
		search: filters.search || undefined,
		role: filters.role !== "ALL" ? filters.role : undefined,
		status: filters.status !== "ALL" ? filters.status : undefined,
	});

	const addMember = useAddMember();
	const updateRole = useUpdateMemberRole();
	const removeMember = useRemoveMember();

	const [showAddDialog, setShowAddDialog] = useState(false);
	const [detailsMember, setDetailsMember] = useState<MemberItem | null>(null);
	const [removingMember, setRemovingMember] = useState<MemberItem | null>(null);

	const members = membersQuery.data?.data ?? [];
	const meta = membersQuery.data?.meta;

	const handleRoleChange = (memberId: string, role: AssignableMemberRole) => {
		updateRole.mutate(
			{ memberId, role },
			{ onSuccess: () => setDetailsMember(null) },
		);
	};

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />

			<MembersHeader
				memberCount={members.length}
				canAdd={!addMember.isPending}
				onAdd={() => setShowAddDialog(true)}
			/>

			<MembersFilters
				search={filters.search}
				role={filters.role}
				status={filters.status}
				hasActiveFilters={filters.hasActiveFilters}
				onSearchChange={filters.setSearch}
				onRoleChange={filters.setRole}
				onStatusChange={filters.setStatus}
				onReset={filters.reset}
			/>

			<MembersTable
				members={members}
				isLoading={membersQuery.isLoading}
				isError={membersQuery.isError}
				disabledMemberId={updateRole.isPending ? detailsMember?.id : undefined}
				onRoleChange={handleRoleChange}
				onViewDetails={setDetailsMember}
				onRemove={(memberId) =>
					setRemovingMember(
						members.find((member) => member.id === memberId) ?? null,
					)
				}
			/>

			{meta && (
				<Pagination
					meta={meta}
					onPageChange={filters.setPage}
					onLimitChange={filters.setLimit}
					disabled={membersQuery.isLoading}
				/>
			)}

			<AddMemberDialog
				open={showAddDialog}
				onOpenChange={setShowAddDialog}
				onSubmit={(values) =>
					addMember.mutate(
						{ ...values, eventId },
						{ onSuccess: () => setShowAddDialog(false) },
					)
				}
				isLoading={addMember.isPending}
			/>

			{detailsMember && (
				<MemberDetailsDialog
					member={detailsMember}
					onClose={() => setDetailsMember(null)}
					onRoleChange={handleRoleChange}
					onRemove={(memberId) => {
						setDetailsMember(null);
						setRemovingMember(
							members.find((member) => member.id === memberId) ?? null,
						);
					}}
					isUpdating={updateRole.isPending}
					isRemoving={removeMember.isPending}
				/>
			)}

			<RemoveMemberDialog
				member={removingMember}
				onClose={() => setRemovingMember(null)}
				onConfirm={(memberId) =>
					removeMember.mutate(
						{ memberId },
						{ onSuccess: () => setRemovingMember(null) },
					)
				}
				isLoading={removeMember.isPending}
			/>
		</div>
	);
}
