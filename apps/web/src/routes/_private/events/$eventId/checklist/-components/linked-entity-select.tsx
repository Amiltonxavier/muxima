import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import { useQuery } from "@tanstack/react-query";
import { inventoryKeys } from "@/shared/queries/inventory-queries";
import { supplierKeys } from "@/shared/queries/supplier-queries";
import { orpc } from "@/utils/orpc";

/** Escolhe o fornecedor ou o item de inventário do mesmo evento. */
export function LinkedEntitySelect({
	value,
	onChange,
	eventId,
	linkType,
}: {
	value: string;
	onChange: (value: string) => void;
	eventId: string;
	linkType: "SUPPLIER" | "INVENTORY";
}) {
	const suppliersQuery = useQuery({
		...orpc.suppliers.list.queryOptions({
			input: { eventId, page: 1, limit: 100 },
		}),
		queryKey: supplierKeys.list(eventId, { eventId, page: 1, limit: 100 }),
		enabled: linkType === "SUPPLIER",
	});
	const inventoryQuery = useQuery({
		...orpc.inventory.list.queryOptions({
			input: { eventId, page: 1, limit: 100 },
		}),
		queryKey: inventoryKeys.list(eventId, { eventId, page: 1, limit: 100 }),
		enabled: linkType === "INVENTORY",
	});

	if (linkType === "SUPPLIER") {
		const suppliers = suppliersQuery.data?.data ?? [];
		return (
			<Select
				value={value || undefined}
				onValueChange={(v) => onChange(v ?? "")}
			>
				<SelectTrigger>
					<SelectValue placeholder="Escolher fornecedor" />
				</SelectTrigger>
				<SelectContent>
					{suppliers.map((supplier) => (
						<SelectItem key={supplier.id} value={supplier.id}>
							{supplier.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		);
	}

	const inventoryItems = inventoryQuery.data?.data ?? [];
	return (
		<Select value={value || undefined} onValueChange={(v) => onChange(v ?? "")}>
			<SelectTrigger>
				<SelectValue placeholder="Escolher item de inventário" />
			</SelectTrigger>
			<SelectContent>
				{inventoryItems.map((item) => (
					<SelectItem key={item.id} value={item.id}>
						{item.name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
