import { Button } from "@muxima/ui/components/button";
import { Checkbox } from "@muxima/ui/components/checkbox";
import { Input } from "@muxima/ui/components/input";
import { Label } from "@muxima/ui/components/label";
import { Textarea } from "@muxima/ui/components/textarea";
import { Plus, Trash2 } from "lucide-react";
import { dateHelper } from "@/shared/utils/date-helper";
import type {
	SupplierFieldSpec,
	SupplierProductItem,
} from "../-types/suppliers.types";

/**
 * Renders one field of `suppliers.getCategorySchema`. Adding a field in the
 * API module is enough for it to show up here: the input kind is decided by
 * `field.type` and the value is validated again by the API on write.
 */
export function SupplierCustomField({
	field,
	value,
	onChange,
	disabled,
}: {
	field: SupplierFieldSpec;
	value: unknown;
	onChange: (value: unknown) => void;
	disabled: boolean;
}) {
	const id = `supplier-custom-${field.name}`;
	const label = field.required ? (
		<span>
			{field.label} <span className="text-destructive">*</span>
		</span>
	) : (
		field.label
	);

	if (field.type === "boolean") {
		return (
			<div className="flex items-center gap-2 pt-1">
				<Checkbox
					id={id}
					checked={value === true}
					onCheckedChange={(checked) => onChange(checked === true)}
					disabled={disabled}
				/>
				<Label htmlFor={id} className="font-normal">
					{label}
				</Label>
			</div>
		);
	}

	if (field.type === "tags") {
		const list = Array.isArray(value) ? (value as string[]) : [];
		return (
			<div className="space-y-2">
				<Label htmlFor={id}>{label}</Label>
				<Input
					id={id}
					placeholder="Separados por vírgula"
					value={list.join(", ")}
					onChange={(e) =>
						onChange(
							e.target.value
								.split(",")
								.map((entry) => entry.trim())
								.filter(Boolean),
						)
					}
					disabled={disabled}
				/>
			</div>
		);
	}

	if (field.type === "items") {
		return (
			<SupplierItemsField
				id={id}
				name={field.label}
				label={label}
				items={Array.isArray(value) ? (value as SupplierProductItem[]) : []}
				onChange={onChange}
				disabled={disabled}
			/>
		);
	}

	if (field.type === "textarea") {
		return (
			<div className="space-y-2">
				<Label htmlFor={id}>{label}</Label>
				<Textarea
					id={id}
					placeholder={field.placeholder}
					value={typeof value === "string" ? value : ""}
					onChange={(e) => onChange(e.target.value)}
					disabled={disabled}
				/>
			</div>
		);
	}

	if (field.type === "date") {
		return (
			<div className="space-y-2">
				<Label htmlFor={id}>{label}</Label>
				<Input
					id={id}
					type="date"
					value={
						value instanceof Date
							? dateHelper.formatToIsoDate(value)
							: typeof value === "string"
								? value.slice(0, 10)
								: ""
					}
					onChange={(e) => onChange(e.target.value)}
					disabled={disabled}
				/>
			</div>
		);
	}

	if (field.type === "number") {
		return (
			<div className="space-y-2">
				<Label htmlFor={id}>{label}</Label>
				<Input
					id={id}
					type="number"
					min={0}
					step="any"
					placeholder={field.placeholder}
					value={value === undefined || value === null ? "" : String(value)}
					onChange={(e) =>
						onChange(e.target.value === "" ? undefined : Number(e.target.value))
					}
					disabled={disabled}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			<Input
				id={id}
				placeholder={field.placeholder}
				value={typeof value === "string" ? value : ""}
				onChange={(e) => onChange(e.target.value)}
				disabled={disabled}
			/>
		</div>
	);
}

/** Editable list of `{ name, quantity, unit }` rows for the `items` field type. */
function SupplierItemsField({
	id,
	name,
	label,
	items,
	onChange,
	disabled,
}: {
	id: string;
	name: string;
	label: React.ReactNode;
	items: SupplierProductItem[];
	onChange: (value: unknown) => void;
	disabled: boolean;
}) {
	const patch = (index: number, changes: Partial<SupplierProductItem>) => {
		const next = [...items];
		next[index] = { ...items[index], ...changes };
		onChange(next);
	};

	return (
		<div className="space-y-2">
			<Label>{label}</Label>
			{items.map((item, index) => (
				<div key={index} className="grid grid-cols-[1fr_5rem_6rem_auto] gap-2">
					<Input
						id={`${id}-${index}-name`}
						aria-label={`${name} ${index + 1} - nome`}
						placeholder="Item"
						value={item.name}
						onChange={(e) => patch(index, { name: e.target.value })}
						disabled={disabled}
					/>
					<Input
						id={`${id}-${index}-quantity`}
						aria-label={`${name} ${index + 1} - quantidade`}
						type="number"
						min={0}
						placeholder="Qtd"
						value={item.quantity}
						onChange={(e) => patch(index, { quantity: e.target.value })}
						disabled={disabled}
					/>
					<Input
						id={`${id}-${index}-unit`}
						aria-label={`${name} ${index + 1} - unidade`}
						placeholder="Un."
						value={item.unit}
						onChange={(e) => patch(index, { unit: e.target.value })}
						disabled={disabled}
					/>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="text-destructive"
						title={`Remover ${item.name || "item"}`}
						disabled={disabled}
						onClick={() => onChange(items.filter((_, i) => i !== index))}
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			))}
			<Button
				type="button"
				variant="outline"
				size="sm"
				disabled={disabled}
				onClick={() =>
					onChange([...items, { name: "", quantity: "", unit: "" }])
				}
			>
				<Plus className="mr-2 h-3.5 w-3.5" />
				Adicionar item
			</Button>
		</div>
	);
}
