import { PERMISSIONS } from "@muxima/permissions";
import { Button } from "@muxima/ui/components/button";
import { Card, CardContent } from "@muxima/ui/components/card";
import { ShoppingCart } from "lucide-react";
import { useEventCan } from "@/shared/hooks/use-can";
import { useEventLock } from "@/shared/hooks/use-event-lock";
import { useFoodPlanStats } from "@/shared/queries/food-plan-queries";

/**
 * CTA de associação: o nome do fornecedor já vive no card do grid; este
 * cartão só existe enquanto não há catering associado.
 */
export function FoodPlanSupplierCta({
	eventId,
	onAssociate,
}: {
	eventId: string;
	onAssociate: () => void;
}) {
	const statsQuery = useFoodPlanStats(eventId);
	const { isEventLocked, lockMessage } = useEventLock();
	const canUpdate = useEventCan(eventId, PERMISSIONS.FOOD_PLAN_UPDATE);

	const stats = statsQuery.data;

	if (!stats || stats.hasSupplier) {
		return null;
	}

	return (
		<Card>
			<CardContent className="flex flex-col justify-between gap-3 pt-6 sm:flex-row sm:items-center">
				<p className="text-muted-foreground text-sm">
					Associe o fornecedor de catering ao plano de alimentação.
				</p>
				{canUpdate && (
					<Button
						variant="outline"
						onClick={onAssociate}
						disabled={isEventLocked}
						title={lockMessage ?? undefined}
					>
						<ShoppingCart className="mr-2 h-4 w-4" />
						Associar fornecedor
					</Button>
				)}
			</CardContent>
		</Card>
	);
}
