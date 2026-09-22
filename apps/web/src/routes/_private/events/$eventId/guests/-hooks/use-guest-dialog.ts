import { useCallback, useState } from "react";
import type { GuestItem } from "../-types/guest.types";

export function useGuestDialog() {
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [editingGuest, setEditingGuest] = useState<GuestItem | null>(null);

	const openCreateDialog = useCallback(() => setShowCreateDialog(true), []);
	const closeCreateDialog = useCallback(() => setShowCreateDialog(false), []);

	const openEditDialog = useCallback(
		(guest: GuestItem) => setEditingGuest(guest),
		[],
	);
	const closeEditDialog = useCallback(() => setEditingGuest(null), []);

	return {
		showCreateDialog,
		editingGuest,
		openCreateDialog,
		closeCreateDialog,
		openEditDialog,
		closeEditDialog,
	};
}
