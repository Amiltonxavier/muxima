import { useCallback } from "react";
import { toast } from "sonner";
import {
	useCreateGuest,
	useDeleteGuest,
	useUpdateGuest,
} from "../-queries/guest-queries";
import type { GuestDialogValues } from "../-types/guest.types";

export function useGuestActions() {
	const createMutation = useCreateGuest();
	const updateMutation = useUpdateGuest();
	const deleteMutation = useDeleteGuest();

	const createGuest = useCallback(
		(eventId: string, values: GuestDialogValues, onSuccess?: () => void) => {
			createMutation.mutate(
				{ ...values, eventId },
				{
					onSuccess: () => {
						toast.success("Convidado adicionado");
						onSuccess?.();
					},
					onError: (error) => toast.error(error.message),
				},
			);
		},
		[createMutation],
	);

	const updateGuest = useCallback(
		(guestId: string, values: GuestDialogValues, onSuccess?: () => void) => {
			updateMutation.mutate(
				{ id: guestId, ...values },
				{
					onSuccess: () => {
						toast.success("Convidado atualizado");
						onSuccess?.();
					},
					onError: (error) => toast.error(error.message),
				},
			);
		},
		[updateMutation],
	);

	const deleteGuest = useCallback(
		(guestId: string, onSuccess?: () => void) => {
			deleteMutation.mutate(
				{ id: guestId },
				{
					onSuccess: () => {
						toast.success("Convidado eliminado");
						onSuccess?.();
					},
					onError: (error) => toast.error(error.message),
				},
			);
		},
		[deleteMutation],
	);

	return {
		createGuest,
		updateGuest,
		deleteGuest,
		isCreating: createMutation.isPending,
		isUpdating: updateMutation.isPending,
		isDeleting: deleteMutation.isPending,
	};
}
