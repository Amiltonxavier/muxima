import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
import { checklistKeys } from "./checklist-queries";
import { supplierKeys } from "./supplier-queries";

export type FoodPlanCategoryValue =
	| "STARTER"
	| "MAIN_COURSE"
	| "SIDE_DISH"
	| "DESSERT"
	| "FRUIT"
	| "OTHER";

export type FoodPlanUnitValue =
	| "UNIT"
	| "PLATE"
	| "BOWL"
	| "PORTION"
	| "GRAM"
	| "KILOGRAM"
	| "LITER"
	| "GLASS"
	| "BOTTLE"
	| "PACKAGE"
	| "OTHER";

export type FoodPlanStatusValue = "PENDING" | "IN_PROGRESS" | "COMPLETED";

export type FoodPlanItemFilters = {
	status?: FoodPlanStatusValue;
};

const foodPlanRootKey = ["foodPlan"] as const;

export const foodPlanKeys = {
	all: foodPlanRootKey,
	plan: (eventId: string) => [...foodPlanRootKey, eventId] as const,
	stats: (eventId: string) => [...foodPlanRootKey, "stats", eventId] as const,
};

/**
 * O plano é criado pelo servidor no primeiro acesso (`foodPlan.get` faz
 * upsert), por isso o cliente nunca trata o caso "ainda não existe".
 */
export function useFoodPlan(eventId: string) {
	return useQuery({
		...orpc.foodPlan.get.queryOptions({ input: { eventId } }),
		queryKey: foodPlanKeys.plan(eventId),
		enabled: !!eventId,
	});
}

export function useFoodPlanStats(eventId: string) {
	return useQuery({
		...orpc.foodPlan.getStats.queryOptions({ input: { eventId } }),
		queryKey: foodPlanKeys.stats(eventId),
		enabled: !!eventId,
	});
}

/**
 * O plano suporta um único fornecedor; o backend recusa trocar quando já há
 * um associado. Altera as estatísticas e o checklist (itens ligados), por
 * isso ambos são invalidados.
 */
export function useSetFoodPlanSupplier() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.foodPlan.setSupplier.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: foodPlanKeys.all });
				queryClient.invalidateQueries({ queryKey: checklistKeys.all });
				queryClient.invalidateQueries({ queryKey: supplierKeys.all });
			},
		}),
	);
}

export function useUpdateFoodPlanNotes() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.foodPlan.updateNotes.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: foodPlanKeys.all });
			},
		}),
	);
}

export function useAddFoodPlanItem() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.foodPlan.addItem.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: foodPlanKeys.all });
			},
		}),
	);
}

export function useUpdateFoodPlanItem() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.foodPlan.updateItem.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: foodPlanKeys.all });
			},
		}),
	);
}

export function useDeleteFoodPlanItem() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.foodPlan.deleteItem.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: foodPlanKeys.all });
				queryClient.invalidateQueries({ queryKey: checklistKeys.all });
			},
		}),
	);
}
