import { Badge } from "@muxima/ui/components/badge";
import {
    Cake,
    CookingPot,
    CupSoda,
    Package,
    Sparkles,
} from "lucide-react";


type InventoryCategory =
    | "DRINK"
    | "FOOD"
    | "CAKE"
    | "DECORATION"
    | "OTHER";

type InventoryCategoryBadgeProps = {
    category: string;
};

const CATEGORY_CONFIG: Record<
    InventoryCategory,
    {
        label: string;
        icon: typeof Package;
    }
> = {
    DRINK: {
        label: "Bebidas",
        icon: CupSoda,
    },
    FOOD: {
        label: "Alimentos",
        icon: CookingPot,
    },
    CAKE: {
        label: "Bolos",
        icon: Cake,
    },
    DECORATION: {
        label: "Decoração",
        icon: Sparkles,
    },
    OTHER: {
        label: "Outros",
        icon: Package,
    },
};

export function InventoryCategoryBadge({
    category,
}: InventoryCategoryBadgeProps) {
    const config = CATEGORY_CONFIG[category as InventoryCategory];

    const Icon = config?.icon ?? Package;
    const label = config?.label ?? category;

    return (
        <Badge
            variant="secondary"
            className="gap-1.5 font-normal"
        >
            <Icon className="size-3.5" />
            {label}
        </Badge>
    );
}