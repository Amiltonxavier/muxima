export function buildPayload<T extends Record<string, unknown>>(
    data: T,
) {
    return {
        id: String(data.id || ""),
        name: String(data.name || ""),
        category: String(data.category || "OTHER"),
        plannedQuantity: Number(data.plannedQuantity) || 0,
        currentQuantity: Number(data.currentQuantity) || 0,
        unit: String(data.unit || "UNIT"),
        unitPrice: Number(data.unitPrice) || 0,
        cakeType: data.cakeType ? String(data.cakeType) : undefined,
        weight: data.weight ? Number(data.weight) : undefined,
		deliveryDate: data.deliveryDate
			? new Date(String(data.deliveryDate)).toISOString().split("T")[0]
			: data.event &&
				typeof data.event === "object" &&
				(data.event as Record<string, unknown>).eventDate
				? new Date(
						String(
							(data.event as Record<string, unknown>).eventDate,
						),
					)
						.toISOString()
						.split("T")[0]
				: undefined,
        notes: String(data.notes || ""),
    };
}