import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Progress } from "@muxima/ui/components/progress";
import { cn } from "@muxima/ui/lib/utils";
import type { ReactNode } from "react";
import {
	type MetricTone,
	metricToneBarClass,
	safePercentage,
} from "./segmented-progress";

export interface MetricProgressCardProps {
	title: string;
	/** Valor actual. */
	value: number;
	/** Valor máximo/limite. */
	limit: number;
	/**
	 * Percentagem pré-calculada (0–100). Se omitida, é calculada de forma
	 * segura a partir de `value`/`limit` (clamped, sem NaN/Infinity).
	 */
	percentage?: number;
	/** Label curto no canto superior direito (ex.: "42 de 100"). */
	label?: string;
	description?: ReactNode;
	/** Tone da barra de progresso. */
	tone?: MetricTone;
	icon?: ReactNode;
	action?: ReactNode;
	className?: string;
}

/**
 * Métrica com valor actual vs. limite e progress bar.
 *
 * Quando usar: consumos/capacidades ("X de Y", "% concluído").
 * Quando não usar: breakdowns por categoria (→ `MetricBreakdownCard`),
 * percentagem de destaque circular (→ `MetricRadialCard`).
 */
export function MetricProgressCard({
	title,
	value,
	limit,
	percentage,
	label,
	description,
	tone = "primary",
	icon,
	action,
	className,
}: MetricProgressCardProps) {
	const pct = percentage ?? safePercentage(value, limit);
	const hasLimit = Number.isFinite(limit) && limit > 0;

	return (
		<Card className={className}>
			<CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
				<CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-xs">
					{title}
					{icon && <span aria-hidden="true">{icon}</span>}
				</CardTitle>
				{label && (
					<span className="font-normal text-muted-foreground text-xs">
						{label}
					</span>
				)}
			</CardHeader>
			<CardContent className="space-y-2">
				<div className="font-semibold text-2xl">
					{value}
					{hasLimit && (
						<span className="ml-1 font-normal text-muted-foreground text-sm">
							/ {limit}
						</span>
					)}
				</div>
				{/* O `Progress` da Base UI já expõe role="progressbar" com os
				    valores ARIA derivados de `value`; só nomeamos a barra. */}
				<Progress
					value={pct}
					aria-label={title}
					className={cn("h-2", metricToneBarClass[tone])}
				/>
				{description && (
					<p className="text-muted-foreground text-xs">{description}</p>
				)}
				{action && <div className="pt-1">{action}</div>}
			</CardContent>
		</Card>
	);
}
