import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Multi-selection bounded to the currently visible rows.
 *
 * Selection is a `Set` of ids, but tables are paginated: without pruning, ids
 * from a previous page (or from a previous filter) would stay selected, which
 * breaks "select all" (`selected.length === rows.length` never matches again)
 * and inflates the selection counter. Pruning on every visible-set change keeps
 * the counter honest and the bulk payloads scoped to what the user can see.
 *
 * `visibleIds` must be a stable reference across renders of unchanged data —
 * build it with `useMemo` from the rows.
 */
export function useVisibleSelection(visibleIds: string[]) {
	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
	const visibleIdSet = useMemo(() => new Set(visibleIds), [visibleIds]);
	const visibleIdKey = visibleIds.join("\u0000");

	// Prune ids that are no longer visible (page change, filter change, or a row
	// removed by a mutation). Returning `current` when nothing changed avoids a
	// re-render loop caused by the array identity.
	useEffect(() => {
		const visible = new Set(visibleIdKey ? visibleIdKey.split("\u0000") : []);
		setSelectedIds((current) => {
			const next = current.filter((id) => visible.has(id));
			return next.length === current.length ? current : next;
		});
	}, [visibleIdKey]);

	const toggle = useCallback((id: string) => {
		setSelectedIds((current) =>
			current.includes(id)
				? current.filter((currentId) => currentId !== id)
				: [...current, id],
		);
	}, []);

	const toggleAll = useCallback(() => {
		setSelectedIds((current) =>
			current.length === visibleIdSet.size ? [] : [...visibleIdSet],
		);
	}, [visibleIdSet]);

	const clear = useCallback(() => setSelectedIds([]), []);

	const isSelected = useCallback(
		(id: string) => selectedIdSet.has(id),
		[selectedIdSet],
	);

	/**
	 * Guarded on membership, not just count: during the render that happens
	 * before the pruning effect flushes, a stale id can still be in state.
	 */
	const allSelected =
		visibleIds.length > 0 &&
		selectedIds.length === visibleIds.length &&
		visibleIds.every((id) => selectedIdSet.has(id));

	return {
		selectedIds,
		selectedIdSet,
		selectedCount: selectedIds.length,
		allSelected,
		isSelected,
		toggle,
		toggleAll,
		clear,
	};
}
