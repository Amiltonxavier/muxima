import { Button } from "@muxima/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/shared/components/back-to";
import { QueryState } from "@/shared/components/states";
import { orpc } from "@/shared/utils/orpc";
import { AddMemberDialog } from "./-components/add-member-dialog";
import { MemberCard } from "./-components/member-card";
import type { Member } from "./-types";

export const Route = createFileRoute("/_private/events/$eventId/members/")({
	component: MembersPage,
});

function MembersPage() {
	const { eventId } = Route.useParams();
	const queryClient = useQueryClient();

	const membersQuery = useQuery(
		orpc.members.list.queryOptions({ input: { eventId } }),
	);

	const addMember = useMutation(
		orpc.members.add.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.members.list.queryKey({ input: { eventId } }),
				});
				toast.success("Membro adicionado com sucesso");
				setShowAddDialog(false);
			},
			onError: (err: Error) => {
				toast.error(err.message || "Erro ao adicionar membro");
			},
		}),
	);

	const updateRole = useMutation(
		orpc.members.updateRole.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.members.list.queryKey({ input: { eventId } }),
				});
				toast.success("Papel atualizado com sucesso");
			},
			onError: (err: Error) => {
				toast.error(err.message || "Erro ao atualizar papel");
			},
		}),
	);

	const members = (membersQuery.data ?? []) as Member[];
	const [showAddDialog, setShowAddDialog] = useState(false);

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-2xl">Membros do evento</h1>
					<p className="text-muted-foreground text-sm">
						Gira a equipa do evento
					</p>
				</div>
				<Button onClick={() => setShowAddDialog(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Adicionar membro
				</Button>
			</div>

			<QueryState
				state={{
					isLoading: membersQuery.isLoading,
					isError: membersQuery.isError,
					isEmpty: members.length === 0,
					hasData: members.length > 0,
				}}
			>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{members.map((member) => (
						<MemberCard
							key={member.id}
							member={member}
							onRoleChange={(memberId, role) => {
								updateRole.mutate({ memberId, role: role as never });
							}}
						/>
					))}
				</div>
			</QueryState>

			{members.length === 0 && !membersQuery.isLoading && (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
					<Users className="mb-4 h-12 w-12 text-muted-foreground" />
					<h3 className="font-medium text-lg">Nenhum membro adicionado</h3>
					<p className="mb-4 text-muted-foreground text-sm">
						Adicione membros para colaborar na gestao do evento
					</p>
					<Button onClick={() => setShowAddDialog(true)}>
						<Plus className="mr-2 h-4 w-4" />
						Adicionar primeiro membro
					</Button>
				</div>
			)}

			<AddMemberDialog
				open={showAddDialog}
				onOpenChange={setShowAddDialog}
				onSubmit={(values) => {
					addMember.mutate({ ...values, eventId });
				}}
				isLoading={addMember.isPending}
			/>
		</div>
	);
}
