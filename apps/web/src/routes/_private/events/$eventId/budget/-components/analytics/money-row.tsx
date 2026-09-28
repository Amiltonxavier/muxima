/** A labelled money figure, used beside the charts to keep them uncluttered. */
export function MoneyRow({
	label,
	value,
	tone,
}: {
	label: string;
	value: string;
	tone?: "destructive";
}) {
	return (
		<div className="flex items-baseline justify-between gap-3 text-sm">
			<dt className="text-muted-foreground">{label}</dt>
			<dd
				className={
					tone === "destructive"
						? "font-medium text-destructive"
						: "font-medium"
				}
			>
				{value}
			</dd>
		</div>
	);
}
