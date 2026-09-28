import { cn } from "@muxima/ui/lib/utils";
import { Fragment } from "react";

/** Tones semânticos das métricas, independentes de domínio. */
export type MetricTone =
	| "default"
	| "primary"
	| "success"
	| "warning"
	| "danger";

/**
 * Classes por tone. A fonte de verdade visual é o design system (cores do
 * tema + paleta semântica já usada nos `Badge`/charts).
 */
export const metricToneBarClass: Record<MetricTone, string> = {
	default: "bg-muted-foreground/40",
	primary: "bg-primary",
	success: "bg-emerald-600 dark:bg-emerald-500",
	warning: "bg-amber-500 dark:bg-amber-400",
	danger: "bg-destructive",
};

export const metricToneTextClass: Record<MetricTone, string> = {
	default: "text-foreground",
	primary: "text-foreground",
	success: "text-emerald-700 dark:text-emerald-400",
	warning: "text-amber-700 dark:text-amber-400",
	danger: "text-destructive",
};

/** Percentagem segura: clamped a 0–100, sem NaN/Infinity. */
export function safePercentage(value: number, max: number): number {
	if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) {
		return 0;
	}
	return Math.min(Math.max((value / max) * 100, 0), 100);
}

export interface SegmentedProgressSegment {
	/** Label do segmento (legenda e tooltip). */
	label: string;
	/** Valor absoluto do segmento. */
	value: number;
	/** Tone visual; ignorado se `color` for fornecido. */
	tone?: MetricTone;
	/** Cor explícita (CSS color) para casos como paletas de charts. */
	color?: string;
}

export interface SegmentedProgressProps {
	segments: SegmentedProgressSegment[];
	/**
	 * Total de referência. Por omissão é a soma dos segmentos; com um total
	 * explícito, segmentos que não chegam ao total deixam a área restante vazia.
	 */
	total?: number;
	/** Legenda (label + valor + %). Default: `true`. */
	showLegend?: boolean;
	/** Mostra o total na legenda. */
	showTotal?: boolean;
	/** Texto do total na legenda. */
	totalLabel?: string;
	/** Texto do restante na legenda. */
	remainingLabel?: string;
	/** Formata os valores da legenda (ex.: moeda). */
	formatValue?: (value: number) => string;
	className?: string;
	/** Nome acessível da barra. */
	"aria-label"?: string;
}

/**
 * Barra de progresso segmentada com legenda opcional — building block puro,
 * sem card.
 *
 * Quando usar: composição parte-de-um-todo num espaço reduzido.
 * Quando não usar: uma única percentagem (→ `Progress`), ou quando é
 * pretendido um card completo (→ `MetricBreakdownCard`).
 */
export function SegmentedProgress({
	segments,
	total,
	showLegend = true,
	showTotal = false,
	totalLabel = "Total",
	remainingLabel = "Restante",
	formatValue,
	className,
	"aria-label": ariaLabel,
}: SegmentedProgressProps) {
	const hasExplicitTotal = total !== undefined;
	const segmentsSum = segments.reduce((sum, s) => sum + (s.value || 0), 0);
	const reference = hasExplicitTotal ? total : segmentsSum;
	const filledPct = safePercentage(segmentsSum, reference || 1);

	const renderValue = (value: number) =>
		formatValue ? formatValue(value) : String(value);

	return (
		<div className={cn("space-y-2", className)}>
			<div
				role="progressbar"
				aria-label={ariaLabel}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={Math.round(filledPct)}
				className="flex h-2 w-full gap-px overflow-hidden rounded-full bg-muted"
			>
				{segments.map((segment) => {
					const pct = safePercentage(segment.value, reference || 1);
					if (pct <= 0) {
						return null;
					}
					return (
						<div
							key={segment.label}
							title={`${segment.label}: ${renderValue(segment.value)}`}
							className={cn(
								"h-full",
								segment.color ?? metricToneBarClass[segment.tone ?? "primary"],
							)}
							style={{ width: `${pct}%` }}
						/>
					);
				})}
			</div>

			{showLegend && (
				<ul className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
					{segments.map((segment) => (
						<Fragment key={segment.label}>
							<li className="flex items-center gap-1.5">
								<span
									aria-hidden="true"
									className={cn(
										"inline-block h-2 w-2 shrink-0 rounded-full",
										segment.color ??
											metricToneBarClass[segment.tone ?? "primary"],
									)}
								/>
								<span>{segment.label}</span>
								<span className="font-medium text-foreground">
									{renderValue(segment.value)}
								</span>
								<span>
									({Math.round(safePercentage(segment.value, reference || 1))}%)
								</span>
							</li>
						</Fragment>
					))}
					{showTotal && (
						<li className="flex items-center gap-1.5">
							<span>{totalLabel}</span>
							<span className="font-medium text-foreground">
								{renderValue(reference)}
							</span>
						</li>
					)}
					{hasExplicitTotal && filledPct < 100 && (
						<li className="flex items-center gap-1.5">
							<span>{remainingLabel}</span>
							<span className="font-medium text-foreground">
								{renderValue(Math.max(reference - segmentsSum, 0))}
							</span>
						</li>
					)}
				</ul>
			)}
		</div>
	);
}
