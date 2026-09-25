// event-charts/components/chart-stat-item.tsx

interface ChartStatItemProps {
	label: string;
	value: string | number;
	valueClassName?: string;
}

export function ChartStatItem({
	label,
	value,
	valueClassName,
}: ChartStatItemProps) {
	return (
		<div className="border p-3 text-center">
			<p className="text-muted-foreground text-xs">{label}</p>

			<p className={`font-semibold text-lg ${valueClassName ?? ""}`}>{value}</p>
		</div>
	);
}
