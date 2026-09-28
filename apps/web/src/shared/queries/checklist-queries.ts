import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
import { inventoryKeys } from "./inventory-queries";
import { supplierKeys } from "./supplier-queries";

export type ChecklistStatusValue =
	| "PENDING"
	| "IN_PROGRESS"
	| "COMPLETED"
	| "CANCELLED";

export type ChecklistItemFilters = {
	status?: ChecklistStatusValue;
};

const checklistRootKey = ["checklist"] as const;

export const checklistKeys = {
	all: checklistRootKey,
	list: (eventId: string, params: Record<string, unknown>) =>
		[...checklistRootKey, "list", eventId, params] as const,
	stats: (eventId: string) => [...checklistRootKey, "stats", eventId] as const,
};

/**
 * Itens ligados a fornecedor ou inventário são geridos pela API: o estado é
 * derivado no backend (regras em `checklist.rules`), pelo que aqui só se lê o
 * que o servidor devolve e se escreve o que o utilizador controla (título,
 * descrição, data limite, estado dos itens manuais).
 */
export function useChecklist(
	eventId: string,
	filters: ChecklistItemFilters = {},
) {
	const input = { eventId, ...filters };
	return useQuery({
		...orpc.checklist.list.queryOptions({ input }),
		queryKey: checklistKeys.list(eventId, input),
		enabled: !!eventId,
	});
}

export function useChecklistStats(eventId: string) {
	return useQuery({
		...orpc.checklist.getStats.queryOptions({ input: { eventId } }),
		queryKey: checklistKeys.stats(eventId),
		enabled: !!eventId,
	});
}

export function useCreateChecklistItem() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.checklist.create.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: checklistKeys.all });
			},
		}),
	);
}

/**
 * Atualiza título/descrição/data de qualquer item e o estado apenas dos
 * manuais — o backend recusa alterar o estado dos auto-geridos.
 */
export function useUpdateChecklistItem() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.checklist.update.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: checklistKeys.all });
			},
		}),
	);
}

export function useDeleteChecklistItem() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.checklist.delete.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: checklistKeys.all });
			},
		}),
	);
}

/**
 * Re-aplica as regras derivadas a todos os itens ligados do evento. Também
 * inválida fornecedores e inventário porque são as origens do estado.
 */
export function useSyncChecklist() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.checklist.sync.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: checklistKeys.all });
				queryClient.invalidateQueries({ queryKey: supplierKeys.all });
				queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
			},
		}),
	);
}
