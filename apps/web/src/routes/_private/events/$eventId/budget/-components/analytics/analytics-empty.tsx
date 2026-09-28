/** Contextual placeholder for a breakdown that the API returned empty. */
export function AnalyticsEmpty({ message }: { message: string }) {
	return (
		<p className="py-6 text-center text-muted-foreground text-sm">{message}</p>
	);
}
