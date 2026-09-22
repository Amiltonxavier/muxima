export function StatRow({
    label,
    value,
}: {
    label: string;
    value: number | string;
}) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    );
}