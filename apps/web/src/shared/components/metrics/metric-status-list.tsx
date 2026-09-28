import { Progress } from "@muxima/ui/components/progress";
import { cn } from "@muxima/ui/lib/utils";
import type { ReactNode } from "react";
import {
	type MetricTone,
	metricToneBarClass,
	metricToneTextClass,
	safePercentage,
} from "./segmented-progress";

export type MetricStatusTone = Extract<
	MetricTone,
	"default" | "success" | "warning" | "danger"
>;

export interface MetricStatusItem {
	/** Label da linha. */
	label: string;
	/** Valor da métrica (texto/número já formatado). */
	value: ReactNode;
	/** Estado opcional — sempre texto, nunca apenas cor. */
	status?: {
		label: string;
		tone?: MetricStatusTone;
	};
	/** Progresso opcional (ex.: 3 de 5 mesas cheias). */
	progress?: {
		value: number;
		max: number;
		/** Tone da barra; por omissão herda o tone do status. */
		tone?: MetricTone;
	};
}

export interface MetricStatusListProps {
	items: MetricStatusItem[];
	/** Nome acessível da lista. */
	"aria-label"?: string;
	className?: string;
}

/**
 * Lista de métricas com status e progresso opcional por linha.
 *
 * Quando usar: resumos compactos por entidade (por mesa, por fornecedor, por
 * categoria) onde cada linha tem um estado.
 * Quando não usar: distribuições parte-de-um-todo (→ `MetricBreakdownCard`),
 * KPIs isolados (→ `MetricCard`).
 *
 * Acessibilidade: o status é sempre texto visível; a barra de progresso tem
 * `role="progressbar"` com valores ARIA; os tones são semânticos e
 * configuráveis pelo consumidor (nothing hard-coded).
 */
export function MetricStatusList({
	items,
	"aria-label": ariaLabel,
	className,
}: MetricStatusListProps) {
	return (
		<ul className={cn("space-y-3", className)} aria-label={ariaLabel}>
			{items.map((item) => {
				const statusTone = item.status?.tone ?? "default";
				const progressTone = item.progress?.tone ?? statusTone;
				const pct = item.progress
					? safePercentage(item.progress.value, item.progress.max)
					: null;

				return (
					<li key={item.label} className="space-y-1">
						<div className="flex items-baseline justify-between gap-3 text-sm">
							<span className="flex min-w-0 items-center gap-2">
								<span className="truncate text-muted-foreground">
									{item.label}
								</span>
								{item.status && (
									<span
										className={cn(
											"shrink-0 font-medium text-xs",
											metricToneTextClass[statusTone],
										)}
									>
										{item.status.label}
									</span>
								)}
							</span>
							<span className="shrink-0 font-medium">{item.value}</span>
						</div>{" "}
						{/* O `Progress` expõe role="progressbar" (0–100) por si. */}
						{item.progress && pct !== null && (
							<Progress
								value={pct}
								aria-label={item.label}
								className={cn("h-1.5", metricToneBarClass[progressTone])}
							/>
						)}
					</li>
				);
			})}
		</ul>
	);
}
