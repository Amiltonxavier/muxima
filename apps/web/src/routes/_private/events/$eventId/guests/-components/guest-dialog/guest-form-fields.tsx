import type { Table as TableEntity } from "@muxima/api/shared/types/entities";
import { Input } from "@muxima/ui/components/input";
import { Label } from "@muxima/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import { Textarea } from "@muxima/ui/components/textarea";
import type { ReactNode } from "react";
import {
	GUEST_STATUS_LABELS,
	GUEST_TYPE_LABELS,
	toSelectItems,
} from "@/utils/status-helpers";
import type { GuestFormApi } from "../../-types/guest.types";

export const EDITABLE_GUEST_STATUS_OPTIONS = toSelectItems(
	GUEST_STATUS_LABELS,
).filter((item) =>
	["PENDING", "CONFIRMED", "DECLINED", "WAITING"].includes(item.value),
);

export function GuestFormFields({
	form,
	tables,
	isEditing,
	isLoading,
	companionsSection,
}: {
	form: GuestFormApi;
	tables: Array<TableEntity>;
	isEditing: boolean;
	isLoading: boolean;
	companionsSection?: ReactNode;
}) {
	return (
		<>
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

			<div className="grid grid-cols-2 gap-4">
				<form.Field name="type">
					{(field) => (
						<div className="space-y-2">
							<Label>Tipo</Label>
							<Select
								items={toSelectItems(GUEST_TYPE_LABELS)}
								value={field.state.value}
								onValueChange={(v) =>
									field.handleChange(v as typeof field.state.value)
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{toSelectItems(GUEST_TYPE_LABELS).map((item) => (
										<SelectItem key={item.value} value={item.value}>
											{item.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}
				</form.Field>
				<form.Field name="group">
					{(field) => (
						<div className="space-y-2">
							<Label>Grupo</Label>
							<Input
								placeholder="Ex: Família da noiva"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								disabled={isLoading}
							/>
						</div>
					)}
				</form.Field>
			</div>

			{/* Table assignment */}
			<form.Field name="tableId">
				{(field) => (
					<div className="space-y-2">
						<Label>Mesa</Label>
						<Select
							value={field.state.value}
							onValueChange={(v) => field.handleChange(v as string)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Selecionar mesa" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="">Sem mesa</SelectItem>
								{tables.map((t) => (
									<SelectItem key={t.id} value={t.id}>
										{t.name}
										{t.number ? ` (#${String(t.number)})` : ""} —{" "}
										{String(t.capacity)} lugares
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}
			</form.Field>

			{isEditing && (
				<form.Field name="status">
					{(field) => (
						<div className="space-y-2">
							<Label>Estado</Label>
							<Select
								items={EDITABLE_GUEST_STATUS_OPTIONS}
								value={field.state.value}
								onValueChange={(v) =>
									field.handleChange(v as typeof field.state.value)
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{EDITABLE_GUEST_STATUS_OPTIONS.map((item) => (
										<SelectItem key={item.value} value={item.value}>
											{item.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}
				</form.Field>
			)}

			{companionsSection}

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
		</>
	);
}
