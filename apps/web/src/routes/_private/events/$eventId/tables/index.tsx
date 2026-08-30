import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { Input } from "@muxima/ui/components/input";
import { Label } from "@muxima/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/shared/components/back-to";
import { QueryState } from "@/shared/components/states";
import { useCreateTable, useTables } from "@/shared/queries/table-queries";

export const Route = createFileRoute("/_private/events/$eventId/tables/")({
	component: TablesPage,
});

function TablesPage() {
	const { eventId } = Route.useParams();

	const tablesQuery = useTables(eventId);
	const createTable = useCreateTable();

	const [showCreate, setShowCreate] = useState(false);

	const tables = tablesQuery.data ?? [];

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-2xl">Mesas</h1>
					<p className="text-muted-foreground text-sm">{tables.length} mesas</p>
				</div>
				<Button onClick={() => setShowCreate(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Criar mesa
				</Button>
			</div>

			<QueryState
				state={{
					isLoading: tablesQuery.isLoading,
					isError: tablesQuery.isError,
					isEmpty: tables.length === 0,
					hasData: tables.length > 0,
				}}
			>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{tables.map((table: Record<string, unknown>) => {
						const guests =
							(table.tableGuests as Record<string, unknown>[]) || [];
						const capacity = (table.capacity as number) || 0;
						const occupied = guests.length;
						return (
							<Card key={table.id as string}>
								<CardHeader>
									<div className="flex items-start justify-between">
										<CardTitle>{table.name as string}</CardTitle>
										<Badge variant="secondary">
											{table.number ? `#${table.number}` : ""}
										</Badge>
									</div>
								</CardHeader>
								<CardContent>
									<div className="space-y-2 text-sm">
										<p className="text-muted-foreground">
											{occupied}/{capacity} lugares
										</p>
										{Boolean(table.location) && (
											<p className="text-muted-foreground text-xs">
												{String(table.location || "")}
											</p>
										)}
										{guests.length > 0 && (
											<div className="flex flex-wrap gap-1 pt-2">
												{guests.map((tg: any) => (
													<Badge
														key={tg.id}
														variant="outline"
														className="text-xs"
													>
														{tg.guest?.name || "Convidado"}
													</Badge>
												))}
											</div>
										)}
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			</QueryState>

			<TableDialog
				open={showCreate}
				onOpenChange={setShowCreate}
				onSubmit={(values) => {
					createTable.mutate({ ...values, eventId } as never, {
						onSuccess: () => {
							toast.success("Mesa criada");
							setShowCreate(false);
						},
						onError: (e) => toast.error(e.message),
					});
				}}
				isLoading={createTable.isPending}
			/>
		</div>
	);
}

function TableDialog({
	open,
	onOpenChange,
	onSubmit,
	isLoading,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	onSubmit: (v: Record<string, unknown>) => void;
	isLoading: boolean;
}) {
	const form = useForm({
		defaultValues: {
			name: "",
			number: 0,
			capacity: 8,
			location: "",
			notes: "",
		},
		onSubmit: async ({ value }) => {
			onSubmit(value);
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Criar mesa</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<form.Field name="name">
						{(field) => (
							<div className="space-y-2">
								<Label>Nome</Label>
								<Input
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>
					<div className="grid grid-cols-2 gap-4">
						<form.Field name="number">
							{(field) => (
								<div className="space-y-2">
									<Label>Número</Label>
									<Input
										type="number"
										value={field.state.value || ""}
										onChange={(e) =>
											field.handleChange(Number(e.target.value) || 0)
										}
										disabled={isLoading}
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="capacity">
							{(field) => (
								<div className="space-y-2">
									<Label>Capacidade</Label>
									<Input
										type="number"
										value={field.state.value || ""}
										onChange={(e) =>
											field.handleChange(Number(e.target.value) || 0)
										}
										disabled={isLoading}
									/>
								</div>
							)}
						</form.Field>
					</div>
					<form.Field name="location">
						{(field) => (
							<div className="space-y-2">
								<Label>Localização</Label>
								<Input
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isLoading}
								/>
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
							{isLoading ? "A criar..." : "Criar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
