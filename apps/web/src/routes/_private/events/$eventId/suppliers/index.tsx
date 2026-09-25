import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import { Card, CardContent } from "@muxima/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { Input } from "@muxima/ui/components/input";
import { Label } from "@muxima/ui/components/label";
import { Pagination } from "@muxima/ui/components/pagination";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@muxima/ui/components/table";
import { Textarea } from "@muxima/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/shared/components/back-to";
import { QueryState } from "@/shared/components/states";
import {
	useCreateVendor,
	useDeleteVendor,
	useUpdateVendor,
	useVendorStats,
	useVendors,
} from "@/shared/queries/vendor-queries";
import { formatCurrency } from "@/utils/format-currency";
import {
	getStatusColor,
	getStatusLabel,
	VENDOR_CATEGORY_LABELS,
	VENDOR_STATUS_LABELS,
} from "@/utils/status-helpers";
import { vendorSchema } from "@/utils/vendor-schemas";

export const Route = createFileRoute("/_private/events/$eventId/suppliers/")({
	component: SuppliersPage,
});

function SuppliersPage() {
	const { eventId } = Route.useParams();

	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);

	const vendorsQuery = useVendors(eventId, { page, limit });
	const createVendor = useCreateVendor();
	const updateVendor = useUpdateVendor();
	const deleteVendor = useDeleteVendor();

	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [editing, setEditing] = useState<{
		id?: string;
		name?: string;
		category?: string;
		phone?: string;
		email?: string;
		status?: string;
		notes?: string;
	} | null>(null);
	const [deleteId, setDeleteId] = useState<string | null>(null);

	const vendorsStatsQuery = useVendorStats(eventId);
	const vendorsStats = vendorsStatsQuery.data;

	const vendors = vendorsQuery.data?.data ?? [];
	const meta = vendorsQuery.data?.meta;

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-2xl">Fornecedores</h1>
					<p className="text-muted-foreground text-sm">
						{vendors.length} fornecedores
					</p>
				</div>
				<Button onClick={() => setShowCreateDialog(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Adicionar fornecedor
				</Button>
			</div>

			<QueryState
				state={{
					isLoading: vendorsQuery.isLoading,
					isError: vendorsQuery.isError,
					isEmpty: vendors.length === 0,
					hasData: vendors.length > 0,
				}}
			>
				<Card>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Fornecedor</TableHead>
								<TableHead>Categoria</TableHead>
								<TableHead>Contacto</TableHead>
								<TableHead>Estado</TableHead>
								<TableHead className="w-24" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{vendors.map((v) => {
								return (
									<TableRow key={v.id}>
										<TableCell className="font-medium">{v.name}</TableCell>
										<TableCell>
											{VENDOR_CATEGORY_LABELS[v.category as string] ||
												v.category}
										</TableCell>
										<TableCell>
											<div className="text-sm">
												{v.phone && <p>{v.phone}</p>}
												{v.email && (
													<p className="text-muted-foreground text-xs">
														{v.email}
													</p>
												)}
											</div>
										</TableCell>
										<TableCell>
											<Badge
												className={getStatusColor(
													(v.status || "PROSPECT") as string,
												)}
											>
												{getStatusLabel(
													(v.status || "PROSPECT") as string,
													"vendor",
												)}
											</Badge>
										</TableCell>
										<TableCell>
											<div className="flex gap-1">
												<Button
													variant="ghost"
													size="icon-sm"
													onClick={() => setEditing(v as any)}
												>
													<Pencil className="h-3.5 w-3.5" />
												</Button>
												<Button
													variant="ghost"
													size="icon-sm"
													className="text-destructive"
													onClick={() => setDeleteId(v.id)}
												>
													<Trash2 className="h-3.5 w-3.5" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</Card>
			</QueryState>

			{meta && (
				<Pagination
					meta={meta}
					onPageChange={setPage}
					onLimitChange={(l) => {
						setLimit(l);
						setPage(1);
					}}
					disabled={vendorsQuery.isLoading}
				/>
			)}

			<VendorDialog
				open={showCreateDialog}
				onOpenChange={setShowCreateDialog}
				onSubmit={(values) => {
					createVendor.mutate(
						{ ...values, eventId },
						{
							onSuccess: () => {
								toast.success("Fornecedor adicionado");
								setShowCreateDialog(false);
							},
							onError: (e) => toast.error(e.message),
						},
					);
				}}
				isLoading={createVendor.isPending}
			/>

			{editing && (
				<VendorDialog
					open={!!editing}
					onOpenChange={() => setEditing(null)}
					initialValues={{
						name: editing.name || "",
						category: editing.category || "",
						phone: editing.phone || "",
						email: editing.email || "",
						status: editing.status || "PROSPECT",
						notes: editing.notes || "",
					}}
					onSubmit={(values) => {
						updateVendor.mutate(
							{ id: editing.id!, ...values },
							{
								onSuccess: () => {
									toast.success("Fornecedor atualizado");
									setEditing(null);
								},
								onError: (e) => toast.error(e.message),
							},
						);
					}}
					isLoading={updateVendor.isPending}
				/>
			)}

			<Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Eliminar fornecedor</DialogTitle>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteId(null)}>
							Cancelar
						</Button>
						<Button
							variant="destructive"
							onClick={() => {
								if (deleteId)
									deleteVendor.mutate(
										{ id: deleteId },
										{
											onSuccess: () => {
												toast.success("Eliminado");
												setDeleteId(null);
											},
											onError: (e) => toast.error(e.message),
										},
									);
							}}
							disabled={deleteVendor.isPending}
						>
							Eliminar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function VendorDialog({
	open,
	onOpenChange,
	initialValues,
	onSubmit,
	isLoading,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	initialValues?: {
		name: string;
		category: string;
		phone?: string;
		email?: string;
		status?: string;
		notes?: string;
	};
	onSubmit: (v: any) => void;
	isLoading: boolean;
}) {
	const isEditing = !!initialValues;
	const form = useForm({
		defaultValues: {
			name: initialValues?.name || "",
			category: (initialValues?.category || "OTHER") as
				| "VENUE"
				| "DECORATION"
				| "MUSIC"
				| "PHOTOGRAPHY"
				| "VIDEO"
				| "CATERING"
				| "CAKE"
				| "DRINKS"
				| "TRANSPORT"
				| "BEAUTY"
				| "SECURITY"
				| "ENTERTAINMENT"
				| "OTHER",
			phone: initialValues?.phone || "",
			email: initialValues?.email || "",
			status: (initialValues?.status || "PROSPECT") as
				| "PROSPECT"
				| "CONTACTED"
				| "NEGOTIATING"
				| "CONTRACTED"
				| "COMPLETED"
				| "CANCELLED",
			notes: initialValues?.notes || "",
		},
		onSubmit: async ({ value }) => {
			const r = vendorSchema.safeParse(value);
			if (!r.success) {
				toast.error(r.error.issues[0].message);
				return;
			}
			onSubmit(r.data);
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{isEditing ? "Editar" : "Adicionar"} fornecedor
					</DialogTitle>
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
						<form.Field name="category">
							{(field) => (
								<div className="space-y-2">
									<Label>Categoria</Label>
									<Select
										items={Object.entries(VENDOR_CATEGORY_LABELS).map(
											([value, label]) => ({ value, label }),
										)}
										value={field.state.value}
										onValueChange={(v) =>
											field.handleChange(
												v as
													| "VENUE"
													| "DECORATION"
													| "MUSIC"
													| "PHOTOGRAPHY"
													| "VIDEO"
													| "CATERING"
													| "CAKE"
													| "DRINKS"
													| "TRANSPORT"
													| "BEAUTY"
													| "SECURITY"
													| "ENTERTAINMENT"
													| "OTHER",
											)
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{Object.entries(VENDOR_CATEGORY_LABELS).map(([k, l]) => (
												<SelectItem key={k} value={k}>
													{l}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>
						<form.Field name="status">
							{(field) => (
								<div className="space-y-2">
									<Label>Estado</Label>
									<Select
										items={Object.entries(VENDOR_STATUS_LABELS).map(
											([value, label]) => ({ value, label }),
										)}
										value={field.state.value}
										onValueChange={(v) =>
											field.handleChange(
												v as
													| "PROSPECT"
													| "CONTACTED"
													| "NEGOTIATING"
													| "CONTRACTED"
													| "COMPLETED"
													| "CANCELLED",
											)
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{Object.entries(VENDOR_STATUS_LABELS).map(([k, l]) => (
												<SelectItem key={k} value={k}>
													{l}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<form.Field name="phone">
							{(field) => (
								<div className="space-y-2">
									<Label>Telefone</Label>
									<Input
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={isLoading}
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="email">
							{(field) => (
								<div className="space-y-2">
									<Label>Email</Label>
									<Input
										type="email"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={isLoading}
									/>
								</div>
							)}
						</form.Field>
					</div>
					<form.Field name="notes">
						{(field) => (
							<div className="space-y-2">
								<Label>Notas</Label>
								<Textarea
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
							{isLoading ? "A guardar..." : isEditing ? "Guardar" : "Adicionar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
