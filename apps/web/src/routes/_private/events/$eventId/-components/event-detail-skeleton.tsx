// -components/event-detail-skeleton.tsx

import { Card, CardContent } from "@muxima/ui/components/card";

export function EventDetailSkeleton() {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-2">
				<div className="h-8 w-8 animate-pulse rounded bg-muted" />
				<div className="h-6 w-48 animate-pulse rounded bg-muted" />
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 6 }).map((_, index) => (
					<Card key={index}>
						<CardContent className="p-6">
							<div className="space-y-3">
								<div className="h-4 w-32 animate-pulse rounded bg-muted" />
								<div className="h-3 w-full animate-pulse rounded bg-muted" />
								<div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}