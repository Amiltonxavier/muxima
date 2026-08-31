import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import {
	Card,
	CardContent,
} from "@muxima/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { Input } from "@muxima/ui/components/input";
import { Label } from "@muxima/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Shield, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/shared/components/back-to";
import { QueryState } from "@/shared/components/states";
import { orpc } from "@/utils/orpc";
import { MEMBER_ROLE_LABELS, toSelectItems } from "@/utils/status-helpers";

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

	const removeMember = useMutation(
		orpc.members.remove.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.members.list.queryKey({ input: { eventId } }),
				});
				toast.success("Membro removido com sucesso");
				setDeletingMemberId(null);
			},
			onError: (err: Error) => {
				toast.error(err.message || "Erro ao remover membro");
			},
		}),
	);

	const members = (membersQuery.data ?? []) as Array<Record<string, unknown>>;
	const [showAddDialog, setShowAddDialog] = useState(false);
	const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);

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
					{members.map((member) => {
						const user = member.user as Record<string, unknown> | undefined;
						const userName = user?.name ? String(user.name) : "Utilizador";
						const userEmail = user?.email ? String(user.email) : "";
						const initials = userName
							.split(" ")
							.map((n: string) => n[0])
							.join("")
							.slice(0, 2);
						const memberRole = String(member.role);
						const memberStatus = String(member.status);

						return (
							<Card key={String(member.id)}>
								<CardContent className="p-4">
									<div className="flex items-start justify-between">
										<div className="flex items-center gap-3">
											<div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-medium text-sm">
												{initials}
											</div>
											<div className="min-w-0">
												<p className="truncate font-medium text-sm">
													{userName}
												</p>
												<p className="truncate text-muted-foreground text-xs">
													{userEmail}
												</p>
											</div>
										</div>
										<Button
											variant="ghost"
											size="icon-sm"
											className="text-destructive"
											title="Remover membro"
											onClick={() => setDeletingMemberId(String(member.id))}
										>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
									</div>
									<div className="mt-3 flex items-center gap-2">
										<Select
											items={toSelectItems(MEMBER_ROLE_LABELS)}
											value={memberRole}
											onValueChange={(v) => {
												if (v) {
													updateRole.mutate({
														memberId: String(member.id),
														role: v as never,
													});
												}
											}}
										>
											<SelectTrigger className="h-8 w-auto text-xs">
												<Shield className="mr-1 h-3 w-3" />
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{toSelectItems(MEMBER_ROLE_LABELS).map((item) => (
													<SelectItem key={item.value} value={item.value}>
														{item.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<Badge
											className={
												memberStatus === "ACTIVE"
													? "bg-green-50 text-green-700"
													: "bg-amber-50 text-amber-700"
											}
										>
											{memberStatus === "ACTIVE" ? "Ativo" : "Pendente"}
										</Badge>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			</QueryState>

			{members.length === 0 && !membersQuery.isLoading && (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
					<Users className="mb-4 h-12 w-12 text-muted-foreground" />
					<h3 className="font-medium text-lg">Nenhum membro adicionado</h3>
					<p className="mb-4 text-muted-foreground text-sm">
						Adicione membros para colaborar na gestão do evento
					</p>
					<Button onClick={() => setShowAddDialog(true)}>
						<Plus className="mr-2 h-4 w-4" />
						Adicionar primeiro membro
					</Button>
				</div>
			)}

			{/* Add Member Dialog */}
			<AddMemberDialog
				open={showAddDialog}
				onOpenChange={setShowAddDialog}
				onSubmit={(values) => {
					addMember.mutate({ ...values, eventId });
				}}
				isLoading={addMember.isPending}
			/>

			{/* Delete Confirmation Dialog */}
			<Dialog
				open={!!deletingMemberId}
				onOpenChange={() => setDeletingMemberId(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Remover membro</DialogTitle>
						<DialogDescription>
							Tem a certeza que deseja remover este membro do evento? Esta ação
							não pode ser desfeita.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeletingMemberId(null)}>
							Cancelar
						</Button>
						<Button
							variant="destructive"
							disabled={removeMember.isPending}
							onClick={() => {
								if (deletingMemberId) {
									removeMember.mutate({ memberId: deletingMemberId });
								}
							}}
						>
							{removeMember.isPending ? "A remover..." : "Remover"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function AddMemberDialog({
	open,
	onOpenChange,
	onSubmit,
	isLoading,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	onSubmit: (values: { email: string; role: string }) => void;
	isLoading: boolean;
}) {
	const form = useForm({
		defaultValues: {
			email: "",
			role: "EDITOR",
		},
		onSubmit: async ({ value }) => {
			if (!value.email) {
				toast.error("Email é obrigatório");
				return;
			}
			onSubmit(value);
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Adicionar membro</DialogTitle>
					<DialogDescription>
						Convide um utilizador para colaborar neste evento
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<form.Field name="email">
						{(field) => (
							<div className="space-y-2">
								<Label>Email do utilizador</Label>
								<Input
									type="email"
									placeholder="email@exemplo.com"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>
					<form.Field name="role">
						{(field) => (
							<div className="space-y-2">
								<Label>Papel</Label>
								<Select
									items={toSelectItems(MEMBER_ROLE_LABELS)}
									value={field.state.value}
									onValueChange={(v) => field.handleChange(v as never)}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{toSelectItems(MEMBER_ROLE_LABELS).map((item) => (
											<SelectItem key={item.value} value={item.value}>
												{item.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
					</form.Field>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? "A adicionar..." : "Adicionar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
