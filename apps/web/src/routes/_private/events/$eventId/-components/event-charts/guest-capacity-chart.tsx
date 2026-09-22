// event-charts/components/guest-capacity-chart.tsx

import { Users } from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@muxima/ui/components/card";

import { ChartStatItem } from "./chart-stat-item";
import { ProgressDonut } from "@/shared/components/charts";

interface GuestCapacityChartProps {
    data?: {
        capacity: number;
        invited: number;
        confirmed: number;
        remaining: number;
        percentage: number;
    };
}

export function GuestCapacityChart({
    data,
}: GuestCapacityChartProps) {
    if (!data || data.capacity <= 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    Capacidade de Convidados
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="flex items-center justify-center">
                    <ProgressDonut
                        value={data.invited}
                        max={data.capacity}
                        color="#3b82f6"
                        size={140}
                        centerLabel="convidados"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <ChartStatItem
                        label="Capacidade"
                        value={data.capacity}
                    />

                    <ChartStatItem
                        label="Convidados"
                        value={data.invited}
                    />

                    <ChartStatItem
                        label="Confirmados"
                        value={data.confirmed}
                    />

                    <ChartStatItem
                        label="Disponíveis"
                        value={data.remaining}
                    />
                </div>
            </CardContent>
        </Card>
    );
}